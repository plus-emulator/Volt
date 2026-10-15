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

const AdvancedView = ({ initial = 0 }: { initial?: number }) => {
    const [value, setValue] = useState(initial);
    return <WiredNativeContext.Provider value={true}><WiredDropdown options={[{ id: 0, label: 'Assign' }, { id: 40, label: 'Minimum', advanced: true }, { id: 100, label: 'Bitwise AND', advanced: true }]}
        value={value} caption="Operator" advancedCaption="Advanced operations" onChange={next => { setValue(next); onChange(next); }} /></WiredNativeContext.Provider>;
};
describe('AIR expandable operator dropdown', () => {
    beforeEach(() => { onChange.mockClear(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ measureText: (text: string) => ({ width: text.length * 6 }) } as unknown as ReturnType<HTMLCanvasElement['getContext']>); });
    afterEach(() => { cleanup(); vi.restoreAllMocks(); });
    it('expands in place without changing the selected wire ID or selecting on pointer release', () => {
        render(<AdvancedView />);
        fireEvent.click(screen.getByRole('combobox'));
        expect(screen.queryByRole('option', { name: 'Minimum' })).toBeNull();
        fireEvent.pointerDown(screen.getByRole('option', { name: 'Advanced operations' }), { button: 0 });
        fireEvent.pointerUp(screen.getByRole('option', { name: 'Minimum' }), { button: 0 });
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('combobox').textContent).toBe('Assign');
        fireEvent.pointerDown(screen.getByRole('option', { name: 'Bitwise AND' }), { button: 0 });
        expect(onChange).toHaveBeenCalledExactlyOnceWith(100);
        fireEvent.click(screen.getByRole('combobox'));
        expect(screen.queryByRole('option', { name: 'Advanced operations' })).toBeNull();
        expect(screen.getByRole('option', { name: 'Bitwise AND' }).getAttribute('aria-selected')).toBe('true');
    });
    it('collapses advanced entries after cancelling or selecting a basic operator', () => {
        render(<AdvancedView />);
        const trigger = screen.getByRole('combobox');
        fireEvent.click(trigger);
        fireEvent.pointerDown(screen.getByRole('option', { name: 'Advanced operations' }), { button: 0 });
        fireEvent.keyDown(trigger, { key: 'Escape' });
        fireEvent.click(trigger);
        expect(screen.queryByRole('option', { name: 'Minimum' })).toBeNull();
        expect(screen.getByRole('option', { name: 'Advanced operations' })).toBeTruthy();
        fireEvent.pointerDown(screen.getByRole('option', { name: 'Advanced operations' }), { button: 0 });
        fireEvent.pointerDown(screen.getByRole('option', { name: 'Assign' }), { button: 0 });
        fireEvent.click(trigger);
        expect(screen.queryByRole('option', { name: 'Minimum' })).toBeNull();
    });
    it('opens saved advanced values with all options already available', () => {
        render(<AdvancedView initial={40} />);
        expect(screen.getByRole('combobox').textContent).toBe('Minimum');
        fireEvent.click(screen.getByRole('combobox'));
        expect(screen.getByRole('option', { name: 'Bitwise AND' })).toBeTruthy();
        expect(screen.queryByRole('option', { name: 'Advanced operations' })).toBeNull();
    });
});
