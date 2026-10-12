import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CreateLinkEvent } from '@volt/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGroupForumUnreadStore } from '../../state/groupForumUnreadStore';
import { ToolbarMeView } from './ToolbarMeView';

vi.mock('@volt/renderer', () => ({
    CreateLinkEvent: vi.fn(),
    GetRoomEngine: () => ({ selectRoomObject: vi.fn() }),
    GetSessionDataManager: () => ({ userId: 1 }),
    RoomObjectCategory: { UNIT: 100 }
}));

vi.mock('../../api', () => ({
    DispatchUiEvent: vi.fn(),
    GetConfigurationValue: () => false,
    GetRoomSession: () => null,
    GetUserProfile: vi.fn(),
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../common', () => ({
    Flex: ({ children, innerRef }: any) => <div ref={innerRef}>{children}</div>,
    LayoutItemCountView: ({ count }: any) => <div data-testid="count">{count}</div>
}));

vi.mock('../../events', () => ({ GuideToolEvent: class {} }));

beforeEach(() => useGroupForumUnreadStore.setState({ unreadForumsCount: 0 }));

afterEach(cleanup);

describe('ToolbarMeView forums item', () => {
    it('counts the forums with unread messages (MeMenuNewController.unseenForumsCount) and opens "My Forums"', () => {
        render(<ToolbarMeView setMeExpanded={vi.fn()} useGuideTool={false} />);

        expect(screen.queryByTestId('count')).toBeNull();

        act(() => useGroupForumUnreadStore.getState().setUnreadForumsCount(3));
        expect(screen.getByTestId('count')).toHaveTextContent('3');

        fireEvent.click(screen.getByText('Forums'));
        expect(CreateLinkEvent).toHaveBeenCalledWith('groupforum/list/my');
    });
});
