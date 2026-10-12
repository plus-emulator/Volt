import { FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import friendsBrowseArrowLeft from '../../../../assets/images/toolbar/air/friend-browse-arrow-left.png';
import friendsBrowseArrowRight from '../../../../assets/images/toolbar/air/friend-browse-arrow-right.png';
import friendsBrowseBg from '../../../../assets/images/toolbar/air/friends-browse-bg.png';
import { localizeWithFallback, MessengerFriend, orderFriendBarFriends } from '../../../../api';
import { useFriendBarNotifications, useFriendBarNotificationsStore } from '../../../../hooks';
import { FriendBarItemView } from './FriendBarItemView';

// HabboFriendBarView (v4e): 127px tabs with 3px list spacing, the 150px friendtools block and a 16px reserve.
const TAB_WIDTH = 127;
const TAB_SPACING = 3;
const FRIEND_TOOLS_WIDTH = 150;
const BAR_RESERVE = 16;
const MIN_TABS = 3;
const FRIEND_KEY = 'friend-';

// Bar width is the desktop width minus the left bottom bar's right edge.
const resolveCapacity = () =>
{
    const leftDock = document.querySelector('.tb-left-dock');
    const leftEdge = leftDock ? leftDock.getBoundingClientRect().right : 0;

    return Math.max(0, Math.trunc((window.innerWidth - leftEdge - FRIEND_TOOLS_WIDTH - BAR_RESERVE) / (TAB_WIDTH + TAB_SPACING)));
};

// Add-friends tabs fill up to three tabs; at least one is added while there is room for it.
const resolveFindFriendsCount = (capacity: number, used: number) =>
{
    if(used >= capacity) return 0;

    if(used + 1 < MIN_TABS) return Math.min(capacity - used, MIN_TABS - used);

    return 1;
};

export const FriendBarView: FC<{ onlineFriends: MessengerFriend[]; requestsCount?: number }> = (props) =>
{
    const { onlineFriends = [] } = props;
    const [ indexOffset, setIndexOffset ] = useState(0);
    const [ capacity, setCapacity ] = useState(MIN_TABS);
    const [ selectedKey, setSelectedKey ] = useState<string | null>(null);
    const frontFriendIds = useFriendBarNotificationsStore(state => state.frontFriendIds);
    const consumeViewed = useFriendBarNotificationsStore(state => state.consumeViewed);

    const previousKeyRef = useRef<string | null>(null);

    useFriendBarNotifications(onlineFriends);

    // HabboFriendBarView.deSelect(true): however a friend's tab closes (its own toggle, another tab, paging,
    // a click elsewhere), its view-once notifications are consumed.
    useEffect(() =>
    {
        const previousKey = previousKeyRef.current;

        previousKeyRef.current = selectedKey;

        if(previousKey && (previousKey !== selectedKey) && previousKey.startsWith(FRIEND_KEY)) consumeViewed(Number(previousKey.slice(FRIEND_KEY.length)));
    }, [ selectedKey, consumeViewed ]);

    useLayoutEffect(() =>
    {
        const measure = () =>
        {
            const next = resolveCapacity();

            setCapacity(prev => (prev === next ? prev : next));
        };

        measure();

        const observer = new ResizeObserver(measure);
        const leftDock = document.querySelector('.tb-left-dock');

        observer.observe(document.documentElement);
        if(leftDock) observer.observe(leftDock);
        window.addEventListener('resize', measure);

        return () =>
        {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, []);

    // Online friends by name, except that a notification moves its friend to the front (setFriendAt(friend, 0)).
    const friends = orderFriendBarFriends(onlineFriends.filter(Boolean), frontFriendIds);
    const total = friends.length + 1;
    const visibleCount = Math.min(capacity, total);
    const offset = Math.max(0, Math.min(indexOffset, total - visibleCount));
    const visibleFriends = friends.slice(offset, offset + capacity);
    const findFriendsCount = resolveFindFriendsCount(capacity, visibleFriends.length);
    const showPaging = (visibleFriends.length + findFriendsCount) < total && total > 0;
    const canPageLeft = offset !== 0;
    const canPageRight = (offset + visibleFriends.length + findFriendsCount) < total;

    const toggleSelected = (key: string) => setSelectedKey(prev => (prev === key ? null : key));
    // A tab's own close (click elsewhere, a control button) must not undo a tab selected meanwhile.
    const deselect = (key: string) => setSelectedKey(prev => (prev === key ? null : prev));

    return (
        <div className="friend-bar">
            {showPaging && (
                <button
                    type="button"
                    disabled={!canPageLeft}
                    aria-label={localizeWithFallback('friendbar.scroll.left', 'Previous friends')}
                    className="friend-bar-button left"
                    onClick={() => { setSelectedKey(null); setIndexOffset(Math.max(0, offset - capacity)); }}
                >
                    <img src={friendsBrowseBg} alt="" className="friend-bar-browse-bg" />
                    <img src={friendsBrowseArrowLeft} alt="" className="friend-bar-browse-arrow" />
                </button>
            )}
            <div className="friend-bar-list">
                {visibleFriends.map(friend => (
                    <FriendBarItemView
                        key={friend.id}
                        friend={friend}
                        selected={selectedKey === `${ FRIEND_KEY }${ friend.id }`}
                        onToggle={() => toggleSelected(`${ FRIEND_KEY }${ friend.id }`)}
                        onDeselect={() => deselect(`${ FRIEND_KEY }${ friend.id }`)}
                    />
                ))}
                {Array.from({ length: findFriendsCount }, (_, index) => (
                    <FriendBarItemView
                        key={`find-${ index }`}
                        friend={null}
                        selected={selectedKey === `find-${ index }`}
                        onToggle={() => toggleSelected(`find-${ index }`)}
                        onDeselect={() => deselect(`find-${ index }`)}
                    />
                ))}
            </div>
            {showPaging && (
                <button
                    type="button"
                    disabled={!canPageRight}
                    aria-label={localizeWithFallback('friendbar.scroll.right', 'Next friends')}
                    className="friend-bar-button right"
                    onClick={() => { setSelectedKey(null); setIndexOffset(Math.min(total - capacity, offset + capacity)); }}
                >
                    <img src={friendsBrowseBg} alt="" className="friend-bar-browse-bg" />
                    <img src={friendsBrowseArrowRight} alt="" className="friend-bar-browse-arrow" />
                </button>
            )}
        </div>
    );
};
