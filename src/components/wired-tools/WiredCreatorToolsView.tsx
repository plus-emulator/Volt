import { IWiredVariableData, parseWiredInt64 } from '@volt/renderer';
import {
    AddLinkEventTracker,
    FigureUpdateEvent,
    FurnitureFloorUpdateEvent,
    FurnitureWallUpdateEvent,
    GetRoomEngine,
    GetSessionDataManager,
    GetStage,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RoomControllerLevel,
    RoomObjectCategory,
    RoomObjectType,
    RoomObjectVariable,
    RoomUnitInfoEvent,
    WiredMonitorDataEvent,
    WiredMonitorRequestComposer,
} from '@volt/renderer';
import { FC, KeyboardEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    AddAnimationTickerCallback,
    AvatarInfoUtilities,
    createPacketCooldownGate,
    GetRoomObjectBounds,
    GetRoomObjectScreenLocation,
    IsOwnerOfFloorFurniture,
    IsTemporaryFurniId,
    LocalizeText,
    localizeWithFallback,
    NotificationAlertType,
    decodeUserVariableHolder,
    findUserVariableHolderData,
    SendMessageComposer,
    WiredSelectionVisualizer
} from '../../api';
import wiredErrorIcon from '../../assets/images/wiredtools/icon_wired_error.png';
import wiredWarningIcon from '../../assets/images/wiredtools/icon_wired_warning.png';
import wiredGlobalPlaceholderImage from '../../assets/images/wiredtools/wired_global_placeholder.png';
import wiredMonitorImage from '../../assets/images/wiredtools/wired_monitor.png';
import {
    Button,
    DraggableWindowPosition,
    LayoutAvatarImageView,
    LayoutPetImageView,
    LayoutRoomObjectImageView,
    VoltCardContentView,
    VoltCardHeaderView,
    VoltCardTabsItemView,
    VoltCardTabsView,
    VoltCardView,
    Text
} from '../../common';
import { useMessageEvent, useNotification, useObjectSelectedEvent, useRoom, useWiredCatalogRows, useWiredObjectVariables, useWiredTools, useWiredVariableHolders, WiredObjectHolder, WiredObjectVariableOperation } from '../../hooks';
import { WiredChestsTabView } from './WiredChestsTabView';
import {
    INSPECTION_ELEMENTS,
    MONITOR_COLOR_GREEN,
    MONITOR_COLOR_ORANGE,
    MONITOR_ERROR_INFO,
    MONITOR_STAT_CAPTIONS,
    TABS,
    VARIABLES_ELEMENTS,
    WIRED_CLOCK_REFRESH_MS,
    WIRED_MONITOR_ACTION_CLEAR_LOGS,
    WIRED_MONITOR_ACTION_FETCH,
    WIRED_MONITOR_CLEAR_LOCK_MS,
    WIRED_MONITOR_POLL_MS,
    WIRED_VARIABLE_OVERVIEW_POLL_MS,
    WIRED_VARIABLES_POLL_MS
} from './WiredCreatorTools.constants';
import {
    colorizeMonitorStat,
    formatMonitorHistoryOccurrence,
    formatMonitorLatestOccurrence,
    formatMonitorSource,
    buildInspectionGiveDefinitions,
    buildInspectionRows,
    formatVariableTimestamp,
    getHotelTimeFormatter,
    normalizeMonitorReason,
    parseInspectionInt,
    buildVariablePickerRows,
    buildVariableProperties,
    buildVariableTextValues,
    customVariableItemId,
    isPersistedVariable,
    VARIABLE_TARGET_OF_TYPE,
    VARIABLE_TYPE_CUSTOM,
    VARIABLE_TYPE_INTERNAL
} from './WiredCreatorTools.helpers';
import {
    InspectionElementButton,
    InspectionElementType,
    InspectionFurniSelection,
    InspectionUserSelection,
    InspectionVariable,
    ManagedHolderVariableEntry,
    MonitorLog,
    MonitorStat,
    VariableHighlightOverlay,
    VariableHighlightTarget,
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
import { HOLDER_TYPE_FURNI, HOLDER_TYPE_USER, WiredHolderDescription, WiredVariableOwnersView } from './WiredVariableOwnersView';
import { useVariablesExplorerStore } from '../../state/variablesExplorer';
import { WiredVariableHolderPanelView } from './WiredVariableHolderPanelView';
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
    const monitorSnapshot = useWiredCreatorToolsUiStore((s) => s.monitorSnapshot);
    const setMonitorSnapshot = useWiredCreatorToolsUiStore((s) => s.setMonitorSnapshot);
    const resetMonitorSnapshot = useWiredCreatorToolsUiStore((s) => s.resetMonitorSnapshot);
    const [selectedMonitorError, setSelectedMonitorError] = useState<{ type: string; category: string }>(null);
    const isMonitorHistoryOpen = useWiredCreatorToolsUiStore((s) => s.isMonitorHistoryOpen);
    const setIsMonitorHistoryOpen = useWiredCreatorToolsUiStore((s) => s.setIsMonitorHistoryOpen);
    const isRoomLogsOpen = useWiredCreatorToolsUiStore((s) => s.isRoomLogsOpen);
    const isSelfDonationOpen = useWiredCreatorToolsUiStore((s) => s.isSelfDonationOpen);
    const setIsSelfDonationOpen = useWiredCreatorToolsUiStore((s) => s.setIsSelfDonationOpen);
    const setIsRoomLogsOpen = useWiredCreatorToolsUiStore((s) => s.setIsRoomLogsOpen);
    const isMonitorInfoOpen = useWiredCreatorToolsUiStore((s) => s.isMonitorInfoOpen);
    const setIsMonitorInfoOpen = useWiredCreatorToolsUiStore((s) => s.setIsMonitorInfoOpen);
    const monitorHistorySeverityFilter = useWiredCreatorToolsUiStore((s) => s.monitorHistorySeverityFilter);
    const setMonitorHistorySeverityFilter = useWiredCreatorToolsUiStore((s) => s.setMonitorHistorySeverityFilter);
    const monitorHistoryTypeFilter = useWiredCreatorToolsUiStore((s) => s.monitorHistoryTypeFilter);
    const setMonitorHistoryTypeFilter = useWiredCreatorToolsUiStore((s) => s.setMonitorHistoryTypeFilter);
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
    const isVariableManageOpen = useWiredCreatorToolsUiStore((s) => s.isVariableManageOpen);
    const setIsVariableManageOpen = useWiredCreatorToolsUiStore((s) => s.setIsVariableManageOpen);
    const isArrayInspectorOpen = useWiredCreatorToolsUiStore((s) => s.isArrayInspectorOpen);
    const setIsArrayInspectorOpen = useWiredCreatorToolsUiStore((s) => s.setIsArrayInspectorOpen);
    const selectedManagedVariableEntry = useWiredCreatorToolsUiStore((s) => s.selectedManagedVariableEntry);
    const setSelectedManagedVariableEntry = useWiredCreatorToolsUiStore((s) => s.setSelectedManagedVariableEntry);
    const selectedManagedHolderVariableId = useWiredCreatorToolsUiStore((s) => s.selectedManagedHolderVariableId);
    const setSelectedManagedHolderVariableId = useWiredCreatorToolsUiStore((s) => s.setSelectedManagedHolderVariableId);
    const editingManagedHolderVariableId = useWiredCreatorToolsUiStore((s) => s.editingManagedHolderVariableId);
    const setEditingManagedHolderVariableId = useWiredCreatorToolsUiStore((s) => s.setEditingManagedHolderVariableId);
    const editingManagedHolderValue = useWiredCreatorToolsUiStore((s) => s.editingManagedHolderValue);
    const setEditingManagedHolderValue = useWiredCreatorToolsUiStore((s) => s.setEditingManagedHolderValue);
    const isManagedGiveOpen = useWiredCreatorToolsUiStore((s) => s.isManagedGiveOpen);
    const setIsManagedGiveOpen = useWiredCreatorToolsUiStore((s) => s.setIsManagedGiveOpen);
    const managedGiveVariableItemId = useWiredCreatorToolsUiStore((s) => s.managedGiveVariableItemId);
    const setManagedGiveVariableItemId = useWiredCreatorToolsUiStore((s) => s.setManagedGiveVariableItemId);
    const managedGiveValue = useWiredCreatorToolsUiStore((s) => s.managedGiveValue);
    const setManagedGiveValue = useWiredCreatorToolsUiStore((s) => s.setManagedGiveValue);
    const isVariableHighlightActive = useWiredCreatorToolsUiStore((s) => s.isVariableHighlightActive);
    const setIsVariableHighlightActive = useWiredCreatorToolsUiStore((s) => s.setIsVariableHighlightActive);
    const variableHighlightOverlays = useWiredCreatorToolsUiStore((s) => s.variableHighlightOverlays);
    const setVariableHighlightOverlays = useWiredCreatorToolsUiStore((s) => s.setVariableHighlightOverlays);
    const removedInspectionRowIndexRef = useRef(-1);
    const variableHighlightObjectsRef = useRef<Array<{ category: number; objectId: number }>>([]);
    const monitorRequestGateRef = useRef<ReturnType<typeof createPacketCooldownGate> | null>(null);

    if (!monitorRequestGateRef.current) {
        monitorRequestGateRef.current = createPacketCooldownGate();
    }

    const shouldPauseVariableSnapshotRefresh = !!editingVariable || !!editingManagedHolderVariableId || isInspectionGiveOpen || isManagedGiveOpen;
    const selectedVariableKeys = useWiredCreatorToolsUiStore((s) => s.selectedVariableKeys);
    const setSelectedVariableKeys = useWiredCreatorToolsUiStore((s) => s.setSelectedVariableKeys);
    const { roomSession = null } = useRoom();
    // WiredMenuMonitorTab.isDataReady: the tab stays in its loading state until the server answers. The answer is remembered for the room the monitor is
    // being viewed in; leaving that room, closing the tab or closing the window clears it, so every opening or room change starts in the loading state again.
    const monitorViewKey = isVisible && activeTab === 'monitor' && roomSession?.roomId ? roomSession.roomId : 0;
    const [monitorLoadedKey, setMonitorLoadedKey] = useState(0);
    const monitorViewKeyRef = useRef(0);
    const [isMonitorClearLocked, setIsMonitorClearLocked] = useState(false);
    const monitorClearLockTimerRef = useRef<number>(0);

    useEffect(() => () => window.clearTimeout(monitorClearLockTimerRef.current), []);
    const monitorLoaded = monitorViewKey !== 0 && monitorLoadedKey === monitorViewKey;

    useLayoutEffect(() =>
    {
        monitorViewKeyRef.current = monitorViewKey;
    });

    // Any change of the viewed room (A -> B -> A included) or closing the tab starts a new view: the loading state returns until an answer arrives for it.
    if (monitorLoadedKey !== 0 && monitorLoadedKey !== monitorViewKey) setMonitorLoadedKey(0);
    const {
        roomSettings,
        clearVariableForAllHolders,
        userVariableDefinitions,
        userVariableAssignments,
        furniVariableDefinitions,
        furniVariableAssignments,
        roomVariableDefinitions,
        roomVariableAssignments,
        requestUserVariables,
        assignUserVariable,
        removeUserVariable,
        updateUserVariableValue,
        assignFurniVariable,
        removeFurniVariable,
        updateFurniVariableValue,
        updateRoomVariableValue
    } = useWiredTools();
    const { simpleAlert = null, showConfirm = null } = useNotification();

    const getVariableAvailabilityLabel = (value: number, targetType: 'user' | 'furni' | 'global' | 'context'): string => {
        if (targetType === 'context') return 'Current wired execution';

        if (value === 11) {
            const localizedValue = LocalizeText('wiredfurni.params.variables.availability.11');

            return localizedValue && localizedValue !== 'wiredfurni.params.variables.availability.11' ? localizedValue : 'Permanent, shared between rooms';
        }

        if (value === 10) return 'Permanent';

        return targetType === 'furni' || targetType === 'global' ? 'While the room is active' : 'While the user is in the room';
    };

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

    useMessageEvent<WiredMonitorDataEvent>(WiredMonitorDataEvent, (event) => {
        const parser = event.getParser();

        setMonitorSnapshot({
            usageCurrentWindow: Number(parser.usageCurrentWindow ?? 0),
            usageLimitPerWindow: Number(parser.usageLimitPerWindow ?? 0),
            isHeavy: !!parser.isHeavy,
            delayedEventsPending: Number(parser.delayedEventsPending ?? 0),
            delayedEventsLimit: Number(parser.delayedEventsLimit ?? 0),
            averageExecutionMs: Number(parser.averageExecutionMs ?? 0),
            peakExecutionMs: Number(parser.peakExecutionMs ?? 0),
            recursionDepthCurrent: Number(parser.recursionDepthCurrent ?? 0),
            recursionDepthLimit: Number(parser.recursionDepthLimit ?? 0),
            killedRemainingSeconds: Number(parser.killedRemainingSeconds ?? 0),
            usageWindowMs: Number(parser.usageWindowMs ?? 0),
            overloadAverageThresholdMs: Number(parser.overloadAverageThresholdMs ?? 0),
            overloadPeakThresholdMs: Number(parser.overloadPeakThresholdMs ?? 0),
            heavyUsageThresholdPercent: Number(parser.heavyUsageThresholdPercent ?? 0),
            heavyConsecutiveWindowsThreshold: Number(parser.heavyConsecutiveWindowsThreshold ?? 0),
            overloadConsecutiveWindowsThreshold: Number(parser.overloadConsecutiveWindowsThreshold ?? 0),
            heavyDelayedThresholdPercent: Number(parser.heavyDelayedThresholdPercent ?? 0),
            logs: [...(parser.logs ?? [])],
            history: [...(parser.history ?? [])]
        });
        setMonitorLoadedKey(monitorViewKeyRef.current);
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
        resetMonitorSnapshot();
        setSelectedMonitorError(null);
        setIsMonitorHistoryOpen(false);
        setIsMonitorInfoOpen(false);
        setMonitorHistorySeverityFilter('ALL');
        setMonitorHistoryTypeFilter('ALL');
    }, [roomSession?.roomId]);

    useEffect(() => {
        if (activeTab === 'monitor') return;

        setSelectedMonitorError(null);
        setIsMonitorHistoryOpen(false);
        setIsMonitorInfoOpen(false);
    }, [activeTab]);

    useEffect(() => {
        if (!isVisible) setSelectedMonitorError(null);
    }, [isVisible]);

    const requestMonitorSnapshot = useCallback(() => {
        monitorRequestGateRef.current?.request(() => {
            SendMessageComposer(new WiredMonitorRequestComposer(WIRED_MONITOR_ACTION_FETCH));
        });
    }, []);

    useEffect(() => {
        if (!isVisible || activeTab !== 'monitor' || !roomSession?.roomId) return;

        requestMonitorSnapshot();

        const interval = window.setInterval(requestMonitorSnapshot, WIRED_MONITOR_POLL_MS);

        return () => window.clearInterval(interval);
    }, [isVisible, activeTab, roomSession?.roomId, requestMonitorSnapshot]);

    useEffect(() => {
        // The per-holder panel still reads the Volt variable snapshot; nothing else in the menu does.
        if (!isVisible || !selectedManagedVariableEntry || !roomSession?.roomId || !roomSettings.canInspect || shouldPauseVariableSnapshotRefresh) return;

        requestUserVariables();

        const interval = window.setInterval(requestUserVariables, WIRED_VARIABLES_POLL_MS);

        return () => window.clearInterval(interval);
    }, [isVisible, selectedManagedVariableEntry, roomSession?.roomId, roomSettings.canInspect, requestUserVariables, shouldPauseVariableSnapshotRefresh]);

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

    const selectedMonitorErrorInfo = useMemo(() => {
        if (!selectedMonitorError) return null;

        return MONITOR_ERROR_INFO[selectedMonitorError.type] ?? null;
    }, [selectedMonitorError]);
    const monitorRoomStats = useMemo(() => {
        if (!roomSession) {
            return {
                roomFurniCount: 0,
                roomItemLimit: 0,
                wallFurniCount: 0,
                permanentFurniVariables: 0
            };
        }

        const roomId = roomSession.roomId;
        const floorObjects = GetRoomEngine().getRoomObjects(roomId, RoomObjectCategory.FLOOR);
        const wallObjects = GetRoomEngine().getRoomObjects(roomId, RoomObjectCategory.WALL);

        return {
            roomFurniCount: floorObjects.length + wallObjects.length,
            roomItemLimit: Number(roomSession.roomItemLimit ?? 0),
            wallFurniCount: wallObjects.length,
            permanentFurniVariables: [...floorObjects, ...wallObjects].reduce((total, roomObject) => {
                if (!roomObject) return total;

                const customVariables = roomObject.model.getValue<string[]>(RoomObjectVariable.FURNITURE_CUSTOM_VARIABLES);

                return total + (customVariables?.length ?? 0);
            }, 0)
        };
    }, [roomSession, globalClock]);
    const monitorHistoryTypeOptions = useMemo(() => {
        return ['ALL', ...new Set(monitorSnapshot.history.map((entry) => entry.type))];
    }, [monitorSnapshot.history]);
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
    const monitorStats = useMemo<MonitorStat[]>(() => {
        // WiredMenuMonitorTab.updateRoomStatsUI rows. Until the room stats arrive the html fields keep their
        // layout captions, so the values stay empty. This server reports no permanent user/global variable
        // counts; those two rows keep their caption only.
        if (!monitorLoaded) return MONITOR_STAT_CAPTIONS.map((label) => ({ label, value: '' }));

        const floorFurniCount = monitorRoomStats.roomFurniCount - monitorRoomStats.wallFurniCount;
        const usageColor = colorizeMonitorStat(monitorSnapshot.usageCurrentWindow, monitorSnapshot.usageLimitPerWindow, 0.3, 0.7);

        return [
            { label: MONITOR_STAT_CAPTIONS[0], value: `${monitorSnapshot.usageCurrentWindow}/${Math.max(0, monitorSnapshot.usageLimitPerWindow)}`, color: usageColor },
            {
                label: MONITOR_STAT_CAPTIONS[1],
                value: monitorSnapshot.isHeavy ? localizeWithFallback('wiredmenu.bool.yes', 'Yes') : localizeWithFallback('wiredmenu.bool.no', 'No'),
                color: monitorSnapshot.isHeavy ? MONITOR_COLOR_ORANGE : MONITOR_COLOR_GREEN
            },
            // AIR colours these rows from WiredRoomStatsData (server counts and separate floor/wall caps). The monitor packet carries neither, and the room's
            // single item limit from the guest room data is not that per-category cap, so the client-side counts are shown without a cap or a colour.
            { label: MONITOR_STAT_CAPTIONS[2], value: `${floorFurniCount}` },
            { label: MONITOR_STAT_CAPTIONS[3], value: `${monitorRoomStats.wallFurniCount}` },
            { label: MONITOR_STAT_CAPTIONS[4], value: `${monitorRoomStats.permanentFurniVariables}` },
            { label: MONITOR_STAT_CAPTIONS[5], value: '' },
            { label: MONITOR_STAT_CAPTIONS[6], value: '' },
            // Volt's executor metrics, not part of the official list: kept after the official rows.
            { label: 'Delayed events', value: `${monitorSnapshot.delayedEventsPending}/${Math.max(0, monitorSnapshot.delayedEventsLimit)}` },
            { label: 'Average execution', value: `${monitorSnapshot.averageExecutionMs}ms` },
            { label: 'Peak execution', value: `${monitorSnapshot.peakExecutionMs}ms` },
            { label: 'Recursion', value: `${monitorSnapshot.recursionDepthCurrent}/${Math.max(0, monitorSnapshot.recursionDepthLimit)}` },
            { label: 'Killed remaining', value: `${Math.max(0, monitorSnapshot.killedRemainingSeconds)}s` }
        ];
    }, [monitorLoaded, monitorRoomStats, monitorSnapshot]);
    // ErrorDataTableObject rows: exactly the errors the server lists, none while loading.
    const monitorLogs = useMemo<MonitorLog[]>(() => {
        if (!monitorLoaded) return [];

        return monitorSnapshot.logs.map((log) => {
            const amount = Number(log?.amount ?? 0);

            return {
                type: log.type,
                category: log.severity,
                amount: String(amount),
                latest: amount > 0 ? formatMonitorLatestOccurrence(Number(log?.latestOccurrenceSeconds ?? 0), globalClock) : '/'
            };
        });
    }, [monitorLoaded, monitorSnapshot.logs, globalClock]);
    const monitorHistoryRows = useMemo(() => {
        return monitorSnapshot.history.map((entry, index) => ({
            id: `${entry.type}-${entry.occurredAtSeconds}-${index}`,
            type: entry.type,
            category: entry.severity,
            occurredAt: formatMonitorHistoryOccurrence(Number(entry.occurredAtSeconds ?? 0)),
            occurredAtSeconds: Number(entry.occurredAtSeconds ?? 0),
            reason: normalizeMonitorReason(entry.reason),
            sourceLabel: String(entry.sourceLabel ?? ''),
            sourceId: Number(entry.sourceId ?? 0)
        }));
    }, [monitorSnapshot.history]);
    const filteredMonitorHistoryRows = useMemo(() => {
        return monitorHistoryRows.filter((row) => {
            if (monitorHistorySeverityFilter !== 'ALL' && row.category !== monitorHistorySeverityFilter) return false;
            if (monitorHistoryTypeFilter !== 'ALL' && row.type !== monitorHistoryTypeFilter) return false;

            return true;
        });
    }, [monitorHistoryRows, monitorHistorySeverityFilter, monitorHistoryTypeFilter]);
    const monitorInfoSections = useMemo(() => {
        return [
            {
                title: 'Wired usage',
                lines: [
                    `Current value: ${monitorSnapshot.usageCurrentWindow}/${Math.max(0, monitorSnapshot.usageLimitPerWindow)}`,
                    `This is the room execution budget used inside a ${Math.max(0, monitorSnapshot.usageWindowMs)}ms server window.`,
                    'Each triggered stack consumes cost based on conditions, selectors, effects, delayed effects, and recursion depth.'
                ]
            },
            {
                title: 'Heavy / overload',
                lines: [
                    `Heavy warning starts when usage stays above ${Math.max(0, monitorSnapshot.heavyUsageThresholdPercent)}% for ${Math.max(0, monitorSnapshot.heavyConsecutiveWindowsThreshold)} consecutive window(s).`,
                    `Delayed pressure also contributes when the queue stays above ${Math.max(0, monitorSnapshot.heavyDelayedThresholdPercent)}% of its limit.`,
                    `Overload is tracked from execution time and currently trips after ${Math.max(0, monitorSnapshot.overloadConsecutiveWindowsThreshold)} consecutive overloaded window(s).`
                ]
            },
            {
                title: 'Execution times',
                lines: [
                    `Average execution: ${monitorSnapshot.averageExecutionMs}ms (threshold ${Math.max(0, monitorSnapshot.overloadAverageThresholdMs)}ms)`,
                    `Peak execution: ${monitorSnapshot.peakExecutionMs}ms (threshold ${Math.max(0, monitorSnapshot.overloadPeakThresholdMs)}ms)`,
                    'These values reset with each server usage window.'
                ]
            },
            {
                title: 'Other numbers',
                lines: [
                    `Delayed events: ${monitorSnapshot.delayedEventsPending}/${Math.max(0, monitorSnapshot.delayedEventsLimit)} pending scheduled execution(s).`,
                    `Recursion: ${monitorSnapshot.recursionDepthCurrent}/${Math.max(0, monitorSnapshot.recursionDepthLimit)} nested wired call(s).`,
                    `Killed remaining: ${Math.max(0, monitorSnapshot.killedRemainingSeconds)} second(s) of room cooldown when protection has halted execution.`
                ]
            },
            {
                title: 'Room counters',
                lines: [
                    `Room furni: ${monitorRoomStats.roomFurniCount}/${Math.max(0, monitorRoomStats.roomItemLimit) || 0}`,
                    `Wall furni: ${monitorRoomStats.wallFurniCount}/${Math.max(0, monitorRoomStats.roomItemLimit) || 0}`,
                    `Permanent furni vars: ${monitorRoomStats.permanentFurniVariables} renderer-side custom variable entries currently attached to room items.`
                ]
            }
        ];
    }, [monitorSnapshot, monitorRoomStats]);
    const roomVariableAssignmentMap = useMemo(() => {
        return new Map(roomVariableAssignments.map((assignment) => [assignment.variableItemId, assignment]));
    }, [roomVariableAssignments]);
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
    // AIR identifies a variable of the overview by its name (VariableTableObject.identifier), and so do menu links.
    const variableNamesByType = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(variablesByType).map(([type, variables]) => [type, variables.map((variable) => ({ key: variable.variableName }))])
            ) as Record<VariablesElementType, { key: string }[]>,
        [variablesByType]
    );
    // AIR WiredMenuOverviewTab.update: while the tab is open the catalogue is asked for every 500 ms; the request itself waits 800 ms.
    useEffect(() => {
        if (!isVisible || activeTab !== 'variables') return;

        const interval = window.setInterval(variableCatalog.refresh, WIRED_VARIABLE_OVERVIEW_POLL_MS);

        return () => window.clearInterval(interval);
    }, [isVisible, activeTab, variableCatalog.refresh]);
    // AIR jumpToVariableByName: a link that arrives before the catalogue is kept until the catalogue is there.
    const pendingMenuLinkRef = useRef<string | null>(null);
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
                pendingMenuLinkRef.current = variableCatalog.ready ? null : url;
            }
        };
        AddLinkEventTracker(nativeLinkTracker);
        return () => RemoveLinkEventTracker(nativeLinkTracker);
    }, [variableNamesByType, variableCatalog.ready, roomSettings.canInspect, simpleAlert]);


    useEffect(() => {
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
    }, [variableNamesByType]);
    useEffect(() => {
        setSelectedManagedVariableEntry(null);
    }, [variablesType, selectedVariableKeys[variablesType]]);
    useEffect(() => {
        if (isVariableManageOpen) return;

        setSelectedManagedVariableEntry(null);
    }, [isVariableManageOpen]);

    const selectedVariable = useMemo(() => {
        const variables = variablesByType[variablesType];
        const selectedKey = selectedVariableKeys[variablesType];

        return variables.find((variable) => variable.variableName === selectedKey) ?? variables[0] ?? null;
    }, [variablesByType, variablesType, selectedVariableKeys]);
    const selectedVariableItemId = selectedVariable ? customVariableItemId(selectedVariable) : null;
    const selectedVariableProperties = useMemo(() => buildVariableProperties(selectedVariable), [selectedVariable]);
    const selectedVariableTextValues = useMemo(() => buildVariableTextValues(selectedVariable), [selectedVariable]);
    const describeVariableHolder = useCallback(
        (entityType: number, entityId: number, entityName: string): WiredHolderDescription => {
            if (entityType === HOLDER_TYPE_USER) {
                const userData = findUserVariableHolderData(roomSession?.userDataManager, entityId);
                let categoryLabel = 'Habbo';

                switch (userData?.type) {
                    case RoomObjectType.BOT:
                        categoryLabel = 'Bot';
                        break;
                    case RoomObjectType.RENTABLE_BOT:
                        categoryLabel = 'Rentable bot';
                        break;
                    case RoomObjectType.PET:
                        categoryLabel = 'Pet';
                        break;
                }

                return {
                    categoryLabel,
                    entityName: userData?.name || entityName || `#${decodeUserVariableHolder(entityId)?.id ?? entityId}`
                };
            }

            if (entityType === HOLDER_TYPE_FURNI) {
                const roomId = roomSession?.roomId ?? -1;
                const floorObject = roomSession ? GetRoomEngine().getRoomObject(roomId, entityId, RoomObjectCategory.FLOOR) : null;
                const wallObject = floorObject || !roomSession ? null : GetRoomEngine().getRoomObject(roomId, entityId, RoomObjectCategory.WALL);
                const roomObject = floorObject ?? wallObject;
                const typeId = roomObject?.model?.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
                const furnitureData = !roomObject
                    ? null
                    : wallObject
                      ? GetSessionDataManager().getWallItemData(typeId)
                      : GetSessionDataManager().getFloorItemData(typeId);

                return {
                    categoryLabel: wallObject ? 'Wall furni' : 'Floor furni',
                    entityName: furnitureData?.name || furnitureData?.className || entityName || `#${entityId}`
                };
            }

            return { categoryLabel: 'Global', entityName: entityName || `Room #${entityId}` };
        },
        [roomSession]
    );
    // AIR WiredMenuOverviewTab.canHighlightCurrentVariable.
    const canVariableHighlight =
        !!selectedVariable &&
        !selectedVariable.requiresExecutionContext &&
        selectedVariable.variableType !== VARIABLE_TYPE_INTERNAL &&
        (variablesType === 'user' || variablesType === 'furni') &&
        !!roomSession;
    const variableHolders = useWiredVariableHolders(
        roomSession?.roomId ?? 0,
        isVariableHighlightActive && canVariableHighlight && selectedVariable ? selectedVariable.variableId : null
    );
    // AIR VariableHoldersHighlighter: a furni holder is a floor item, or a wall item when its id is negative; a user holder is found in the room.
    const variableHighlightTargets = useMemo((): VariableHighlightTarget[] => {
        if (!variableHolders || !roomSession || !selectedVariable) return [];

        const targets: VariableHighlightTarget[] = [];

        for (const holder of variableHolders) {
            const value = selectedVariable.hasValue ? holder.value : null;

            if (selectedVariable.variableTarget === VARIABLE_TARGET_OF_TYPE.user) {
                const roomIndex = Number(findUserVariableHolderData(roomSession.userDataManager, holder.objectId)?.roomIndex ?? -1);

                if (roomIndex >= 0) targets.push({ category: RoomObjectCategory.UNIT, objectId: roomIndex, hasValue: value !== null, value });
                continue;
            }

            const category = holder.objectId < 0 ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR;
            const objectId = Math.abs(holder.objectId);

            if (GetRoomEngine().getRoomObject(roomSession.roomId, objectId, category)) targets.push({ category, objectId, hasValue: value !== null, value });
        }

        return targets;
    }, [variableHolders, roomSession, selectedVariable]);
    useEffect(() => {
        if (isVisible && activeTab === 'variables' && canVariableHighlight) return;

        setIsVariableHighlightActive(false);
    }, [activeTab, canVariableHighlight, isVisible]);
    useEffect(() => {
        if (variableHighlightObjectsRef.current.length) {
            WiredSelectionVisualizer.clearVariableHighlightFromObjects(variableHighlightObjectsRef.current);
            variableHighlightObjectsRef.current = [];
        }

        if (!isVariableHighlightActive || !variableHighlightTargets.length) {
            setVariableHighlightOverlays([]);

            return;
        }

        const objects = variableHighlightTargets.map((target) => ({
            category: target.category,
            objectId: target.objectId
        }));

        WiredSelectionVisualizer.applyVariableHighlightToObjects(objects);
        variableHighlightObjectsRef.current = objects;

        return () => {
            if (!variableHighlightObjectsRef.current.length) return;

            WiredSelectionVisualizer.clearVariableHighlightFromObjects(variableHighlightObjectsRef.current);
            variableHighlightObjectsRef.current = [];
        };
    }, [isVariableHighlightActive, variableHighlightTargets]);
    useEffect(() => {
        if (!isVariableHighlightActive || !roomSession?.roomId || !variableHighlightTargets.length) {
            setVariableHighlightOverlays([]);

            return;
        }

        const updateOverlays = () => {
            const stage = GetStage();
            const nextOverlays: VariableHighlightOverlay[] = [];

            for (const target of variableHighlightTargets) {
                const bounds = GetRoomObjectBounds(roomSession.roomId, target.objectId, target.category);
                const location = GetRoomObjectScreenLocation(roomSession.roomId, target.objectId, target.category);

                if (!bounds || !location) continue;

                const x = Math.max(8, Math.min(Math.round(location.x), stage.width - 8));
                const y = Math.max(8, Math.min(Math.round(bounds.top), stage.height - 40));

                nextOverlays.push({
                    ...target,
                    key: `${target.category}:${target.objectId}`,
                    x,
                    y
                });
            }

            setVariableHighlightOverlays(nextOverlays);
        };

        updateOverlays();

        return AddAnimationTickerCallback(updateOverlays);
    }, [isVariableHighlightActive, roomSession?.roomId, variableHighlightTargets]);
    const userVariableDefinitionsById = useMemo(
        () => new Map(userVariableDefinitions.map((definition) => [definition.itemId, definition])),
        [userVariableDefinitions]
    );
    const furniVariableDefinitionsById = useMemo(
        () => new Map(furniVariableDefinitions.map((definition) => [definition.itemId, definition])),
        [furniVariableDefinitions]
    );
    const managedHolderVariableEntries = useMemo((): ManagedHolderVariableEntry[] => {
        if (!selectedManagedVariableEntry) return [];

        switch (variablesType) {
            case 'user':
                return [...(userVariableAssignments[selectedManagedVariableEntry.entityId] || [])]
                    .map((assignment): ManagedHolderVariableEntry | null => {
                        const definition = userVariableDefinitionsById.get(assignment.variableItemId);

                        if (!definition) return null;

                        return {
                            variableItemId: assignment.variableItemId,
                            name: definition.name,
                            hasValue: definition.hasValue,
                            isReadOnly: !!definition.isReadOnly,
                            value: assignment.value,
                            availability: getVariableAvailabilityLabel(definition.availability, 'user'),
                            createdAt: Number(assignment.createdAt ?? 0),
                            updatedAt: Number(assignment.updatedAt ?? 0)
                        };
                    })
                    .filter((entry): entry is ManagedHolderVariableEntry => !!entry)
                    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
            case 'furni':
                return [...(furniVariableAssignments[selectedManagedVariableEntry.entityId] || [])]
                    .map((assignment): ManagedHolderVariableEntry | null => {
                        const definition = furniVariableDefinitionsById.get(assignment.variableItemId);

                        if (!definition) return null;

                        return {
                            variableItemId: assignment.variableItemId,
                            name: definition.name,
                            hasValue: definition.hasValue,
                            isReadOnly: !!definition.isReadOnly,
                            value: assignment.value,
                            availability: getVariableAvailabilityLabel(definition.availability, 'furni'),
                            createdAt: Number(assignment.createdAt ?? 0),
                            updatedAt: Number(assignment.updatedAt ?? 0)
                        };
                    })
                    .filter((entry): entry is ManagedHolderVariableEntry => !!entry)
                    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
            case 'context':
                return [];
            default:
                return [...roomVariableDefinitions]
                    .map((definition) => {
                        const assignment = roomVariableAssignmentMap.get(definition.itemId);

                        return {
                            variableItemId: definition.itemId,
                            name: definition.name,
                            hasValue: definition.hasValue,
                            isReadOnly: !!definition.isReadOnly,
                            value: assignment?.value ?? 0n,
                            availability: getVariableAvailabilityLabel(definition.availability, 'global'),
                            createdAt: 0,
                            updatedAt: Number(assignment?.updatedAt ?? 0)
                        };
                    })
                    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
        }
    }, [
        selectedManagedVariableEntry,
        variablesType,
        userVariableAssignments,
        userVariableDefinitionsById,
        furniVariableAssignments,
        furniVariableDefinitionsById,
        roomVariableDefinitions,
        roomVariableAssignmentMap
    ]);
    const selectedManagedHolderVariableEntry = useMemo(() => {
        if (!managedHolderVariableEntries.length) return null;

        return managedHolderVariableEntries.find((entry) => entry.variableItemId === selectedManagedHolderVariableId) ?? managedHolderVariableEntries[0];
    }, [managedHolderVariableEntries, selectedManagedHolderVariableId]);
    const availableManagedHolderDefinitions = useMemo(() => {
        if (!selectedManagedVariableEntry || variablesType === 'global' || variablesType === 'context') return [];

        const assignedIds = new Set(managedHolderVariableEntries.map((entry) => entry.variableItemId));
        const definitions = variablesType === 'user' ? userVariableDefinitions : furniVariableDefinitions;

        return definitions
            .filter((definition) => !assignedIds.has(definition.itemId) && !definition.isReadOnly)
            .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
    }, [selectedManagedVariableEntry, variablesType, managedHolderVariableEntries, userVariableDefinitions, furniVariableDefinitions]);
    const selectedManagedGiveDefinition = useMemo(() => {
        if (!availableManagedHolderDefinitions.length) return null;

        return availableManagedHolderDefinitions.find((definition) => definition.itemId === managedGiveVariableItemId) ?? availableManagedHolderDefinitions[0];
    }, [availableManagedHolderDefinitions, managedGiveVariableItemId]);
    const variableManageCategoryHeader = useMemo(() => {
        switch (variablesType) {
            case 'furni':
                return 'Furni type';
            case 'global':
                return 'Scope';
            case 'context':
                return 'Execution scope';
            default:
                return 'User type';
        }
    }, [variablesType]);
    const managedHolderPanelTitle = useMemo(() => {
        switch (variablesType) {
            case 'furni':
                return 'Manage Furni Variables';
            case 'global':
                return 'Manage Global Variables';
            case 'context':
                return 'Manage Context Variables';
            default:
                return 'Manage User Variables';
        }
    }, [variablesType]);
    const managedHolderInfoLines = useMemo(() => {
        if (!selectedManagedVariableEntry || !roomSession) return [];

        if (variablesType === 'user') {
            const userData = findUserVariableHolderData(roomSession.userDataManager, selectedManagedVariableEntry.entityId);
            const holder = decodeUserVariableHolder(selectedManagedVariableEntry.entityId);
            const idLabel = holder?.kind === 'pet' ? 'Pet id' : holder?.kind === 'bot' ? 'Bot id' : 'User id';

            return [
                `${variableManageCategoryHeader}: ${selectedManagedVariableEntry.categoryLabel}`,
                `Name: ${selectedManagedVariableEntry.entityName}`,
                ...(holder?.kind !== 'user' && userData?.ownerName ? [`Owner: ${userData.ownerName}`] : []),
                `${idLabel}: ${holder?.id ?? selectedManagedVariableEntry.entityId}`,
                ...(userData?.type === RoomObjectType.PET ? [`Pet level: ${Number(userData.petLevel ?? 0)}`] : [])
            ];
        }

        if (variablesType === 'furni') {
            const category = selectedManagedVariableEntry.categoryLabel === 'Wall furni' ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR;
            const owner =
                GetRoomEngine()
                    .getRoomObject(roomSession.roomId, selectedManagedVariableEntry.entityId, category)
                    ?.model?.getValue<string>(RoomObjectVariable.FURNITURE_OWNER_NAME) || '';

            return [
                `${variableManageCategoryHeader}: ${selectedManagedVariableEntry.categoryLabel}`,
                `Name: ${selectedManagedVariableEntry.entityName}`,
                ...(owner ? [`Owner: ${owner}`] : []),
                `Furni id: ${selectedManagedVariableEntry.entityId}`
            ];
        }

        if (variablesType === 'context') {
            return [
                `${variableManageCategoryHeader}: Current execution`,
                `Name: ${selectedManagedVariableEntry.entityName}`,
                `Context id: ${selectedManagedVariableEntry.entityId}`
            ];
        }

        return [`${variableManageCategoryHeader}: Room`, `Name: Room #${roomSession.roomId}`, `Room id: ${roomSession.roomId}`];
    }, [selectedManagedVariableEntry, roomSession, variablesType, variableManageCategoryHeader]);
    const managedHolderWarningText = useMemo(() => {
        switch (variablesType) {
            case 'furni':
                return 'Use this tool only for furni that are currently loaded in the room. Reload the panel after major room changes.';
            case 'global':
                return 'Global variables are room-scoped. Only the latest update time is tracked for these values.';
            case 'context':
                return 'Context variables only live inside the current wired execution. They are shared through the signal chain until a branch overrides them.';
            default:
                return 'Do not use this tool for users who are currently in the room/using the changed variable in another room.';
        }
    }, [variablesType]);
    const managedHolderUserData = useMemo(() => {
        if (variablesType !== 'user' || !selectedManagedVariableEntry || !roomSession) return null;

        return findUserVariableHolderData(roomSession.userDataManager, selectedManagedVariableEntry.entityId);
    }, [variablesType, selectedManagedVariableEntry, roomSession]);
    const managedHolderFurniCategory = useMemo(() => {
        if (variablesType !== 'furni' || !selectedManagedVariableEntry) return RoomObjectCategory.FLOOR;

        return selectedManagedVariableEntry.categoryLabel === 'Wall furni' ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR;
    }, [variablesType, selectedManagedVariableEntry]);
    const canManageHolderVariables = roomSettings.canModify && !!selectedManagedVariableEntry;
    const canRemoveManagedHolderVariable =
        canManageHolderVariables &&
        variablesType !== 'global' &&
        variablesType !== 'context' &&
        !!selectedManagedHolderVariableEntry &&
        !selectedManagedHolderVariableEntry.isReadOnly;
    const canGiveManagedHolderVariable =
        canManageHolderVariables && variablesType !== 'global' && variablesType !== 'context' && !!availableManagedHolderDefinitions.length;
    useEffect(() => {
        if (!selectedManagedVariableEntry) {
            setSelectedManagedHolderVariableId(0);
            setEditingManagedHolderVariableId(0);
            setEditingManagedHolderValue('');
            setIsManagedGiveOpen(false);

            return;
        }

        setEditingManagedHolderVariableId(0);
        setEditingManagedHolderValue('');
        setIsManagedGiveOpen(false);
    }, [selectedManagedVariableEntry]);
    useEffect(() => {
        if (!managedHolderVariableEntries.length) {
            setSelectedManagedHolderVariableId(0);
            return;
        }

        if (managedHolderVariableEntries.some((entry) => entry.variableItemId === selectedManagedHolderVariableId)) return;

        const preferredItemId = selectedVariableItemId ?? 0;
        const preferredEntry = managedHolderVariableEntries.find((entry) => entry.variableItemId === preferredItemId);

        setSelectedManagedHolderVariableId(preferredEntry?.variableItemId ?? managedHolderVariableEntries[0].variableItemId);
    }, [managedHolderVariableEntries, selectedManagedHolderVariableId, selectedVariableItemId]);
    useEffect(() => {
        if (!availableManagedHolderDefinitions.length) {
            setManagedGiveVariableItemId(0);
            return;
        }

        if (availableManagedHolderDefinitions.some((definition) => definition.itemId === managedGiveVariableItemId)) return;

        setManagedGiveVariableItemId(availableManagedHolderDefinitions[0].itemId);
    }, [availableManagedHolderDefinitions, managedGiveVariableItemId]);
    useEffect(() => {
        if (!selectedManagedHolderVariableEntry || !editingManagedHolderVariableId) return;
        if (selectedManagedHolderVariableEntry.variableItemId !== editingManagedHolderVariableId) return;

        setEditingManagedHolderValue(String(selectedManagedHolderVariableEntry.value ?? 0));
    }, [selectedManagedHolderVariableEntry, editingManagedHolderVariableId]);
    // The owners list and the per-holder panel work on variables created in this room.
    const variableManageCanOpen = selectedVariableItemId !== null && variablesType !== 'context' && !selectedVariable?.requiresExecutionContext;
    // AIR WiredMenuOverviewTab.canDeleteCurrentVariable. Clearing reaches holders outside the room, so only the owner of the
    // definition box gets the button; the server enforces the same rule.
    const canVariableClear =
        roomSettings.canModify &&
        !!selectedVariable &&
        selectedVariable.canCreateAndDelete &&
        isPersistedVariable(selectedVariable) &&
        selectedVariable.variableType === VARIABLE_TYPE_CUSTOM &&
        (variablesType === 'user' || variablesType === 'furni') &&
        selectedVariableItemId !== null &&
        IsOwnerOfFloorFurniture(selectedVariableItemId);
    const confirmClearVariable = () => {
        if (!canVariableClear || !showConfirm || selectedVariableItemId === null) return;
        const scope = variablesType === 'furni' ? 'furni' : 'user';
        const itemId = selectedVariableItemId;

        showConfirm(
            localizeWithFallback(
                'wiredmenu.variable_overview.delete_all.desc',
                'Are you sure you want to clear this variable? All users/furni that hold this variable will lose it. This action cannot be undone'
            ),
            () => clearVariableForAllHolders(scope, itemId),
            null,
            LocalizeText('generic.ok'),
            LocalizeText('generic.cancel'),
            localizeWithFallback('wiredmenu.variable_overview.delete_all.title', 'Clear this variable')
        );
    };
    const parseScalarInput = (input: string): bigint | null => {
        try { return parseWiredInt64(input); }
        catch (error) {
            simpleAlert?.(String(error instanceof Error ? error.message : error));
            return null;
        }
    };
    const commitManagedHolderValueEdit = useCallback(() => {
        if (!selectedManagedVariableEntry || !selectedManagedHolderVariableEntry || !roomSettings.canModify || selectedManagedHolderVariableEntry.isReadOnly)
            return;
        if (!selectedManagedHolderVariableEntry.hasValue) return;
        if (variablesType === 'context') return;

        const nextValue = parseScalarInput(editingManagedHolderValue);
        if (nextValue === null) return;

        switch (variablesType) {
            case 'user':
                updateUserVariableValue(selectedManagedVariableEntry.entityId, selectedManagedHolderVariableEntry.variableItemId, nextValue);
                break;
            case 'furni':
                updateFurniVariableValue(selectedManagedVariableEntry.entityId, selectedManagedHolderVariableEntry.variableItemId, nextValue);
                break;
            default:
                updateRoomVariableValue(selectedManagedHolderVariableEntry.variableItemId, nextValue);
                break;
        }

        setEditingManagedHolderVariableId(0);
    }, [
        selectedManagedVariableEntry,
        selectedManagedHolderVariableEntry,
        roomSettings.canModify,
        editingManagedHolderValue,
        variablesType,
        updateUserVariableValue,
        updateFurniVariableValue,
        updateRoomVariableValue
    ]);
    const giveManagedHolderVariable = useCallback(() => {
        if (!selectedManagedVariableEntry || !selectedManagedGiveDefinition || !roomSettings.canModify) return;
        if (variablesType === 'global' || variablesType === 'context') return;

        const nextValue = parseScalarInput(managedGiveValue);
        if (nextValue === null) return;

        if (variablesType === 'user') assignUserVariable(selectedManagedVariableEntry.entityId, selectedManagedGiveDefinition.itemId, nextValue);
        else assignFurniVariable(selectedManagedVariableEntry.entityId, selectedManagedGiveDefinition.itemId, nextValue);

        setSelectedManagedHolderVariableId(selectedManagedGiveDefinition.itemId);
        setManagedGiveValue('0');
        setIsManagedGiveOpen(false);
    }, [
        selectedManagedVariableEntry,
        selectedManagedGiveDefinition,
        roomSettings.canModify,
        variablesType,
        managedGiveValue,
        assignUserVariable,
        assignFurniVariable
    ]);
    const removeManagedHolderVariable = useCallback(() => {
        if (!selectedManagedVariableEntry || !selectedManagedHolderVariableEntry || !roomSettings.canModify || selectedManagedHolderVariableEntry.isReadOnly)
            return;
        if (variablesType === 'global' || variablesType === 'context') return;

        if (variablesType === 'user') removeUserVariable(selectedManagedVariableEntry.entityId, selectedManagedHolderVariableEntry.variableItemId);
        else removeFurniVariable(selectedManagedVariableEntry.entityId, selectedManagedHolderVariableEntry.variableItemId);

        setEditingManagedHolderVariableId(0);
    }, [selectedManagedVariableEntry, selectedManagedHolderVariableEntry, roomSettings.canModify, variablesType, removeUserVariable, removeFurniVariable]);

    const clearMonitorLogs = () => {
        // updateButtonsUI: Clear is disabled for CLEAR_LOGS_TIMEOUT after it was pressed.
        setIsMonitorClearLocked(true);
        window.clearTimeout(monitorClearLockTimerRef.current);
        monitorClearLockTimerRef.current = window.setTimeout(() => setIsMonitorClearLocked(false), WIRED_MONITOR_CLEAR_LOCK_MS);
        setSelectedMonitorError(null);
        setIsMonitorHistoryOpen(false);
        setIsMonitorInfoOpen(false);
        SendMessageComposer(new WiredMonitorRequestComposer(WIRED_MONITOR_ACTION_CLEAR_LOGS));
    };

    const openMonitorErrorInfo = (type: string, category: string) => setSelectedMonitorError({ type, category });

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
    const onManagedHolderValueInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();

        switch (event.key) {
            case 'Enter':
            case 'NumpadEnter':
                event.preventDefault();
                commitManagedHolderValueEdit();
                window.requestAnimationFrame(() => event.currentTarget.blur());
                return;
            case 'Escape':
                event.preventDefault();
                setEditingManagedHolderVariableId(0);
                window.requestAnimationFrame(() => event.currentTarget.blur());
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

    if (!isVisible) return null;

    return (
        <>
            {isVariableHighlightActive && !!variableHighlightOverlays.length && (
                <div className="pointer-events-none absolute left-0 top-0 z-30">
                    {variableHighlightOverlays.map((overlay) => (
                        <div
                            key={overlay.key}
                            className="pointer-events-none absolute"
                            style={{
                                left: overlay.x,
                                top: overlay.y,
                                transform: 'translateX(-50%)'
                            }}
                        >
                            {overlay.hasValue && (
                                <div className="absolute left-1/2 top-[-30px] -translate-x-1/2">
                                    <div className="relative min-w-[24px] rounded-[8px] bg-[#86aebccc] px-[8px] py-[4px] text-center text-[12px] font-bold leading-none text-white shadow-[inset_0_0_0_1px_rgba(176,211,225,.7)]">
                                        {overlay.value ?? 0}
                                        <span className="absolute left-1/2 bottom-[-7px] z-10 h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent border-t-[#86aebccc]" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
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
                            monitorHistoryRows={monitorHistoryRows}
                            onOpenMonitorInfo={() => setIsMonitorInfoOpen(true)}
                            onOpenMonitorHistory={() => setIsMonitorHistoryOpen(true)}
                            onOpenRoomLogs={() => setIsRoomLogsOpen(true)}
                            onClearMonitorLogs={clearMonitorLogs}
                            onOpenMonitorErrorInfo={openMonitorErrorInfo}
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
                            variableManageCanOpen={variableManageCanOpen}
                            canVariableClear={canVariableClear}
                            onClearVariable={confirmClearVariable}
                            onOpenManagePanel={() => {
                                requestUserVariables();
                                setSelectedManagedVariableEntry(null);
                                setIsVariableManageOpen(true);
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
            {isMonitorHistoryOpen && (
                <VoltCardView
                    className="min-w-[760px] max-w-[760px] max-h-[520px]"
                    theme="primary-slim"
                    uniqueKey="wired-monitor-history"
                    windowPosition={DraggableWindowPosition.TOP_LEFT}
                    offsetLeft={40}
                    offsetTop={40}
                >
                    <VoltCardHeaderView headerText="Wired Monitor Logs" onCloseClick={() => setIsMonitorHistoryOpen(false)} />
                    <VoltCardContentView className="text-black bg-[#f4efe3] p-3 flex flex-col gap-3" overflow="hidden">
                        <div className="flex flex-wrap items-center gap-2 text-[12px]">
                            <span className="text-[#555]">Severity:</span>
                            {['ALL', 'WARNING', 'ERROR'].map((severity) => (
                                <button
                                    key={severity}
                                    className={`rounded border px-2 py-[2px] ${monitorHistorySeverityFilter === severity ? 'border-[#4d7892] bg-[#dbeaf4] text-[#1a4d68]' : 'border-[#b8b2a4] bg-white text-[#555]'}`}
                                    type="button"
                                    onClick={() => setMonitorHistorySeverityFilter(severity as 'ALL' | 'ERROR' | 'WARNING')}
                                >
                                    {severity}
                                </button>
                            ))}
                            <span className="ml-2 text-[#555]">Type:</span>
                            <select
                                className="rounded border border-[#b8b2a4] bg-white px-2 py-[2px] text-[12px]"
                                value={monitorHistoryTypeFilter}
                                onChange={(event) => setMonitorHistoryTypeFilter(event.target.value)}
                            >
                                {monitorHistoryTypeOptions.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grow overflow-y-auto border border-[#d1ccbf] rounded bg-white">
                            <table className="w-full text-[12px]">
                                <thead className="bg-[#efede5] sticky top-0">
                                    <tr>
                                        <th className="text-left px-2 py-1">Type</th>
                                        <th className="text-left px-2 py-1">Severity</th>
                                        <th className="text-left px-2 py-1">Trigger</th>
                                        <th className="text-left px-2 py-1">Motivation</th>
                                        <th className="text-left px-2 py-1">Occurred at</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!filteredMonitorHistoryRows.length && (
                                        <tr>
                                            <td className="px-2 py-3 text-center text-[#8b8678]" colSpan={5}>
                                                No log history for the current filters
                                            </td>
                                        </tr>
                                    )}
                                    {filteredMonitorHistoryRows.map((row, index) => (
                                        <tr
                                            key={row.id}
                                            className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f8f6f0]'} cursor-pointer hover:bg-[#e8eefc]`}
                                            onClick={() => openMonitorErrorInfo(row.type, row.category)}
                                        >
                                            <td className="px-2 py-1 text-[#1b57b2]">{row.type}</td>
                                            <td className="px-2 py-1">{row.category}</td>
                                            <td className="px-2 py-1">{formatMonitorSource(row.sourceLabel, row.sourceId)}</td>
                                            <td className="px-2 py-1 text-[#555]">{row.reason}</td>
                                            <td className="px-2 py-1">{row.occurredAt}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </VoltCardContentView>
                </VoltCardView>
            )}
            {isMonitorInfoOpen && (
                <VoltCardView
                    className="min-w-[560px] max-w-[560px] max-h-[520px]"
                    theme="primary-slim"
                    uniqueKey="wired-monitor-info"
                    windowPosition={DraggableWindowPosition.TOP_LEFT}
                    offsetLeft={610}
                    offsetTop={80}
                >
                    <VoltCardHeaderView headerText="Wired Monitor Information" onCloseClick={() => setIsMonitorInfoOpen(false)} />
                    <VoltCardContentView className="text-black bg-[#f4efe3] p-4 flex flex-col gap-4 overflow-y-auto">
                        {monitorInfoSections.map((section) => (
                            <div key={section.title} className="flex flex-col gap-1">
                                <Text bold>{section.title}</Text>
                                {section.lines.map((line, index) => (
                                    <Text key={`${section.title}-${index}`}>{line}</Text>
                                ))}
                            </div>
                        ))}
                    </VoltCardContentView>
                </VoltCardView>
            )}
            {isVariableManageOpen && variableManageCanOpen && !!selectedVariable && (
                <WiredVariableOwnersView
                    variableId={selectedVariable.variableId}
                    variableName={selectedVariable.variableName}
                    variablesType={variablesType}
                    hasValue={selectedVariable.hasValue}
                    describeHolder={describeVariableHolder}
                    onManage={setSelectedManagedVariableEntry}
                    onClose={() => setIsVariableManageOpen(false)}
                />
            )}
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
            {!!selectedManagedVariableEntry && !!selectedVariable && (
                <WiredVariableHolderPanelView
                    title={managedHolderPanelTitle}
                    warningText={managedHolderWarningText}
                    onRefresh={() => requestUserVariables()}
                    onClose={() => setSelectedManagedVariableEntry(null)}
                    preview={
                        <>
                            {variablesType === 'furni' && roomSession && (
                                <LayoutRoomObjectImageView
                                    category={managedHolderFurniCategory}
                                    objectId={selectedManagedVariableEntry.entityId}
                                    roomId={roomSession.roomId}
                                />
                            )}
                            {variablesType === 'user' && managedHolderUserData && (
                                <>
                                    {managedHolderUserData.type === RoomObjectType.PET ? (
                                        <LayoutPetImageView direction={2} figure={managedHolderUserData.figure} />
                                    ) : (
                                        <LayoutAvatarImageView direction={2} figure={managedHolderUserData.figure} />
                                    )}
                                </>
                            )}
                            {variablesType === 'global' && (
                                <img alt="Global placeholder" className="max-w-full max-h-full object-contain p-3" src={wiredGlobalPlaceholderImage} />
                            )}
                        </>
                    }
                    infoLines={managedHolderInfoLines}
                    variablesTitle={variablesType === 'global' ? 'Room variables:' : 'Assigned variables:'}
                    entries={managedHolderVariableEntries.map((entry) => ({
                        id: String(entry.variableItemId),
                        name: entry.name,
                        availability: entry.availability,
                        hasValue: entry.hasValue,
                        value: entry.value,
                        isReadOnly: entry.isReadOnly
                    }))}
                    selectedId={selectedManagedHolderVariableEntry ? String(selectedManagedHolderVariableEntry.variableItemId) : null}
                    onSelect={(id) => setSelectedManagedHolderVariableId(Number(id))}
                    canEdit={roomSettings.canModify}
                    editingId={editingManagedHolderVariableId ? String(editingManagedHolderVariableId) : null}
                    editingValue={editingManagedHolderValue}
                    onBeginEdit={(entry) => {
                        setSelectedManagedHolderVariableId(Number(entry.id));
                        setEditingManagedHolderVariableId(Number(entry.id));
                        setEditingManagedHolderValue(String(entry.value ?? 0));
                    }}
                    onEditingValueChange={setEditingManagedHolderValue}
                    onEditBlur={() => setEditingManagedHolderVariableId(0)}
                    onEditKeyDown={onManagedHolderValueInputKeyDown}
                    isGiveOpen={isManagedGiveOpen}
                    onToggleGive={() => setIsManagedGiveOpen((value) => !value)}
                    giveOptions={availableManagedHolderDefinitions.map((definition) => ({
                        id: String(definition.itemId),
                        name: definition.name,
                        hasValue: !!definition.hasValue
                    }))}
                    giveSelectedId={selectedManagedGiveDefinition ? String(selectedManagedGiveDefinition.itemId) : ''}
                    onGiveSelect={(id) => setManagedGiveVariableItemId(Number(id))}
                    giveValue={managedGiveValue}
                    onGiveValueChange={setManagedGiveValue}
                    canGive={canGiveManagedHolderVariable}
                    onGive={() => giveManagedHolderVariable()}
                    canRemove={canRemoveManagedHolderVariable}
                    onRemove={() => removeManagedHolderVariable()}
                />
            )}
            {!!selectedMonitorErrorInfo && (
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
                        {!!MONITOR_ERROR_ICONS[selectedMonitorError.category] && (
                            <img alt="" className="absolute right-0 top-0 size-[40px]" src={MONITOR_ERROR_ICONS[selectedMonitorError.category]} />
                        )}
                        <Text bold className="absolute left-[109px] top-[11px] whitespace-nowrap">
                            {selectedMonitorErrorInfo.title}
                        </Text>
                        <div className="w-[319px] whitespace-pre-line pt-[46px]">
                            <Text>
                                {selectedMonitorErrorInfo.errorId === undefined
                                    ? selectedMonitorErrorInfo.description
                                    : localizeWithFallback(`wiredmenu.error_info.${selectedMonitorErrorInfo.errorId}`, selectedMonitorErrorInfo.description).replace(/\\n/g, '\n')}
                            </Text>
                        </div>
                    </div>
                </VoltCardView>
            )}
        </>
    );
};
