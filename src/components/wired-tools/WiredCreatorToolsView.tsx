import { IWiredErrorLogEntry, IWiredVariableData } from '@volt/renderer';
import {
    AddLinkEventTracker,
    FigureUpdateEvent,
    FurnitureFloorUpdateEvent,
    FurnitureWallUpdateEvent,
    GetRoomEngine,
    GetSessionDataManager,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RoomControllerLevel,
    RoomObjectCategory,
    RoomObjectType,
    RoomObjectVariable,
    RoomUnitInfoEvent,
    WiredClearErrorLogsComposer,
    WiredDeleteAllVariableHoldersComposer,
    WiredErrorLogsEvent,
    WiredGetErrorLogsComposer,
    WiredGetVariableOwnersPageComposer,
    WiredGetRoomStatsComposer,
    WiredRoomStatsEvent,
} from '@volt/renderer';
import { FC, KeyboardEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    AvatarInfoUtilities,
    createPacketCooldownGate,
    IsTemporaryFurniId,
    LocalizeText,
    localizeWithFallback,
    NotificationAlertType,
    NotificationConfirmType,
    SendMessageComposer,
    WiredSelectionVisualizer
} from '../../api';
import wiredErrorIcon from '../../assets/images/wiredtools/icon_wired_error.png';
import wiredWarningIcon from '../../assets/images/wiredtools/icon_wired_warning.png';
import {
    Button,
    DraggableWindowPosition,
    VoltCardContentView,
    VoltCardHeaderView,
    VoltCardTabsItemView,
    VoltCardTabsView,
    VoltCardView,
    Text
} from '../../common';
import { useMessageEvent, useNotification, useObjectSelectedEvent, useRoom, useWiredCatalogRows, useWiredObjectVariables, useWiredMenuErrors, useWiredTools, useWiredVariableHighlight, WiredObjectHolder, WiredObjectVariableOperation } from '../../hooks';
import { WiredChestsTabView } from './WiredChestsTabView';
import {
    INSPECTION_ELEMENTS,
    TABS,
    VARIABLES_ELEMENTS,
    WIRED_CLOCK_REFRESH_MS,
    WIRED_MONITOR_CLEAR_LOCK_MS,
    WIRED_MONITOR_POLL_MS,
    WIRED_VARIABLE_OVERVIEW_POLL_MS,
    WIRED_VARIABLES_POLL_MS
} from './WiredCreatorTools.constants';
import {
    buildInspectionGiveDefinitions,
    buildInspectionRows,
    buildMonitorLogs,
    formatVariableTimestamp,
    getHotelTimeFormatter,
    parseInspectionInt,
    buildVariablePickerRows,
    buildVariableProperties,
    buildVariableTextValues,
    customVariableItemId,
    isPersistedVariable,
    monitorRoomStatRows,
    VARIABLE_TYPE_CUSTOM,
    VARIABLE_TYPE_INTERNAL
} from './WiredCreatorTools.helpers';
import {
    InspectionElementButton,
    InspectionElementType,
    InspectionFurniSelection,
    InspectionUserSelection,
    InspectionVariable,
    MonitorLog,
    MonitorRoomStats,
    MonitorStat,
    VariablesElementButton,
    VariablesElementType,
    WiredToolsTab
} from './WiredCreatorTools.types';
import { WiredInspectionTabView } from './WiredInspectionTabView';
import { WiredMenuFrame } from './WiredMenuParts';
import { WiredMonitorTabView } from './WiredMonitorTabView';
import { WiredRoomLogsView } from './WiredRoomLogsView';
import { WiredSelfDonationView } from './WiredSelfDonationView';
import { WiredToolsSettingsTabView } from './WiredToolsSettingsTabView';
import { WiredArrayInspectorView, wiredArrayVariableTypeOf } from './WiredArrayInspectorView';
import { useVariablesExplorerStore } from '../../state/variablesExplorer';
import { WiredVariableHighlightBubbles } from './WiredVariableHighlightBubbles';
import { VARIABLE_MANAGEMENT_PAGE_SIZE } from './WiredVariableManagementView';
import { WiredVariablesTabView } from './WiredVariablesTabView';
import { openWiredMenuLink, useWiredCreatorToolsUiStore } from './wiredCreatorToolsUiStore';

/** icon_wired_<category>_png, as the official error view picks it. */
const MONITOR_ERROR_ICONS: Record<string, string> = { ERROR: wiredErrorIcon, WARNING: wiredWarningIcon };

const MENU_HEADER_TITLES: Record<WiredToolsTab, string> = {
    monitor: 'Monitor',
    variables: 'Variable Overview',
    inspection: 'Inspection',
    chests: 'Chests and Transactions',
    settings: 'Settings'
};

export const WiredCreatorToolsView: FC<{}> = () => {
    const openVariablesExplorer = useVariablesExplorerStore((s) => s.open);
    const isVisible = useWiredCreatorToolsUiStore((s) => s.isVisible);
    const setIsVisible = useWiredCreatorToolsUiStore((s) => s.setIsVisible);
    const activeTab = useWiredCreatorToolsUiStore((s) => s.activeTab);
    const setActiveTab = useWiredCreatorToolsUiStore((s) => s.setActiveTab);
    const inspectionType = useWiredCreatorToolsUiStore((s) => s.inspectionType);
    const setInspectionType = useWiredCreatorToolsUiStore((s) => s.setInspectionType);
    const variablesType = useWiredCreatorToolsUiStore((s) => s.variablesType);
    const [keepSelected, setKeepSelected] = useState(false);
    const selectedFurni = useWiredCreatorToolsUiStore((s) => s.selectedFurni);
    const setSelectedFurni = useWiredCreatorToolsUiStore((s) => s.setSelectedFurni);
    const selectedUser = useWiredCreatorToolsUiStore((s) => s.selectedUser);
    const setSelectedUser = useWiredCreatorToolsUiStore((s) => s.setSelectedUser);
    const [globalClock, setGlobalClock] = useState(Date.now());
    const [selectedMonitorError, setSelectedMonitorError] = useState<MonitorLog>(null);
    const isRoomLogsOpen = useWiredCreatorToolsUiStore((s) => s.isRoomLogsOpen);
    const isSelfDonationOpen = useWiredCreatorToolsUiStore((s) => s.isSelfDonationOpen);
    const setIsSelfDonationOpen = useWiredCreatorToolsUiStore((s) => s.setIsSelfDonationOpen);
    const setIsRoomLogsOpen = useWiredCreatorToolsUiStore((s) => s.setIsRoomLogsOpen);
    const editingVariable = useWiredCreatorToolsUiStore((s) => s.editingVariable);
    const setEditingVariable = useWiredCreatorToolsUiStore((s) => s.setEditingVariable);
    const editingValue = useWiredCreatorToolsUiStore((s) => s.editingValue);
    const setEditingValue = useWiredCreatorToolsUiStore((s) => s.setEditingValue);
    const selectedInspectionVariableKeys = useWiredCreatorToolsUiStore((s) => s.selectedInspectionVariableKeys);
    const setSelectedInspectionVariableKeys = useWiredCreatorToolsUiStore((s) => s.setSelectedInspectionVariableKeys);
    const isInspectionGiveOpen = useWiredCreatorToolsUiStore((s) => s.isInspectionGiveOpen);
    const setIsInspectionGiveOpen = useWiredCreatorToolsUiStore((s) => s.setIsInspectionGiveOpen);
    const inspectionGiveVariableId = useWiredCreatorToolsUiStore((s) => s.inspectionGiveVariableId);
    const setInspectionGiveVariableId = useWiredCreatorToolsUiStore((s) => s.setInspectionGiveVariableId);
    const inspectionGiveValue = useWiredCreatorToolsUiStore((s) => s.inspectionGiveValue);
    const setInspectionGiveValue = useWiredCreatorToolsUiStore((s) => s.setInspectionGiveValue);
    const isArrayInspectorOpen = useWiredCreatorToolsUiStore((s) => s.isArrayInspectorOpen);
    const setIsArrayInspectorOpen = useWiredCreatorToolsUiStore((s) => s.setIsArrayInspectorOpen);
    const isVariableHighlightActive = useWiredCreatorToolsUiStore((s) => s.isVariableHighlightActive);
    const setIsVariableHighlightActive = useWiredCreatorToolsUiStore((s) => s.setIsVariableHighlightActive);
    const removedInspectionRowIndexRef = useRef(-1);
    const monitorRequestGateRef = useRef<ReturnType<typeof createPacketCooldownGate> | null>(null);

    if (!monitorRequestGateRef.current) {
        monitorRequestGateRef.current = createPacketCooldownGate();
    }

    const shouldPauseVariableSnapshotRefresh = !!editingVariable || isInspectionGiveOpen;
    const selectedVariableKeys = useWiredCreatorToolsUiStore((s) => s.selectedVariableKeys);
    const setSelectedVariableKeys = useWiredCreatorToolsUiStore((s) => s.setSelectedVariableKeys);
    const { roomSession = null } = useRoom();
    // WiredMenuMonitorTab.isDataReady: the tab stays in its loading state until both the room stats and the error rows arrive. Answers are kept for the
    // room the monitor is viewed in; leaving that room, closing the tab or closing the window clears them, so every opening starts in the loading state.
    const monitorViewKey = isVisible && activeTab === 'monitor' && roomSession?.roomId ? roomSession.roomId : 0;
    const monitorViewKeyRef = useRef(0);
    const [isMonitorClearLocked, setIsMonitorClearLocked] = useState(false);
    const monitorClearLockTimerRef = useRef<number>(0);

    useEffect(() => () => window.clearTimeout(monitorClearLockTimerRef.current), []);

    useLayoutEffect(() =>
    {
        monitorViewKeyRef.current = monitorViewKey;
    });

    const [monitorRoomStatsAnswer, setMonitorRoomStatsAnswer] = useState<{ viewKey: number; stats: MonitorRoomStats } | null>(null);
    const [monitorErrorsAnswer, setMonitorErrorsAnswer] = useState<{ viewKey: number; errors: IWiredErrorLogEntry[] } | null>(null);

    if (monitorRoomStatsAnswer && monitorRoomStatsAnswer.viewKey !== monitorViewKey) setMonitorRoomStatsAnswer(null);
    if (monitorErrorsAnswer && monitorErrorsAnswer.viewKey !== monitorViewKey) setMonitorErrorsAnswer(null);
    const monitorRoomStats = monitorRoomStatsAnswer?.stats ?? null;
    const monitorErrors = monitorErrorsAnswer?.errors ?? null;
    const monitorLoaded = monitorViewKey !== 0 && !!monitorRoomStats && !!monitorErrors;
    const {
        roomSettings,
        requestUserVariables
    } = useWiredTools();
    const { simpleAlert = null, showConfirm = null } = useNotification();
    useWiredMenuErrors();

    const refreshSelectedUser = useCallback(
        (roomIndex: number = selectedUser?.roomIndex) => {
            if (roomIndex === null || roomIndex === undefined || !roomSession) return;

            const userData = roomSession.userDataManager.getUserDataByIndex(roomIndex);

            if (!userData) return;

            const roomObject = GetRoomEngine().getRoomObject(roomSession.roomId, roomIndex, RoomObjectCategory.UNIT);
            const gender = String(userData.sex || roomObject?.model.getValue<string>(RoomObjectVariable.GENDER) || 'U').toUpperCase();
            const isOwnUser = userData.webID === GetSessionDataManager().userId;
            const roomOwnerLevel = isOwnUser
                ? roomSession.controllerLevel
                : Number(roomObject?.model.getValue<number>(RoomObjectVariable.FIGURE_FLAT_CONTROL) ?? 0);
            const hasRights = roomOwnerLevel >= RoomControllerLevel.GUEST;
            const isOwner = (isOwnUser && roomSession.isRoomOwner) || roomOwnerLevel >= RoomControllerLevel.ROOM_OWNER;
            const roomEntryMethod = userData.roomEntryMethod || 'unknown';
            const roomEntryTeleportId = Number(userData.roomEntryTeleportId ?? 0);

            switch (userData.type) {
                case RoomObjectType.USER: {
                    const info = AvatarInfoUtilities.getUserInfo(RoomObjectCategory.UNIT, userData);

                    if (!info) return;

                    setSelectedUser({
                        kind: 'user',
                        roomIndex,
                        name: info.name,
                        figure: info.figure,
                        gender,
                        userId: info.webID,
                        level: isOwnUser ? info.roomControllerLevel : info.targetRoomControllerLevel,
                        achievementScore: info.achievementScore,
                        isHC: isOwnUser && GetSessionDataManager().clubLevel > 0,
                        hasRights,
                        isOwner,
                        favouriteGroupId: info.groupId,
                        roomEntryMethod,
                        roomEntryTeleportId
                    });
                    break;
                }
                case RoomObjectType.BOT: {
                    const info = AvatarInfoUtilities.getBotInfo(RoomObjectCategory.UNIT, userData);

                    if (!info) return;

                    setSelectedUser({
                        kind: 'bot',
                        roomIndex,
                        name: info.name,
                        figure: info.figure,
                        gender,
                        userId: info.webID,
                        level: 0,
                        achievementScore: 0,
                        isHC: false,
                        hasRights: false,
                        isOwner: false,
                        favouriteGroupId: 0,
                        roomEntryMethod,
                        roomEntryTeleportId
                    });
                    break;
                }
                case RoomObjectType.RENTABLE_BOT: {
                    const info = AvatarInfoUtilities.getRentableBotInfo(RoomObjectCategory.UNIT, userData);

                    if (!info) return;

                    setSelectedUser({
                        kind: 'rentable_bot',
                        roomIndex,
                        name: info.name,
                        figure: info.figure,
                        gender,
                        userId: info.webID,
                        level: 0,
                        achievementScore: 0,
                        isHC: false,
                        hasRights: false,
                        isOwner: false,
                        favouriteGroupId: 0,
                        roomEntryMethod,
                        roomEntryTeleportId
                    });
                    break;
                }
                case RoomObjectType.PET:
                    setSelectedUser({
                        kind: 'pet',
                        roomIndex,
                        name: userData.name,
                        figure: userData.figure,
                        gender,
                        userId: userData.webID,
                        level: Number(userData.petLevel ?? 0),
                        achievementScore: 0,
                        isHC: false,
                        hasRights: false,
                        isOwner: false,
                        favouriteGroupId: 0,
                        roomEntryMethod,
                        roomEntryTeleportId,
                        posture: 'std'
                    });
                    break;
            }
        },
        [roomSession, selectedUser?.roomIndex]
    );

    const refreshSelectedFurni = useCallback(
        (objectId: number = selectedFurni?.objectId, category: number = selectedFurni?.category) => {
            if (!objectId && objectId !== 0) return;

            const info = AvatarInfoUtilities.getFurniInfo(objectId, category);

            if (!info) return;

            setSelectedFurni({
                objectId,
                category,
                info
            });
        },
        [selectedFurni?.category, selectedFurni?.objectId]
    );

    useObjectSelectedEvent((event) => {
        if (keepSelected || !roomSession) return;

        if (inspectionType === 'furni' && (event.category === RoomObjectCategory.FLOOR || event.category === RoomObjectCategory.WALL)) {
            refreshSelectedFurni(event.id, event.category);

            return;
        }

        if (inspectionType !== 'user' || event.category !== RoomObjectCategory.UNIT) return;

        refreshSelectedUser(event.id);
    });

    useMessageEvent<WiredErrorLogsEvent>(WiredErrorLogsEvent, (event) => {
        const viewKey = monitorViewKeyRef.current;

        if (viewKey === 0) return;

        setMonitorErrorsAnswer({ viewKey, errors: [...event.getParser().errors] });
    });

    useMessageEvent<WiredRoomStatsEvent>(WiredRoomStatsEvent, (event) => {
        const viewKey = monitorViewKeyRef.current;

        // An answer that arrives after the Monitor tab was left belongs to no view.
        if (viewKey === 0) return;

        const parser = event.getParser();

        setMonitorRoomStatsAnswer({
            viewKey,
            stats: {
                executionCost: parser.executionCost,
                executionCostCap: parser.executionCostCap,
                isHeavy: parser.isHeavy,
                floorItemCount: parser.floorItemCount,
                floorItemCap: parser.floorItemCap,
                wallItemCount: parser.wallItemCount,
                wallItemCap: parser.wallItemCap,
                permanentFurniVariables: parser.permanentFurniVariables,
                maxPermanentFurniVariables: parser.maxPermanentFurniVariables,
                permanentUserVariables: parser.permanentUserVariables,
                maxPermanentUserVariables: parser.maxPermanentUserVariables,
                permanentGlobalVariables: parser.permanentGlobalVariables,
                maxPermanentGlobalVariables: parser.maxPermanentGlobalVariables
            }
        });
    });

    useMessageEvent<FurnitureFloorUpdateEvent>(FurnitureFloorUpdateEvent, (event) => {
        if (!selectedFurni) return;

        const parser = event.getParser();

        if (parser.item.itemId !== selectedFurni.objectId) return;

        refreshSelectedFurni(selectedFurni.objectId, selectedFurni.category);
    });

    useMessageEvent<FurnitureWallUpdateEvent>(FurnitureWallUpdateEvent, (event) => {
        if (!selectedFurni || selectedFurni.category !== RoomObjectCategory.WALL) return;

        const parser = event.getParser();

        if (parser.item.itemId !== selectedFurni.objectId) return;

        refreshSelectedFurni(selectedFurni.objectId, selectedFurni.category);
    });

    useMessageEvent<RoomUnitInfoEvent>(RoomUnitInfoEvent, (event) => {
        if (!selectedUser) return;

        const parser = event.getParser();

        if (parser.unitId !== selectedUser.roomIndex) return;

        refreshSelectedUser(selectedUser.roomIndex);
    });

    useMessageEvent<FigureUpdateEvent>(FigureUpdateEvent, () => {
        if (!selectedUser || selectedUser.kind !== 'user' || !roomSession) return;

        if (selectedUser.roomIndex !== roomSession.ownRoomIndex) return;

        refreshSelectedUser(selectedUser.roomIndex);
    });

    useEffect(() => {
        const shouldTick = isVisible;

        if (!shouldTick) return;

        setGlobalClock(Date.now());

        const interval = window.setInterval(() => setGlobalClock(Date.now()), WIRED_CLOCK_REFRESH_MS);

        return () => window.clearInterval(interval);
    }, [isVisible, activeTab, inspectionType, roomSession?.roomId]);

    useEffect(() => {
        setSelectedMonitorError(null);
    }, [roomSession?.roomId]);

    useEffect(() => {
        if (activeTab === 'monitor') return;

        setSelectedMonitorError(null);
    }, [activeTab]);

    useEffect(() => {
        if (!isVisible) setSelectedMonitorError(null);
    }, [isVisible]);

    const requestMonitorData = useCallback(() => {
        monitorRequestGateRef.current?.request(() => {
            // WiredMenuMonitorTab.requestData: room stats and error rows, on opening and every POLL_MONITOR_MS.
            SendMessageComposer(new WiredGetRoomStatsComposer());
            SendMessageComposer(new WiredGetErrorLogsComposer());
        });
    }, []);

    useEffect(() => {
        if (!isVisible || activeTab !== 'monitor' || !roomSession?.roomId) return;

        requestMonitorData();

        const interval = window.setInterval(requestMonitorData, WIRED_MONITOR_POLL_MS);

        return () => window.clearInterval(interval);
    }, [isVisible, activeTab, roomSession?.roomId, requestMonitorData]);

    useEffect(() => {
        // The wired editors read the Volt variable snapshot, kept fresh while the menu is open.
        if (!isVisible || !roomSession?.roomId || !roomSettings.canInspect || shouldPauseVariableSnapshotRefresh) return;

        requestUserVariables();

        const interval = window.setInterval(requestUserVariables, WIRED_VARIABLES_POLL_MS);

        return () => window.clearInterval(interval);
    }, [isVisible, roomSession?.roomId, roomSettings.canInspect, requestUserVariables, shouldPauseVariableSnapshotRefresh]);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setActiveTab('monitor');
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => {
                            const nextValue = !prevValue;

                            if (nextValue) setActiveTab('monitor');

                            return nextValue;
                        });
                        return;
                    case 'invalid':
                        if (simpleAlert)
                            simpleAlert(
                                LocalizeText('wiredmenu.invalid_room.desc'),
                                NotificationAlertType.ALERT,
                                null,
                                null,
                                LocalizeText('generic.alert.title')
                            );
                        return;
                    case 'inspection':
                        if (parts.length > 3) {
                            switch (parts[2]) {
                                case 'furni': {
                                    const objectId = parseInt(parts[3], 10);
                                    const category = parseInt(parts[4] ?? '-1', 10);

                                    if (Number.isInteger(objectId) && Number.isInteger(category)) {
                                        setInspectionType('furni');
                                        refreshSelectedFurni(objectId, category);
                                        setActiveTab('inspection');
                                        setIsVisible(true);
                                    }
                                    return;
                                }
                                case 'user': {
                                    const roomIndex = parseInt(parts[3], 10);

                                    if (Number.isInteger(roomIndex)) {
                                        setInspectionType('user');
                                        refreshSelectedUser(roomIndex);
                                        setActiveTab('inspection');
                                        setIsVisible(true);
                                    }
                                    return;
                                }
                            }
                        }
                        return;
                    case 'tab':
                        if (parts.length > 2) {
                            const tab = parts[2] as WiredToolsTab;

                            if (TABS.some((entry) => entry.key === tab)) setActiveTab(tab);
                        }
                        setIsVisible(true);
                        return;
                }
            },
            eventUrlPrefix: 'wired-tools/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [refreshSelectedFurni, refreshSelectedUser, simpleAlert]);

    useEffect(() => {
        if (!isVisible || !roomSession?.roomId || !roomSettings.isLoaded || roomSettings.canInspect) return;

        setIsVisible(false);
    }, [isVisible, roomSession?.roomId, roomSettings.isLoaded, roomSettings.canInspect]);

    const previewPlaceholder = useMemo(() => {
        switch (inspectionType) {
            case 'furni':
                return 'Select a furni';
            case 'user':
                return 'Select a user';
            default:
                return 'Nothing to display';
        }
    }, [inspectionType]);
    const monitorStats = useMemo<MonitorStat[]>(() => monitorRoomStatRows(monitorLoaded ? monitorRoomStats : null), [monitorLoaded, monitorRoomStats]);
    const monitorLogs = useMemo<MonitorLog[]>(() => (monitorLoaded ? buildMonitorLogs(monitorErrors, globalClock) : []), [monitorLoaded, monitorErrors, globalClock]);
    // AIR InfoStandWidgetHandler.as:1118-1124 sends a wall item as -id. This server reads a negative furni id only for a temporary
    // wall item and finds every other wall item by its own id.
    const selectedFurniWireId =
        selectedFurni?.category === RoomObjectCategory.WALL && IsTemporaryFurniId(selectedFurni.objectId) ? -selectedFurni.objectId : (selectedFurni?.objectId ?? 0);
    const inspectionHolder = useMemo<WiredObjectHolder | null>(() => {
        switch (inspectionType) {
            case 'global':
                return { type: -10, objectId: 0 };
            case 'user':
                return selectedUser ? { type: 1, objectId: selectedUser.roomIndex } : null;
            default:
                return selectedFurni ? { type: 0, objectId: selectedFurniWireId } : null;
        }
    }, [inspectionType, selectedUser, selectedFurni, selectedFurniWireId]);
    const objectVariables = useWiredObjectVariables(roomSession?.roomId ?? 0, inspectionHolder, isVisible && activeTab === 'inspection', roomSettings.canInspect);
    const canWriteInspection = roomSettings.canModify;
    const displayedVariables = useMemo(
        () =>
            objectVariables.values && objectVariables.catalog ? buildInspectionRows(objectVariables.values, objectVariables.catalog, canWriteInspection) : [],
        [objectVariables.values, objectVariables.catalog, canWriteInspection]
    );
    const selectedInspectionVariableKey = selectedInspectionVariableKeys[inspectionType] ?? '';
    const selectedInspectionVariable = displayedVariables.find((variable) => variable.key === selectedInspectionVariableKey) ?? null;
    const availableInspectionDefinitions = useMemo(
        () =>
            inspectionHolder && inspectionHolder.type !== -10 && objectVariables.values && objectVariables.catalog
                ? buildInspectionGiveDefinitions(inspectionHolder.type, objectVariables.values, objectVariables.catalog)
                : [],
        [inspectionHolder, objectVariables.values, objectVariables.catalog]
    );
    const selectedInspectionGiveDefinition =
        availableInspectionDefinitions.find((definition) => definition.variableId === inspectionGiveVariableId) ??
        availableInspectionDefinitions.find((definition) => definition.available) ??
        null;
    // AIR WiredMenuInspectionTab.updateButtonsUI: write permission, data shown, and not the room.
    const canGiveInspectionVariable = canWriteInspection && inspectionType !== 'global' && !!objectVariables.values;
    const canRemoveInspectionVariable = canGiveInspectionVariable && !!selectedInspectionVariable?.removable;
    const canCreateInspectionVariable = canGiveInspectionVariable && !!selectedInspectionGiveDefinition?.available;
    const variableCatalog = useWiredCatalogRows(roomSession?.roomId ?? 0, isVisible, roomSettings.canInspect);
    const variablesByType = useMemo<Record<VariablesElementType, IWiredVariableData[]>>(
        () => ({
            furni: buildVariablePickerRows(variableCatalog.catalog, 'furni'),
            user: buildVariablePickerRows(variableCatalog.catalog, 'user'),
            global: buildVariablePickerRows(variableCatalog.catalog, 'global'),
            context: buildVariablePickerRows(variableCatalog.catalog, 'context')
        }),
        [variableCatalog.catalog]
    );
    // AIR WIN63-202610121709-785561319 identifies a variable of the overview by its name (VariableTableObject.identifier), and so do menu links.
    const variableNamesByType = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(variablesByType).map(([type, variables]) => [type, variables.map((variable) => ({ key: variable.variableName }))])
            ) as Record<VariablesElementType, { key: string }[]>,
        [variablesByType]
    );
    // AIR WIN63-202610121709-785561319 WiredMenuOverviewTab.update: while the tab is open the catalogue is asked for every 500 ms; the request itself waits 800 ms.
    useEffect(() => {
        if (!isVisible || activeTab !== 'variables') return;

        const interval = window.setInterval(variableCatalog.refresh, WIRED_VARIABLE_OVERVIEW_POLL_MS);

        return () => window.clearInterval(interval);
    }, [isVisible, activeTab, variableCatalog.refresh]);
    // AIR WIN63-202610121709-785561319 WiredMenuOverviewTab.jumpToVariableByName: a link that arrives before the catalogue is kept until the catalogue is there.
    const pendingMenuLinkRef = useRef<string | null>(null);
    useEffect(() => {
        if (!isVisible) pendingMenuLinkRef.current = null;
    }, [isVisible]);
    useEffect(() => {
        pendingMenuLinkRef.current = null;
    }, [roomSession?.roomId]);
    useEffect(() => {
        if (!variableCatalog.ready || pendingMenuLinkRef.current === null) return;

        openWiredMenuLink(pendingMenuLinkRef.current, variableNamesByType);
        pendingMenuLinkRef.current = null;
    }, [variableCatalog.ready, variableNamesByType]);

    useEffect(() => {
        const nativeLinkTracker: ILinkEventTracker = {
            eventUrlPrefix: 'wiredmenu/',
            linkReceived: url => {
                // AIR WiredMenuController.as:154-158: without read permission every menu link only alerts.
                if (!roomSettings.canInspect) {
                    simpleAlert?.(LocalizeText('wiredmenu.invalid_room.desc'), NotificationAlertType.ALERT, null, null, LocalizeText('wiredmenu.invalid_room.title'));
                    return;
                }
                openWiredMenuLink(url, variableNamesByType);
                pendingMenuLinkRef.current = !variableCatalog.ready && url.startsWith('wiredmenu/open/variable_overview/') ? url : null;
            }
        };
        AddLinkEventTracker(nativeLinkTracker);
        return () => RemoveLinkEventTracker(nativeLinkTracker);
    }, [variableNamesByType, variableCatalog.ready, roomSettings.canInspect, simpleAlert]);


    useEffect(() => {
        // Closing the menu drops the catalogue; the selection is kept until a catalogue is there again.
        if (!variableCatalog.ready) return;

        setSelectedVariableKeys((prevValue) => {
            let didChange = false;
            const nextValue = { ...prevValue };

            for (const type of ['furni', 'user', 'global', 'context'] as VariablesElementType[]) {
                const definitions = variableNamesByType[type];

                if (!definitions.length) {
                    if (nextValue[type] !== '') {
                        nextValue[type] = '';
                        didChange = true;
                    }

                    continue;
                }

                if (!definitions.some((definition) => definition.key === nextValue[type])) {
                    nextValue[type] = definitions[0].key;
                    didChange = true;
                }
            }

            return didChange ? nextValue : prevValue;
        });
    }, [variableCatalog.ready, variableNamesByType]);

    const selectedVariable = useMemo(() => {
        const variables = variablesByType[variablesType];
        const selectedKey = selectedVariableKeys[variablesType];

        return variables.find((variable) => variable.variableName === selectedKey) ?? variables[0] ?? null;
    }, [variablesByType, variablesType, selectedVariableKeys]);
    const selectedVariableItemId = selectedVariable ? customVariableItemId(selectedVariable) : null;
    const selectedVariableProperties = useMemo(() => buildVariableProperties(selectedVariable), [selectedVariable]);
    const selectedVariableTextValues = useMemo(() => buildVariableTextValues(selectedVariable), [selectedVariable]);
    // AIR WIN63-202610121709-785561319 WiredMenuOverviewTab.canHighlightCurrentVariable.
    const canVariableHighlight =
        !!selectedVariable &&
        !selectedVariable.requiresExecutionContext &&
        selectedVariable.variableType !== VARIABLE_TYPE_INTERNAL &&
        (variablesType === 'user' || variablesType === 'furni') &&
        !!roomSession;
    useWiredVariableHighlight(
        roomSession,
        isVariableHighlightActive && canVariableHighlight ? selectedVariable : null,
        () => setIsVariableHighlightActive(false)
    );
    useEffect(() => {
        if (isVisible && activeTab === 'variables' && canVariableHighlight) return;

        setIsVariableHighlightActive(false);
    }, [activeTab, canVariableHighlight, isVisible]);
    // AIR WiredMenuOverviewTab.canManageCurrentVariable.
    const canVariableManage =
        !!selectedVariable && !selectedVariable.requiresExecutionContext && variablesType === 'user' && isPersistedVariable(selectedVariable);
    // AIR WiredMenuOverviewTab.canDeleteCurrentVariable.
    const canVariableClear =
        roomSettings.canModify &&
        !!selectedVariable &&
        selectedVariable.canCreateAndDelete &&
        isPersistedVariable(selectedVariable) &&
        selectedVariable.variableType === VARIABLE_TYPE_CUSTOM &&
        (variablesType === 'user' || variablesType === 'furni');
    const confirmClearVariable = () => {
        if (!canVariableClear || !showConfirm) return;
        const variableId = selectedVariable.variableId;

        showConfirm(
            localizeWithFallback(
                'wiredmenu.variable_overview.delete_all.desc',
                'Are you sure you want to clear this variable? All users/furni that hold this variable will lose it. This action cannot be undone'
            ),
            () => {
                setIsVariableHighlightActive(false);
                SendMessageComposer(new WiredDeleteAllVariableHoldersComposer(variableId));
            },
            null,
            LocalizeText('generic.ok'),
            LocalizeText('generic.cancel'),
            localizeWithFallback('wiredmenu.variable_overview.delete_all.title', 'Clear this variable'),
            NotificationConfirmType.DANGER
        );
    };
    const clearMonitorLogs = () => {
        // updateButtonsUI: Clear is disabled for CLEAR_LOGS_TIMEOUT after it was pressed.
        setIsMonitorClearLocked(true);
        window.clearTimeout(monitorClearLockTimerRef.current);
        monitorClearLockTimerRef.current = window.setTimeout(() => setIsMonitorClearLocked(false), WIRED_MONITOR_CLEAR_LOCK_MS);
        SendMessageComposer(new WiredClearErrorLogsComposer());
    };

    const beginVariableEdit = (variable: InspectionVariable) => {
        if (!variable.editable) return;

        setEditingVariable(variable.key);
        setEditingValue(String(variable.rawValue));
    };

    const cancelVariableEdit = () => {
        setEditingVariable(null);
        setEditingValue('');
    };

    const commitVariableEdit = () => {
        const variable = displayedVariables.find((entry) => entry.key === editingVariable);
        const value = parseInspectionInt(editingValue);

        if (variable?.editable && value !== null) objectVariables.write(variable.target, variable.key, value, WiredObjectVariableOperation.WRITE);

        cancelVariableEdit();
    };

    const openGiveInspectionVariable = () => {
        // AIR refreshes the variable catalogue before it opens the picker.
        if (!isInspectionGiveOpen) objectVariables.refreshCatalog();

        setIsInspectionGiveOpen((value) => !value);
    };

    const giveInspectionVariable = () => {
        const definition = selectedInspectionGiveDefinition;

        if (!canCreateInspectionVariable || !definition) return;

        // AIR int(text): text that is not a number creates the variable with 0.
        const value = definition.hasValue ? (parseInspectionInt(inspectionGiveValue) ?? 0) : 0;

        objectVariables.write(definition.target, definition.variableId, value, WiredObjectVariableOperation.CREATE);
        setSelectedInspectionVariableKeys((prev) => ({ ...prev, [inspectionType]: definition.variableId }));
        setInspectionGiveValue('0');
        setIsInspectionGiveOpen(false);
    };

    const removeInspectionVariable = () => {
        const variable = selectedInspectionVariable;

        if (!canRemoveInspectionVariable || !variable) return;

        cancelVariableEdit();
        removedInspectionRowIndexRef.current = displayedVariables.indexOf(variable);
        objectVariables.write(variable.target, variable.key, 0, WiredObjectVariableOperation.DELETE);
        setIsInspectionGiveOpen(false);
    };

    const onVariableInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        const input = event.currentTarget;

        switch (event.key) {
            case 'Enter':
            case 'NumpadEnter':
                event.preventDefault();
                commitVariableEdit();
                window.requestAnimationFrame(() => input.blur());
                return;
            case 'Escape':
                event.preventDefault();
                cancelVariableEdit();
                window.requestAnimationFrame(() => input.blur());
                return;
        }
    };
    useEffect(() => {
        setEditingVariable(null);
        setEditingValue('');
    }, [selectedFurni?.objectId, selectedUser?.roomIndex, inspectionType]);
    useEffect(() => {
        if (!displayedVariables.length) {
            if (selectedInspectionVariableKey) {
                setSelectedInspectionVariableKeys((prev) => ({ ...prev, [inspectionType]: '' }));
            }

            return;
        }

        if (displayedVariables.some((variable) => variable.key === selectedInspectionVariableKey)) return;

        // AIR WiredMenuInspectionTab.as:471-481 selects the row at the removed row's index.
        const index = Math.min(Math.max(removedInspectionRowIndexRef.current, 0), displayedVariables.length - 1);

        removedInspectionRowIndexRef.current = -1;
        setSelectedInspectionVariableKeys((prev) => ({ ...prev, [inspectionType]: displayedVariables[index].key }));
    }, [displayedVariables, inspectionType, selectedInspectionVariableKey]);
    useEffect(() => {
        setIsInspectionGiveOpen(false);
        setInspectionGiveValue('0');
    }, [inspectionType, selectedUser?.userId, selectedFurni?.objectId]);

    const [wiredBoxHighlight, setWiredBoxHighlight] = useState<{ furniId: number; boxIds: readonly number[] } | null>(null);
    const canHighlightWiredBoxes = inspectionType === 'furni' && !!selectedFurni && objectVariables.configuredInWireds.length > 0;
    const isHighlightingWiredBoxes = wiredBoxHighlight !== null;
    const toggleWiredBoxHighlight = useCallback(() => {
        setWiredBoxHighlight((current) =>
            current || !selectedFurni || !objectVariables.configuredInWireds.length ? null : { furniId: selectedFurniWireId, boxIds: objectVariables.configuredInWireds }
        );
    }, [selectedFurni, selectedFurniWireId, objectVariables.configuredInWireds]);
    useEffect(() => {
        if (!wiredBoxHighlight) return;
        if (isVisible && activeTab === 'inspection' && inspectionType === 'furni' && selectedFurni && selectedFurniWireId === wiredBoxHighlight.furniId) return;

        setWiredBoxHighlight(null);
    }, [wiredBoxHighlight, isVisible, activeTab, inspectionType, selectedFurni, selectedFurniWireId]);
    useEffect(() => {
        if (!wiredBoxHighlight) return;

        const objects = wiredBoxHighlight.boxIds.map((objectId) => ({ category: RoomObjectCategory.FLOOR, objectId }));

        WiredSelectionVisualizer.applyVariableHighlightToObjects(objects);

        return () => WiredSelectionVisualizer.clearVariableHighlightFromObjects(objects);
    }, [wiredBoxHighlight]);

    if (!isVisible) return null;

    return (
        <>
            <WiredVariableHighlightBubbles />
            {/* Official wired_menu_view: frame 3, 500x500. The tab bodies are this hotel's, so taller ones may grow it. */}
            <WiredMenuFrame
                activeTab={activeTab}
                headerTitle={MENU_HEADER_TITLES[activeTab]}
                tabs={TABS}
                title={
                    activeTab === 'monitor' && !monitorLoaded
                        ? localizeWithFallback('wiredmenu.title.loading', 'Wired Creator Tools - Loading')
                        : localizeWithFallback('wiredmenu.title', 'Wired Creator Tools (:wired)')
                }
                onClose={() => setIsVisible(false)}
                onTabChange={(tab) => setActiveTab(tab as WiredToolsTab)}
            >
                {(
                    <>
                    {activeTab === 'monitor' && (
                        <WiredMonitorTabView loading={!monitorLoaded} canClear={roomSettings.canModify && !isMonitorClearLocked} canOpenLogs={roomSettings.canInspect}
                            monitorStats={monitorStats}
                            monitorLogs={monitorLogs}
                            onOpenRoomLogs={() => setIsRoomLogsOpen(true)}
                            onClearMonitorLogs={clearMonitorLogs}
                            onOpenMonitorErrorInfo={setSelectedMonitorError}
                        />
                    )}
                    {activeTab === 'inspection' && (
                        <WiredInspectionTabView
                            selectedFurni={selectedFurni}
                            selectedUser={selectedUser}
                            roomId={roomSession?.roomId ?? null}
                            previewPlaceholder={previewPlaceholder}
                            keepSelected={keepSelected}
                            onKeepSelectedChange={setKeepSelected}
                            canHighlightWiredBoxes={canHighlightWiredBoxes}
                            isHighlightingWiredBoxes={isHighlightingWiredBoxes}
                            onToggleWiredBoxHighlight={toggleWiredBoxHighlight}
                            displayedVariables={displayedVariables}
                            selectedInspectionVariableKey={selectedInspectionVariableKey}
                            onSelectInspectionVariable={(variable) => {
                                setSelectedInspectionVariableKeys((prev) => ({ ...prev, [inspectionType]: variable.key }));
                                beginVariableEdit(variable);
                            }}
                            onCancelVariableEdit={cancelVariableEdit}
                            onVariableInputKeyDown={onVariableInputKeyDown}
                            onBeginVariableEdit={(variable) => {
                                setSelectedInspectionVariableKeys((prev) => ({ ...prev, [inspectionType]: variable.key }));
                                beginVariableEdit(variable);
                            }}
                            selectedInspectionGiveDefinition={selectedInspectionGiveDefinition}
                            onSelectGiveVariable={setInspectionGiveVariableId}
                            availableInspectionDefinitions={availableInspectionDefinitions}
                            inspectionGiveValue={inspectionGiveValue}
                            onInspectionGiveValueChange={setInspectionGiveValue}
                            canGiveInspectionVariable={canGiveInspectionVariable}
                            onOpenGiveInspectionVariable={openGiveInspectionVariable}
                            canCreateInspectionVariable={canCreateInspectionVariable}
                            onGiveInspectionVariable={giveInspectionVariable}
                            canRemoveInspectionVariable={canRemoveInspectionVariable}
                            onRemoveInspectionVariable={removeInspectionVariable}
                        />
                    )}
                    {activeTab === 'variables' && (
                        <WiredVariablesTabView
                            variablePickerDefinitions={variableNamesByType[variablesType]}
                            selectedVariableDefinition={selectedVariable ? { key: selectedVariable.variableName } : null}
                            onPickVariable={(key) => setSelectedVariableKeys((prev) => ({ ...prev, [variablesType]: key }))}
                            canVariableHighlight={canVariableHighlight}
                            variableManageCanOpen={canVariableManage}
                            canVariableClear={canVariableClear}
                            onClearVariable={confirmClearVariable}
                            onOpenManagePanel={() => {
                                if (canVariableManage)
                                    SendMessageComposer(new WiredGetVariableOwnersPageComposer(selectedVariable.variableId, 1, VARIABLE_MANAGEMENT_PAGE_SIZE, 0, -1));
                            }}
                            arrayInspectorCanOpen={selectedVariableItemId !== null}
                            onOpenArrayInspector={() => setIsArrayInspectorOpen(true)}
                            selectedVariableProperties={selectedVariableProperties}
                            selectedVariableTextValues={selectedVariableTextValues}
                            onOpenWebApiExplorer={() => openVariablesExplorer({ roomId: roomSession?.roomId })}
                        />
                    )}
                    {activeTab === 'settings' && <WiredToolsSettingsTabView onOpenSelfDonation={() => setIsSelfDonationOpen(true)} />}
                    {activeTab === 'chests' && <WiredChestsTabView />}
                    </>
                )}
            </WiredMenuFrame>
            {isArrayInspectorOpen && selectedVariableItemId !== null && !!selectedVariable && (
                <WiredArrayInspectorView
                    definitionItemId={selectedVariableItemId}
                    variableName={selectedVariable.variableName}
                    variableType={wiredArrayVariableTypeOf(variablesType)}
                    onClose={() => setIsArrayInspectorOpen(false)}
                />
            )}
            {isRoomLogsOpen && <WiredRoomLogsView onClose={() => setIsRoomLogsOpen(false)} />}
            {isSelfDonationOpen && <WiredSelfDonationView onClose={() => setIsSelfDonationOpen(false)} />}
            {!!selectedMonitorError && (
                // Official error_info_view: 337 wide, frame 3, contents at (8, 3) and height = contents + 48.
                <VoltCardView
                    className="w-[337px]"
                    frameStyle={3}
                    isResizable={false}
                    theme="primary-slim"
                    uniqueKey="wired-monitor-error-info"
                    windowPosition={DraggableWindowPosition.TOP_LEFT}
                    offsetLeft={660}
                    offsetTop={120}
                >
                    <VoltCardHeaderView
                        headerText={localizeWithFallback('wiredmenu.error_info.title', 'Wired Error Information')}
                        onCloseClick={() => setSelectedMonitorError(null)}
                    />
                    <div className="relative mb-[6px] ml-[5px] mt-[3px] min-h-[100px] w-[320px] text-black">
                        {!!MONITOR_ERROR_ICONS[selectedMonitorError.category.toUpperCase()] && (
                            <img alt="" className="absolute right-0 top-0 size-[40px]" src={MONITOR_ERROR_ICONS[selectedMonitorError.category.toUpperCase()]} />
                        )}
                        <Text bold className="absolute left-[109px] top-[11px] whitespace-nowrap">
                            {selectedMonitorError.type}
                        </Text>
                        <div className="w-[319px] whitespace-pre-line pt-[46px]">
                            <Text>
                                {/* WiredErrorInfoView.initialize: an id without a text shows an empty body. */}
                                {localizeWithFallback(`wiredmenu.error_info.${selectedMonitorError.errorId}`, '').replace(/\\n/g, '\n')}
                            </Text>
                        </div>
                    </div>
                </VoltCardView>
            )}
        </>
    );
};
