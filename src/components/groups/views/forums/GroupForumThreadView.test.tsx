import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GetMessagesMessageComposer, MessageEvent, ModerateMessageMessageComposer, PostMessageMessageEvent, ThreadMessagesMessageEvent } from '@volt/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GroupForumThreadView } from './GroupForumThreadView';

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
        ThreadMessagesMessageEvent: class extends MessageEvent {},
        PostMessageMessageEvent: class extends MessageEvent {},
        PostThreadMessageEvent: class extends MessageEvent {},
        UpdateMessageMessageEvent: class extends MessageEvent {},
        UpdateThreadMessageEvent: class extends MessageEvent {},
        GetMessagesMessageComposer: class GetMessagesMessageComposer extends Composer {},
        ModerateMessageMessageComposer: class ModerateMessageMessageComposer extends Composer {},
        GetCommunication: () => ({
            registerMessageEvent: (event: any) => state.listeners.add(event),
            removeMessageEvent: (event: any) => state.listeners.delete(event)
        })
    };
});

vi.mock('../../../../api', () => ({
    FriendlyTime: { format: () => 'a while ago' },
    LocalizeText: (key: string, _keys?: string[], values?: string[]) => (values ? `${key}:${values[0]}` : key),
    ReportType: { MESSAGE: 5 },
    SendMessageComposer: (composer: unknown) => state.send(composer)
}));

vi.mock('../../../../common', () => ({
    ClassicScrollAreaView: ({ children }: any) => <div>{children}</div>,
    LayoutAvatarImageView: () => null,
    LayoutBadgeImageView: () => null,
    VoltCardHeaderView: () => null,
    VoltCardView: () => null
}));

vi.mock('../../../../hooks', async () => ({
    useHelp: () => ({ report: vi.fn() }),
    useMessageEvent: (await import('../../../../hooks/events/useMessageEvent')).useMessageEvent
}));

vi.mock('../GroupNativeLayout', () => ({
    GroupText: ({ text }: any) => <span>{text}</span>,
    GroupWindowTitle: () => null,
    flatText: (size: number, extra: object = {}) => ({ size, ...extra })
}));

vi.mock('./GroupForumThreadListView', () => ({ forumPermissionText: (code: string) => code }));

const forumData = (rights: Partial<{ canModerate: boolean; isStaff: boolean }> = {}) =>
    ({
        canModerate: false,
        isStaff: false,
        canReport: true,
        canPostMessage: true,
        postMessagePermissionError: '',
        moderatePermissionError: '',
        ...rights
    }) as any;

const message = (messageId: number, messageIndex: number, extra: object = {}) => ({
    messageId,
    messageIndex,
    threadId: 3,
    state: 1,
    adminName: 'Admin',
    authorName: 'Author',
    authorFigure: '',
    authorPostCount: 1,
    creationTime: 10,
    messageText: `Text ${messageId}`,
    ...extra
});

const dispatch = (type: typeof MessageEvent, parser: unknown) => {
    act(() => {
        for (const listener of [...state.listeners]) {
            if (listener.constructor === type) listener.callBack({ getParser: () => parser });
        }
    });
};

const renderThread = (rights: Partial<{ canModerate: boolean; isStaff: boolean }>, onMessagesSeen = vi.fn()) => {
    render(
        <GroupForumThreadView
            forumData={forumData(rights)}
            groupId={7}
            initialPageIndex={0}
            initialThread={{ threadId: 3, header: 'Subject', totalMessages: 3, isLocked: false } as any}
            scrollIndex={0}
            threadId={3}
            onBack={vi.fn()}
            onMessagesSeen={onMessagesSeen}
            onReply={vi.fn()}
        />
    );

    dispatch(ThreadMessagesMessageEvent, {
        groupId: 7,
        threadId: 3,
        startIndex: 0,
        messages: [message(11, 0), message(12, 1, { state: 10 }), message(13, 2, { state: 20 })]
    });
};

const sent = (type: unknown) => state.send.mock.calls.map(([composer]) => composer).filter((composer) => composer instanceof (type as any));
const items = () => Array.from(document.querySelectorAll('.volt-forum__message'));

beforeEach(() => state.send.mockClear());

afterEach(() => {
    cleanup();
    state.listeners.clear();
});

describe('GroupForumThreadView (AIR MessageListView)', () => {
    it('reports the last message of the page as seen with its thread and index', () => {
        const onMessagesSeen = vi.fn();

        renderThread({}, onMessagesSeen);

        expect(onMessagesSeen).toHaveBeenCalledWith(13, 3, 2);
    });

    it('shows readers the moderation messages and no hide buttons', () => {
        renderThread({});

        expect(screen.getByText('Text 11')).toBeInTheDocument();
        expect(screen.getByText('groupforum.view.message_hidden_by_admin:Admin')).toBeInTheDocument();
        expect(screen.getByText('groupforum.view.message_hidden_by_staff:Admin')).toBeInTheDocument();
        expect(document.querySelector('.is-hide')).toBeNull();
    });

    it('lets a group admin read and show a message hidden by an admin, but not one deleted by staff', () => {
        renderThread({ canModerate: true });

        expect(screen.getByText('Text 12')).toBeInTheDocument();
        expect(screen.getByText('groupforum.view.message_hidden_by_staff:Admin')).toBeInTheDocument();
        expect(items()[2].querySelector('.is-hide')).toBeNull();

        fireEvent.click(items()[0].querySelector('.is-hide'));
        fireEvent.click(items()[1].querySelector('.is-hide'));

        expect(sent(ModerateMessageMessageComposer)).toEqual([
            new ModerateMessageMessageComposer(7, 3, 11, 10),
            new ModerateMessageMessageComposer(7, 3, 12, 1)
        ]);
    });

    it('lets staff moderators read, hide with 20 and show again a message deleted by staff', () => {
        renderThread({ canModerate: true, isStaff: true });

        expect(screen.getByText('Text 13')).toBeInTheDocument();

        fireEvent.click(items()[0].querySelector('.is-hide'));
        fireEvent.click(items()[2].querySelector('.is-hide'));

        expect(sent(ModerateMessageMessageComposer)).toEqual([
            new ModerateMessageMessageComposer(7, 3, 11, 20),
            new ModerateMessageMessageComposer(7, 3, 13, 1)
        ]);
    });

    it('goes to the page of a message just posted', () => {
        renderThread({});
        state.send.mockClear();

        dispatch(PostMessageMessageEvent, { groupId: 7, threadId: 3, message: message(14, 3) });
        expect(sent(GetMessagesMessageComposer)).toEqual([new GetMessagesMessageComposer(7, 3, 0, 20)]);

        dispatch(PostMessageMessageEvent, { groupId: 7, threadId: 3, message: message(40, 20) });
        expect(sent(GetMessagesMessageComposer).at(-1)).toEqual(new GetMessagesMessageComposer(7, 3, 20, 20));
    });
});
