// Friend bar notifications, after AIR WIN63-202609161723-93809945:
// HabboFriendBarData.onFriendNotification/makeNotification and NewFriendEntityTab's token handling.

/** FriendNotification type codes sent in FriendNotificationEvent (2865). */
export const FriendBarNotificationType = {
    ROOM_EVENT: 0,
    ACHIEVEMENT: 1,
    QUEST: 2,
    PLAYING_GAME: 3,
    FINISHED_GAME: 4
} as const;

export interface FriendBarNotification {
    readonly typeCode: number;
    readonly message: string;
    /** Consumed when the user closes the friend's tab; everything but "playing a game" is view-once. */
    readonly viewOnce: boolean;
}

export interface FriendBarNotificationUpdate {
    readonly notifications: FriendBarNotification[];
    /** makeNotification moves the friend to the front of the bar (setFriendAt(friend, 0)). */
    readonly moveToFront: boolean;
}

export type FriendBarTokenIcon = 'notify' | 'game';

const TOKEN_TYPES: ReadonlySet<number> = new Set([
    FriendBarNotificationType.ROOM_EVENT,
    FriendBarNotificationType.ACHIEVEMENT,
    FriendBarNotificationType.QUEST,
    FriendBarNotificationType.PLAYING_GAME
]);

/**
 * Applies one FriendNotificationEvent to a friend's notifications. A friend keeps one notification per
 * type and a newer one replaces the message. Returns null for types the bar has no token for.
 */
export const applyFriendBarNotification = (
    current: readonly FriendBarNotification[],
    typeCode: number,
    message: string | null | undefined
): FriendBarNotificationUpdate | null => {
    // "Finished a game" only removes the "playing a game" token (addNotificationToken, case 5).
    if (typeCode === FriendBarNotificationType.FINISHED_GAME) {
        return { notifications: current.filter((entry) => entry.typeCode !== FriendBarNotificationType.PLAYING_GAME), moveToFront: false };
    }

    if (!TOKEN_TYPES.has(typeCode)) return null;

    const playing = typeCode === FriendBarNotificationType.PLAYING_GAME;
    const notification: FriendBarNotification = { typeCode, message: message ?? '', viewOnce: !playing };
    const index = current.findIndex((entry) => entry.typeCode === typeCode);

    if (index === -1) return { notifications: [...current, notification], moveToFront: true };

    const notifications = [...current];

    notifications[index] = notification;

    // An update to "playing a game" is stored without being announced again.
    return { notifications, moveToFront: !playing };
};

/** deselect(true): closing the tab yourself consumes its view-once notifications. */
export const consumeViewedFriendBarNotifications = (current: readonly FriendBarNotification[]): FriendBarNotification[] =>
    current.filter((entry) => !entry.viewOnce);

export const getFriendBarTokenIcon = (typeCode: number): FriendBarTokenIcon => (typeCode === FriendBarNotificationType.PLAYING_GAME ? 'game' : 'notify');

/**
 * The icon strip above a tab holds one icon per tag (icon_tag_notify, icon_tag_game); a tag seen later
 * is inserted at the front, as addListItemAt(icon, 0) does.
 */
export const getFriendBarTokenIcons = (notifications: readonly FriendBarNotification[]): FriendBarTokenIcon[] => {
    const icons: FriendBarTokenIcon[] = [];

    for (const entry of notifications) {
        const icon = getFriendBarTokenIcon(entry.typeCode);

        if (!icons.includes(icon)) icons.unshift(icon);
    }

    return icons;
};

const TITLE_KEYS: Readonly<Record<number, string>> = {
    [FriendBarNotificationType.ROOM_EVENT]: 'friendbar.notify.event',
    [FriendBarNotificationType.ACHIEVEMENT]: 'friendbar.notify.achievement',
    [FriendBarNotificationType.QUEST]: 'friendbar.notify.quest',
    [FriendBarNotificationType.PLAYING_GAME]: 'friendbar.notify.game'
};

export const getFriendBarNotificationTitleKey = (typeCode: number): string => TITLE_KEYS[typeCode] ?? '';

export interface FriendBarNotificationLocalizer {
    badgeName(badgeCode: string): string;
    text(key: string): string;
}

/** The second line of a token piece: AchievementToken, QuestToken, GameToken and RoomEventToken. */
export const getFriendBarNotificationMessage = (notification: FriendBarNotification, localize: FriendBarNotificationLocalizer): string => {
    switch (notification.typeCode) {
        case FriendBarNotificationType.ACHIEVEMENT:
            return localize.badgeName(notification.message);
        case FriendBarNotificationType.QUEST:
            return localize.text(`quests.${notification.message}.name`);
        case FriendBarNotificationType.PLAYING_GAME:
            return localize.text(`gamecenter.${notification.message}.name`);
        default:
            return notification.message;
    }
};

/** Bar order: friends moved to the front by a notification (latest first), then the rest in their order. */
export const orderFriendBarFriends = <T extends { id: number }>(friends: readonly T[], frontIds: readonly number[]): T[] => {
    const byId = new Map(friends.map((friend) => [friend.id, friend] as const));
    const front = frontIds.map((id) => byId.get(id)).filter((friend): friend is T => !!friend);
    const inFront = new Set(front.map((friend) => friend.id));

    return [...front, ...friends.filter((friend) => !inFront.has(friend.id))];
};

export const moveFriendBarFriendToFront = (frontIds: readonly number[], friendId: number): number[] => [friendId, ...frontIds.filter((id) => id !== friendId)];
