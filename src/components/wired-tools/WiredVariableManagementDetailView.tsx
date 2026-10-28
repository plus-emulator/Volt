import {
    GetCommunication,
    IWiredVariableData,
    WiredGetUserPermanentVariablesComposer,
    WiredSetUserPermanentVariableComposer,
    WiredSetUserPermanentVariableResultEvent,
    WiredUserPermanentVariablesEvent,
    WiredUserPermanentVariablesParser
} from '@volt/renderer';
import { KeyboardEvent, MouseEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { GetUserProfile, localizeWithFallback, NotificationBubbleType, SendMessageComposer } from '../../api';
import { LayoutAvatarImageView, LayoutPetImageView, VoltCardHeaderView, VoltCardView } from '../../common';
import { useMessageEvent, useNotification, useRoom, useWiredCatalogRows, useWiredToolsState } from '../../hooks';
import { compareVariables, isPersistedVariable, parseInspectionInt, variableValueCell } from './WiredCreatorTools.helpers';
import { WiredMenuButton, WiredMenuItem, WiredMenuPanel, WiredMenuTable, WiredMenuTitle } from './WiredMenuParts';

const ENTITY_TYPE_HABBO = 1;
const ENTITY_TYPE_PET = 2;
const ENTITY_TYPE_BOT = 4;
const VARIABLE_TARGET_USER = 1;
const INFO_TEXTS: Record<number, [string, string]> = {
    [ENTITY_TYPE_HABBO]: ['wiredmenu.variable_management_detail.info.user', 'User type: Habbo\\nName: %name%\\nUser id: %id%'],
    [ENTITY_TYPE_PET]: ['wiredmenu.variable_management_detail.info.pet', 'User type: Pet\\nName: %name%\\nPet id: %id%\\nOwner name: %owner_name%\\nOwner id: %owner_id%'],
    [ENTITY_TYPE_BOT]: ['wiredmenu.variable_management_detail.info.bot', 'User type: Bot\\nName: %name%\\nBot id: %id%\\nOwner name: %owner_name%\\nOwner id: %owner_id%']
};

interface HolderData {
    roomId: number;
    entityType: number;
    entityId: number;
    entityName: string;
    entityFigure: string;
    ownerId: number;
    ownerName: string;
    values: ReadonlyMap<string, number>;
}

const toHolderData = (roomId: number, parser: WiredUserPermanentVariablesParser): HolderData => ({
    roomId,
    entityType: parser.entityType,
    entityId: parser.entityId,
    entityName: parser.entityName,
    entityFigure: parser.entityFigure,
    ownerId: parser.ownerId,
    ownerName: parser.ownerName,
    values: new Map(parser.variables.map((entry) => [entry.variableId, entry.value]))
});

const holderInfoText = (holder: HolderData): string => {
    const text = INFO_TEXTS[holder.entityType];

    if (!text) return '';

    return localizeWithFallback(text[0], text[1])
        .replace(/\\n/g, '\n')
        .replace('%name%', holder.entityName)
        .replace('%id%', String(holder.entityId))
        .replace('%owner_name%', holder.ownerName)
        .replace('%owner_id%', String(holder.ownerId));
};

/**
 * The Manage User Variables window: the permanent variables of one user, pet or bot. It opens when the server sends them and
 * updates every time it sends them again, which it does after each change.
 */
export const WiredVariableManagementDetailView = () => {
    const { roomSession = null } = useRoom();
    const { roomSettings } = useWiredToolsState();
    const { showSingleBubble = null } = useNotification();
    const roomId = roomSession?.roomId ?? 0;
    const canModify = roomSettings.canModify;
    const [holder, setHolder] = useState<HolderData | null>(null);
    const [selectedId, setSelectedId] = useState('');
    const [editingId, setEditingId] = useState('');
    const [editingValue, setEditingValue] = useState('');
    const [isGiveOpen, setIsGiveOpen] = useState(false);
    const [giveId, setGiveId] = useState('');
    const [giveValue, setGiveValue] = useState('0');
    const [scrollKey, setScrollKey] = useState(0);
    const giveBubbleRef = useRef<HTMLDivElement>(null);
    const giveButtonRef = useRef<HTMLDivElement>(null);
    const catalog = useWiredCatalogRows(roomId, !!holder, roomSettings.canInspect);
    const shownHolder = holder && holder.roomId === roomId ? holder : null;

    useMessageEvent<WiredUserPermanentVariablesEvent>(WiredUserPermanentVariablesEvent, (event) => {
        if (event.connection !== GetCommunication().connection || roomId <= 0) return;

        setHolder(toHolderData(roomId, event.getParser()));
        setEditingId('');
        setScrollKey((key) => key + 1);
    });

    useMessageEvent<WiredSetUserPermanentVariableResultEvent>(WiredSetUserPermanentVariableResultEvent, (event) => {
        if (event.connection !== GetCommunication().connection || event.getParser().success) return;

        showSingleBubble?.(
            localizeWithFallback('wiredmenu.variable_management_detail.notification.modification_failed', 'Variable modification failed'),
            NotificationBubbleType.INFO
        );
    });

    useEffect(() => {
        if (holder && holder.roomId !== roomId) setHolder(null);
    }, [holder, roomId]);

    if (!shownHolder || !catalog.catalog) return null;

    const variables: IWiredVariableData[] = [];

    for (const variableId of shownHolder.values.keys()) {
        const variable = catalog.catalog.get(variableId)?.variable;

        if (variable && !variable.isInvisible) variables.push(variable);
    }

    variables.sort(compareVariables);

    const selectedVariable = variables.find((variable) => variable.variableId === selectedId) ?? null;
    const giveOptions = [...catalog.catalog.values()]
        .map((entry) => entry.variable)
        .filter(
            (variable) =>
                variable.variableTarget === VARIABLE_TARGET_USER &&
                !variable.isInvisible &&
                variable.canCreateAndDelete &&
                isPersistedVariable(variable) &&
                !shownHolder.values.has(variable.variableId)
        )
        .sort(compareVariables);
    const giveVariable = giveOptions.find((variable) => variable.variableId === giveId) ?? null;

    const send = (variableId: string, value: number, action: number) =>
        SendMessageComposer(new WiredSetUserPermanentVariableComposer(shownHolder.entityType, shownHolder.entityId, variableId, value, action));

    const commitEdit = (variable: IWiredVariableData) => {
        const value = parseInspectionInt(editingValue);

        setEditingId('');

        if (!canModify || !variable.hasValue || !variable.canWriteValue || value === null) return;

        send(variable.variableId, value, WiredSetUserPermanentVariableComposer.SET_VALUE);
    };

    const onEditKeyDown = (event: KeyboardEvent<HTMLInputElement>, variable: IWiredVariableData) => {
        event.stopPropagation();

        if (event.key === 'Enter' || event.key === 'NumpadEnter') {
            event.preventDefault();
            commitEdit(variable);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setEditingId('');
        }
    };

    const removeVariable = () => {
        if (!canModify || !selectedVariable?.canCreateAndDelete) return;

        send(selectedVariable.variableId, 0, WiredSetUserPermanentVariableComposer.DELETE);
    };

    const toggleGive = () => {
        if (!isGiveOpen) {
            catalog.refresh();
            setGiveId('');
        }

        setIsGiveOpen(!isGiveOpen);
    };

    const createVariable = () => {
        if (!giveVariable) return;

        send(giveVariable.variableId, giveVariable.hasValue ? (parseInspectionInt(giveValue) ?? 0) : 0, WiredSetUserPermanentVariableComposer.CREATE);
        setIsGiveOpen(false);
        setGiveValue('0');
    };

    const closeGiveOnClickAway = (event: MouseEvent) => {
        if (!isGiveOpen) return;

        const target = event.target as Node;

        if (giveBubbleRef.current?.contains(target) || giveButtonRef.current?.contains(target)) return;

        setIsGiveOpen(false);
    };

    const isHabbo = shownHolder.entityType === ENTITY_TYPE_HABBO;

    const rows = variables.map((variable) => {
        const value = shownHolder.values.get(variable.variableId) ?? 0;
        const cell = variableValueCell(variable, value);
        const editable = !!cell?.editable && canModify && variable.canWriteValue;
        let valueContent: ReactNode = '';

        if (editingId === variable.variableId) {
            valueContent = (
                <input
                    autoFocus
                    className="volt-wired-menu__cell-input"
                    spellCheck={false}
                    type="text"
                    value={editingValue}
                    onBlur={() => setEditingId('')}
                    onChange={(event) => setEditingValue(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDownCapture={(event) => onEditKeyDown(event, variable)}
                />
            );
        } else if (cell && editable) {
            valueContent = (
                <button
                    className={`volt-wired-menu__link ${cell.valueClassName ?? ''}`}
                    title={cell.valueTitle}
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(variable.variableId);
                        setEditingId(variable.variableId);
                        setEditingValue(String(value));
                    }}
                >
                    {cell.value}
                </button>
            );
        } else if (cell) {
            valueContent = (
                <span className={cell.valueClassName} title={cell.valueTitle}>
                    {cell.value}
                </span>
            );
        }

        return {
            key: variable.variableId,
            selected: variable.variableId === selectedId,
            onSelect: () => setSelectedId(variable.variableId),
            cells: { variable: variable.variableName, value: valueContent }
        };
    });

    return (
        <VoltCardView className="volt-wired-manage h-[512px] w-[339px]" frameStyle={3} isResizable={false} theme="primary-slim" uniqueKey="wired-variable-management-detail">
            <VoltCardHeaderView headerText={localizeWithFallback('wiredmenu.variable_management_detail.title', 'Manage User Variables')} onCloseClick={() => setHolder(null)} />
            <div className="volt-wired-manage__client" onMouseDownCapture={closeGiveOnClickAway}>
                <WiredMenuItem className="volt-wired-manage__box volt-wired-manage__centered-text" h={57} w={228} x={18} y={7}>
                    {localizeWithFallback('wiredmenu.variable_management_detail.info', 'Use this tool to see and change the permanent variables of a user.')}
                </WiredMenuItem>
                <WiredMenuButton h={30} w={62} x={259} y={20} onClick={() => SendMessageComposer(new WiredGetUserPermanentVariablesComposer(shownHolder.entityType, shownHolder.entityId))}>
                    {localizeWithFallback('wiredmenu.list_view.refresh', 'Refresh')}
                </WiredMenuButton>
                <WiredMenuTitle h={19} w={188} x={18} y={73}>
                    {localizeWithFallback('wiredmenu.variable_management_detail.holder_info', 'Holder info:')}
                </WiredMenuTitle>
                <WiredMenuPanel className={`volt-wired-manage__preview ${isHabbo ? 'is-clickable' : ''}`} h={94} w={94} x={18} y={93}>
                    <div className="volt-wired-menu__preview-image" onClick={isHabbo ? () => GetUserProfile(shownHolder.entityId) : undefined}>
                        {shownHolder.entityType === ENTITY_TYPE_PET ? (
                            <LayoutPetImageView direction={2} figure={shownHolder.entityFigure} />
                        ) : (
                            <LayoutAvatarImageView direction={2} figure={shownHolder.entityFigure} headOnly={true} />
                        )}
                    </div>
                </WiredMenuPanel>
                <WiredMenuItem className="volt-wired-manage__box" h={94} w={194} x={127} y={93}>
                    <div className="volt-wired-manage__info-text" style={{ position: 'absolute', left: 6, top: 6, width: 182, height: 80 }}>
                        {holderInfoText(shownHolder)}
                    </div>
                </WiredMenuItem>
                <WiredMenuTitle h={19} w={188} x={18} y={196}>
                    {localizeWithFallback('wiredmenu.variable_management_detail.variables', 'Permanent variables:')}
                </WiredMenuTitle>
                <WiredMenuTable
                    key={scrollKey}
                    columns={[
                        { key: 'variable', title: localizeWithFallback('wiredmenu.inspection.variables.variable', 'Variable'), factor: 0.65, align: 'left' },
                        { key: 'value', title: localizeWithFallback('wiredmenu.inspection.variables.value', 'Value'), factor: 0.35, align: 'right' }
                    ]}
                    emptyText={localizeWithFallback('wiredmenu.table.empty', 'Nothing to display')}
                    h={211}
                    rows={rows}
                    w={303}
                    x={18}
                    y={216}
                />
                <WiredMenuButton disabled={!canModify || !selectedVariable?.canCreateAndDelete} h={25} w={145} x={18} y={436} onClick={removeVariable}>
                    {localizeWithFallback('wiredmenu.inspection.delete', 'Remove variable')}
                </WiredMenuButton>
                <div ref={giveButtonRef}>
                    <WiredMenuButton disabled={!canModify} h={25} w={145} x={176} y={436} onClick={toggleGive}>
                        {localizeWithFallback('wiredmenu.inspection.add', 'Give variable')}
                    </WiredMenuButton>
                </div>
                {isGiveOpen && (
                    <div ref={giveBubbleRef}>
                        <WiredMenuItem className="volt-wired-menu__bubble" h={145} w={186} x={140} y={291}>
                            <WiredMenuTitle h={17} w={158} x={6} y={6}>
                                {localizeWithFallback('wiredmenu.inspection.select_variable', 'Variable:')}
                            </WiredMenuTitle>
                            <WiredMenuItem h={22} w={158} x={6} y={26}>
                                <div className="volt-wired-menu__dropdown-wrap">
                                    <select className="volt-wired-menu__dropdown" value={giveVariable?.variableId ?? ''} onChange={(event) => setGiveId(event.target.value)}>
                                        <option value="" />
                                        {giveOptions.map((variable) => (
                                            <option key={variable.variableId} value={variable.variableId}>
                                                {variable.variableName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </WiredMenuItem>
                            <WiredMenuTitle h={17} w={158} x={6} y={52}>
                                {localizeWithFallback('wiredmenu.inspection.select_value', 'Value:')}
                            </WiredMenuTitle>
                            <WiredMenuItem className="volt-wired-menu__value-box" h={22} w={80} x={6} y={72}>
                                <input
                                    disabled={!!giveVariable && !giveVariable.hasValue}
                                    type="text"
                                    value={giveValue}
                                    onChange={(event) => setGiveValue(event.target.value.replace(/[^0-9-]/g, ''))}
                                    onKeyDown={(event) => event.stopPropagation()}
                                />
                            </WiredMenuItem>
                            <WiredMenuButton disabled={!giveVariable} h={25} w={158} x={6} y={100} onClick={createVariable}>
                                {localizeWithFallback('wiredmenu.inspection.create', 'Create')}
                            </WiredMenuButton>
                        </WiredMenuItem>
                    </div>
                )}
            </div>
        </VoltCardView>
    );
};
