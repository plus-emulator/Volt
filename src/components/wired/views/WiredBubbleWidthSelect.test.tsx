import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api', () => ({
    localizeWithFallback: (key: string, fallback: string) => fallback
}));

vi.mock('../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('./WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('./WiredDropdown', () => ({ WiredDropdown: ({ caption, value, onChange, options }: { caption: string; value: number; onChange: (id: number) => void; options: { id: number; label: string }[] }) => <select aria-label={caption} value={value} onChange={event => onChange(Number(event.target.value))}>{options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select> }));
import { WiredNativeContext } from './WiredNativeContext';

import { WIRED_BUBBLE_WIDTH_OPTIONS, WiredBubbleWidthSelect } from './WiredBubbleWidthSelect';

describe('WiredBubbleWidthSelect', () => {
    afterEach(cleanup);

    it('offers the room setting and the three official widths, in the official order', () => {
        expect(WIRED_BUBBLE_WIDTH_OPTIONS).toEqual([-1, 0, 1, 2]);

        render(<WiredBubbleWidthSelect value={-1} onChange={vi.fn()} />);

        const select = screen.getByRole('combobox', { name: 'Bubble width' });
        expect(Array.from(select.querySelectorAll('option')).map((option) => option.textContent)).toEqual(['Room setting', 'Wide', 'Normal', 'Thin']);
    });

    it('keeps the native width section initially folded and preserves the stored selection when opened', () => {
        const onChange = vi.fn();
        render(<WiredNativeContext.Provider value={true}><WiredBubbleWidthSelect value={2} onChange={onChange} /></WiredNativeContext.Provider>);
        expect(screen.queryByRole('combobox')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Bubble width' }));
        const select = screen.getByRole('combobox', { name: 'Bubble width' }) as HTMLSelectElement;
        expect(select.value).toBe('2');
        fireEvent.change(select, { target: { value: '-1' } });
        expect(onChange).toHaveBeenCalledWith(-1);
    });

    it('hands the chosen width to the window as a number', () => {
        const onChange = vi.fn();

        render(<WiredBubbleWidthSelect value={-1} onChange={onChange} />);

        fireEvent.change(screen.getByRole('combobox', { name: 'Bubble width' }), { target: { value: '2' } });

        expect(onChange).toHaveBeenCalledWith(2);
    });
});
