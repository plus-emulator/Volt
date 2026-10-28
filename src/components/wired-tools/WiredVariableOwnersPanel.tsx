import { IWiredVariableHolder } from '@volt/renderer';
import { ReactNode, useEffect, useState } from 'react';
import { localizeWithFallback } from '../../api';
import { DraggableWindowPosition, VoltCardHeaderView, VoltCardView } from '../../common';
import { HabboDropMenuView } from '../../common/dropmenu/HabboDropMenuView';
import { WiredMenuLabel } from '../../common/native-text/WiredMenuLabel';
import { WiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
import { VariablesElementType } from './WiredCreatorTools.types';
import { WiredMenuButton, WiredMenuItem, WiredMenuTable, WiredMenuTableColumn, WiredMenuText, WiredMenuTitle } from './WiredMenuParts';
import { WiredMenuHtmlText } from './WiredMenuHtmlText';
import { WiredMenuPagingFooter } from './WiredMenuPaging';
import { useTextWindowWidth } from './useTextWindowWidth';

/** The server's holder kinds (`entityType`). */
export const HOLDER_TYPE_ROOM = 0;
export const HOLDER_TYPE_USER = 1;
export const HOLDER_TYPE_FURNI = 2;

export interface WiredHolderDescription {
    categoryLabel: string;
    entityName: string;
}

export interface WiredOwnersFilter {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}

export interface WiredVariableOwnersPanelProps<T extends number | bigint = number> {
    variableName: string;
    variablesType: VariablesElementType;
    hasValue: boolean;
    holders: IWiredVariableHolder<T>[];
    describeHolder: (entityType: number, entityId: number, entityName: string) => WiredHolderDescription;
    currentPage: number;
    totalEntries: number;
    lastPage: number;
    requests: WiredPageRequests;
    scrollResetKey: number;
    /** The user type menu; holders without one show only the sort menu. */
    typeFilter?: WiredOwnersFilter;
    sortFilter: WiredOwnersFilter;
    onManage: (holder: IWiredVariableHolder<T>) => void;
    /** Adds a delete link column after "Manage". */
    onDelete?: (holder: IWiredVariableHolder<T>) => void;
    /** Turns user names into profile links. */
    onOpenUserProfile?: (entityId: number) => void;
    onClose: () => void;
    infoText?: string;
    status?: ReactNode;
    uniqueKey?: string;
    offsetLeft?: number;
    offsetTop?: number;
}

/** variables_management_overview: a 700x508 frame 3 window whose client starts 33 px down; it resizes in height between 380 and 700. */
const WINDOW_WIDTH = 700;
/** The info html window: auto size "center", leading 1. */
const INFO_LINE_HEIGHT = 15;
/** The layout's own caption of the info window; the overview never replaces it. */
const LAYOUT_INFO_TEXT =
    'This is a tool to manage all users that hold a permanent variable.\nFor variables that are shared with other rooms, there is a possible 20 second synchronization delay.';
const KEY_VALUE_SPACING = 2;

/**
 * The "Variable Management" window (AIR VariableManagementOverviewView): who holds a variable, a page at a time, with the user type and
 * sort menus, refresh and a "Manage" link per holder. It shows what it is handed; the caller fetches.
 */
export const WiredVariableOwnersPanel = <T extends number | bigint = number>(props: WiredVariableOwnersPanelProps<T>) => {
    const {
        variableName,
        variablesType,
        hasValue,
        holders,
        describeHolder,
        currentPage,
        totalEntries,
        lastPage,
        requests,
        scrollResetKey,
        typeFilter,
        sortFilter,
        onManage,
        onDelete,
        onOpenUserProfile,
        onClose,
        infoText = LAYOUT_INFO_TEXT,
        status = null,
        uniqueKey = 'wired-variable-management',
        offsetLeft = 540,
        offsetTop = 60
    } = props;
    const [selectedKey, setSelectedKey] = useState<string>(null);
    const [tableArea, setTableArea] = useState<HTMLDivElement>(null);
    const [tableHeight, setTableHeight] = useState(0);
    const variableNameLabel = localizeWithFallback('wiredmenu.variable_management.variable_name', 'Variable name:');
    const variableNameWidth = useTextWindowWidth(variableNameLabel, 'u_bold');

    // The middle container stretches with the window height; the table view fills it.
    useEffect(() => {
        if (!tableArea) return;

        const observer = new ResizeObserver(() => setTableHeight(tableArea.clientHeight));
        observer.observe(tableArea);

        return () => observer.disconnect();
    }, [tableArea]);

    const typeHeader = (() => {
        switch (variablesType) {
            case 'furni':
                return localizeWithFallback('wiredmenu.variable_management.col.furnitype', 'Furni type');
            case 'global':
                return localizeWithFallback('wiredmenu.variable_management.col.scope', 'Scope');
            default:
                return localizeWithFallback('wiredmenu.variable_management.col.usertype', 'User type');
        }
    })();

    const columns: WiredMenuTableColumn[] = [
        { key: 'type', title: typeHeader, factor: 0.1 },
        { key: 'name', title: localizeWithFallback('wiredmenu.variable_management.col.name', 'Name'), factor: 0.18 },
        { key: 'creation_time', title: localizeWithFallback('wiredmenu.variable_management.col.creation_time', 'Creation time'), factor: 0.21 },
        { key: 'last_update_time', title: localizeWithFallback('wiredmenu.variable_management.col.last_update_time', 'Last update time'), factor: 0.21 },
        { key: 'value', title: localizeWithFallback('wiredmenu.variable_management.col.value', 'Value'), factor: onDelete ? 0.12 : 0.18 },
        { key: 'manage', title: localizeWithFallback('wiredmenu.variable_management.col.manage', 'Manage'), factor: 0.12 },
        ...(onDelete ? [{ key: 'delete', title: '', factor: 0.06 }] : [])
    ];
    const manageLabel = localizeWithFallback('wiredmenu.variable_management.manage', 'Manage');
    const deleteLabel = localizeWithFallback('wiredmenu.variable_management.delete', 'Delete');

    const rows = holders.map((holder) => {
        const key = `${holder.entityType}-${holder.entityId}`;
        const description = describeHolder(holder.entityType, holder.entityId, holder.entityName);
        const isUserLink = holder.entityType === HOLDER_TYPE_USER && holder.entityId > 0 && !!onOpenUserProfile;

        return {
            key,
            selected: selectedKey === key,
            onSelect: () => setSelectedKey(key),
            cells: {
                type: description.categoryLabel,
                name: description.entityName,
                creation_time: holder.storage.creationTimeStr,
                last_update_time: holder.storage.lastUpdateTimeStr,
                value: hasValue ? String(holder.storage.value) : '',
                manage: manageLabel,
                delete: deleteLabel
            },
            cellTitles: { name: description.entityName },
            links: {
                ...(isUserLink ? { name: () => onOpenUserProfile(holder.entityId) } : {}),
                manage: () => onManage(holder),
                ...(onDelete ? { delete: () => onDelete(holder) } : {})
            }
        };
    });

    // A filter container: its bold key text at (0,3) and the drop menu at (menuX,0).
    const filterMenu = (filter: WiredOwnersFilter, x: number, labelWidth: number, menuX: number, menuWidth: number) => (
        <>
            <WiredMenuTitle h={17} w={labelWidth} x={x} y={83}>
                {filter.label}
            </WiredMenuTitle>
            <HabboDropMenuView
                nativeCaption
                label={filter.label}
                options={filter.options}
                skinStyle={3}
                style={{ position: 'absolute', left: x + menuX, top: 80, width: menuWidth, height: 25 }}
                value={filter.value}
                onSelect={filter.onChange}
            />
        </>
    );

    return (
        <VoltCardView
            className="volt-wired-varmanage"
            frameStyle={3}
            offsetLeft={offsetLeft}
            offsetTop={offsetTop}
            resizeAxis="vertical"
            theme="primary-slim"
            uniqueKey={uniqueKey}
            windowPosition={DraggableWindowPosition.TOP_LEFT}
        >
            <VoltCardHeaderView headerText="" onCloseClick={onClose}>
                <WiredMenuLabel
                    align="center"
                    className="volt-wired-menu__caption"
                    color={0xffffff}
                    text={localizeWithFallback('wiredmenu.variable_management.title', 'Variable Management')}
                    textStyle="u_frame_title"
                    width={WINDOW_WIDTH - 14}
                />
            </VoltCardHeaderView>
            <div className="volt-wired-varmanage__client">
                <WiredMenuItem className="volt-wired-varmanage__box" h={38} w={603} x={8} y={7}>
                    <WiredMenuHtmlText lineHeight={INFO_LINE_HEIGHT} style={{ left: 1, top: 3 }} text={infoText} width={600} />
                </WiredMenuItem>
                <WiredMenuButton h={30} w={62} x={621} y={12} onClick={() => requests.refresh()}>
                    {localizeWithFallback('wiredmenu.list_view.refresh', 'Refresh')}
                </WiredMenuButton>
                <WiredMenuTitle h={17} w={88} x={15} y={55}>
                    {variableNameLabel}
                </WiredMenuTitle>
                {variableNameWidth !== null && (
                    <WiredMenuText h={17} w={300} x={15 + variableNameWidth + KEY_VALUE_SPACING} y={55}>
                        {variableName}
                    </WiredMenuText>
                )}
                {!!status && (
                    <WiredMenuItem h={20} w={215} x={470} y={55}>
                        {status}
                    </WiredMenuItem>
                )}
                {!!typeFilter && filterMenu(typeFilter, 15, 63, 68, 131)}
                {filterMenu(sortFilter, 247, 47, 53, 135)}
                <div ref={setTableArea} className="volt-wired-varmanage__middle">
                    {tableHeight > 0 && (
                        <WiredMenuTable key={scrollResetKey} columns={columns} h={tableHeight} rows={rows} w={672} x={13} y={0} />
                    )}
                </div>
                <WiredMenuPagingFooter
                    center={{ x: 237, startText: 'X entries found. Showing page ', startWidth: 175, endText: 'of Y', endWidth: 26 }}
                    className="volt-wired-varmanage__paging"
                    currentPage={currentPage}
                    lastPage={lastPage}
                    requests={requests}
                    template={localizeWithFallback(
                        'wiredmenu.variable_management.bottom_text',
                        '%entries_count% entries found. Showing page %page% of %page_count%'
                    )}
                    totalEntries={totalEntries}
                    width={WINDOW_WIDTH}
                />
            </div>
        </VoltCardView>
    );
};
