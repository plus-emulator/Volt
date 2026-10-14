import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const state = vi.hoisted(() => ({ trigger: { intData: [] as number[], stringData: '' }, setIntParams: vi.fn(), setStringParam: vi.fn() }));
vi.mock('../../../../api', () => ({ LocalizeText: (key: string) => key, localizeWithFallback: (_key: string, fallback: string) => fallback, WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 } }));
vi.mock('../../../../hooks', () => ({ useWired: () => state }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text.replace(/<[^>]+>/g, '')}</span> }));
vi.mock('./WiredExtraBaseView', () => ({ WiredExtraBaseView: ({ children, save, nativeLayout }: PropsWithChildren<{ save: () => void; nativeLayout: boolean }>) => <WiredNativeContext.Provider value={nativeLayout}><div data-testid="editor" data-native={String(nativeLayout)}>{children}<button onClick={save}>Save</button></div></WiredNativeContext.Provider> }));
import { WiredExtraVariableLevelUpSystemView } from './WiredExtraVariableLevelUpSystemView';
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
const change = (name: string, value: string) => fireEvent.change(screen.getByRole('textbox', { name }), { target: { value } });
describe('native Level Up editor', () => {
    beforeEach(() => { vi.clearAllMocks(); state.trigger = { intData: [], stringData: '' }; });
    afterEach(cleanup);
    it('uses native three sections, AIR defaults and six initially folded preview entries', () => {
        const { container } = render(<WiredExtraVariableLevelUpSystemView />);
        expect(screen.getByTestId('editor').dataset.native).toBe('true');
        expect(container.querySelectorAll('.volt-wired__native-section')).toHaveLength(3);
        expect(screen.getByRole('button', { name: 'Preview' }).getAttribute('aria-expanded')).toBe('false');
        expect(screen.getByRole('textbox', { name: 'Increase factor (%):' })).toHaveProperty('value', '20');
        expect(screen.getByRole('textbox', { name: 'Max level: Linear' }).parentElement!.style.width).toBe('28px');
        expect(screen.getByRole('textbox', { name: 'Step size:' }).parentElement!.style.width).toBe('43px');
        expect(screen.getByRole('textbox', { name: 'current_level' })).toHaveProperty('readOnly', true);
        expect(screen.getByRole('textbox', { name: 'current_level' }).parentElement!.style.width).toBe('93px');
        fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
        expect(screen.getAllByTestId('level-preview-row')).toHaveLength(6);
        expect(screen.getAllByTestId('level-preview-row').map(row => row.textContent)).toContain('Level: 20 - XP: 1900');
        save(); expect(state.setIntParams).toHaveBeenLastCalledWith([3, 1, 100, 50]);
    });
    it('retains separate mode drafts and all selected subvariable bits across collapse and save', () => {
        state.trigger.intData = [129, 1, 250, 80]; render(<WiredExtraVariableLevelUpSystemView />);
        change('Max level: Linear', '90');
        fireEvent.click(screen.getByRole('radio', { name: 'Exponential' }));
        expect(screen.getByRole('textbox', { name: 'Max level: Exponential' })).toHaveProperty('value', '50');
        change('Max level: Exponential', '65'); change('Base XP:', '175'); change('Increase factor (%):', '30');
        fireEvent.click(screen.getByRole('checkbox', { name: 'Current XP:' }));
        fireEvent.click(screen.getByRole('button', { name: 'Mode' })); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([131, 2, 175, 30, 65]);
        fireEvent.click(screen.getByRole('button', { name: 'Mode' }));
        fireEvent.click(screen.getByRole('radio', { name: 'Linear' })); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([131, 1, 250, 90]);
        expect(state.setStringParam).toHaveBeenLastCalledWith('');
    });
    it('reads exponential values and uses AIR geometric preview instead of increment rounding', () => {
        state.trigger.intData = [255, 2, 101, 20, 10]; render(<WiredExtraVariableLevelUpSystemView />); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([255, 2, 101, 20, 10]);
        fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
        expect(screen.getAllByTestId('level-preview-row').map(row => row.textContent)).toContain('Level: 5 - XP: 542');
        expect(screen.getAllByTestId('level-preview-row').map(row => row.textContent)).toContain('Level: 20 - XP: Unreachable level');
    });
    it('preserves manual mode0 text and selected bits, restricts new text and truncates interpolation', () => {
        state.trigger = { intData: [17, 0], stringData: '5=11\n10=50' }; render(<WiredExtraVariableLevelUpSystemView />);
        save(); expect(state.setIntParams).toHaveBeenLastCalledWith([17, 0]); expect(state.setStringParam).toHaveBeenLastCalledWith('5=11\n10=50');
        fireEvent.click(screen.getByRole('button', { name: 'Preview' })); expect(screen.getAllByTestId('level-preview-row').map(row => row.textContent)).toContain('Level: 2 - XP: 2');
        change('Manual', '3=9x\n8=40'); save(); expect(state.setStringParam).toHaveBeenLastCalledWith('3=9\n8=40');
        expect(screen.getByRole('textbox', { name: 'Manual' }).getAttribute('maxlength')).toBe('1000');
    });
    it('resets inactive drafts when another box opens', () => {
        state.trigger.intData = [255, 2, 200, 45, 99]; const { rerender } = render(<WiredExtraVariableLevelUpSystemView />);
        state.trigger = { intData: [0, 1, 150, 70], stringData: '' }; rerender(<WiredExtraVariableLevelUpSystemView />);
        fireEvent.click(screen.getByRole('radio', { name: 'Exponential' })); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([0, 2, 100, 20, 50]);
    });
});
