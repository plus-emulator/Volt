import {
    ChestCloseComposer,
    ChestCoinsEvent,
    ChestFurniChunkEvent,
    ChestFurniUpdateEvent,
    ChestLogEvent,
    ChestOpenComposer,
    ChestOpenEvent,
    ChestSaveNotificationsComposer,
    ChestSaveOptionsComposer,
    ChestSaveSettingsComposer,
    ChestSettingsUpdatedEvent,
    ChestStartDepositComposer,
    ChestUpgradeCapacityComposer,
    ChestUpgradeResultEvent,
    ChestWithdrawAllComposer,
    ChestWithdrawCoinsComposer,
    ChestWithdrawFurniComposer,
    FurnitureDataEvent,
    FurnitureFloorUpdateEvent,
    FurnitureListComposer,
    FurnitureType,
    GetRoomEngine,
    GetSessionDataManager,
    IChestFurniStoredItem,
    RoomObjectCategory,
    RoomObjectVariable,
    RoomPreviewer,
    WIRED_TRANSACTION_LIST_CHEST,
    WiredTransactionGetChestLogsComposer,
    WiredTransactionLogListEvent,
    Vector3d,
} from '@volt/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    GetConfigurationValue,
    GetRoomSession,
    getWiredChestLayout,
    getWiredChestMaxCapacity,
    getWiredChestOptions,
    getWiredChestRights,
    isStarterChest,
    LocalizeText,
    localizeWithFallback,
    readWiredChestStuffData,
    SanitizeHtml,
    SendMessageComposer,
    WIRED_CHEST_KIND_COINS,
    WIRED_CHEST_KIND_FURNI,
    WiredChestKind,
} from '../../../../api';
import sceneHigh from '../../../../assets/images/chest/light_coins_chest_balance_high.png';
import sceneLow from '../../../../assets/images/chest/light_coins_chest_balance_low.png';
import sceneMedium from '../../../../assets/images/chest/light_coins_chest_balance_medium.png';
import sceneZero from '../../../../assets/images/chest/light_coins_chest_balance_zero.png';
import bellIcon from '../../../../assets/images/chest/wired_chests_bell_icon.png';
import gearIcon from '../../../../assets/images/chest/wired_chests_gear_icon.png';
import checkmarkIcon from '../../../../assets/images/reward-track/air/checkmark.png';
import wiredIcon from '../../../../assets/images/wiredtools/wired_menu.png';
import { Column, Flex, LayoutCurrencyIcon, LayoutFurniImageView, VoltCardContentView, VoltCardHeaderView, VoltCardView, PIXEL_ART_RENDERING, Text } from '../../../../common';
import { useMessageEvent, useNotification, usePurse } from '../../../../hooks';
import { useWiredToolsState } from '../../../../hooks/wired-tools/useWiredToolsState';
import { ChestButton } from './ChestButton';
import { ChestAppearanceFields, ChestSettingsSection } from './ChestSettingsFields';
import { HabboDropMenuView } from '../../../../common/dropmenu/HabboDropMenuView';
import { ChestFurniGroup, chestFurniDisplayName, groupStoredFurni } from './chestFurniGrouping';
import { WIRED_TRANSACTION_LOGS_PAGE_SIZE, WiredTransactionLogsPage, WiredTransactionLogsWindow } from '../../../wired-tools/WiredTransactionLogsWindow';
import { ChestCheckbox, ChestIconButton, ChestShinyButton, ChestText, ChestTitle } from './chest/ChestAirParts';
import { ChestLockInfoBubble } from './chest/ChestLockInfoBubble';
import { ChestUpgradeView } from './chest/ChestUpgradeView';
import { FurniChestContentsView } from './chest/FurniChestContentsView';

interface ChestLogRow {
    type: string;
    timestamp: number;
    userName: string;
    withdrawn: number;
    deposited: number;
}

const CREDITS = -1;
const NON_DIGITS = /\D/g;
/** Matches the server's per-purchase cap. */
const MAX_UPGRADES_PER_PURCHASE = 10;
/** Coin chests stop at 100000 capacity and furni chests at 10000. */
const COIN_MAX_CAPACITY = 100_000;
const FURNI_MAX_CAPACITY = 10_000;
const FURNI_SEARCH_THRESHOLD = 31;
const COST_CREDITS = 10;
const COST_DIAMONDS = 10;

const furniName = (baseItemId: number, wallItem = false): string => {
    const data = wallItem
        ? GetSessionDataManager().getWallItemData(baseItemId)
        : GetSessionDataManager().getFloorItemData(baseItemId);
    return data?.name || `#${baseItemId}`;
};

const groupLabel = (group: ChestFurniGroup): string =>
    chestFurniDisplayName(
        group,
        LocalizeText,
        (id) => furniName(id, false),
        (id) => furniName(id, true),
    );

const configNumber = (key: string): number | null => {
    const value = GetConfigurationValue<number>(key, null);

    return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

/** The chest furni as the room engine holds it: stuff data map, owner and furni type. */
const readChestObject = (chestId: number) => {
    const roomId = GetRoomSession()?.roomId ?? -1;
    const roomObject = chestId > 0 && roomId >= 0 ? GetRoomEngine().getRoomObject(roomId, chestId, RoomObjectCategory.FLOOR) : null;
    const model = roomObject?.model ?? null;
    const typeId = model?.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID) ?? 0;

    return {
        data: readWiredChestStuffData(model?.getValue<Record<string, string>>(RoomObjectVariable.FURNITURE_DATA)),
        ownerId: model?.getValue<number>(RoomObjectVariable.FURNITURE_OWNER_ID) ?? -1,
        typeId,
        className: (typeId > 0 && GetSessionDataManager().getFloorItemData(typeId)?.className) || '',
    };
};

/**
 * The wired chest window, after AIR WiredChestController / WiredChestWrapperView (WIN63-202610131318-860371703).
 *
 * <p>Opening: the server answers a furni use with ChestOpen (3966); the client asks for the contents with ChestOpen
 * (1595) and the answer decides the chest kind: ChestCoins (988) for a coin chest, ChestFurniChunk (44) fragments for a
 * furni chest. Everything else (name, access, lock, capacity, notifications, wired) is read from the chest's stuff
 * data and re-read whenever the room object updates; rights are computed on the client.
 */
export const FurnitureChestView: FC = () => {
    const [itemId, setItemId] = useState(-1);
    const [kind, setKind] = useState<WiredChestKind>(WIRED_CHEST_KIND_COINS);
    const [coins, setCoins] = useState(0);
    const [storedFurniItems, setStoredFurniItems] = useState<IChestFurniStoredItem[]>([]);
    const [selectedFurniKey, setSelectedFurniKey] = useState('');
    const [furniWithdrawAmount, setFurniWithdrawAmount] = useState('1');
    const [roomPreviewer, setRoomPreviewer] = useState<RoomPreviewer>(null);
    const [withdrawAmount, setWithdrawAmount] = useState(1);
    /** Bumped to re-read the chest's room object after it updates (AIR viewingChestUpdated). */
    const [, setObjectVersion] = useState(0);

    // Settings frame draft (AIR ChestSettingsUI reads the stuff data when it is shown).
    const [showSettings, setShowSettings] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [accessOpen, setAccessOpen] = useState(false);
    const [accessDonate, setAccessDonate] = useState(false);
    const [appearanceState, setAppearanceState] = useState(0);
    const [previewMode, setPreviewMode] = useState(0);
    const [previewAmount, setPreviewAmount] = useState(1);
    /** AIR: the upgrade button is disabled once the chest is wired; every save sends wiredEnabled = that. */
    const [wiredUpgradeDisabled, setWiredUpgradeDisabled] = useState(false);
    const [confirmWiredUpgrade, setConfirmWiredUpgrade] = useState(false);
    const [wiredUpgradeBuying, setWiredUpgradeBuying] = useState(false);

    // Notification settings frame draft (AIR ChestNotificationSettingsUI).
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifyFull, setNotifyFull] = useState(false);
    const [notifyDonation, setNotifyDonation] = useState(false);
    const [notifyWithdraw, setNotifyWithdraw] = useState(false);
    const [notifyEmpty, setNotifyEmpty] = useState(false);
    const [notifyWired, setNotifyWired] = useState(false);
    const [notifyMode, setNotifyMode] = useState(0);

    const [showUpgrade, setShowUpgrade] = useState(false);
    const [showLog, setShowLog] = useState(false);
    const [logRows, setLogRows] = useState<ChestLogRow[]>([]);
    const [upgradeQty, setUpgradeQty] = useState(1);
    const [showLockInfo, setShowLockInfo] = useState(false);
    const [lockInfoAnchor, setLockInfoAnchor] = useState<HTMLButtonElement>(null);
    const [logsPage, setLogsPage] = useState<WiredTransactionLogsPage>(null);
    const [upgradeResult, setUpgradeResult] = useState('');
    /** null shows the saved capacity; a string is what the owner is typing. */
    const [capacityDraft, setCapacityDraft] = useState<string | null>(null);
    const [furniSearchDraft, setFurniSearchDraft] = useState('');
    const [furniSearchQuery, setFurniSearchQuery] = useState('');

    /** The chest a ChestOpen (1595) was sent for; only its 988 / 44 answers open the window. */
    const openingIdRef = useRef(-1);

    /** The chest a View logs request was sent for; its first log page opens the transaction logs window. */
    const logsRequestRef = useRef(-1);

    const { showConfirm = null } = useNotification();
    const { getCurrencyAmount } = usePurse();
    const creditsWallet = getCurrencyAmount(-1);
    const diamondsWallet = getCurrencyAmount(5);
    const { roomSettings } = useWiredToolsState();

    const chestObject = readChestObject(itemId);
    const stuff = chestObject.data;
    const isFurni = kind === WIRED_CHEST_KIND_FURNI;
    const isStarter = isStarterChest(chestObject.className);
    const capacityMax = getWiredChestMaxCapacity(kind, isStarter, stuff.capacityLevel, configNumber);
    const used = isFurni ? storedFurniItems.length : coins;
    const isOwner = chestObject.ownerId > 0 && chestObject.ownerId === GetSessionDataManager().userId;
    const rights = getWiredChestRights({
        owner: isOwner,
        roomOwner: !!GetRoomSession()?.isRoomOwner,
        hasWiredRead: !!roomSettings?.canInspect,
        hasWiredWrite: !!roomSettings?.canModify,
        empty: used <= 0,
        data: stuff,
    });
    const layout = getWiredChestLayout(rights.canRead, stuff.wiredEnabled, kind);

    const furniEntries = useMemo(() => (isFurni ? groupStoredFurni(storedFurniItems) : []), [isFurni, storedFurniItems]);

    const syncSelectedFurniKey = useCallback((groups: ChestFurniGroup[]) => {
        setSelectedFurniKey((prev) =>
            groups.some((f) => f.key === prev) ? prev : groups.length ? groups[0].key : '',
        );
    }, []);

    const notifyModes = useMemo(
        () => [
            { value: 0, label: LocalizeText('wiredchests.notification_settings.notification_mode.when.0') },
            { value: 1, label: LocalizeText('wiredchests.notification_settings.notification_mode.when.1') },
        ],
        [],
    );

    const visibleFurniEntries = useMemo(() => {
        const q = furniSearchQuery.trim().toLowerCase();
        if (!q) return furniEntries;
        const terms = q.split(/\s+/).filter(Boolean);
        return furniEntries.filter((f) => {
            const label = groupLabel(f).toLowerCase();
            return terms.every((term) => label.includes(term));
        });
    }, [furniEntries, furniSearchQuery]);

    const showFurniSearch = furniEntries.length >= FURNI_SEARCH_THRESHOLD;

    const selectedGroup = furniEntries.find((f) => f.key === selectedFurniKey) ?? null;

    useEffect(() => {
        if (itemId <= 0 || !isFurni || !rights.canRead) return;

        const previewer = new RoomPreviewer(GetRoomEngine(), ++RoomPreviewer.PREVIEW_COUNTER);
        previewer.backgroundColor = null;
        previewer.centerWallItems = true;
        previewer.updateRoomWallsAndFloorVisibility(false, false);
        setRoomPreviewer(previewer);

        return () => {
            previewer.dispose();
            setRoomPreviewer(null);
        };
    }, [itemId, isFurni, rights.canRead]);

    useEffect(() => {
        if (!roomPreviewer) return;

        roomPreviewer.reset(false);

        if (!selectedGroup) return;

        if (selectedGroup.wallItem) {
            roomPreviewer.addWallItemIntoRoom(selectedGroup.baseItemId, new Vector3d(90), selectedGroup.legacyPosterId);
        } else {
            roomPreviewer.addFurnitureIntoRoom(selectedGroup.baseItemId, new Vector3d(90), selectedGroup.sample.stuffData, selectedGroup.sample.extra.toString());
        }

        roomPreviewer.setAutomaticStateChange(false);
    }, [roomPreviewer, selectedGroup]);

    useEffect(() => {
        syncSelectedFurniKey(furniEntries);
    }, [furniEntries, syncSelectedFurniKey]);

    // A chest set to open while someone looks inside stays open until we say we stopped, and the
    // window can go away without the close button ever being clicked -- leaving the room, reloading,
    // the widget unmounting. Saying goodbye from the cleanup covers every one of those.
    useEffect(() => {
        if (itemId <= 0) return;

        return () => {
            SendMessageComposer(new ChestCloseComposer(itemId));
        };
    }, [itemId]);

    const closeFrames = () => {
        setShowSettings(false);
        setShowNotifications(false);
        setConfirmWiredUpgrade(false);
        setShowUpgrade(false);
        setShowLockInfo(false);
    };

    // AIR WiredChestController.onOpenChest -> open(): ask for the contents.
    useMessageEvent<ChestOpenEvent>(ChestOpenEvent, (event) => {
        const chestId = event.getParser().chestId;

        if (chestId <= 0) return;

        openingIdRef.current = chestId;
        SendMessageComposer(new ChestOpenComposer(chestId));
    });

    const openChest = (chestId: number, chestKind: WiredChestKind) => {
        openingIdRef.current = -1;

        if (chestId !== itemId) {
            closeFrames();
            setFurniSearchDraft('');
            setFurniSearchQuery('');
        }

        setKind(chestKind);
        setItemId(chestId);
        setObjectVersion((value) => value + 1);
    };

    useMessageEvent<ChestCoinsEvent>(ChestCoinsEvent, (event) => {
        const p = event.getParser();

        if (p.isUpdate) {
            if (p.chestId === itemId && kind === WIRED_CHEST_KIND_COINS) setCoins(p.coins);
            return;
        }

        if (p.chestId !== openingIdRef.current) return;

        setCoins(p.coins);
        setStoredFurniItems([]);
        openChest(p.chestId, WIRED_CHEST_KIND_COINS);
    });

    const pendingFurniRef = useRef<IChestFurniStoredItem[]>([]);

    useMessageEvent<ChestFurniChunkEvent>(ChestFurniChunkEvent, (event) => {
        const p = event.getParser();

        if (p.chestId !== openingIdRef.current) return;

        if (p.fragmentNo === 0) pendingFurniRef.current = [];

        pendingFurniRef.current = [...pendingFurniRef.current, ...p.items];

        if (p.fragmentNo < p.totalFragments - 1) return;

        setStoredFurniItems(pendingFurniRef.current);
        pendingFurniRef.current = [];
        setCoins(0);
        openChest(p.chestId, WIRED_CHEST_KIND_FURNI);
    });

    useMessageEvent<ChestFurniUpdateEvent>(ChestFurniUpdateEvent, (event) => {
        const p = event.getParser();

        if (p.chestId !== itemId) return;

        setStoredFurniItems((prev) => {
            const removed = new Set(p.removedIds);
            return [...prev.filter((i) => !removed.has(i.inventoryId)), ...p.added];
        });
    });

    // AIR viewingChestUpdated: the window follows the chest's room object. The engine applies the update when it
    // handles the same message, so the read happens right after.
    const refreshObject = (objectId: number) => {
        if (objectId !== itemId) return;

        window.setTimeout(() => setObjectVersion((value) => value + 1), 0);
    };

    useMessageEvent<FurnitureFloorUpdateEvent>(FurnitureFloorUpdateEvent, (event) => refreshObject(event.getParser().item?.itemId));
    useMessageEvent<FurnitureDataEvent>(FurnitureDataEvent, (event) => refreshObject(event.getParser().furnitureId));

    useMessageEvent<ChestUpgradeResultEvent>(ChestUpgradeResultEvent, (event) => {
        const p = event.getParser();
        if (p.chestId !== itemId) return;

        if (p.successful) {
            setUpgradeResult('');
            setShowUpgrade(false);
            return;
        }

        // Every refusal has its own reason text; an unknown code still says something rather than
        // leaving the button looking like it was ignored.
        setUpgradeResult(
            LocalizeText(
                'wiredchests.upgrade.result.error',
                ['reason'],
                [localizeWithFallback(`wiredchests.upgrade.result.error.${ p.resultCode }`, '')],
            ),
        );
    });

    useMessageEvent<WiredTransactionLogListEvent>(WiredTransactionLogListEvent, (event) => {
        const parser = event.getParser();

        if (!parser || parser.listType !== WIRED_TRANSACTION_LIST_CHEST || parser.listId !== logsRequestRef.current || parser.amount !== WIRED_TRANSACTION_LOGS_PAGE_SIZE) return;

        logsRequestRef.current = -1;
        setLogsPage({ listType: parser.listType, listId: parser.listId, totalLogs: parser.totalLogs, page: parser.page, logs: [...parser.logs] });
    });

    useMessageEvent<ChestLogEvent>(ChestLogEvent, (event) => {
        const p = event.getParser();
        setLogRows(p.rows.map((r) => ({ ...r })));
        setShowLog(true);
    });

    // ChestSettingsUpdated (2159) arrives only for a successful save and closes the matching frame; a refused save
    // leaves the frame open.
    useMessageEvent<ChestSettingsUpdatedEvent>(ChestSettingsUpdatedEvent, (event) => {
        const p = event.getParser();

        if (p.chestId !== itemId) return;

        if (p.isNotificationPreferences) {
            setShowNotifications(false);
            return;
        }

        setShowSettings(false);
        setConfirmWiredUpgrade(false);
        setWiredUpgradeBuying(false);
    });

    // AIR viewingChestUpdated: someone without read rights keeps the window only while everyone may open the chest.
    const lostAccess = itemId > 0 && !rights.canRead && !stuff.everyoneCanOpen;

    useEffect(() => {
        if (lostAccess) setItemId(-1);
    }, [lostAccess]);

    if (itemId === -1) return null;

    // Scene image follows the official CoinChestSubController.CHEST_STATES thresholds:
    // absolute coin count (NOT a fill ratio) — 0 -> zero, >=1 -> low, >=20 -> medium, >=100 -> high.
    const sceneImg = coins >= 100 ? sceneHigh : coins >= 20 ? sceneMedium : coins >= 1 ? sceneLow : sceneZero;

    const chestTypeLabel = isFurni
        ? LocalizeText('wiredchests.furni_chest')
        : LocalizeText('wiredchests.coin_chest');
    const chestName = stuff.name || chestTypeLabel;

    const close = () => {
        closeFrames();
        openingIdRef.current = -1;
        setItemId(-1);
        setStoredFurniItems([]);
        setCoins(0);
    };
    const openSettings = () => {
        setName(stuff.name);
        setDescription(stuff.description);
        setAccessOpen(stuff.everyoneCanOpen);
        setAccessDonate(stuff.everyoneCanDonate);
        setAppearanceState(stuff.stateMode);
        setPreviewMode(stuff.previewMode);
        setPreviewAmount(stuff.previewAmount);
        setWiredUpgradeDisabled(stuff.wiredEnabled);
        setWiredUpgradeBuying(false);
        setShowSettings(true);
    };
    const openNotifications = () => {
        setNotifyFull(stuff.notifyChestFull);
        setNotifyDonation(stuff.notifyDonation);
        setNotifyWithdraw(stuff.notifySomeoneWithdraws);
        setNotifyEmpty(stuff.notifyChestEmpty);
        setNotifyWired(stuff.notifyWiredTransaction);
        setNotifyMode(stuff.notifyMode);
        setShowNotifications(true);
    };
    const withdraw = () => {
        if (withdrawAmount <= 0) return;
        SendMessageComposer(new ChestWithdrawCoinsComposer(itemId, withdrawAmount));
    };
    /** AIR windowManager.confirm: the request goes out only after OK. */
    const confirm = (titleKey: string, descKey: string, onOk: () => void) =>
        showConfirm(LocalizeText(descKey).replace(/\\n/g, '\n'), onOk, () => {}, LocalizeText('generic.ok'), LocalizeText('generic.cancel'), LocalizeText(titleKey));
    const withdrawAll = () => confirm('wiredchests.withdraw_all.confirm.title', 'wiredchests.withdraw_all.confirm.desc', () => SendMessageComposer(new ChestWithdrawAllComposer(itemId)));
    const viewLogs = () => {
        logsRequestRef.current = itemId;
        SendMessageComposer(new WiredTransactionGetChestLogsComposer(itemId, WIRED_TRANSACTION_LOGS_PAGE_SIZE, 1));
    };
    const withdrawFurni = () => {
        const amount = parseInt(furniWithdrawAmount, 10);

        if (!selectedGroup || isNaN(amount)) return;
        SendMessageComposer(
            new ChestWithdrawFurniComposer(
                itemId,
                selectedGroup.wallItem,
                selectedGroup.baseItemId,
                selectedGroup.legacyPosterId,
                amount,
            ),
        );
    };
    /** AIR deposits furni and credit furni through the wired trade the server opens for 3268. */
    const startDeposit = () => {
        SendMessageComposer(new FurnitureListComposer());
        SendMessageComposer(new ChestStartDepositComposer(itemId));
    };
    const sendSettings = (wiredEnabled: boolean) => {
        SendMessageComposer(
            new ChestSaveSettingsComposer(
                itemId,
                name,
                description,
                accessOpen,
                accessDonate,
                appearanceState,
                previewMode,
                previewAmount,
                wiredEnabled,
            ),
        );
    };
    const saveSettings = () => sendSettings(wiredUpgradeDisabled);
    /** AIR ChestSettingsUI.confirmUpgrade: disable the button, show the checkmark, then the normal save with wired on. */
    const buyWiredUpgrade = () => {
        setWiredUpgradeBuying(true);
        setWiredUpgradeDisabled(true);
        sendSettings(true);
    };
    /**
     * The three switches on this window save the moment they are touched, the way the official one
     * does — no save button, because closing a chest is not a settings change you review first.
     */
    const saveOptions = (next: { locked?: boolean; autoLock?: boolean; capacity?: number }) => {
        const options = getWiredChestOptions(stuff, next);

        SendMessageComposer(new ChestSaveOptionsComposer(itemId, options.locked, options.autoLock, options.capacity));
    };

    /**
     * How many steps are still buyable. The official offers 1..remaining rather than a fixed list, so
     * the dropdown can never propose a purchase the chest has no room for.
     */
    const upgradeStep = getWiredChestMaxCapacity(kind, false, 1, configNumber) - getWiredChestMaxCapacity(kind, false, 0, configNumber);
    const upgradesLeft = isStarter || upgradeStep <= 0 ? 0 : Math.max(0, Math.floor(((isFurni ? FURNI_MAX_CAPACITY : COIN_MAX_CAPACITY) - capacityMax) / upgradeStep));
    const upgradeOptions = Array.from(
        { length: Math.min(upgradesLeft, MAX_UPGRADES_PER_PURCHASE) },
        (unused, index) => index + 1,
    );

    /** The reason the buy button is off, in the official's own order: capacity first, then money. */
    const upgradeError = !upgradesLeft
        ? 'wiredchests.upgrade.error.reason.at_capacity'
        : creditsWallet < COST_CREDITS * upgradeQty || diamondsWallet < COST_DIAMONDS * upgradeQty
          ? 'wiredchests.upgrade.error.reason.not_enough_currency'
          : '';

    /** AIR onAttemptLockChest / onAttemptUnlockChest: locking asks only someone who is not the owner, unlocking always asks. */
    const toggleLock = (locked: boolean) => {
        if (locked && isOwner) {
            saveOptions({ locked });
            return;
        }

        const key = locked ? 'lock' : 'unlock';
        confirm(`wiredchests.${key}.confirm.title`, `wiredchests.${key}.confirm.desc`, () => saveOptions({ locked }));
    };
    /** AIR onCapacityChange: a value above the maximum is replaced by the maximum while typing. */
    const changeCapacity = (value: string) => {
        const digits = value.replace(NON_DIGITS, '');

        setCapacityDraft(parseInt(digits, 10) > capacityMax ? String(capacityMax) : digits);
    };
    const upgradeTooltip = isStarter
        ? LocalizeText('wiredchests.upgrade.result.error.10')
        : isOwner
          ? ''
          : LocalizeText('wiredchests.upgrade.error.reason.not_owner');
    const commitCapacity = () => {
        const parsed = parseInt(capacityDraft ?? '', 10);
        const next = Math.min(Math.max(isNaN(parsed) ? stuff.capacity : parsed, 0), capacityMax);

        setCapacityDraft(null);
        if (next !== stuff.capacity) saveOptions({ capacity: next });
    };
    const saveNotifications = () => {
        SendMessageComposer(new ChestSaveNotificationsComposer(itemId, notifyMode, notifyFull, notifyDonation, notifyWithdraw, notifyEmpty, notifyWired));
    };
    const buyUpgrade = () => {
        setUpgradeResult('');
        SendMessageComposer(new ChestUpgradeCapacityComposer(itemId, upgradeQty));
    };

    return (
        <>
            {/* ===== MAIN WINDOW (chest_generic) ===== */}
            <VoltCardView
                className={`volt-chest-air volt-widget-chest ${isFurni ? 'is-furni' : 'is-coins'}`}
                frameStyle={3}
                initialPosition={{ x: 60, y: 50 }}
                isResizable={isFurni}
                style={isFurni ? { width: 460, height: 473 } : { width: 415, height: 472 }}
                unconstrainedPosition
            >
                <VoltCardHeaderView headerText="" onCloseClick={close}>
                    <ChestTitle text={chestName} />
                </VoltCardHeaderView>
                <div className="volt-chest-air__header">
                    <ChestText bold background={0xdadada} blend={0.6} className="volt-chest-air__desc" maxWidth={380} text={stuff.description || LocalizeText('wiredchests.description_placeholder')} />
                    {layout.showNotificationSettings && (
                        <ChestIconButton airName="notification_settings_button" disabled={!isOwner} icon={bellIcon} iconAt={[6, 4]} style={{ right: 39 }} title={LocalizeText('tooltip.notification_settings')} onClick={openNotifications} />
                    )}
                    {layout.showSettings && (
                        <ChestIconButton airName="settings_button" disabled={!isOwner} icon={gearIcon} iconAt={[5, 5]} style={{ right: 10 }} title={LocalizeText('tooltip.settings')} onClick={openSettings} />
                    )}
                </div>
                <div className="volt-chest-air__contents">
                    {isFurni ? (
                        <FurniChestContentsView
                            canWithdraw={rights.canWithdraw}
                            entries={visibleFurniEntries}
                            label={groupLabel}
                            roomPreviewer={roomPreviewer}
                            searchDraft={furniSearchDraft}
                            selectedGroup={selectedGroup}
                            selectedKey={selectedFurniKey}
                            showSearch={showFurniSearch}
                            withdrawAmount={furniWithdrawAmount}
                            onSearchApply={setFurniSearchQuery}
                            onSearchClear={() => {
                                setFurniSearchDraft('');
                                setFurniSearchQuery('');
                            }}
                            onSearchDraftChange={setFurniSearchDraft}
                            onSelect={setSelectedFurniKey}
                            onWithdraw={withdrawFurni}
                            onWithdrawAmountChange={setFurniWithdrawAmount}
                        />
                    ) : (
                        <div className="volt-chest-air__coins">
                            {/* coins_chest_contents: the 324x228 scene at (44,24); overlay coordinates are relative to it. */}
                            <div style={{ position: 'absolute', left: 44, top: 24, width: 324, height: 228 }}>
                                <img alt="" draggable={false} height={228} src={sceneImg} style={{ imageRendering: PIXEL_ART_RENDERING, display: 'block' }} width={324} />
                                <div style={{ position: 'absolute', left: 11, top: 75, width: 45, color: '#5b4632', fontWeight: 'bold', fontSize: 11, lineHeight: 1, textAlign: 'left' }}>
                                    {LocalizeText('wiredchests.coin_chest.balance')}
                                </div>
                                <div style={{ position: 'absolute', left: 9, top: 90, width: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                    <span style={{ fontSize: 12, fontWeight: 'bold', color: '#5b4632' }}>{coins}</span>
                                    <LayoutCurrencyIcon style={{ width: 15, height: 15 }} type={CREDITS} />
                                </div>
                                <div style={{ position: 'absolute', left: 160, top: 18, display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <input
                                        className="volt-chest__input volt-chest__input--coin"
                                        inputMode="numeric"
                                        type="text"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(Math.max(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))}
                                    />
                                    <ChestButton fixed disabled={!rights.canWithdraw} onClick={withdraw}>
                                        {LocalizeText('wiredchests.withdraw')}
                                    </ChestButton>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="volt-chest-air__footer">
                    {layout.showLockingOptions && (
                        <button
                            ref={setLockInfoAnchor}
                            aria-label={LocalizeText('wiredchests.lock_info.title')}
                            className="volt-chest-air__info"
                            data-air-name="lock_info_button"
                            type="button"
                            onClick={() => setShowLockInfo(true)}
                        />
                    )}
                    <div className="volt-chest-air__options">
                        {layout.showLockingOptions && (
                            <div className="volt-chest-air__locking">
                                <ChestCheckbox airName="lock_chest_cbx" checked={stuff.locked} disabled={!rights.canToggleLock} label={LocalizeText('wiredchests.lock_chest')} onToggle={toggleLock} />
                                <ChestCheckbox airName="auto_lock_chest_cbx" checked={stuff.autoLock} disabled={!isOwner} label={LocalizeText('wiredchests.auto_lock_chest')} style={{ top: 20 }} onToggle={(autoLock) => saveOptions({ autoLock })} />
                                <div className="volt-chest-air__splitter" style={{ top: 40 }} />
                            </div>
                        )}
                        {layout.showCapacityOptions && (
                            <div className="volt-chest-air__capacity">
                                {stuff.wiredEnabled ? (
                                    <div className="volt-chest-air__capacity-override">
                                        <ChestText background={0xdadada} text={LocalizeText('wiredchests.capacity')} />
                                        <span className={`volt-chest-air__input-border${isOwner ? '' : ' is-disabled'}`}>
                                            <input
                                                data-air-name="capacity_input"
                                                disabled={!isOwner}
                                                inputMode="numeric"
                                                type="text"
                                                value={capacityDraft ?? String(stuff.capacity)}
                                                onBlur={commitCapacity}
                                                onChange={(e) => changeCapacity(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') commitCapacity();
                                                }}
                                            />
                                        </span>
                                    </div>
                                ) : (
                                    <ChestText background={0xdadada} blend={0.6} className="volt-chest-air__item-count" text={LocalizeText('wiredchests.space_used2', ['count', 'total'], [String(used), String(stuff.capacity)])} />
                                )}
                                <div className="volt-chest-air__upgrade">
                                    <ChestText background={0xdadada} blend={0.6} text={LocalizeText('wiredchests.max_capacity', ['max_capacity'], [String(capacityMax)])} />
                                    <span title={upgradeTooltip}>
                                        <button aria-label={LocalizeText('wiredchests.upgrade.title')} className="volt-chest-air__plus" data-air-name="upgrade_capacity_btn" disabled={!isOwner || isStarter} type="button" onClick={() => setShowUpgrade(true)} />
                                    </span>
                                </div>
                                <div className="volt-chest-air__splitter" style={{ top: 29 }} />
                            </div>
                        )}
                    </div>
                    <div className="volt-chest-air__buttons">
                        {layout.showWithdrawAll && (
                            <ChestShinyButton airName="withdraw_all_btn" caption={LocalizeText('wiredchests.withdraw_all')} disabled={!rights.canWithdraw} rect={[17, 0, 89, 30]} onClick={withdrawAll} />
                        )}
                        <ChestShinyButton airName="start_deposit_btn" caption={LocalizeText(layout.depositKey)} disabled={!rights.canDeposit} rect={[layout.showWithdrawAll ? 119 : 17, 0, 92, 30]} onClick={startDeposit} />
                        {layout.showLogs && (
                            <span className="volt-chest-air__logs">
                                <ChestShinyButton airName="view_logs_btn" caption={LocalizeText('wiredchests.view_logs')} disabled={!rights.canRead} rect={[0, 0, 73, 30]} onClick={viewLogs} />
                            </span>
                        )}
                        {!rights.canRead && (
                            <ChestText background={0xdadada} blend={0.6} className="volt-chest-air__item-count-bottom" text={LocalizeText('wiredchests.space_used', ['count', 'total'], [String(used), String(stuff.capacity)])} />
                        )}
                    </div>
                </div>
            </VoltCardView>
            {showLockInfo && lockInfoAnchor && <ChestLockInfoBubble anchor={lockInfoAnchor} onClose={() => setShowLockInfo(false)} />}
            {logsPage && <WiredTransactionLogsWindow data={logsPage} onClose={() => setLogsPage(null)} />}

            {/* ===== SETTINGS ===== */}
            {showSettings && (
                <VoltCardView className="volt-widget-chest-settings volt-chest-settings" theme="primary-slim" frameStyle={3} isResizable={false} style={{ width: 300 }}>
                    <VoltCardHeaderView
                        headerText={LocalizeText('wiredchests.settings.title', ['chest_type'], [chestTypeLabel])}
                        onCloseClick={() => setShowSettings(false)}
                    />
                    <VoltCardContentView>
                        <Column gap={2}>
                            <ChestSettingsSection title={LocalizeText('wiredchests.settings.access')}>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-check-input" checked={accessOpen} onChange={(e) => setAccessOpen(e.target.checked)} />
                                <Text small>{LocalizeText('wiredchests.settings.access.open')}</Text>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-check-input" checked={accessDonate} onChange={(e) => setAccessDonate(e.target.checked)} />
                                <Text small>{LocalizeText('wiredchests.settings.access.donate')}</Text>
                            </label>
                            </ChestSettingsSection>
                            <ChestSettingsSection title={LocalizeText('wiredchests.settings.info')}>
                            <Text small>{LocalizeText('wiredchests.settings.info.name')}</Text>
                            <input className="form-control form-control-sm" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
                            <Text small>{LocalizeText('wiredchests.settings.info.desc')}</Text>
                            <textarea className="form-control form-control-sm" rows={4} maxLength={200} style={{ height: 64 }} value={description} onChange={(e) => setDescription(e.target.value)} />
                            </ChestSettingsSection>
                            <ChestSettingsSection title={LocalizeText('wiredchests.settings.appearance')}>
                                <ChestAppearanceFields isFurni={isFurni} state={appearanceState} previewMode={previewMode} previewAmount={previewAmount}
                                    onStateChange={setAppearanceState} onPreviewModeChange={setPreviewMode} onPreviewAmountChange={setPreviewAmount} />
                            </ChestSettingsSection>
                            <ChestSettingsSection title={localizeWithFallback('wiredchests.settings.wired', 'Wired transactions')}>
                                <Flex alignItems="center" gap={2}>
                                    <ChestButton wide disabled={wiredUpgradeDisabled} onClick={() => setConfirmWiredUpgrade(true)}>
                                        <span className="inline-flex items-center gap-1">
                                            <img src={wiredIcon} width={16} height={16} alt="" draggable={false} style={{ imageRendering: PIXEL_ART_RENDERING }} />
                                            {localizeWithFallback('wiredchests.settings.wired.upgrade', 'Upgrade to Wired Chest')}
                                        </span>
                                    </ChestButton>
                                    {wiredUpgradeDisabled && (
                                        <img src={checkmarkIcon} alt="" draggable={false} style={{ imageRendering: PIXEL_ART_RENDERING }} />
                                    )}
                                </Flex>
                            </ChestSettingsSection>
                            <div className="volt-chest__actions">
                                <ChestButton wide onClick={saveSettings}>
                                    {LocalizeText('wiredchests.ready')}
                                </ChestButton>
                                <ChestButton wide onClick={() => setShowSettings(false)}>
                                    {LocalizeText('wiredchests.cancel')}
                                </ChestButton>
                            </div>
                        </Column>
                    </VoltCardContentView>
                </VoltCardView>
            )}

            {/* ===== NOTIFICATIONS ===== */}
            {showNotifications && (
                <VoltCardView className="volt-widget-chest-notifications volt-chest-settings" theme="primary-slim" frameStyle={3} isResizable={false} style={{ width: 350 }}>
                    <VoltCardHeaderView
                        headerText={LocalizeText('wiredchests.notification_settings.title', ['chest_type'], [chestTypeLabel])}
                        onCloseClick={() => setShowNotifications(false)}
                    />
                    <VoltCardContentView>
                        <Column gap={2}>
                            <Text bold>{LocalizeText('wiredchests.notification_settings.notification_info')}</Text>
                            <Text small>{LocalizeText('wiredchests.notification_settings.notification_info.desc')}</Text>
                            <ChestSettingsSection title={LocalizeText('wiredchests.notification_settings.enable_notifications')}>
                            <Text bold>{LocalizeText('wiredchests.notification_settings.enable_notifications.generic')}</Text>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-check-input" checked={notifyFull} onChange={(e) => setNotifyFull(e.target.checked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.generic.0')}</Text>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-check-input" checked={notifyDonation} onChange={(e) => setNotifyDonation(e.target.checked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.generic.1')}</Text>
                            </label>
                            <fieldset disabled={!stuff.wiredEnabled} className="volt-chest-settings__wired-notifications">
                            <Text bold>{LocalizeText('wiredchests.notification_settings.enable_notifications.wired')}</Text>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-check-input" checked={notifyWithdraw} onChange={(e) => setNotifyWithdraw(e.target.checked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.wired.0')}</Text>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-check-input" checked={notifyEmpty} onChange={(e) => setNotifyEmpty(e.target.checked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.wired.1')}</Text>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-check-input" checked={notifyWired} onChange={(e) => setNotifyWired(e.target.checked)} />
                                <Text small>{LocalizeText('wiredchests.notification_settings.enable_notifications.wired.2')}</Text>
                            </label>
                            </fieldset>
                            </ChestSettingsSection>
                            <ChestSettingsSection title={LocalizeText('wiredchests.notification_settings.notification_mode')}>
                                <Text bold>{LocalizeText('wiredchests.notification_settings.notification_mode.when')}</Text>
                                <HabboDropMenuView<number> skinStyle={3} label={LocalizeText('wiredchests.notification_settings.notification_mode.when')} value={notifyMode} options={notifyModes} onSelect={setNotifyMode} />
                            </ChestSettingsSection>
                            <div className="volt-chest__actions">
                                <ChestButton wide onClick={saveNotifications}>
                                    {LocalizeText('wiredchests.ready')}
                                </ChestButton>
                                <ChestButton wide onClick={() => setShowNotifications(false)}>
                                    {LocalizeText('wiredchests.cancel')}
                                </ChestButton>
                            </div>
                        </Column>
                    </VoltCardContentView>
                </VoltCardView>
            )}

            {/* ===== UPGRADE (chest_upgrade) ===== */}
            {showUpgrade && (
                <ChestUpgradeView
                    chestTypeId={chestObject.typeId}
                    costCredits={COST_CREDITS}
                    costDiamonds={COST_DIAMONDS}
                    currentCapacity={capacityMax}
                    error={upgradeResult || (upgradeError ? LocalizeText('wiredchests.upgrade.error', ['reason'], [localizeWithFallback(upgradeError, '')]) : '')}
                    options={upgradeOptions}
                    quantity={upgradeQty}
                    step={upgradeStep}
                    onBuy={buyUpgrade}
                    onClose={() => setShowUpgrade(false)}
                    onQuantityChange={setUpgradeQty}
                />
            )}

            {/* ===== LOG ===== */}
            {showLog && (
                <VoltCardView className="volt-widget-chest-log" theme="primary-slim" style={{ width: 520 }}>
                    <VoltCardHeaderView headerText={LocalizeText('wiredchests.logs.title')} onCloseClick={() => setShowLog(false)} />
                    <VoltCardContentView>
                        <Column gap={1}>
                            <Text small>{LocalizeText('wiredchests.logs.chest_id', ['id'], [String(itemId)])}</Text>
                            <Flex gap={2} className="border-b pb-1">
                                <Text bold className="w-20">
                                    {LocalizeText('wiredchests.logs.col.type')}
                                </Text>
                                <Text bold className="w-24">
                                    {LocalizeText('wiredchests.logs.col.timestamp')}
                                </Text>
                                <Text bold className="grow!">
                                    {LocalizeText('wiredchests.logs.col.username')}
                                </Text>
                                <Text bold className="w-16">
                                    {LocalizeText('wiredchests.logs.col.withdraws')}
                                </Text>
                                <Text bold className="w-16">
                                    {LocalizeText('wiredchests.logs.col.deposits')}
                                </Text>
                            </Flex>
                            {logRows.length === 0 && <Text small>{LocalizeText('wiredchests.logs.empty')}</Text>}
                            {logRows.map((r, i) => (
                                <Flex key={i} gap={2}>
                                    <Text small className="w-20">
                                        {r.type === 'withdraw'
                                            ? LocalizeText('wiredchests.logs.type.withdraw')
                                            : LocalizeText('wiredchests.logs.type.deposit')}
                                    </Text>
                                    <Text small className="w-24">
                                        {new Date(r.timestamp * 1000).toLocaleString()}
                                    </Text>
                                    <Text small className="grow!">
                                        {r.userName}
                                    </Text>
                                    <Text small className="w-16">
                                        {r.withdrawn || ''}
                                    </Text>
                                    <Text small className="w-16">
                                        {r.deposited || ''}
                                    </Text>
                                </Flex>
                            ))}
                        </Column>
                    </VoltCardContentView>
                </VoltCardView>
            )}

            {/* ===== WIRED UPGRADE CONFIRM (AIR WiredChestWiredUpdateConfirmationView) ===== */}
            {confirmWiredUpgrade && showSettings && (
                <VoltCardView className="volt-widget-chest-confirm" theme="primary-slim" style={{ width: 360 }}>
                    <VoltCardHeaderView
                        headerText={localizeWithFallback('wiredchests.upgrade.title', 'Chest upgrade')}
                        onCloseClick={() => setConfirmWiredUpgrade(false)}
                    />
                    <VoltCardContentView>
                        <Column gap={2}>
                            <Flex alignItems="center" gap={2}>
                                <div className="volt-chest__upgrade-preview">
                                    {chestObject.typeId > 0 && (
                                        <LayoutFurniImageView
                                            productType={FurnitureType.FLOOR}
                                            productClassId={chestObject.typeId}
                                            direction={2}
                                        />
                                    )}
                                </div>
                                <Column gap={1}>
                                    <Text bold>{LocalizeText('wiredchests.upgrade.wired.info')}</Text>
                                    <Text small dangerouslySetInnerHTML={{ __html: SanitizeHtml(LocalizeText('wiredchests.big_fat_warning')) }} />
                                </Column>
                            </Flex>
                            <Text bold>{LocalizeText('wiredchests.upgrade.wired.cost')}</Text>
                            {isStarter && (
                                <Text small className="volt-chest__upgrade-error">
                                    {LocalizeText(
                                        'wiredchests.upgrade.wired.error',
                                        ['reason'],
                                        [LocalizeText('wiredchests.upgrade.wired.error.reason.rookie_chest')],
                                    )}
                                </Text>
                            )}
                            <div className="volt-chest__actions">
                                <ChestButton wide onClick={() => setConfirmWiredUpgrade(false)}>
                                    {LocalizeText('wiredchests.cancel')}
                                </ChestButton>
                                <ChestButton wide disabled={isStarter || wiredUpgradeBuying} onClick={buyWiredUpgrade}>
                                    {LocalizeText('wiredchests.upgrade.buy')}
                                </ChestButton>
                            </div>
                        </Column>
                    </VoltCardContentView>
                </VoltCardView>
            )}

        </>
    );
};
