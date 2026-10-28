import {
    GetCommunication,
    IWiredUserVariablesEntry,
    WiredGetUserPermanentVariablesComposer,
    WiredGetVariableOwnersPageComposer,
    WiredUserVariablesListEvent
} from '@volt/renderer';
import { useEffect, useRef, useState } from 'react';
import { GetUserProfile, localizeWithFallback, SendMessageComposer } from '../../api';
import { VoltCardHeaderView, VoltCardView } from '../../common';
import { useMessageEvent, useRoom, useWiredCatalogRows, useWiredToolsState } from '../../hooks';
import { useWiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
import { variableValueCell } from './WiredCreatorTools.helpers';
import { WiredMenuButton, WiredMenuItem, WiredMenuTable, WiredMenuText, WiredMenuTitle } from './WiredMenuParts';
import { calculateLastPage, clampInputPage, NO_PAGE, parseInputPage, restrictPageInput } from './WiredPaging.helpers';

export const VARIABLE_MANAGEMENT_PAGE_SIZE = 50;
const REQUEST_PAGE_RATELIMIT = 280;
const ENTITY_TYPE_HABBO = 1;
/** The user type menu rows and the `userType` each one sends. */
const USER_TYPE_OPTIONS: [number, string, string][] = [
    [-1, 'wiredmenu.variable_management.usertype.all', 'All types'],
    [1, 'wiredmenu.variable_management.usertype.1', 'Habbo'],
    [2, 'wiredmenu.variable_management.usertype.2', 'Pet'],
    [4, 'wiredmenu.variable_management.usertype.4', 'Bot']
];
const SORT_OPTIONS: [number, string][] = [
    [0, 'Highest value'],
    [1, 'Lowest value'],
    [2, 'Oldest creation'],
    [3, 'Latest creation'],
    [4, 'Oldest update'],
    [5, 'Latest update']
];
// The window keeps the AIR layout caption here; the client never sets this text from a localization key.
const INFO_TEXT = 'This is a tool to manage all users that hold a permanent variable.\nFor variables that are shared with other rooms, there is a possible 20 second synchronization delay.';

interface OwnersPage {
    roomId: number;
    variableId: string;
    totalEntries: number;
    page: number;
    entries: readonly IWiredUserVariablesEntry[];
    userType: number;
    sort: number;
}

/** A user type the menu does not list shows as "All types", like the AIR menu does. */
const toMenuUserType = (userType: number): number => (USER_TYPE_OPTIONS.some(([value]) => value === userType) ? userType : -1);

/**
 * The Variable Management window: every user that holds a permanent user variable, 50 per page. It opens when the server
 * answers the Manage button and shows each page the server sends, with the filters that page was made with.
 */
export const WiredVariableManagementView = () => {
    const { roomSession = null } = useRoom();
    const { roomSettings } = useWiredToolsState();
    const roomId = roomSession?.roomId ?? 0;
    const [page, setPage] = useState<OwnersPage | null>(null);
    const [userType, setUserType] = useState(-1);
    const [sort, setSort] = useState(0);
    const [pageInput, setPageInput] = useState('1');
    const [scrollKey, setScrollKey] = useState(0);
    const nextFilters = useRef<{ sort: number; userType: number } | null>(null);
    const catalog = useWiredCatalogRows(roomId, !!page, roomSettings.canInspect);
    const shownPage = page && page.roomId === roomId ? page : null;
    const variable = shownPage ? (catalog.catalog?.get(shownPage.variableId)?.variable ?? null) : null;
    const currentPage = shownPage?.page ?? NO_PAGE;
    const lastPage = shownPage ? calculateLastPage(shownPage.totalEntries, VARIABLE_MANAGEMENT_PAGE_SIZE) : NO_PAGE;

    useMessageEvent<WiredUserVariablesListEvent>(WiredUserVariablesListEvent, (event) => {
        const parser = event.getParser();

        if (event.connection !== GetCommunication().connection || parser.amount !== VARIABLE_MANAGEMENT_PAGE_SIZE || roomId <= 0) return;

        setPage({
            roomId,
            variableId: parser.variableId,
            totalEntries: parser.totalEntries,
            page: parser.page,
            entries: parser.entries,
            userType: parser.userTypeFilter,
            sort: parser.sortFilter
        });
        setUserType(toMenuUserType(parser.userTypeFilter));
        setSort(parser.sortFilter);
        setPageInput(String(parser.page));
        setScrollKey((key) => key + 1);
    });

    useEffect(() => {
        if (page && page.roomId !== roomId) setPage(null);
    }, [page, roomId]);

    const requestWithFilters = (requested: number, nextSort: number, nextUserType: number) => {
        if (!shownPage) return;

        SendMessageComposer(new WiredGetVariableOwnersPageComposer(shownPage.variableId, requested, VARIABLE_MANAGEMENT_PAGE_SIZE, nextSort, nextUserType));
    };

    const requests = useWiredPageRequests({
        currentPage,
        lastPage,
        pageKey: shownPage,
        ratelimit: REQUEST_PAGE_RATELIMIT,
        onRequestPage: (requested) => {
            const filters = nextFilters.current ?? { sort: shownPage?.sort ?? 0, userType: shownPage?.userType ?? -1 };

            requestWithFilters(requested, filters.sort, filters.userType);
        }
    });

    const changeFilters = (nextUserType: number, nextSort: number) => {
        if (!shownPage || !requests.canRequestNewPage(false)) return;

        setUserType(nextUserType);
        setSort(nextSort);
        nextFilters.current = { sort: nextSort, userType: nextUserType };
        requests.requestPage(1);
        nextFilters.current = null;
    };

    if (!shownPage || !variable) return null;

    const navigateToInputPage = () => {
        const clamped = clampInputPage(parseInputPage(pageInput), lastPage);

        setPageInput(String(clamped));

        if (clamped !== currentPage) requests.requestPage(clamped);
    };

    const [pageTextStart, pageTextEnd] = (() => {
        const text = localizeWithFallback('wiredmenu.variable_management.bottom_text', '%entries_count% entries found. Showing page %page% of %page_count%');
        const parts = text.split('%page%');

        if (parts.length !== 2) return ['', ''];

        return [parts[0].replace('%entries_count%', String(shownPage.totalEntries)), parts[1].replace('%page_count%', String(lastPage))];
    })();

    const rows = shownPage.entries.map((entry) => {
        const cell = variableValueCell(variable, entry.value);
        const isHabbo = entry.entityType === ENTITY_TYPE_HABBO;

        return {
            key: `${entry.entityType}-${entry.entityId}`,
            cells: {
                usertype: localizeWithFallback(`wiredfurni.params.usertype.${entry.entityType}`, String(entry.entityType)),
                name: isHabbo ? (
                    <button className="volt-wired-menu__link" title={entry.entityName} type="button" onClick={() => GetUserProfile(entry.entityId)}>
                        {entry.entityName}
                    </button>
                ) : (
                    <span title={entry.entityName}>{entry.entityName}</span>
                ),
                creation_time: <span title={entry.createdText}>{entry.createdText}</span>,
                last_update_time: <span title={entry.updatedText}>{entry.updatedText}</span>,
                value: cell ? (
                    <span className={cell.valueClassName} title={cell.valueTitle ?? cell.value}>
                        {cell.value}
                    </span>
                ) : (
                    ''
                ),
                manage: (
                    <button className="volt-wired-menu__link" type="button" onClick={() => SendMessageComposer(new WiredGetUserPermanentVariablesComposer(entry.entityType, entry.entityId))}>
                        {localizeWithFallback('wiredmenu.variable_management.manage', 'Manage')}
                    </button>
                )
            }
        };
    });

    return (
        <VoltCardView className="volt-wired-manage h-[508px] w-[700px]" frameStyle={3} isResizable={false} theme="primary-slim" uniqueKey="wired-variable-management">
            <VoltCardHeaderView headerText={localizeWithFallback('wiredmenu.variable_management.title', 'Variable Management')} onCloseClick={() => setPage(null)} />
            <div className="volt-wired-manage__client">
                <WiredMenuItem className="volt-wired-manage__box volt-wired-manage__centered-text" h={38} w={603} x={8} y={7}>
                    {INFO_TEXT}
                </WiredMenuItem>
                <WiredMenuTitle h={17} w={88} x={15} y={55}>
                    {localizeWithFallback('wiredmenu.variable_management.variable_name', 'Variable name:')}
                </WiredMenuTitle>
                <WiredMenuText h={17} w={500} x={105} y={55}>
                    {variable.variableName}
                </WiredMenuText>
                <WiredMenuTitle h={17} w={63} x={15} y={83}>
                    {localizeWithFallback('wiredmenu.variable_management.usertype', 'User type:')}
                </WiredMenuTitle>
                <WiredMenuItem h={25} w={131} x={83} y={80}>
                    <div className="volt-wired-menu__dropdown-wrap">
                        <select className="volt-wired-menu__dropdown" value={userType} onChange={(event) => changeFilters(Number(event.target.value), sort)}>
                            {USER_TYPE_OPTIONS.map(([value, key, fallback]) => (
                                <option key={value} value={value}>
                                    {localizeWithFallback(key, fallback)}
                                </option>
                            ))}
                        </select>
                    </div>
                </WiredMenuItem>
                <WiredMenuTitle h={17} w={47} x={247} y={83}>
                    {localizeWithFallback('wiredmenu.variable_management.sort_by', 'Sort by:')}
                </WiredMenuTitle>
                <WiredMenuItem h={25} w={135} x={300} y={80}>
                    <div className="volt-wired-menu__dropdown-wrap">
                        <select className="volt-wired-menu__dropdown" value={sort} onChange={(event) => changeFilters(userType, Number(event.target.value))}>
                            {SORT_OPTIONS.map(([value, fallback]) => (
                                <option key={value} value={value}>
                                    {localizeWithFallback(`wiredmenu.variable_management.sort_by.${value}`, fallback)}
                                </option>
                            ))}
                        </select>
                    </div>
                </WiredMenuItem>
                <WiredMenuButton h={30} w={62} x={621} y={12} onClick={() => requests.refresh()}>
                    {localizeWithFallback('wiredmenu.list_view.refresh', 'Refresh')}
                </WiredMenuButton>
                <WiredMenuTable
                    key={scrollKey}
                    columns={[
                        { key: 'usertype', title: localizeWithFallback('wiredmenu.variable_management.col.usertype', 'User type'), factor: 0.1 },
                        { key: 'name', title: localizeWithFallback('wiredmenu.variable_management.col.name', 'Name'), factor: 0.18 },
                        { key: 'creation_time', title: localizeWithFallback('wiredmenu.variable_management.col.creation_time', 'Creation time'), factor: 0.21 },
                        { key: 'last_update_time', title: localizeWithFallback('wiredmenu.variable_management.col.last_update_time', 'Last update time'), factor: 0.21 },
                        { key: 'value', title: localizeWithFallback('wiredmenu.variable_management.col.value', 'Value'), factor: 0.18 },
                        { key: 'manage', title: localizeWithFallback('wiredmenu.variable_management.col.manage', 'Manage'), factor: 0.12 }
                    ]}
                    emptyText={localizeWithFallback('wiredmenu.table.empty', 'Nothing to display')}
                    h={296}
                    rows={rows}
                    w={672}
                    x={14}
                    y={117}
                />
                <WiredMenuButton disabled={currentPage <= 1} h={30} w={50} x={17} y={429} onClick={() => requests.requestFirstPage()}>
                    <span className="volt-wired-manage__arrow is-left" />
                    <span className="volt-wired-manage__arrow is-left" />
                </WiredMenuButton>
                <WiredMenuButton disabled={currentPage <= 1} h={30} w={50} x={80} y={429} onClick={() => requests.requestPreviousPage()}>
                    <span className="volt-wired-manage__arrow is-left" />
                </WiredMenuButton>
                <WiredMenuItem className="volt-wired-manage__paging-text" h={25} w={226} x={237} y={433}>
                    <span>{pageTextStart}</span>
                    <input
                        aria-label={localizeWithFallback('wiredmenu.variable_management.title', 'Variable Management')}
                        inputMode="numeric"
                        type="text"
                        value={pageInput}
                        onBlur={navigateToInputPage}
                        onChange={(event) => setPageInput(restrictPageInput(event.target.value))}
                        onKeyDown={(event) => {
                            event.stopPropagation();

                            if (event.key === 'Enter') navigateToInputPage();
                        }}
                    />
                    <span>{pageTextEnd}</span>
                </WiredMenuItem>
                <WiredMenuButton disabled={currentPage >= lastPage} h={30} w={50} x={573} y={429} onClick={() => requests.requestNextPage()}>
                    <span className="volt-wired-manage__arrow is-right" />
                </WiredMenuButton>
                <WiredMenuButton disabled={currentPage >= lastPage} h={30} w={50} x={633} y={429} onClick={() => requests.requestLastPage()}>
                    <span className="volt-wired-manage__arrow is-right" />
                    <span className="volt-wired-manage__arrow is-right" />
                </WiredMenuButton>
            </div>
        </VoltCardView>
    );
};
