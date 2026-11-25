import { CreateLinkEvent, Dispose, DropBounce, EaseOut, GetSessionDataManager, JumpBy, Motions, VoltToolbarAnimateIconEvent, PerkEnum, Queue, SessionDataPreferencesEvent, Wait } from '@volt/renderer';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { CSSProperties, FC, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Permission } from '../../api/permissions';
import { GetConfigurationValue, IsTouchLayout, localizeWithFallback, MessengerIconState, OpenMessengerChat, useVoltLayout, VisitDesktop } from '../../api';
import dividerImg from '../../assets/images/toolbar/air/divider.png';
import memenuBgImg from '../../assets/images/toolbar/air/memenu-bg.png';
import memenuCircleImg from '../../assets/images/toolbar/air/memenu-circle.png';
import { Flex, LayoutAvatarImageView, LayoutItemCountView } from '../../common';
import { useAchievements, useBuildHeight, useDailyTasks, useFriends, useHasPermission, useInventoryUnseenTracker, useMessageEvent, useMessenger, useVoltEvent, useOpenIssueCount, useRewardTracks, useSessionInfo, useWiredTools } from '../../hooks';
import { useGroupForumUnreadStore } from '../../state/groupForumUnreadStore';
import { usePerkAllowed } from '../../state/perkAllowancesStore';
import { AIR_RAISED_CHAT_BOTTOM } from './bottomDockLayout';
import { ToolbarItemView } from './ToolbarItemView';
import { ToolbarMeView } from './ToolbarMeView';
import { ToolbarProgressionView } from './ToolbarProgressionView';
import { ToolbarTouchView } from './ToolbarTouchView';
import { ToolbarUnseenCountView } from './ToolbarUnseenCountView';

const containerVariants: Variants = {
    hidden: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
    visible: { transition: { staggerChildren: 0.025 } }
};
const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.8 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 22 } }
};

const shellVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 }
};

const SHELL_TRANSITION = { type: 'spring' as const, stiffness: 260, damping: 26 };
const NAV_TRANSITION = { type: 'spring' as const, stiffness: 300, damping: 28 };
const ME_POPOVER_TRANSITION = { type: 'spring' as const, stiffness: 420, damping: 28 };
const LEFT_COLLAPSED_STORAGE_KEY = 'nitro.toolbar.leftCollapsed';
// UI flag 1 (SessionDataManager.setFriendBarState): set while the friend bar is expanded.
const FRIEND_BAR_UI_FLAG = 1;


const readCollapsedPreference = (key: string): boolean =>
{
    if(typeof window === 'undefined') return false;

    try
    {
        return window.localStorage.getItem(key) === '1';
    }
    catch
    {
        return false;
    }
};

export const ToolbarView: FC<{ isInRoom: boolean }> = props =>
{
    const { isInRoom } = props;
    const [ isMeExpanded, setMeExpanded ] = useState(false);
    const [ isProgressionExpanded, setProgressionExpanded ] = useState(false);
    const [ leftCollapsed, setLeftCollapsed ] = useState(() => readCollapsedPreference(LEFT_COLLAPSED_STORAGE_KEY));
    const [ rightCollapsed, setRightCollapsed ] = useState(() => !((GetSessionDataManager()?.uiFlags ?? 0) & FRIEND_BAR_UI_FLAG));
    const useGuideTool = usePerkAllowed(PerkEnum.USE_GUIDE_TOOL);
    const cameraAllowed = usePerkAllowed(PerkEnum.CAMERA);
    const leftDockRef = useRef<HTMLDivElement>(null);
    const rightDockRef = useRef<HTMLDivElement>(null);
    const meSlotRef = useRef<HTMLDivElement>(null);
    const progressionSlotRef = useRef<HTMLDivElement>(null);
    const meMenuRef = useRef<HTMLDivElement>(null);
    const progressionMenuRef = useRef<HTMLDivElement>(null);
    const { userFigure = null } = useSessionInfo();
    const { getFullCount = 0 } = useInventoryUnseenTracker();
    const { getTotalUnseen = 0 } = useAchievements();
    const { unseenCount: unseenDailyTaskCount = 0 } = useDailyTasks();
    const { tracks: rewardTracks = [], unseenCount: unseenRewardTrackCount = 0 } = useRewardTracks();
    // HabboToolbar.setUnseenItemCount("HTIE_ICON_PROGRESSION", unseenProgMenuCount): achievements + daily tasks + reward track rewards.
    const unseenProgMenuCount = getTotalUnseen + unseenDailyTaskCount + unseenRewardTrackCount;
    // HabboToolbar.onUnseenForumsCountUpdate -> setUnseenItemCount("HTIE_ICON_MEMENU", unseenMeMenuCount): the Me menu counts the forums with unread messages.
    const unreadForumsCount = useGroupForumUnreadStore((state) => state.unreadForumsCount);
    const { requests = [] } = useFriends();
    const { iconState = MessengerIconState.HIDDEN } = useMessenger();
    const { openMonitor, showToolbarButton } = useWiredTools();
    const { available: buildHeightAvailable, toggle: toggleBuildHeight } = useBuildHeight();
    const isMod = useHasPermission(Permission.ModerationTool);
    const openIssueCount = useOpenIssueCount();
    const openTicketsCount = isMod ? openIssueCount : 0;
    const visibilityVariant = 'visible';
    const layout = useVoltLayout();
    const touchLayout = IsTouchLayout(layout);
    const desktopBlockClasses = touchLayout ? 'hidden' : 'block';
    const desktopFlexClasses = touchLayout ? 'hidden' : 'flex';
    const storiesEnabled = useMemo(() => GetConfigurationValue<boolean>('toolbar.stories.enabled', false), []);
    // CAMERA icon: room only, camera.launch.ui.position "bottom-icons" and the CAMERA perk.
    const cameraInBottomBar = GetConfigurationValue<string>('camera.launch.ui.position', 'bottom-icons') === 'bottom-icons';
    const cameraAvailable = isInRoom && cameraInBottomBar && cameraAllowed;
    // BottomBarLeft.as:191-199: only games_icon_enabled shows HTIE_ICON_GAMES; habbo.com sets it to false.
    const gamesAvailable = GetConfigurationValue<boolean>('games_icon_enabled', false);
    // BUILDER (HTIE_ICON_BUILDER): next to the catalogue in the room and hotel view while builders.club.enabled is on.
    const buildersClubEnabled = GetConfigurationValue<boolean>('builders.club.enabled', true);
    const [ messengerNotifyFrame, setMessengerNotifyFrame ] = useState(0);
    const chatFrameStyle = useMemo<CSSProperties | undefined>(() =>
    {
        if(touchLayout) return undefined;

        // chatinput_window_new keeps its place above the bottom bar; it never moves into the bar.
        return { bottom: `${ AIR_RAISED_CHAT_BOTTOM }px` };
    }, [ touchLayout ]);

    const railMaxWidthClass = 'max-w-[calc(50vw-12px)]';
    const leftNavVariants = useMemo<Variants>(() => ({
        hidden: { opacity: 0, x: isInRoom ? -10 : 0, y: isInRoom ? 0 : 8, pointerEvents: 'none' },
        visible: { opacity: 1, x: 0, y: 0, pointerEvents: 'auto' }
    }), [ isInRoom ]);
    const rightNavVariants = useMemo<Variants>(() => ({
        hidden: { opacity: 0, x: 10, pointerEvents: 'none' },
        visible: { opacity: 1, x: 0, pointerEvents: 'auto' }
    }), []);

    useEffect(() =>
    {
        if(iconState !== MessengerIconState.UNREAD)
        {
            setMessengerNotifyFrame(0);
            return;
        }

        const interval = window.setInterval(() => setMessengerNotifyFrame(value => (value === 0 ? 1 : 0)), 500);

        return () => window.clearInterval(interval);
    }, [ iconState ]);

    useEffect(() =>
    {
        try
        {
            window.localStorage.setItem(LEFT_COLLAPSED_STORAGE_KEY, leftCollapsed ? '1' : '0');
        }
        catch
        {
        }
    }, [ leftCollapsed ]);

    useVoltEvent<SessionDataPreferencesEvent>(SessionDataPreferencesEvent.UPDATED, event => setRightCollapsed(!(event.uiFlags & FRIEND_BAR_UI_FLAG)));

    const toggleFriendBar = (collapsed: boolean) =>
    {
        setRightCollapsed(collapsed);
        GetSessionDataManager()?.setFriendBarState(!collapsed);
    };

    useLayoutEffect(() =>
    {
        if(touchLayout) return;

        const positionMenus = () =>
        {
            for(const [ slot, menu ] of [
                [ meSlotRef.current, meMenuRef.current ],
                [ progressionSlotRef.current, progressionMenuRef.current ]
            ])
            {
                if(!slot || !menu) continue;

                const bounds = slot.getBoundingClientRect();
                const left = bounds.left + bounds.width / 2 - menu.offsetWidth / 2;

                menu.style.left = `${ Math.round(Math.max(3, Math.min(left, window.innerWidth - menu.offsetWidth - 3))) }px`;
            }
        };

        positionMenus();

        const observer = new ResizeObserver(positionMenus);

        for(const element of [ leftDockRef.current, meMenuRef.current, progressionMenuRef.current ])
        {
            if(element) observer.observe(element);
        }

        window.addEventListener('resize', positionMenus);

        return () =>
        {
            observer.disconnect();
            window.removeEventListener('resize', positionMenus);
        };
    }, [ isMeExpanded, isProgressionExpanded, leftCollapsed, touchLayout ]);


    useVoltEvent<VoltToolbarAnimateIconEvent>(VoltToolbarAnimateIconEvent.ANIMATE_ICON, event =>
    {
        const animationIconToToolbar = (iconName: string, image: HTMLImageElement, x: number, y: number) =>
        {
            const target = Array.from(document.body.getElementsByClassName(iconName)).find(element => (element as HTMLElement).offsetParent) as HTMLElement;

            if(!target) return;

            image.className = 'toolbar-icon-animation';
            image.style.visibility = 'visible';
            image.style.left = (x + 'px');
            image.style.top = (y + 'px');

            document.body.append(image);

            const targetBounds = target.getBoundingClientRect();
            const imageBounds = image.getBoundingClientRect();
            const left = (imageBounds.x - targetBounds.x);
            const top = (imageBounds.y - targetBounds.y);
            const squared = Math.sqrt(((left * left) + (top * top)));
            const wait = (500 - Math.abs(((((1 / squared) * 100) * 500) * 0.5)));
            const height = 20;
            const motionName = (`ToolbarBouncing[${ iconName }]`);

            if(!Motions.getMotionByTag(motionName))
            {
                Motions.runMotion(new Queue(new Wait((wait + 8)), new DropBounce(target, 400, 12))).tag = motionName;
            }

            const motion = new Queue(new EaseOut(new JumpBy(image, wait, ((targetBounds.x - imageBounds.x) + height), (targetBounds.y - imageBounds.y), 100, 1), 1), new Dispose(image));

            Motions.runMotion(motion);
        };

        animationIconToToolbar('icon-inventory', event.image, event.x, event.y);
    });

    return (
        <>

            <AnimatePresence>
                {/* Both menus sit right above the bottom bar, centred over their icon and kept 3px inside the screen. */}
                {!touchLayout && isProgressionExpanded && (
                    <motion.div
                        key="progression-menu"
                        ref={progressionMenuRef}
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={ME_POPOVER_TRANSITION}
                        className="pointer-events-auto fixed bottom-[51px] left-[3px] z-[100]"
                    >
                        <ToolbarProgressionView
                            achievementCount={getTotalUnseen}
                            dailyTaskCount={unseenDailyTaskCount}
                            rewardTracks={rewardTracks}
                            setExpanded={setProgressionExpanded}
                        />
                    </motion.div>
                )}
                {!touchLayout && isMeExpanded && (
                    <motion.div
                        key="me-menu"
                        ref={meMenuRef}
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={ME_POPOVER_TRANSITION}
                        className="pointer-events-auto fixed bottom-[51px] left-[3px] z-[100]"
                    >
                        <ToolbarMeView setMeExpanded={setMeExpanded} useGuideTool={useGuideTool} />
                    </motion.div>
                )}
            </AnimatePresence>

            {isInRoom && (
                <div
                    style={chatFrameStyle}
                    className={touchLayout
                        ? 'tb-frame volt-touch-chat-slot z-[71] flex items-center p-0 pointer-events-none'
                        : 'tb-frame absolute left-1/2 ml-[calc(min(236px,47.5vw)*-1)] z-[71] flex h-[38px] w-[471px] max-w-[95vw] items-center p-0 pointer-events-none'}
                >
                    <Flex
                        alignItems="center"
                        justifyContent="center"
                        className="pointer-events-auto h-full w-full min-w-0 flex-1"
                        id="toolbar-chat-input-container"
                    />
                </div>
            )}

            <motion.div
                initial="visible"
                animate={visibilityVariant}
                variants={shellVariants}
                transition={SHELL_TRANSITION}
                className={`volt-toolbar volt-toolbar-hobba absolute z-[70] ${desktopBlockClasses}`}
            />

            <motion.div
                ref={leftDockRef}
                initial="visible"
                animate={visibilityVariant}
                variants={leftNavVariants}
                transition={NAV_TRANSITION}
                className={`tb-nav-clip tb-left-dock absolute bottom-0 left-0 z-[71] h-[46px] ${railMaxWidthClass} items-center ${desktopFlexClasses}`}
            >
                <button
                    type="button"
                    onClick={() =>
                    {
                        setProgressionExpanded(false);
                        setLeftCollapsed((value) => !value);
                    }}
                    aria-label={localizeWithFallback('toolbar.icons.toggle', 'Show/hide icons')}
                    className={`tb-collapse pointer-events-auto ${leftCollapsed ? 'tb-collapse--right' : 'tb-collapse--left'}`}
                />
                <motion.div variants={containerVariants} className="tb-open-shell flex h-[46px] max-w-full items-start overflow-visible bg-transparent">
                    {!leftCollapsed && (
                        <>
                            <motion.div variants={itemVariants} className="tb-slot">
                                {isInRoom ? (
                                    <ToolbarItemView icon="habbo" onClick={() => VisitDesktop()} className="tb-icon" />
                                ) : (
                                    <ToolbarItemView icon="house" onClick={() => CreateLinkEvent('navigator/goto/home')} className="tb-icon" />
                                )}
                            </motion.div>
                            <motion.div variants={itemVariants} className="tb-slot">
                                <ToolbarItemView icon="rooms" onClick={() => CreateLinkEvent('navigator/toggle')} className="tb-icon" />
                            </motion.div>
                            {isInRoom && (
                                <motion.div ref={progressionSlotRef} variants={itemVariants} className="relative tb-slot">
                                    <ToolbarItemView
                                        icon="progression"
                                        onClick={(event) =>
                                        {
                                            setMeExpanded(false);
                                            setProgressionExpanded((value) => !value);
                                            event.stopPropagation();
                                        }}
                                        className="tb-icon"
                                    />
                                    <ToolbarUnseenCountView count={unseenProgMenuCount} />
                                </motion.div>
                            )}
                            {gamesAvailable && (
                                <motion.div variants={itemVariants} className="tb-slot">
                                    <ToolbarItemView icon="game" onClick={() => CreateLinkEvent('games/toggle')} className="tb-icon" />
                                </motion.div>
                            )}
                            {!isInRoom && storiesEnabled && (
                                <motion.div variants={itemVariants} className="tb-slot">
                                    <ToolbarItemView icon="stories" onClick={() => CreateLinkEvent('stories/toggle')} className="tb-icon" />
                                </motion.div>
                            )}
                        </>
                    )}
                    <motion.div variants={itemVariants} className="tb-slot">
                        <ToolbarItemView icon="catalog" onClick={() => CreateLinkEvent('catalog/toggle/normal')} className="tb-icon" />
                    </motion.div>
                    {buildersClubEnabled && (
                        <motion.div variants={itemVariants} className="tb-slot">
                            <ToolbarItemView icon="buildersclub" onClick={() => CreateLinkEvent('catalog/toggle/builder')} className="tb-icon" />
                        </motion.div>
                    )}
                    {isInRoom && (
                        <motion.div variants={itemVariants} className="relative tb-slot tb-slot-inventory">
                            <ToolbarItemView icon="inventory" onClick={() => CreateLinkEvent('inventory/toggle')} className="tb-icon" />
                            <ToolbarUnseenCountView count={getFullCount} />
                        </motion.div>
                    )}
                    <motion.div
                        ref={meSlotRef}
                        variants={itemVariants}
                        className="relative tb-slot tb-slot-tall tb-slot-memenu"
                        data-toolbar-tooltip={localizeWithFallback('toolbar.icon.label.memenu', 'Me')}
                    >
                        <img src={memenuBgImg} alt="" className="tb-memenu-bg" />
                        <motion.div
                            className="tb-memenu-avatar"
                            aria-label={localizeWithFallback('toolbar.icon.label.memenu', 'Me')}
                            onClick={(event) =>
                            {
                                setProgressionExpanded(false);
                                setMeExpanded((value) => !value);
                                event.stopPropagation();
                            }}
                        >
                            <LayoutAvatarImageView airMeMenu={true} direction={3} figure={userFigure} />
                        </motion.div>
                        <img src={memenuCircleImg} alt="" className="tb-memenu-circle" />
                        <ToolbarUnseenCountView count={unreadForumsCount} />
                    </motion.div>
                    {isInRoom && showToolbarButton && (
                        <motion.div variants={itemVariants} className="tb-slot tb-slot-tall">
                            <ToolbarItemView icon="wired-tools" onClick={openMonitor} className="tb-icon" />
                        </motion.div>
                    )}
                    {cameraAvailable && (
                        <motion.div variants={itemVariants} className="tb-slot tb-slot-tall">
                            <ToolbarItemView icon="camera" onClick={() => CreateLinkEvent('camera/toggle')} className="tb-icon" />
                        </motion.div>
                    )}
                    <img src={dividerImg} alt="" className="tb-divider" />
                    {!leftCollapsed && (
                        <>
                            {isInRoom && buildHeightAvailable && (
                                <motion.div variants={itemVariants} className="tb-slot">
                                    <ToolbarItemView icon="buildheight" onClick={toggleBuildHeight} className="tb-icon" />
                                </motion.div>
                            )}
                            {isMod && (
                                <motion.div variants={itemVariants} className="relative tb-slot">
                                    <ToolbarItemView icon="modtools" onClick={() => CreateLinkEvent('mod-tools/show')} className="tb-icon" />
                                    {openTicketsCount > 0 && (
                                        <LayoutItemCountView count={openTicketsCount} className="pointer-events-none absolute -right-1 -top-1 z-10" />
                                    )}
                                </motion.div>
                            )}
                        </>
                    )}
                </motion.div>
            </motion.div>
            <motion.div
                ref={rightDockRef}
                initial="visible"
                animate={visibilityVariant}
                variants={rightNavVariants}
                transition={NAV_TRANSITION}
                data-collapsed={rightCollapsed ? 'true' : 'false'}
                className={`tb-nav-clip tb-right-dock absolute right-0 z-[71] ${desktopFlexClasses}`}
            >
                {/* new_bar_xml: the visible children are laid out left to right from x=0 (friendtools 150, page arrows, list, collapse_right 15). */}
                <motion.div variants={containerVariants} className="tb-friendtools">
                    {!rightCollapsed && <img src={dividerImg} alt="" className="tb-friendtools-line" />}
                    <motion.div variants={itemVariants} className="relative tb-slot tb-right-friends">
                        <ToolbarItemView icon="friendall" onClick={() => CreateLinkEvent('friends/toggle')} className="tb-icon" />
                        <ToolbarUnseenCountView count={requests.length} className="tb-unseen-count--friends" />
                    </motion.div>
                    <motion.div variants={itemVariants} className="tb-slot tb-right-search">
                        <ToolbarItemView icon="friendsearch" onClick={() => CreateLinkEvent('friends/search')} className="tb-icon" />
                    </motion.div>
                    {iconState !== MessengerIconState.HIDDEN && (
                        <motion.div variants={itemVariants} className="tb-slot tb-slot-messenger tb-right-messenger">
                            <ToolbarItemView
                                className={`tb-icon ${iconState === MessengerIconState.UNREAD ? (messengerNotifyFrame === 1 ? 'is-notify-1' : 'is-notify-0') : ''}`}
                                icon="message"
                                onClick={() => OpenMessengerChat()}
                            />
                        </motion.div>
                    )}
                    {rightCollapsed && (
                        <button
                            type="button"
                            onClick={() => toggleFriendBar(false)}
                            aria-label={localizeWithFallback('toolbar.icons.toggle', 'Show/hide icons')}
                            className="tb-collapse tb-collapse--friendbar-left pointer-events-auto"
                        />
                    )}
                </motion.div>
                {/* Collapsing only clips the bar, so the tabs keep their state. */}
                <div className={`tb-right-friend-bar ${rightCollapsed ? 'hidden' : ''}`} id="toolbar-friend-bar-container-desktop" />
                {!rightCollapsed && (
                    <>
                        <button
                            type="button"
                            onClick={() => toggleFriendBar(true)}
                            aria-label={localizeWithFallback('toolbar.icons.toggle', 'Show/hide icons')}
                            className="tb-collapse tb-collapse--friendbar-right pointer-events-auto"
                        />
                    </>
                )}
            </motion.div>
            {touchLayout && (
                <ToolbarTouchView
                    layout={layout}
                    isInRoom={isInRoom}
                    userFigure={userFigure}
                    useGuideTool={useGuideTool}
                    inventoryCount={getFullCount}
                    achievementCount={getTotalUnseen}
                    dailyTaskCount={unseenDailyTaskCount}
                    progressionCount={unseenProgMenuCount}
                    rewardTracks={rewardTracks}
                    forumsCount={unreadForumsCount}
                    friendRequestCount={requests.length}
                    messengerState={iconState}
                    messengerNotifyFrame={messengerNotifyFrame}
                    cameraAvailable={cameraAvailable}
                    buildersClubEnabled={buildersClubEnabled}
                    gamesAvailable={gamesAvailable}
                    storiesEnabled={storiesEnabled}
                    wiredAvailable={showToolbarButton}
                    openWired={openMonitor}
                    buildHeightAvailable={buildHeightAvailable}
                    toggleBuildHeight={toggleBuildHeight}
                    isMod={isMod}
                    openTicketsCount={openTicketsCount}
                />
            )}
        </>
    );
};
