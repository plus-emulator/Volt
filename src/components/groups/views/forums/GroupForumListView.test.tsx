import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupForumListView } from './GroupForumListView';

// The external texts as the hotel ships them; LocalizeText fills every %PARAM% like AIR's Localization (the renderer does the same).
const localization = vi.hoisted(() => {
    const texts: Record<string, string> = {
        'groupforum.view.forum_details':
            'Score %RATING%, last message by <a href="event:friendbar/user/%LAST_AUTHOR_NAME%">%LAST_AUTHOR_NAME%</a> %UPDATE_TIME%',
        'groupforum.view.thread_details1': '%TOTAL_MESSAGES% messages',
        'groupforum.view.thread_details2': '%NEW_MESSAGES% unread',
        'friendlytime.seconds.ago': '%amount% seconds ago',
        'friendlytime.minutes.ago': '%amount% minutes ago'
    };

    return {
        LocalizeText: (key: string, parameters: string[] = [], values: string[] = []) =>
            parameters.reduce((text, parameter, index) => text.replace(new RegExp(`%${parameter}%`, 'gi'), () => values[index]), texts[key] ?? key)
    };
});

vi.mock('../../../../api/utils/LocalizeText', () => localization);

vi.mock('../../../../api', async () => ({
    GetGroupInformation: vi.fn(),
    LocalizeText: localization.LocalizeText,
    FriendlyTime: (await vi.importActual<typeof import('../../../../api/utils/FriendlyTime')>('../../../../api/utils/FriendlyTime')).FriendlyTime
}));

vi.mock('@volt/renderer', () => ({ CreateLinkEvent: vi.fn() }));

vi.mock('../../../../common', () => ({
    ClassicScrollAreaView: ({ children }: any) => <div>{children}</div>,
    LayoutBadgeImageView: () => null,
    VoltCardHeaderView: () => null,
    VoltCardView: () => null
}));

vi.mock('../GroupNativeLayout', () => ({
    GroupText: ({ text }: any) => <span data-testid="text">{text}</span>,
    GroupWindowTitle: () => null,
    flatText: (size: number) => ({ size })
}));

const forum = (extra: object) => ({
    groupId: 5,
    name: 'Forum',
    icon: 'b5',
    unreadMessages: 0,
    totalMessages: 0,
    leaderboardScore: 0,
    lastMessageAuthorName: '',
    lastMessageTimeAsSecondsAgo: 0,
    ...extra
});

const renderList = (entry: object) =>
    render(
        <GroupForumListView
            list={{ listCode: 2, totalAmount: 1, startIndex: 0, forums: [forum(entry) as any] }}
            onMarkAsRead={vi.fn()}
            onOpenForum={vi.fn()}
            onPage={vi.fn()}
        />
    );

const texts = () => screen.getAllByTestId('text').map((element) => element.textContent);

afterEach(cleanup);

describe('GroupForumListView forum details (ForumsListView.updateListItem)', () => {
    it('reads a forum without messages like AIR: empty author link, "0 seconds ago"', () => {
        renderList({});

        expect(texts()).toContain('Score 0, last message by  0 seconds ago');
        expect(texts().join(' ')).not.toContain('%');
    });

    it('names the last author and the friendly time of the last message', () => {
        renderList({ leaderboardScore: 12, lastMessageAuthorName: 'Bob', lastMessageTimeAsSecondsAgo: 150, totalMessages: 4 });

        expect(texts()).toContain('Score 12, last message by Bob 3 minutes ago');
        expect(texts()).toContain('4 messages');
    });
});
