import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from './WiredNativeContext';
import { WiredDropdown } from './WiredDropdown';

vi.mock('../../../common/native-text/NativeText', () => ({ NativeText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: () => null }));

const onChange = vi.fn();
const options = [{ id: 2, label: 'Always' }, { id: 7, label: 'When changed' }];
const View = ({ disabled = false }: { disabled?: boolean }) => {
    const [value, setValue] = useState(-1);
    return <WiredNativeContext.Provider value={true}><WiredDropdown options={options} value={value} caption="Display mode" disabled={disabled}
        onChange={next => { setValue(next); onChange(next); }} /></WiredNativeContext.Provider>;
};

describe('native Wired dropdown', () => {
    beforeEach(() => {
        onChange.mockClear();
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ measureText: (text: string) => ({ width: text.length * 6 }) } as unknown as ReturnType<HTMLCanvasElement['getContext']>);
    });
    afterEach(() => { cleanup(); vi.restoreAllMocks(); });

    it('opens the Illumina list and saves the selected wire ID once', () => {
        render(<View />);
        const trigger = screen.getByRole('combobox', { name: 'Display mode' });
        expect(trigger.textContent).toBe('Display mode');
        expect(trigger.tagName).toBe('BUTTON');
        fireEvent.click(trigger);
        const choice = screen.getByRole('option', { name: 'When changed' });
        fireEvent.pointerDown(choice, { button: 0 });
        fireEvent.pointerUp(choice, { button: 0 });
        expect(onChange).toHaveBeenCalledExactlyOnceWith(7);
        expect(trigger.textContent).toBe('When changed');
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('closes without changing the selection on Escape or an outside pointer', () => {
        render(<View />);
        const trigger = screen.getByRole('combobox');
        fireEvent.keyDown(trigger, { key: 'Enter' });
        fireEvent.keyDown(trigger, { key: 'Escape' });
        expect(screen.queryByRole('listbox')).toBeNull();
        fireEvent.click(trigger);
        fireEvent.pointerDown(document.body);
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('does not open a disabled selector', () => {
        render(<View disabled />);
        fireEvent.click(screen.getByRole('combobox'));
        expect(screen.queryByRole('listbox')).toBeNull();
    });
});
