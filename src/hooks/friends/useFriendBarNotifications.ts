import { FriendNotificationEvent, GetConfiguration } from '@volt/renderer';
import { useCallback, useEffect, useRef } from 'react';
import { MessengerFriend } from '../../api';
import { useMessageEvent } from '../events';
import { useFriendBarNotificationsStore } from './friendBarNotificationsStore';

// habbo.com's external variables set friendbar.notifications.enabled=true; a hotel can turn it off.
const notificationsEnabled = (): boolean => {
    const value = GetConfiguration().getValue<unknown>('friendbar.notifications.enabled', true);

    return value !== false && value !== 'false' && value !== '0' && value !== 0;
};

/**
 * HabboFriendBarData.onFriendNotification: FriendNotificationEvent (2865) feeds the friend bar tokens.
 * Mount once, where the bar lives. Notifications for friends not in the bar are ignored, like
 * makeNotification's getFriendByID, and a friend who goes offline leaves with their notifications.
 */
export const useFriendBarNotifications = (onlineFriends: readonly MessengerFriend[]) => {
    const receive = useFriendBarNotificationsStore((state) => state.receive);
    const retainFriends = useFriendBarNotificationsStore((state) => state.retainFriends);
    const onlineIdsRef = useRef<ReadonlySet<number>>(new Set());

    useEffect(() => {
        const onlineIds = new Set(onlineFriends.map((friend) => friend.id));

        onlineIdsRef.current = onlineIds;
        retainFriends(onlineIds);
    }, [onlineFriends, retainFriends]);

    const onFriendNotification = useCallback(
        (event: FriendNotificationEvent) => {
            const parser = event.getParser();

            if (!parser || !notificationsEnabled() || !onlineIdsRef.current.has(parser.avatarId)) return;

            receive(parser.avatarId, parser.typeCode, parser.message);
        },
        [receive]
    );

    useMessageEvent<FriendNotificationEvent>(FriendNotificationEvent, onFriendNotification);
};
