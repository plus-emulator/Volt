import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GuildForumThreadsEvent, MessageEvent, ModerateThreadMessageComposer, UpdateThreadMessageComposer } from '@volt/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GroupForumThreadListView } from './GroupForumThreadListView';

const state = vi.hoisted(() => ({
    listeners: new Set<any>(),
    send: vi.fn()
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

    return {
        MessageEvent,
        GuildForumThreadsEvent: class extends MessageEvent {},
        UpdateThreadMessageEvent: class extends MessageEvent {},
        GetThreadsMessageComposer: class GetThreadsMessageComposer extends Composer {},
        ModerateThreadMessageComposer: class ModerateThreadMessageComposer extends Composer {},
        UpdateThreadMessageComposer: class UpdateThreadMessageComposer extends Composer {},
        GetCommunication: () => ({
            registerMessageEvent: (event: any) => state.listeners.add(event),
            removeMessageEvent: (event: any) => state.listeners.delete(event)
        })
    };
});

vi.mock('../../../../api', () => ({
    FriendlyTime: { format: () => 'a while ago' },
    LocalizeText: (key: string, _keys?: string[], values?: string[]) => (values ? `${key}:${values[0]}` : key),
    ReportType: { THREAD: 4 },
    SendMessageComposer: (composer: unknown) => state.send(composer)
}));

vi.mock('../../../../common', () => ({
    ClassicScrollAreaView: ({ children }: any) => <div>{children}</div>,
    LayoutBadgeImageView: () => null,
    VoltCardHeaderView: () => null,
    VoltCardView: () => null
}));

vi.mock('../../../../hooks', async () => ({
    useHelp: () => ({ report: vi.fn() }),
    useMessageEvent: (await import('../../../../hooks/events/useMessageEvent')).useMessageEvent
}));

vi.mock('../GroupNativeLayout', () => ({
    GroupText: ({ text, className }: any) => <span className={className}>{text}</span>,
    GroupWindowTitle: () => null,
    flatText: (size: number, extra: object = {}) => ({ size, ...extra })
}));

const forumData = (rights: Partial<{ canModerate: boolean; isStaff: boolean }> = {}) =>
    ({
        canModerate: false,
        isStaff: false,
        canReport: true,
        canPostThread: true,
        postThreadPermissionError: '',
        totalThreads: 3,
        ...rights
    }) as any;

const thread = (threadId: number, extra: object = {}) => ({
    threadId,
    header: `Thread ${threadId}`,
    authorName: 'Author',
    lastUserName: 'Last',
    creationTimeAsSecondsAgo: 10,
    lastCommentTime: 5,
    totalMessages: 10,
    unreadMessagesCount: 0,
    state: 1,
    adminName: 'Admin',
    isPinned: false,
    isLocked: false,
    ...extra
});

const renderThreads = (rights: Partial<{ canModerate: boolean; isStaff: boolean }>, threads: object[], extra: object = {}) => {
    const onOpenThread = vi.fn();

    render(
        <GroupForumThreadListView
            forumData={forumData(rights)}
            getLastReadMessageIndex={(entry) => entry.totalMessages - entry.unreadMessagesCount - 1}
            groupId={7}
            pageIndex={0}
            onLeave={vi.fn()}
            onNewThread={vi.fn()}
            onOpenThread={onOpenThread}
            onPageChange={vi.fn()}
            {...extra}
        />
    );

    act(() => {
        for (const listener of [...state.listeners]) {
            if (listener.constructor === GuildForumThreadsEvent) listener.callBack({ getParser: () => ({ groupId: 7, startIndex: 0, threads }) });
        }
    });

    return { onOpenThread };
};

const sent = (type: unknown) => state.send.mock.calls.map(([composer]) => composer).filter((composer) => composer instanceof (type as any));
const rows = () => Array.from(document.querySelectorAll('.volt-forum__thread'));

beforeEach(() => state.send.mockClear());

afterEach(() => {
    cleanup();
    state.listeners.clear();
});

describe('GroupForumThreadListView (AIR ThreadListView)', () => {
    it('keeps the server order and opens a thread from its subject or its counts', () => {
        const { onOpenThread } = renderThreads({}, [thread(1), thread(2, { isPinned: true })]);

        expect(rows().map((row) => row.textContent?.match(/Thread \d/)?.[0])).toEqual(['Thread 1', 'Thread 2']);

        fireEvent.click(rows()[1].querySelector('.volt-forum__thread-header'));
        fireEvent.click(rows()[0].querySelector('.volt-forum__thread-counts'));

        expect(onOpenThread.mock.calls.map(([entry]) => entry.threadId)).toEqual([2, 1]);
    });

    it('counts unread messages from the last read message index', () => {
        renderThreads({}, [thread(1, { totalMessages: 10, unreadMessagesCount: 3 })], {
            getLastReadMessageIndex: () => 7
        });

        expect(screen.getByText('groupforum.view.thread_details2:2')).toBeInTheDocument();
    });

    it('shows readers the moderation message of a hidden thread, the lock and pin only when set, and no hide button', () => {
        renderThreads({}, [thread(1, { state: 10, isLocked: true }), thread(2, { state: 20, header: '' })]);

        expect(screen.getByText('groupforum.view.thread_hidden_by_admin:Admin')).toBeInTheDocument();
        expect(screen.getByText('groupforum.view.thread_hidden_by_staff:Admin')).toBeInTheDocument();
        expect(rows()[0].querySelectorAll('.volt-forum__flag')).toHaveLength(1);
        expect(rows()[0].querySelector('.volt-forum__flag')).toBeDisabled();
        expect(rows()[1].querySelectorAll('.volt-forum__flag')).toHaveLength(0);
        expect(document.querySelector('.is-hide')).toBeNull();
    });

    it('lets a group admin hide with 10 and show a thread hidden by an admin, but not one deleted by staff', () => {
        renderThreads({ canModerate: true }, [thread(1), thread(2, { state: 10 }), thread(3, { state: 20, header: '' })]);

        expect(screen.getByText('(No Subject)')).toBeInTheDocument();
        expect(rows()[2].querySelector('.is-hide')).toBeNull();

        fireEvent.click(rows()[0].querySelector('.is-hide'));
        fireEvent.click(rows()[1].querySelector('.is-hide'));

        expect(sent(ModerateThreadMessageComposer)).toEqual([new ModerateThreadMessageComposer(7, 1, 10), new ModerateThreadMessageComposer(7, 2, 1)]);
    });

    it('lets staff hide with 20 and show a thread deleted by staff again', () => {
        renderThreads({ isStaff: true }, [thread(1), thread(2, { state: 20 })]);

        fireEvent.click(rows()[0].querySelector('.is-hide'));
        fireEvent.click(rows()[1].querySelector('.is-hide'));
        fireEvent.click(rows()[0].querySelectorAll('.volt-forum__flag')[0]);

        expect(sent(ModerateThreadMessageComposer)).toEqual([new ModerateThreadMessageComposer(7, 1, 20), new ModerateThreadMessageComposer(7, 2, 1)]);
        expect(sent(UpdateThreadMessageComposer)).toEqual([new UpdateThreadMessageComposer(7, 1, true, false)]);
    });
});
