import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FriendBarNotificationType } from '../../../../api/friends/friendBarNotifications';
import { useFriendBarNotificationsStore } from '../../../../hooks/friends/friendBarNotificationsStore';
import { FriendBarView } from './FriendsBarView';

vi.mock('../../../../api', async () => ({
    ...(await vi.importActual<object>('../../../../api/friends/friendBarNotifications')),
    GetUserProfile: vi.fn(),
    LocalizeBadgeName: (code: string) => `badge:${code}`,
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    OpenMessengerChat: vi.fn(),
    SendMessageComposer: vi.fn()
}));

vi.mock('../../../../hooks', async () => ({
    ...(await vi.importActual<object>('../../../../hooks/friends/friendBarNotificationsStore')),
    useFriendBarNotifications: () => undefined,
    useFriends: () => ({ followFriend: vi.fn() })
}));

vi.mock('../../../../common', () => ({
    LayoutAvatarImageView: () => <div data-testid="avatar" />,
    LayoutBadgeImageView: () => <div data-testid="badge" />
}));

const friend = (id: number, name: string, extra: object = {}) =>
    ({ id, name, figure: 'hd-180-1', online: true, followingAllowed: true, realName: '', ...extra }) as any;

const tabNames = (container: HTMLElement) =>
    [...container.querySelectorAll('.friend-bar-friend .friend-bar-tab .friend-bar-text')].map((element) => element.textContent);

const tabOf = (container: HTMLElement, name: string) =>
    [...container.querySelectorAll<HTMLElement>('.friend-bar-friend')].find((element) => element.querySelector('.friend-bar-tab')?.textContent === name);

const receive = (friendId: number, typeCode: number, message: string) =>
    act(() => useFriendBarNotificationsStore.getState().receive(friendId, typeCode, message));

describe('FriendBarView notifications', () => {
    beforeEach(() => useFriendBarNotificationsStore.setState({ notificationsByFriendId: {}, frontFriendIds: [] }));
    afterEach(cleanup);

    it('moves a notified friend to the front and marks the tab with a token icon', () => {
        const { container } = render(<FriendBarView onlineFriends={[friend(1, 'Alice'), friend(2, 'Bob')]} />);

        receive(2, FriendBarNotificationType.ACHIEVEMENT, 'ACH_RoomEntry3');

        expect(tabNames(container)).toEqual(['Bob', 'Alice']);
        expect(tabOf(container, 'Bob')?.querySelectorAll('.friend-bar-token')).toHaveLength(1);
        expect(tabOf(container, 'Alice')?.querySelector('.friend-bar-token')).toBeNull();
    });

    it('shows the achievement between the header and the controls and consumes it on close', () => {
        const { container } = render(<FriendBarView onlineFriends={[friend(2, 'Bob', { followingAllowed: false, realName: 'Robert' })]} />);

        receive(2, FriendBarNotificationType.ACHIEVEMENT, 'ACH_RoomEntry3');
        fireEvent.click(tabOf(container, 'Bob')!.querySelector('.friend-bar-token')!);

        const tab = tabOf(container, 'Bob')!;

        expect(tab.querySelector('.friend-bar-piece-real-name')?.textContent).toBe('Robert');
        expect(tab.querySelector('.friend-bar-piece-title')?.textContent).toBe('friendbar.notify.achievement');
        expect(tab.querySelector('.friend-bar-piece-text')?.textContent).toBe('badge:ACH_RoomEntry3');
        // btn_visit is only shown when the friend allows following.
        expect(tab.querySelectorAll('.friend-bar-action-icon')).toHaveLength(2);

        fireEvent.click(tab.querySelector('.friend-bar-tab')!);

        expect(useFriendBarNotificationsStore.getState().notificationsByFriendId[2]).toEqual([]);
        expect(tabOf(container, 'Bob')?.querySelector('.friend-bar-token')).toBeNull();
    });

    it('keeps "playing a game" after closing and hides visit while it lasts', () => {
        const { container } = render(<FriendBarView onlineFriends={[friend(2, 'Bob')]} />);

        receive(2, FriendBarNotificationType.PLAYING_GAME, 'snowwar');
        fireEvent.click(tabOf(container, 'Bob')!.querySelector('.friend-bar-tab')!);

        expect(tabOf(container, 'Bob')!.querySelector('.friend-bar-piece-text')?.textContent).toBe('gamecenter.snowwar.name');
        expect(tabOf(container, 'Bob')!.querySelectorAll('.friend-bar-action-icon')).toHaveLength(2);

        fireEvent.click(tabOf(container, 'Bob')!.querySelector('.friend-bar-tab')!);

        expect(useFriendBarNotificationsStore.getState().notificationsByFriendId[2]).toHaveLength(1);
        expect(tabOf(container, 'Bob')?.querySelector('.friend-bar-token')).not.toBeNull();
    });
});
