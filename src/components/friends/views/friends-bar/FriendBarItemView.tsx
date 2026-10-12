import { FindNewFriendsMessageComposer, MouseEventType } from '@volt/renderer';
import { AnimatePresence, motion } from 'framer-motion';
import { FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FriendBarNotificationLocalizer, FriendBarNotificationType, getFriendBarNotificationMessage, getFriendBarNotificationTitleKey, getFriendBarTokenIcon, getFriendBarTokenIcons, GetUserProfile, LocalizeBadgeName, LocalizeText, MessengerFriend, OpenMessengerChat, SendMessageComposer } from '../../../../api';
import findFriendsIcon from '../../../../assets/images/toolbar/air/find-friends-icon.png';
import chatIcon from '../../../../assets/images/friends/swf/friendlist_chat.png';
import profileIcon from '../../../../assets/images/friends/swf/friendlist_eye.png';
import visitIcon from '../../../../assets/images/friends/swf/friendlist_go_room.png';
import realNameIcon from '../../../../assets/images/friends/swf/fb_icon_small.png';
import notifyIcon from '../../../../assets/images/friends/swf/friend_bar_event_notification_icon.png';
import gameIcon from '../../../../assets/images/friends/swf/game_center_snowball_notification_icon.png';
import { LayoutAvatarImageView, LayoutBadgeImageView } from '../../../../common';
import { selectFriendBarNotifications, useFriendBarNotificationsStore, useFriends } from '../../../../hooks';
import { isStaffChatIdentity } from '../../staffChatIdentity';
import { StaffChatFrankIconView } from '../../StaffChatFrankIconView';

const LOCALIZER: FriendBarNotificationLocalizer = { badgeName: LocalizeBadgeName, text: key => LocalizeText(key) };

interface FriendBarItemViewProps
{
    friend: MessengerFriend;
    selected: boolean;
    onToggle: () => void;
    onDeselect: () => void;
}

export const FriendBarItemView: FC<FriendBarItemViewProps> = (props) => {
    const { friend = null, selected = false, onToggle = null, onDeselect = null } = props;
    const [ exposed, setExposed ] = useState(false);
    const [ concealed, setConcealed ] = useState(false);
    const { followFriend = null } = useFriends();
    const elementRef = useRef<HTMLDivElement>(null);
    const piecesRef = useRef<HTMLDivElement>(null);
    const notifications = useFriendBarNotificationsStore(selectFriendBarNotifications(friend?.id ?? 0));
    const isVisible = selected;
    const setVisible = (value: boolean) => (value ? (!selected && onToggle()) : (selected && onDeselect()));

    useEffect(() => {
        if (!selected) return;

        const onClick = (event: MouseEvent) => {
            const element = elementRef.current;
            if (!element) return;
            if (event.target !== element && !element.contains(event.target as Node)) onDeselect();
        };
        document.addEventListener(MouseEventType.MOUSE_CLICK, onClick);
        return () => document.removeEventListener(MouseEventType.MOUSE_CLICK, onClick);
    }, [ selected, onDeselect ]);

    // NewFriendEntityTab.select: the tab grows upwards by the height of the pieces between header and controls.
    useLayoutEffect(() =>
    {
        const element = elementRef.current;
        const pieces = piecesRef.current;

        if(!element || !pieces) return;

        const apply = () => element.style.setProperty('--friend-bar-pieces', `${ pieces.offsetHeight }px`);

        apply();

        const observer = new ResizeObserver(apply);

        observer.observe(pieces);

        return () =>
        {
            observer.disconnect();
            element.style.removeProperty('--friend-bar-pieces');
        };
    }, [ isVisible, notifications ]);

    if (!friend) {
        // add_friends_tab_xml (AddFriendsTab b4e): 127x36 tab that grows to 164px upwards when selected.
        // Frame colour: the layout's 0x74dbfa until the tab is first exposed or selected, then 0x91e1f9 while
        // exposed (hover) and 0x7fc8de otherwise; selecting conceals the tab.
        const frameColor = selected ? '7fc8de' : (exposed ? '91e1f9' : (concealed ? '7fc8de' : '74dbfa'));

        return (
            <div
                ref={elementRef}
                className={`friend-bar-add-tab frame-${ frameColor } ${ selected ? 'is-selected' : '' } ${ (exposed && !selected) ? 'is-exposed' : '' }`}
                onClick={() => { setExposed(false); setConcealed(true); onToggle(); }}
                onMouseEnter={() => !selected && setExposed(true)}
                onMouseLeave={() => { if (exposed) { setExposed(false); setConcealed(true); } }}
            >
                <img className="friend-bar-add-tab__icon" src={findFriendsIcon} alt="" />
                <span className="friend-bar-add-tab__title">{LocalizeText('friend.bar.find.title')}</span>
                {selected && (
                    <>
                        <div className="friend-bar-add-tab__text">{LocalizeText('friend.bar.find.text')}</div>
                        <button
                            type="button"
                            className="friend-bar-add-tab__button"
                            onClick={(event) => {
                                event.stopPropagation();
                                SendMessageComposer(new FindNewFriendsMessageComposer());
                                onDeselect();
                            }}
                        >
                            {LocalizeText('friend.bar.find.button')}
                        </button>
                    </>
                )}
            </div>
        );
    }

    const isStaffChat = isStaffChatIdentity(friend);
    const tokenIcons = getFriendBarTokenIcons(notifications);
    const isInGame = notifications.some(entry => entry.typeCode === FriendBarNotificationType.PLAYING_GAME);
    // A new notification of the same tag drops its icon in again (Token's DropBounce on creation).
    const tokenIconKey = (icon: string) => `${ icon }:${ notifications.filter(entry => getFriendBarTokenIcon(entry.typeCode) === icon).map(entry => `${ entry.typeCode }/${ entry.message }`).join('|') }`;

    return (
        <div ref={elementRef} className={`friend-bar-friend relative ${isVisible ? 'is-selected' : ''}`}>
            {isStaffChat ? (
                <div className="friend-bar-item-head avatar staff-chat absolute left-[-3px] bottom-[-2px] z-10 h-[40px] w-[40px] overflow-hidden pointer-events-none">
                    <StaffChatFrankIconView size={40} className="friend-bar-staff-chat-frank" />
                </div>
            ) : friend.id > 0 ? (
                <div className="friend-bar-item-head avatar friend-bar-item-head-avatar absolute left-[-3px] bottom-[-2px] z-10 h-[40px] w-[40px] overflow-hidden pointer-events-none">
                    <LayoutAvatarImageView
                        direction={2}
                        figure={friend.figure}
                        headOnly={true}
                        style={{ backgroundPosition: '50% 42%', backgroundSize: '80px auto' }}
                        className="block h-auto w-auto pointer-events-none"
                    />
                </div>
            ) : (
                <div className="friend-bar-item-head group friend-bar-item-head-group absolute left-[6px] top-1/2 -translate-y-1/2 z-10 flex h-[28px] w-[28px] items-center justify-center pointer-events-none">
                    <LayoutBadgeImageView badgeCode="ADM" isGroup={false} className="block pointer-events-none drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)]" />
                </div>
            )}
            {(tokenIcons.length > 0) && (
                <div className="friend-bar-tokens">
                    {tokenIcons.map(icon => (
                        <img
                            key={tokenIconKey(icon)}
                            className="friend-bar-token"
                            src={(icon === 'game') ? gameIcon : notifyIcon}
                            alt=""
                            onClick={(event) => { event.stopPropagation(); onToggle(); }}
                        />
                    ))}
                </div>
            )}
            <motion.button
                type="button"
                className={`friend-bar-item friend-bar-tab find-friends-active ${friend.id <= 0 ? 'group' : ''}`}
                onClick={() => onToggle()}
            >
                <div className="friend-bar-text">{friend.name}</div>
            </motion.button>

            <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="friend-bar-actions friend-bar-item find-friends-active"
                        >
                        <div ref={piecesRef} className="friend-bar-pieces">
                            {!!friend.realName && (
                                <div className="friend-bar-piece-real-name">
                                    <img src={realNameIcon} alt="" />
                                    <span>{friend.realName}</span>
                                </div>
                            )}
                            {notifications.map(entry => (
                                <div key={entry.typeCode} className="friend-bar-piece-message">
                                    <div className="friend-bar-piece-title">{LocalizeText(getFriendBarNotificationTitleKey(entry.typeCode))}</div>
                                    <div className="friend-bar-piece-text">{getFriendBarNotificationMessage(entry, LOCALIZER)}</div>
                                </div>
                            ))}
                        </div>
                        <div className="friend-bar-actions-buttons">
                            <div
                                className="cursor-pointer friend-bar-action-icon"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    OpenMessengerChat(friend.id);
                                    setVisible(false);
                                }}
                            ><img src={chatIcon} alt="" /></div>
                            {!isStaffChat && friend.online && friend.followingAllowed && !isInGame && (
                                <div
                                    className="cursor-pointer friend-bar-action-icon"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        followFriend(friend);
                                        setVisible(false);
                                    }}
                                ><img src={visitIcon} alt="" /></div>
                            )}
                            {!isStaffChat && (
                                <div
                                    className="cursor-pointer friend-bar-action-icon"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        GetUserProfile(friend.id);
                                        setVisible(false);
                                    }}
                                ><img src={profileIcon} alt="" /></div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
