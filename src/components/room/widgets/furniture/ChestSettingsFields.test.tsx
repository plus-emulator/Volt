import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../../../api', () => ({ LocalizeText: (key: string) => key }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../../../../common/native-text/NativeText', () => ({ NativeText: ({ text }: { text: string }) => <span>{text}</span> }));
import { ChestAppearanceFields } from './ChestSettingsFields';
beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ measureText: (text: string) => ({ width: text.length * 6 }) } as CanvasRenderingContext2D); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const previewLabel = 'wiredchests.settings.appearance.preview';
const countLabel = 'wiredchests.settings.appearance.preview_amount';
const Fixture = ({ save, isFurni = true }: { save: (value: number[]) => void; isFurni?: boolean }) => {
    const [state, setState] = useState(2), [previewMode, setPreviewMode] = useState(6), [previewAmount, setPreviewAmount] = useState(4);
    return <><ChestAppearanceFields isFurni={isFurni} state={state} previewMode={previewMode} previewAmount={previewAmount} onStateChange={setState} onPreviewModeChange={setPreviewMode} onPreviewAmountChange={setPreviewAmount} /><button onClick={() => save([state, previewMode, previewAmount])}>Save</button></>;
};
const choose = (label: string, value: string) => { fireEvent.click(screen.getByRole('combobox', { name: label })); fireEvent(screen.getByRole('option', { name: value }), new MouseEvent('pointerdown', { bubbles: true, button: 0 })); };
describe('AIR chest appearance fields', () => {
    it('retains all eight loaded preview modes and changes them without reducing them to booleans', () => {
        const save = vi.fn(); render(<Fixture save={save} />);
        fireEvent.click(screen.getByRole('button', { name: 'Save' })); expect(save).toHaveBeenLastCalledWith([2, 6, 4]);
        fireEvent.click(screen.getByRole('combobox', { name: previewLabel })); expect(screen.getAllByRole('option')).toHaveLength(8);
        fireEvent(screen.getByRole('option', { name: `${previewLabel}.7` }), new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' })); expect(save).toHaveBeenLastCalledWith([2, 7, 4]);
    });
    it('disables rather than hides or resets the preview amount when switched off', () => {
        const save = vi.fn(); render(<Fixture save={save} />);
        choose(previewLabel, `${previewLabel}.0`);
        expect(screen.getByRole('combobox', { name: countLabel })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Save' })); expect(save).toHaveBeenLastCalledWith([2, 0, 4]);
        choose(previewLabel, `${previewLabel}.5`); choose(countLabel, '2');
        fireEvent.click(screen.getByRole('button', { name: 'Save' })); expect(save).toHaveBeenLastCalledWith([2, 5, 2]);
    });
    it('omits furniture preview controls for coin storage', () => {
        render(<Fixture save={vi.fn()} isFurni={false} />); expect(screen.getAllByRole('combobox')).toHaveLength(1); expect(screen.queryByRole('combobox', { name: previewLabel })).toBeNull();
    });
});
