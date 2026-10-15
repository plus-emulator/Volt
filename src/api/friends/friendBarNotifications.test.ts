import { describe, expect, it } from 'vitest';
import {
    applyFriendBarNotification,
    consumeViewedFriendBarNotifications,
    FriendBarNotification,
    FriendBarNotificationType,
    getFriendBarNotificationMessage,
    getFriendBarNotificationTitleKey,
    getFriendBarTokenIcons,
    moveFriendBarFriendToFront,
    orderFriendBarFriends
} from './friendBarNotifications';

const { ROOM_EVENT, ACHIEVEMENT, QUEST, PLAYING_GAME, FINISHED_GAME } = FriendBarNotificationType;

describe('applyFriendBarNotification', () => {
    it('adds a view-once achievement and moves the friend to the front', () => {
        expect(applyFriendBarNotification([], ACHIEVEMENT, 'ACH_RoomEntry3')).toEqual({
            notifications: [{ typeCode: ACHIEVEMENT, message: 'ACH_RoomEntry3', viewOnce: true }],
            moveToFront: true
        });
    });

    it('keeps one notification per type, replacing the message in place', () => {
        const current: FriendBarNotification[] = [
            { typeCode: ACHIEVEMENT, message: 'ACH_RoomEntry3', viewOnce: true },
            { typeCode: QUEST, message: 'explore.visit', viewOnce: true }
        ];

        expect(applyFriendBarNotification(current, ACHIEVEMENT, 'ACH_RoomEntry4')?.notifications).toEqual([
            { typeCode: ACHIEVEMENT, message: 'ACH_RoomEntry4', viewOnce: true },
            { typeCode: QUEST, message: 'explore.visit', viewOnce: true }
        ]);
    });

    it('keeps "playing a game" until finished and updates it without moving the friend', () => {
        const playing = applyFriendBarNotification([], PLAYING_GAME, 'snowwar');

        expect(playing).toEqual({ notifications: [{ typeCode: PLAYING_GAME, message: 'snowwar', viewOnce: false }], moveToFront: true });
        expect(applyFriendBarNotification(playing.notifications, PLAYING_GAME, 'basejump')?.moveToFront).toBe(false);
        expect(applyFriendBarNotification(playing.notifications, FINISHED_GAME, '')).toEqual({ notifications: [], moveToFront: false });
    });

    it('ignores types the bar has no token for', () => {
        expect(applyFriendBarNotification([], 5, 'invite')).toBeNull();
        expect(applyFriendBarNotification([], -1, 'hi')).toBeNull();
    });
});

describe('consumeViewedFriendBarNotifications', () => {
    it('drops view-once notifications and keeps "playing a game"', () => {
        expect(
            consumeViewedFriendBarNotifications([
                { typeCode: ROOM_EVENT, message: 'Party', viewOnce: true },
                { typeCode: PLAYING_GAME, message: 'snowwar', viewOnce: false }
            ])
        ).toEqual([{ typeCode: PLAYING_GAME, message: 'snowwar', viewOnce: false }]);
    });
});

describe('getFriendBarTokenIcons', () => {
    it('shows one icon per tag with the tag seen last in front', () => {
        expect(
            getFriendBarTokenIcons([
                { typeCode: ACHIEVEMENT, message: 'ACH_RoomEntry3', viewOnce: true },
                { typeCode: QUEST, message: 'explore.visit', viewOnce: true },
                { typeCode: PLAYING_GAME, message: 'snowwar', viewOnce: false }
            ])
        ).toEqual(['game', 'notify']);
    });
});

describe('friend bar notification texts', () => {
    const localize = { badgeName: (code: string) => `name:${code}`, text: (key: string) => `text:${key}` };

    it('uses the token title keys', () => {
        expect([ROOM_EVENT, ACHIEVEMENT, QUEST, PLAYING_GAME].map(getFriendBarNotificationTitleKey)).toEqual([
            'friendbar.notify.event',
            'friendbar.notify.achievement',
            'friendbar.notify.quest',
            'friendbar.notify.game'
        ]);
    });

    it('localizes each token message like its AIR token', () => {
        expect(getFriendBarNotificationMessage({ typeCode: ACHIEVEMENT, message: 'ACH_RoomEntry3', viewOnce: true }, localize)).toBe('name:ACH_RoomEntry3');
        expect(getFriendBarNotificationMessage({ typeCode: QUEST, message: 'explore.visit', viewOnce: true }, localize)).toBe('text:quests.explore.visit.name');
        expect(getFriendBarNotificationMessage({ typeCode: PLAYING_GAME, message: 'snowwar', viewOnce: false }, localize)).toBe('text:gamecenter.snowwar.name');
        expect(getFriendBarNotificationMessage({ typeCode: ROOM_EVENT, message: 'Party', viewOnce: true }, localize)).toBe('Party');
    });
});

describe('friend bar order', () => {
    it('puts the latest notified friends first and keeps the rest in order', () => {
        const friends = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
        const front = moveFriendBarFriendToFront(moveFriendBarFriendToFront([], 3), 2);

        expect(front).toEqual([2, 3]);
        expect(orderFriendBarFriends(friends, front).map((friend) => friend.id)).toEqual([2, 3, 1, 4]);
        expect(orderFriendBarFriends(friends, [9, 4]).map((friend) => friend.id)).toEqual([4, 1, 2, 3]);
    });
});
