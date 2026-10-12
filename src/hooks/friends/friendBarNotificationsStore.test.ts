import { beforeEach, describe, expect, it } from 'vitest';
import { FriendBarNotificationType } from '../../api';
import { selectFriendBarNotifications, useFriendBarNotificationsStore } from './friendBarNotificationsStore';

const store = () => useFriendBarNotificationsStore.getState();

describe('friendBarNotificationsStore', () => {
    beforeEach(() => useFriendBarNotificationsStore.setState({ notificationsByFriendId: {}, frontFriendIds: [] }));

    it('stores notifications per friend and moves the friend to the front', () => {
        store().receive(7, FriendBarNotificationType.ACHIEVEMENT, 'ACH_RoomEntry3');
        store().receive(9, FriendBarNotificationType.QUEST, 'explore.visit');

        expect(selectFriendBarNotifications(7)(store())).toEqual([{ typeCode: 1, message: 'ACH_RoomEntry3', viewOnce: true }]);
        expect(store().frontFriendIds).toEqual([9, 7]);
    });

    it('consumes view-once notifications when a tab closes', () => {
        store().receive(7, FriendBarNotificationType.ACHIEVEMENT, 'ACH_RoomEntry3');
        store().receive(7, FriendBarNotificationType.PLAYING_GAME, 'snowwar');
        store().consumeViewed(7);

        expect(selectFriendBarNotifications(7)(store())).toEqual([{ typeCode: 3, message: 'snowwar', viewOnce: false }]);
    });

    it('forgets friends who leave the bar', () => {
        store().receive(7, FriendBarNotificationType.ACHIEVEMENT, 'ACH_RoomEntry3');
        store().receive(9, FriendBarNotificationType.ACHIEVEMENT, 'ACH_Login2');
        store().retainFriends(new Set([9]));

        expect(store().notificationsByFriendId).toEqual({ 9: [{ typeCode: 1, message: 'ACH_Login2', viewOnce: true }] });
        expect(store().frontFriendIds).toEqual([9]);
    });

    it('ignores types without a token', () => {
        const before = store();

        store().receive(7, 5, 'invite');

        expect(store()).toBe(before);
    });
});
