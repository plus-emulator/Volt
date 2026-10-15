import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from './WiredNativeContext';

vi.mock('../../../api', () => ({ LocalizeText: (key: string) => key, WIRED_SLIDER_ECHO: {} }));
vi.mock('../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span>, Slider: () => null }));
vi.mock('./WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('./WiredShellHeaderView', () => ({ WiredShellButton: ({ children, onClick, disabled }: PropsWithChildren<{ onClick: () => void; disabled: boolean }>) => <button disabled={disabled} onClick={onClick}>{children}</button> }));
import { WiredRadioGroup } from './WiredOptions';
import { WiredSlider } from './WiredSlider';

let measuredWidth = 148;
let resize: () => void;
const thumb = () => document.querySelector<HTMLElement>('.volt-wired__slider-thumb')!;
const drag = (start = 0, end = 68) => {
    fireEvent.pointerDown(thumb(), { button: 0, pointerId: 1, clientX: start });
    fireEvent.pointerMove(thumb(), { pointerId: 1, clientX: end });
};
beforeEach(() => {
    measuredWidth = 148;
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => measuredWidth);
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect() {} });
    vi.stubGlobal('PointerEvent', MouseEvent);
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: vi.fn() });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('AIR shared control interactions', () => {
    it.each([false, true])('keeps radio extras mounted and disables inactive/disabled parents (native=%s)', native => {
        const options = [
            { id: 0, label: 'First', extra: <input aria-label="First draft" defaultValue="saved" /> },
            { id: 1, label: 'Second', extra: <input aria-label="Second draft" defaultValue="other" /> }
        ];
        const editor = (value: number, disabled = false) => <WiredNativeContext.Provider value={native}><WiredRadioGroup name="selection" value={value} options={options.map(option => ({ ...option, disabled }))} onChange={vi.fn()} /></WiredNativeContext.Provider>;
        const view = render(editor(0));
        const input = screen.getByRole('textbox', { name: 'First draft' }) as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'unfinished' } });
        expect(input.matches(':disabled')).toBe(false);
        view.rerender(editor(1));
        expect(input.matches(':disabled')).toBe(true);
        expect(input.closest('fieldset')?.hasAttribute('inert')).toBe(true);
        view.rerender(editor(0));
        expect(screen.getByRole('textbox', { name: 'First draft' })).toBe(input);
        expect(input.value).toBe('unfinished');
        expect(input.matches(':disabled')).toBe(false);
        view.rerender(editor(0, true));
        expect(input.matches(':disabled')).toBe(true);
    });

    it('repositions an existing thumb when a folded section opens or resizes', () => {
        measuredWidth = 0;
        render(<WiredSlider min={0} max={100} value={50} onChange={vi.fn()} />);
        expect(parseInt(thumb().style.left)).toBeGreaterThanOrEqual(0);
        act(() => { measuredWidth = 212; resize(); });
        expect(thumb().style.left).toBe('100px');
        act(() => { measuredWidth = 312; resize(); });
        expect(thumb().style.left).toBe('150px');
        act(() => { measuredWidth = 0; resize(); });
        expect(thumb().style.left).toBe('150px');
    });

    it('quantizes drag on the AIR absolute step grid and clamps arrows', () => {
        const onChange = vi.fn();
        const view = render(<WiredSlider min={5} max={105} step={10} value={5} onChange={onChange} />);
        drag();
        expect(onChange).toHaveBeenLastCalledWith(60);
        view.rerender(<WiredSlider min={5} max={105} step={10} value={100} onChange={onChange} />);
        fireEvent.click(screen.getAllByRole('button')[1]);
        expect(onChange).toHaveBeenLastCalledWith(105);
        onChange.mockClear();
        fireEvent.pointerMove(thumb(), { pointerId: 1, clientX: 100 });
        expect(onChange).not.toHaveBeenCalled();
    });

    it('treats zero step and a fixed range as non-moving controls', () => {
        const onChange = vi.fn();
        const view = render(<WiredSlider min={0} max={100} step={0} value={50} onChange={onChange} />);
        drag();
        screen.getAllByRole('button').forEach(button => fireEvent.click(button));
        expect(onChange).not.toHaveBeenCalled();
        view.rerender(<WiredSlider min={50} max={50} value={50} onChange={onChange} />);
        drag();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('cancels an active drag when disabled, including a radio extra fieldset', () => {
        const onChange = vi.fn();
        const editor = (disabled: boolean, inherited = false) => <fieldset disabled={inherited}><WiredSlider min={0} max={100} value={0} disabled={disabled} onChange={onChange} /></fieldset>;
        const view = render(editor(false));
        fireEvent.pointerDown(thumb(), { button: 0, pointerId: 1, clientX: 0 });
        view.rerender(editor(true));
        view.rerender(editor(false));
        fireEvent.pointerMove(thumb(), { pointerId: 1, clientX: 68 });
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.pointerDown(thumb(), { button: 0, pointerId: 1, clientX: 0 });
        view.rerender(editor(false, true));
        fireEvent.pointerMove(thumb(), { pointerId: 1, clientX: 68 });
        expect(onChange).not.toHaveBeenCalled();
        view.rerender(editor(false));
        fireEvent.pointerMove(thumb(), { pointerId: 1, clientX: 68 });
        expect(onChange).not.toHaveBeenCalled();
        drag();
        expect(onChange).toHaveBeenLastCalledWith(50);
    });
});
