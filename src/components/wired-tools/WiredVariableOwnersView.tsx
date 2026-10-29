import { GetCommunication, IWiredVariableHolder, WiredVariableHoldersPage64Composer, WiredVariableHoldersPage64Event } from '@volt/renderer';
import { useEffect, useRef, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../api';
import { GetUserProfile } from '../../api/user/GetUserProfile';
import { useMessageEvent, useRoom } from '../../hooks';
import { useWiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
import { VariableManageEntry, VariablesElementType } from './WiredCreatorTools.types';
import { calculateLastPage, NO_PAGE } from './WiredPaging.helpers';
import { HOLDER_TYPE_FURNI, HOLDER_TYPE_ROOM, HOLDER_TYPE_USER, WiredHolderDescription, WiredVariableOwnersPanel } from './WiredVariableOwnersPanel';

export { HOLDER_TYPE_FURNI, HOLDER_TYPE_ROOM, HOLDER_TYPE_USER };
export type { WiredHolderDescription };

/** Holders per page, as the official overview shows them. */
export const WIRED_VARIABLE_OWNERS_PAGE_SIZE = 50;
/** Above the server's own 250 ms limit on the page request. */
const REQUEST_PAGE_RATELIMIT = 300;

/** The user types of the AIR page request. */
const USER_TYPE_ALL = -1;
const USER_TYPES = [
    { value: 1, key: '1', fallback: 'Habbo' },
    { value: 2, key: '2', fallback: 'Pet' },
    { value: 4, key: '4', fallback: 'Bot' }
];
/** The sorts of the AIR page request, in the order of AIR's drop menu. */
const SORT_HIGHEST_VALUE = 0;
const SORTS = [
    { value: 0, fallback: 'Highest value' },
    { value: 1, fallback: 'Lowest value' },
    { value: 2, fallback: 'Oldest creation' },
    { value: 3, fallback: 'Latest creation' },
    { value: 4, fallback: 'Oldest update' },
    { value: 5, fallback: 'Latest update' }
];

interface HoldersPage {
    variableId: string;
    totalEntries: number;
    currentPage: number;
    elements: IWiredVariableHolder<bigint>[];
    userTypeFilter: number;
    sortTypeFilter: number;
}

export interface WiredVariableOwnersViewProps {
    variableId: string;
    variableName: string;
    variablesType: VariablesElementType;
    hasValue: boolean;
    /** The room's own knowledge of a holder (Habbo / Bot / Pet, floor / wall furni), when it is in the room. */
    describeHolder: (entityType: number, entityId: number, entityName: string) => WiredHolderDescription;
    onManage: (entry: VariableManageEntry) => void;
    onClose: () => void;
}

/**
 * Who holds a wired variable, a page of 50 at a time from the server: user type, name (a link
 * to a user's profile), creation and last update time, value, and "manage", which opens the
 * holder in the detail panel. The user type and sort menus ask for page 1 again; every page that
 * arrives puts its own filters back into the menus.
 */
export const WiredVariableOwnersView = (props: WiredVariableOwnersViewProps) => {
    const { variableId, variableName, variablesType, hasValue, describeHolder, onManage, onClose } = props;
    const { roomSession } = useRoom();
    const pending = useRef<{ room: typeof roomSession; variableId: string; page: number; users: number; sort: number; connection: ReturnType<typeof GetCommunication>['connection'] } | null>(null);
    const [page, setPage] = useState<HoldersPage | null>(null);
    const [userType, setUserType] = useState(USER_TYPE_ALL);
    const [sortType, setSortType] = useState(SORT_HIGHEST_VALUE);
    const [scrollKey, setScrollKey] = useState(0);
    const nextFilters = useRef<{ userTypeFilter: number; sortTypeFilter: number } | null>(null);

    useMessageEvent<WiredVariableHoldersPage64Event>(WiredVariableHoldersPage64Event, (event) => {
        const parser = event.getParser();

        const expected = pending.current;
        if (!expected || !roomSession || expected.room !== roomSession || expected.connection !== GetCommunication().connection || parser.amount !== WIRED_VARIABLE_OWNERS_PAGE_SIZE || expected.variableId !== variableId || parser.variableId !== expected.variableId || parser.currentPage !== expected.page || parser.userTypeFilter !== expected.users || parser.sortTypeFilter !== expected.sort) return;
        pending.current = null;
        // 9482 has no room ID/nonce: an identical delayed request is indistinguishable on the wire.

        setPage({
            variableId: parser.variableId,
            totalEntries: parser.totalEntries,
            currentPage: parser.currentPage,
            elements: [...parser.elements],
            userTypeFilter: parser.userTypeFilter,
            sortTypeFilter: parser.sortTypeFilter
        });
        setUserType(parser.userTypeFilter);
        setSortType(parser.sortTypeFilter);
        setScrollKey((key) => key + 1);
    });

    const currentPage = page?.currentPage ?? NO_PAGE;
    const lastPage = page ? calculateLastPage(page.totalEntries, WIRED_VARIABLE_OWNERS_PAGE_SIZE) : NO_PAGE;

    const requests = useWiredPageRequests({
        currentPage,
        lastPage,
        pageKey: page,
        ratelimit: REQUEST_PAGE_RATELIMIT,
        onRequestPage: (requested) => {
            const filters = nextFilters.current ?? {
                userTypeFilter: page?.userTypeFilter ?? USER_TYPE_ALL,
                sortTypeFilter: page?.sortTypeFilter ?? SORT_HIGHEST_VALUE
            };

            if (!roomSession) return;
            pending.current = { room: roomSession, connection: GetCommunication().connection, variableId, page: requested, users: filters.userTypeFilter, sort: filters.sortTypeFilter };
            SendMessageComposer(
                new WiredVariableHoldersPage64Composer(variableId, requested, WIRED_VARIABLE_OWNERS_PAGE_SIZE, filters.sortTypeFilter, filters.userTypeFilter)
            );
        }
    });

    // The first page of a new variable, as AIR's WiredMenuOverviewTab asks for it: sort 0 (highest value), user type -1 (all).
    useEffect(() => {
        setPage(null);
        pending.current = null;
        if (!roomSession) return;
        pending.current = { room: roomSession, connection: GetCommunication().connection, variableId, page: 1, users: USER_TYPE_ALL, sort: SORT_HIGHEST_VALUE };
        SendMessageComposer(new WiredVariableHoldersPage64Composer(variableId, 1, WIRED_VARIABLE_OWNERS_PAGE_SIZE, SORT_HIGHEST_VALUE, USER_TYPE_ALL));
        return () => { pending.current = null; };
    }, [variableId, roomSession]);

    const changeFilters = (nextUserType: number, nextSortType: number) => {
        if (!requests.canRequestNewPage(false)) return;

        nextFilters.current = { userTypeFilter: nextUserType, sortTypeFilter: nextSortType };
        requests.requestPage(1);
        nextFilters.current = null;
    };

    const toManageEntry = (holder: IWiredVariableHolder<bigint>): VariableManageEntry => {
        const description = describeHolder(holder.entityType, holder.entityId, holder.entityName);

        return {
            categoryLabel: description.categoryLabel,
            entityId: holder.entityId,
            entityName: description.entityName,
            createdAt: Math.floor(holder.storage.creationTime / 1000),
            updatedAt: Math.floor(holder.storage.lastUpdateTime / 1000),
            value: hasValue ? holder.storage.value : null,
            manageLabel: localizeWithFallback('wiredmenu.variable_management.manage', 'Manage')
        };
    };

    const userTypeFilter = {
        label: localizeWithFallback('wiredmenu.variable_management.usertype', 'User type:'),
        value: String(userType),
        options: [
            { value: String(USER_TYPE_ALL), label: localizeWithFallback('wiredmenu.variable_management.usertype.all', 'All types') },
            ...USER_TYPES.map((type) => ({ value: String(type.value), label: localizeWithFallback(`wiredmenu.variable_management.usertype.${type.key}`, type.fallback) }))
        ],
        onChange: (value: string) => {
            const next = Number(value);

            setUserType(next);
            changeFilters(next, sortType);
        }
    };

    const sortFilter = {
        label: localizeWithFallback('wiredmenu.variable_management.sort_by', 'Sort by:'),
        value: String(sortType),
        options: SORTS.map((sort) => ({ value: String(sort.value), label: localizeWithFallback(`wiredmenu.variable_management.sort_by.${sort.value}`, sort.fallback) })),
        onChange: (value: string) => {
            const next = Number(value);

            setSortType(next);
            changeFilters(userType, next);
        }
    };

    return (
        <WiredVariableOwnersPanel
            variableName={variableName}
            variablesType={variablesType}
            hasValue={hasValue}
            holders={page?.elements ?? []}
            describeHolder={describeHolder}
            currentPage={currentPage}
            totalEntries={page?.totalEntries ?? 0}
            lastPage={lastPage}
            requests={requests}
            scrollResetKey={scrollKey}
            sortFilter={sortFilter}
            typeFilter={variablesType === 'user' ? userTypeFilter : undefined}
            onManage={(holder) => onManage(toManageEntry(holder))}
            onOpenUserProfile={(entityId) => GetUserProfile(entityId)}
            onClose={onClose}
        />
    );
};
