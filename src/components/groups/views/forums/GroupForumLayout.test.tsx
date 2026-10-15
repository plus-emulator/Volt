import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ForumPager } from './GroupForumLayout';

vi.mock('../../../../api', () => ({
    FriendlyTime: { format: () => '' },
    LocalizeText: (key: string) => key
}));

vi.mock('../../../../common', () => ({
    LayoutBadgeImageView: () => null,
    VoltCardHeaderView: () => null,
    VoltCardView: () => null
}));

vi.mock('../GroupNativeLayout', () => ({
    GroupText: ({ text }: { text: string }) => <span>{text}</span>,
    GroupWindowTitle: () => null,
    flatText: (size: number) => ({ size })
}));

const button = (label: string) => screen.getByText(label).closest('button');

afterEach(cleanup);

describe('ForumPager', () => {
    it('reads "1 / 0" without pages and disables every button, like GroupForumView.initCommonControls', () => {
        render(<ForumPager pageCount={0} pageIndex={0} onPage={vi.fn()} />);

        expect(screen.getByText('1 / 0')).toBeInTheDocument();
        for (const label of ['<<', '<', '>', '>>']) expect(button(label)).toBeDisabled();
    });

    it('enables << and < after the first page and > and >> before the last one', () => {
        const onPage = vi.fn();

        render(<ForumPager pageCount={4} pageIndex={1} onPage={onPage} />);

        expect(screen.getByText('2 / 4')).toBeInTheDocument();

        for (const label of ['<<', '<', '>', '>>']) fireEvent.click(button(label));

        expect(onPage.mock.calls.map(([page]) => page)).toEqual([0, 0, 2, 3]);
    });

    it('stops at the last page', () => {
        render(<ForumPager pageCount={2} pageIndex={1} onPage={vi.fn()} />);

        expect(button('<')).toBeEnabled();
        expect(button('>')).toBeDisabled();
        expect(button('>>')).toBeDisabled();
    });
});
