import { applyFriendBarNotification, consumeViewedFriendBarNotifications, FriendBarNotification, moveFriendBarFriendToFront } from '../../api';
import { createVoltStore } from '../../state/createVoltStore';

// HabboFriendBarData's per-friend `notifications` and the bar order that makeNotification changes.
export interface FriendBarNotificationsState {
    notificationsByFriendId: Readonly<Record<number, readonly FriendBarNotification[]>>;
    frontFriendIds: readonly number[];
    receive(friendId: number, typeCode: number, message: string | null | undefined): void;
    consumeViewed(friendId: number): void;
    /** The bar only holds online friends; a friend who goes offline takes their notifications along. */
    retainFriends(onlineFriendIds: ReadonlySet<number>): void;
}

const EMPTY: readonly FriendBarNotification[] = [];

export const useFriendBarNotificationsStore = createVoltStore<FriendBarNotificationsState>()((set) => ({
    notificationsByFriendId: {},
    frontFriendIds: [],
    receive: (friendId, typeCode, message) =>
        set((state) => {
            const update = applyFriendBarNotification(state.notificationsByFriendId[friendId] ?? EMPTY, typeCode, message);

            if (!update) return state;

            return {
                notificationsByFriendId: { ...state.notificationsByFriendId, [friendId]: update.notifications },
                frontFriendIds: update.moveToFront ? moveFriendBarFriendToFront(state.frontFriendIds, friendId) : state.frontFriendIds
            };
        }),
    consumeViewed: (friendId) =>
        set((state) => {
            const current = state.notificationsByFriendId[friendId];

            if (!current?.length) return state;

            const remaining = consumeViewedFriendBarNotifications(current);

            if (remaining.length === current.length) return state;

            return { notificationsByFriendId: { ...state.notificationsByFriendId, [friendId]: remaining } };
        }),
    retainFriends: (onlineFriendIds) =>
        set((state) => {
            const ids = Object.keys(state.notificationsByFriendId).map(Number);
            const front = state.frontFriendIds.filter((id) => onlineFriendIds.has(id));

            if (ids.every((id) => onlineFriendIds.has(id)) && front.length === state.frontFriendIds.length) return state;

            const notificationsByFriendId: Record<number, readonly FriendBarNotification[]> = {};

            for (const id of ids) if (onlineFriendIds.has(id)) notificationsByFriendId[id] = state.notificationsByFriendId[id];

            return { notificationsByFriendId, frontFriendIds: front };
        })
}));

export const selectFriendBarNotifications =
    (friendId: number) =>
    (state: FriendBarNotificationsState): readonly FriendBarNotification[] =>
        state.notificationsByFriendId[friendId] ?? EMPTY;
