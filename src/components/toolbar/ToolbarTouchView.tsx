import { CreateLinkEvent, FindNewFriendsMessageComposer, GetRoomEngine, RewardTrackData, RoomObjectCategory } from '@volt/renderer';
import { AnimatePresence, motion } from 'framer-motion';
import { FC, ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { GetRoomSession, IsTabletLayout, localizeWithFallback, MessengerIconState, OpenMessengerChat, SendMessageComposer, VisitDesktop, VoltLayout } from '../../api';
import chatStylesImg from '../../assets/images/chat-input-swf/chat_styles.png';
import memenuBgImg from '../../assets/images/toolbar/air/memenu-bg.png';
import memenuCircleImg from '../../assets/images/toolbar/air/memenu-circle.png';
import { LayoutAvatarImageView } from '../../common';
import { classNames } from '../../layout';
import { ToolbarItemView } from './ToolbarItemView';
import { ToolbarMeView } from './ToolbarMeView';
import { ToolbarProgressionView } from './ToolbarProgressionView';
import { ToolbarUnseenCountView } from './ToolbarUnseenCountView';

export interface ToolbarTouchViewProps {
    layout: VoltLayout;
    isInRoom: boolean;
    userFigure: string;
    useGuideTool: boolean;
    inventoryCount: number;
    achievementCount: number;
    dailyTaskCount: number;
    progressionCount: number;
    rewardTracks: RewardTrackData[];
    forumsCount: number;
    friendRequestCount: number;
    messengerState: MessengerIconState;
    messengerNotifyFrame: number;
    cameraAvailable: boolean;
    buildersClubEnabled: boolean;
    gamesAvailable: boolean;
    storiesEnabled: boolean;
    wiredAvailable: boolean;
    openWired: () => void;
    buildHeightAvailable: boolean;
    toggleBuildHeight: () => void;
    isMod: boolean;
    openTicketsCount: number;
}

const POPUP_TRANSITION = { type: 'spring' as const, stiffness: 420, damping: 28 };

export const ToolbarTouchView: FC<ToolbarTouchViewProps> = (props) => {
    const {
        layout,
        isInRoom,
        userFigure,
        useGuideTool,
        inventoryCount,
        achievementCount,
        dailyTaskCount,
        progressionCount,
        rewardTracks,
        forumsCount,
        friendRequestCount,
        messengerState,
        messengerNotifyFrame,
        cameraAvailable,
        buildersClubEnabled,
        gamesAvailable,
        storiesEnabled,
        wiredAvailable,
        openWired,
        buildHeightAvailable,
        toggleBuildHeight,
        isMod,
        openTicketsCount
    } = props;
    const [isMeExpanded, setMeExpanded] = useState(false);
    const [isProgressionExpanded, setProgressionExpanded] = useState(false);
    const groupRef = useRef<HTMLElement>(null);
    const isTablet = IsTabletLayout(layout);
    const isLandscapePhone = layout === 'phone-landscape';
    const homeIcon = isInRoom ? 'habbo' : 'house';
    const goHome = () => (isInRoom ? VisitDesktop() : CreateLinkEvent('navigator/goto/home'));

    const slot = (key: string, icon: string, onClick: () => void, badge: ReactNode = null, iconClassName = '') => (
        <div key={key} className={`volt-touch-toolbar__slot volt-touch-toolbar__slot--${key}`}>
            <ToolbarItemView icon={icon} onClick={onClick} className={classNames('tb-icon', iconClassName)} />
            {badge}
        </div>
    );

    const meItem = (key: string, icon: string, label: string, action: () => void, count = 0) => (
        <div
            key={key}
            className="tbme-item"
            onClick={() => {
                setMeExpanded(false);
                action();
            }}
        >
            <span className={`volt-icon icon-${icon}`} />
            <span>{label}</span>
            <ToolbarUnseenCountView count={count} />
        </div>
    );

    const meExtras = [
        isInRoom &&
            meItem('myhabbo', 'me-profile', localizeWithFallback('widget.memenu.actions', 'Actions'), () => {
                const roomSession = GetRoomSession();

                if (roomSession) GetRoomEngine().selectRoomObject(roomSession.roomId, roomSession.ownRoomIndex, RoomObjectCategory.UNIT);
            }),
        isLandscapePhone &&
            meItem(
                'home',
                homeIcon,
                localizeWithFallback(
                    isInRoom ? 'toolbar.icon.tooltip.exitroom.hotelview' : 'toolbar.icon.tooltip.exitroom.home',
                    isInRoom ? 'Hotel view' : 'Home room'
                ),
                goHome
            ),
        isInRoom &&
            meItem(
                'progression',
                'progression',
                localizeWithFallback('toolbar.icon.label.progression', 'Progress'),
                () => setProgressionExpanded(true),
                progressionCount
            ),
        !isTablet &&
            buildersClubEnabled &&
            meItem('buildersclub', 'buildersclub', localizeWithFallback('toolbar.icon.label.builder', 'BC Warehouse'), () =>
                CreateLinkEvent('catalog/toggle/builder')
            ),
        !isTablet &&
            cameraAvailable &&
            meItem('camera', 'camera', localizeWithFallback('camera.interface.title', 'Camera'), () => CreateLinkEvent('camera/toggle')),
        isInRoom && wiredAvailable && meItem('wired', 'wired-tools', localizeWithFallback('toolbar.icon.label.wired_menu', 'Wired'), openWired),
        isInRoom &&
            buildHeightAvailable &&
            meItem('buildheight', 'buildheight', localizeWithFallback('toolbar.icon.label.buildheight', 'Build height'), toggleBuildHeight),
        meItem('friendsearch', 'friendsearch', localizeWithFallback('friendlist.search', 'Find friends'), () =>
            SendMessageComposer(new FindNewFriendsMessageComposer())
        ),
        gamesAvailable && meItem('games', 'game', localizeWithFallback('toolbar.icon.label.games', 'Games'), () => CreateLinkEvent('games/toggle')),
        !isInRoom &&
            storiesEnabled &&
            meItem('stories', 'stories', localizeWithFallback('toolbar.icon.label.stories', 'Stories'), () => CreateLinkEvent('stories/toggle')),
        isMod &&
            meItem(
                'modtools',
                'modtools',
                localizeWithFallback('toolbar.icon.label.modtools', 'Moderator tools'),
                () => CreateLinkEvent('mod-tools/show'),
                openTicketsCount
            )
    ];

    const meSlot = (
        <div key="me" className="volt-touch-toolbar__slot volt-touch-toolbar__slot--me">
            <div className="relative tb-slot tb-slot-tall tb-slot-memenu" data-toolbar-tooltip={localizeWithFallback('toolbar.icon.label.memenu', 'Me')}>
                <img src={memenuBgImg} alt="" className="tb-memenu-bg" />
                <div
                    className="tb-memenu-avatar"
                    role="button"
                    aria-label={localizeWithFallback('toolbar.icon.label.memenu', 'Me')}
                    aria-expanded={isMeExpanded}
                    onClick={(event) => {
                        setProgressionExpanded(false);
                        setMeExpanded((value) => !value);
                        event.stopPropagation();
                    }}
                >
                    <LayoutAvatarImageView airMeMenu={true} direction={3} figure={userFigure} />
                </div>
                <img src={memenuCircleImg} alt="" className="tb-memenu-circle" />
                <ToolbarUnseenCountView count={forumsCount + (isInRoom ? progressionCount : 0)} />
            </div>
        </div>
    );

    useLayoutEffect(() => {
        const group = groupRef.current;
        const root = document.documentElement;

        if (!group || layout !== 'phone-landscape') return;

        const update = () => {
            const right = Math.max(group.getBoundingClientRect().left, ...Array.from(group.children, (child) => child.getBoundingClientRect().right));

            root.style.setProperty('--volt-toolbar-width', `${Math.ceil(right)}px`);
        };
        const observer = new ResizeObserver(update);

        update();
        observer.observe(group);
        window.addEventListener('resize', update);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', update);
            root.style.removeProperty('--volt-toolbar-width');
        };
    }, [layout]);

    useLayoutEffect(() => {
        const root = document.documentElement;
        const container = document.getElementById('toolbar-chat-input-container');

        if (layout !== 'phone-landscape' || !container) return;

        let timer = 0;

        const onFocusOut = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                const active = document.activeElement;
                const input = container.querySelector('input');

                if (container.contains(active) || active?.closest('[data-radix-popper-content-wrapper]') || input?.value) return;

                delete root.dataset.voltChatOpen;
            }, 200);
        };

        // The room canvas cancels touches, so a tap there never blurs the input.
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Element;
            const input = container.querySelector('input');

            if (!root.dataset.voltChatOpen || input?.value) return;
            if (container.contains(target) || target.closest?.('[data-radix-popper-content-wrapper], .volt-touch-chat-open')) return;

            input?.blur();
            delete root.dataset.voltChatOpen;
        };

        container.addEventListener('focusout', onFocusOut);
        document.addEventListener('pointerdown', onPointerDown, true);

        return () => {
            window.clearTimeout(timer);
            container.removeEventListener('focusout', onFocusOut);
            document.removeEventListener('pointerdown', onPointerDown, true);
            delete root.dataset.voltChatOpen;
        };
    }, [layout]);

    const openChat = () => {
        document.documentElement.dataset.voltChatOpen = 'true';
        document.querySelector<HTMLInputElement>('#toolbar-chat-input-container input')?.focus();
    };

    const slots = [
        !isLandscapePhone && slot('home', homeIcon, goHome),
        slot('navigator', 'rooms', () => CreateLinkEvent('navigator/toggle')),
        slot('shop', 'catalog', () => CreateLinkEvent('catalog/toggle/normal')),
        isInRoom && slot('inventory', 'inventory', () => CreateLinkEvent('inventory/toggle'), <ToolbarUnseenCountView count={inventoryCount} />),
        isTablet && buildersClubEnabled && slot('buildersclub', 'buildersclub', () => CreateLinkEvent('catalog/toggle/builder')),
        isTablet && cameraAvailable && slot('camera', 'camera', () => CreateLinkEvent('camera/toggle')),
        meSlot,
        slot('friends', 'friendall', () => CreateLinkEvent('friends/toggle'), <ToolbarUnseenCountView count={friendRequestCount} />),
        messengerState !== MessengerIconState.HIDDEN &&
            slot(
                'messenger',
                'message',
                () => OpenMessengerChat(),
                null,
                messengerState === MessengerIconState.UNREAD ? `is-notify-${messengerNotifyFrame}` : ''
            ),
        isLandscapePhone && (
            <div key="chat" className="volt-touch-toolbar__slot volt-touch-toolbar__slot--chat">
                <button
                    type="button"
                    className="volt-touch-chat-open"
                    aria-label={localizeWithFallback('widgets.chatinput.default', 'Chat')}
                    onClick={openChat}
                >
                    <img src={chatStylesImg} alt="" />
                </button>
            </div>
        )
    ];

    return (
        <div className={`volt-touch-toolbar volt-touch-toolbar--${layout}`}>
            <AnimatePresence>
                {isMeExpanded && (
                    <motion.div
                        key="touch-me-menu"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={POPUP_TRANSITION}
                        className="volt-touch-toolbar__popup"
                    >
                        <ToolbarMeView setMeExpanded={setMeExpanded} useGuideTool={useGuideTool}>
                            {meExtras}
                        </ToolbarMeView>
                    </motion.div>
                )}
                {isProgressionExpanded && (
                    <motion.div
                        key="touch-progression-menu"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={POPUP_TRANSITION}
                        className="volt-touch-toolbar__popup"
                    >
                        <ToolbarProgressionView
                            achievementCount={achievementCount}
                            dailyTaskCount={dailyTaskCount}
                            rewardTracks={rewardTracks}
                            setExpanded={setProgressionExpanded}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
            <nav ref={groupRef} className="volt-touch-toolbar__group tb-nav-clip">
                {slots}
            </nav>
        </div>
    );
};
