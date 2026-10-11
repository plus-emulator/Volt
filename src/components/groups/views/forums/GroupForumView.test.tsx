import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
    ForumDataMessageEvent,
    ForumsListMessageEvent,
    GetForumStatsMessageComposer,
    GetForumsListMessageComposer,
    GetUnreadForumsCountMessageComposer,
    MessageEvent,
    UnreadForumsCountMessageEvent,
    UpdateForumReadMarkerEntry,
    UpdateForumReadMarkerMessageComposer
} from '@volt/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGroupForumUnreadStore } from '../../../../state/groupForumUnreadStore';
import { GroupForumView } from './GroupForumView';

const state = vi.hoisted(() => ({
    listeners: new Set<any>(),
    trackers: new Set<any>(),
    send: vi.fn(),
    groupInfo: vi.fn(),
    pollPeriod: 300 as number,
    threadList: null as any,
    threadView: null as any,
    compose: null as any
}));

vi.mock('@volt/renderer', () => {
    class MessageEvent {
        constructor(public callBack: (event: any) => void) {}
    }
    class Composer {
        public args: unknown[];

        constructor(...args: unknown[]) {
            this.args = args;
        }
    }
    class UpdateForumReadMarkerEntry {
        constructor(
            public groupId: number,
            public messageId: number,
            public read: boolean
        ) {}
    }

    return {
        MessageEvent,
        UpdateForumReadMarkerEntry,
        ForumDataMessageEvent: class extends MessageEvent {},
        ForumsListMessageEvent: class extends MessageEvent {},
        UnreadForumsCountMessageEvent: class extends MessageEvent {},
        UpdateThreadMessageEvent: class extends MessageEvent {},
        GetForumsListMessageComposer: class GetForumsListMessageComposer extends Composer {},
        GetForumStatsMessageComposer: class GetForumStatsMessageComposer extends Composer {},
        GetThreadMessageComposer: class GetThreadMessageComposer extends Composer {},
        GetUnreadForumsCountMessageComposer: class GetUnreadForumsCountMessageComposer extends Composer {},
        UpdateForumReadMarkerMessageComposer: class UpdateForumReadMarkerMessageComposer extends Composer {},
        AddLinkEventTracker: (tracker: any) => state.trackers.add(tracker),
        RemoveLinkEventTracker: (tracker: any) => state.trackers.delete(tracker),
        CreateLinkEvent: vi.fn(),
        GetCommunication: () => ({
            registerMessageEvent: (event: any) => state.listeners.add(event),
            removeMessageEvent: (event: any) => state.listeners.delete(event)
        })
    };
});

vi.mock('../../../../api', () => ({
    SendMessageComposer: (composer: unknown) => state.send(composer),
    GetConfigurationValue: (key: string, value: unknown) => (key === 'groupforum.poll.period' ? state.pollPeriod : value),
    GetGroupInformation: (groupId: number) => state.groupInfo(groupId),
    LocalizeText: (key: string) => key,
    FriendlyTime: { format: () => 'a while ago' }
}));

vi.mock('../../../../hooks', async () => ({
    useMessageEvent: (await import('../../../../hooks/events/useMessageEvent')).useMessageEvent
}));

vi.mock('../../../../common', () => ({
    VoltCardView: ({ children }: any) => <div role="dialog">{children}</div>,
    VoltCardHeaderView: ({ children, onCloseClick }: any) => (
        <div>
            <button aria-label="close" type="button" onClick={onCloseClick} />
            {children}
        </div>
    ),
    ClassicScrollAreaView: ({ children }: any) => <div>{children}</div>,
    LayoutBadgeImageView: ({ badgeCode }: any) => <img alt={badgeCode} />
}));

vi.mock('../GroupNativeLayout', () => ({
    GroupText: ({ text, onClick, className }: any) => (
        <span className={className} onClick={onClick}>
            {text}
        </span>
    ),
    GroupWindowTitle: () => null,
    flatText: (size: number, extra: object = {}) => ({ size, ...extra })
}));

vi.mock('../../../notification-center/views/native/NativeNotificationPopupView', () => ({ NativeNotificationPopupView: () => null }));
vi.mock('./GroupForumThreadListView', () => ({
    GroupForumThreadListView: (props: any) => {
        state.threadList = props;

        return (
            <button type="button" onClick={props.onLeave}>
                leave threads
            </button>
        );
    }
}));
vi.mock('./GroupForumThreadView', () => ({
    GroupForumThreadView: (props: any) => {
        state.threadView = props;

        return null;
    }
}));
vi.mock('./GroupForumComposeView', () => ({
    GroupForumComposeView: (props: any) => {
        state.compose = props;

        return null;
    }
}));
vi.mock('./GroupForumSettingsView', () => ({ GroupForumSettingsView: () => null }));

const dispatch = (type: typeof MessageEvent, parser: unknown) => {
    act(() => {
        for (const listener of [...state.listeners]) {
            if (listener.constructor === type) listener.callBack({ getParser: () => parser });
        }
    });
};

const link = (url: string) => {
    act(() => {
        for (const tracker of [...state.trackers]) tracker.linkReceived(url);
    });
};

const forum = (groupId: number, unreadMessages: number, totalMessages: number = 10) => ({
    groupId,
    name: `Forum ${groupId}`,
    icon: `b${groupId}`,
    unreadMessages,
    totalMessages,
    leaderboardScore: 0,
    lastMessageAuthorName: 'Someone',
    lastMessageTimeAsSecondsAgo: 30
});

const forumsList = (listCode: number, forums: ReturnType<typeof forum>[], totalAmount: number = forums.length, startIndex: number = 0) => ({
    listCode,
    totalAmount,
    startIndex,
    forums
});

const forumData = (groupId: number) => ({
    extendedForumData: {
        groupId,
        name: `Forum ${groupId}`,
        description: '',
        icon: `b${groupId}`,
        totalMessages: 4,
        lastReadMessageId: 4,
        readPermissionError: '',
        canChangeSettings: false
    }
});

const sent = (type: unknown) => state.send.mock.calls.map(([composer]) => composer).filter((composer) => composer instanceof (type as any));

beforeEach(() => {
    vi.useFakeTimers();
    state.send.mockClear();
    state.groupInfo.mockClear();
    state.pollPeriod = 300;
    state.threadList = null;
    state.threadView = null;
    state.compose = null;
    useGroupForumUnreadStore.setState({ unreadForumsCount: 0 });
});

afterEach(() => {
    cleanup();
    state.listeners.clear();
    state.trackers.clear();
    vi.useRealTimers();
});

describe('GroupForumView forums list', () => {
    it('asks for the unread forums count at start and on every poll, and for the "My Forums" page while the window is open', () => {
        state.pollPeriod = 60;
        render(<GroupForumView />);

        expect(state.send.mock.calls.map(([composer]) => composer)).toEqual([new GetUnreadForumsCountMessageComposer()]);

        act(() => {
            vi.advanceTimersByTime(60_000);
        });
        expect(sent(GetUnreadForumsCountMessageComposer)).toHaveLength(2);

        link('groupforum/list/active');
        dispatch(ForumsListMessageEvent, forumsList(0, [forum(1, 0)]));
        state.send.mockClear();

        act(() => {
            vi.advanceTimersByTime(60_000);
        });
        expect(state.send.mock.calls.map(([composer]) => composer)).toEqual([new GetForumsListMessageComposer(2, 0, 20)]);
    });

    it('opens the window with the list it asked for, drops any other list and counts the unread "My Forums"', () => {
        render(<GroupForumView />);

        link('groupforum/list/my');
        expect(sent(GetForumsListMessageComposer)).toEqual([new GetForumsListMessageComposer(2, 0, 20)]);
        expect(screen.queryByRole('dialog')).toBeNull();

        dispatch(ForumsListMessageEvent, forumsList(0, [forum(1, 3)]));
        expect(screen.queryByRole('dialog')).toBeNull();

        dispatch(ForumsListMessageEvent, forumsList(2, [forum(5, 3), forum(6, 0), forum(7, 1)]));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Forum 5')).toBeInTheDocument();
        expect(useGroupForumUnreadStore.getState().unreadForumsCount).toBe(2);
    });

    it('keeps the unread count of an unrequested "My Forums" answer without showing it', () => {
        render(<GroupForumView />);

        dispatch(ForumsListMessageEvent, forumsList(2, [forum(5, 3)]));
        expect(useGroupForumUnreadStore.getState().unreadForumsCount).toBe(1);
        expect(screen.queryByRole('dialog')).toBeNull();

        dispatch(UnreadForumsCountMessageEvent, { count: 4 });
        expect(useGroupForumUnreadStore.getState().unreadForumsCount).toBe(4);
    });

    it('shows "1 / 0" for an empty list with every page button disabled', () => {
        render(<GroupForumView />);

        link('groupforum/list/my');
        dispatch(ForumsListMessageEvent, forumsList(2, []));

        expect(screen.getByText('1 / 0')).toBeInTheDocument();
        for (const label of ['<<', '<', '>', '>>']) expect(screen.getByText(label).closest('button')).toBeDisabled();
    });

    it('pages by asking for the list again from the page start', () => {
        render(<GroupForumView />);

        link('groupforum/list/popular');
        dispatch(ForumsListMessageEvent, forumsList(1, [forum(1, 0)], 45, 20));

        expect(screen.getByText('2 / 3')).toBeInTheDocument();

        fireEvent.click(screen.getByText('>>'));
        fireEvent.click(screen.getByText('<<'));
        expect(sent(GetForumsListMessageComposer).slice(-2)).toEqual([new GetForumsListMessageComposer(1, 40, 20), new GetForumsListMessageComposer(1, 0, 20)]);
    });

    it('marks every unread forum read, zeroes the count and closes the window on "Mark As Read"', () => {
        render(<GroupForumView />);

        link('groupforum/list/my');
        dispatch(ForumsListMessageEvent, forumsList(2, [forum(5, 3, 12), forum(6, 0, 7), forum(7, 1, 2)]));
        state.send.mockClear();

        fireEvent.click(screen.getByText('groupforum.view.mark_read'));

        expect(state.send.mock.calls.map(([composer]) => composer)).toEqual([
            new UpdateForumReadMarkerMessageComposer(new UpdateForumReadMarkerEntry(5, 12, true), new UpdateForumReadMarkerEntry(7, 2, true))
        ]);
        expect(useGroupForumUnreadStore.getState().unreadForumsCount).toBe(0);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('opens a forum from its header or message counts, and the badge asks for the group details instead', () => {
        render(<GroupForumView />);

        link('groupforum/list/my');
        dispatch(ForumsListMessageEvent, forumsList(2, [forum(5, 0)]));

        fireEvent.click(screen.getByAltText('b5').parentElement);
        expect(state.groupInfo).toHaveBeenCalledWith(5);
        expect(sent(GetForumStatsMessageComposer)).toEqual([]);

        fireEvent.click(document.querySelector('.volt-forum__forum-header'));
        expect(sent(GetForumStatsMessageComposer)).toEqual([new GetForumStatsMessageComposer(5)]);
    });

    it('goes back to the list a forum was opened from, but closes the window of a forum opened by a link', () => {
        render(<GroupForumView />);

        link('groupforum/list/active');
        dispatch(ForumsListMessageEvent, forumsList(0, [forum(5, 0)], 30, 20));
        fireEvent.click(document.querySelector('.volt-forum__forum-header'));
        dispatch(ForumDataMessageEvent, forumData(5));
        state.send.mockClear();

        fireEvent.click(screen.getByText('leave threads'));
        expect(sent(GetForumsListMessageComposer)).toEqual([new GetForumsListMessageComposer(0, 20, 20)]);

        link('groupforum/9');
        dispatch(ForumDataMessageEvent, forumData(9));
        state.send.mockClear();

        fireEvent.click(screen.getByText('leave threads'));
        expect(sent(GetForumsListMessageComposer)).toEqual([]);
        expect(sent(UpdateForumReadMarkerMessageComposer)).toHaveLength(1);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('opens a thread at the first message after the last one seen (onGoToFirstUnread)', () => {
        render(<GroupForumView />);

        link('groupforum/5');
        dispatch(ForumDataMessageEvent, forumData(5));

        const thread = { threadId: 3, totalMessages: 45, unreadMessagesCount: 5 };

        act(() => state.threadList.onOpenThread(thread));
        expect(state.threadView).toMatchObject({ threadId: 3, initialPageIndex: 2, scrollIndex: 0 });

        act(() => state.threadView.onMessagesSeen(90, 3, 43));
        act(() => state.threadView.onBack());
        expect(state.threadList.getLastReadMessageIndex(thread)).toBe(43);

        act(() => state.threadList.onOpenThread(thread));
        expect(state.threadView).toMatchObject({ initialPageIndex: 2, scrollIndex: 4 });
    });

    it('goes back to the first page of the thread list after posting a thread (onPostThreadMessage)', () => {
        render(<GroupForumView />);

        link('groupforum/5');
        dispatch(ForumDataMessageEvent, forumData(5));
        act(() => state.threadList.onPageChange(2));
        act(() => state.threadList.onNewThread());

        const reloadKey = state.threadList.reloadKey;

        act(() => state.compose.onThreadCreated({ threadId: 8, lastMessageId: 120, totalMessages: 1, unreadMessagesCount: 0 }));

        expect(state.threadList.pageIndex).toBe(0);
        expect(state.threadList.reloadKey).toBe(reloadKey + 1);
        expect(state.threadList.getLastReadMessageIndex({ threadId: 8, totalMessages: 1, unreadMessagesCount: 1 })).toBe(0);
    });
});
