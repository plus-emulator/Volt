import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';

const state = vi.hoisted(() => ({
    trigger: { intData: [0, 7, 1, 0, 1, 13], stringData: 'Reward text', furniSources: [100, 301], userSources: [202, 0], variableIds: ['pay'] },
    setStringParam: vi.fn(), setIntParams: vi.fn(), setFurniSources: vi.fn(), setUserSources: vi.fn(), setVariableIds: vi.fn()
}));
vi.mock('../../../../api', async () => ({
    ...(await vi.importActual('../../../../api/wired/WiredNativeVariables')),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_BY_ID: 1 }
}));
vi.mock('../../../../hooks', () => ({ useWired: () => state, useWiredNativeVariables: () => ({}) }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../conditions/WiredVariableConditionParts', () => ({ FurniPickSlotButtons: () => null }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: () => null, WiredHolderSourceSection: ({ scope }: any) => <span>{`holder ${scope}`}</span>, WiredMergedSourceSection: ({ scope, bare, disabled, furniSlot = 0, userSlot = 0, furniSource, userSource, onChangeFurni, onChangeUsers }: any) => { const content = scope === 'global' || scope === 'context' ? <span>{`holder ${scope}`}</span> : <input aria-label={`Merged ${scope === 'furni' ? 'furni' : 'user'} ${scope === 'furni' ? furniSlot : userSlot}${bare ? ' bare' : ''}`} value={scope === 'furni' ? furniSource : userSource} onChange={event => (scope === 'furni' ? onChangeFurni : onChangeUsers)(Number(event.target.value))} />; return disabled ? <fieldset disabled>{content}</fieldset> : content; } }));
vi.mock('../WiredSourceTypeSelector', () => ({ WiredSourceTypeSelector: ({ types, onChange }: { types: string[]; onChange: (value: string) => void }) => <div>{types.map(type => <button key={type} onClick={() => onChange(type)}>{type}</button>)}</div> }));
vi.mock('../WiredVariablePickerData', () => ({
    buildWiredVariablePickerEntries: () => [
        { token: 'custom:pay', displayLabel: 'payment_amount', selectable: true },
        { token: 'custom:reward', displayLabel: 'reward_amount', selectable: true }
    ],
    flattenWiredVariablePickerEntries: (entries: unknown[]) => entries,
    createFallbackVariableEntry: () => null
}));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: ({ entries, onSelect }: { entries: { token: string; displayLabel: string }[]; onSelect: (entry: unknown) => void }) => <div>{entries.map(entry => <button key={entry.token} onClick={() => onSelect(entry)}>{entry.displayLabel}</button>)}</div> }));
vi.mock('./WiredActionBaseView', () => ({ WiredActionBaseView: ({ children, save, validate, nativeLayout, footerCollapsible }: PropsWithChildren<{ save: () => void; validate: () => boolean; nativeLayout: boolean; footerCollapsible: boolean }>) => <WiredNativeContext.Provider value={true}><div data-testid="editor" data-native={String(nativeLayout)} data-footer-collapsible={String(footerCollapsible)}>{children}<button disabled={!validate()} onClick={save}>Save</button></div></WiredNativeContext.Provider> }));
vi.mock('../WiredDropdown', () => ({ WiredDropdown: ({ caption, value, options, onChange }: { caption: string; value: number; options: { id: number; label: string }[]; onChange: (value: number) => void }) => <select aria-label={caption} value={value} onChange={event => onChange(Number(event.target.value))}>{options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select> }));

import { WiredChestRewardForm } from './WiredChestRewardForm';

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
const amount = () => screen.getByRole('textbox', { name: 'Amount' }) as HTMLInputElement;

describe('AIR chest reward form sections and wire values', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.trigger = { intData: [0, 7, 1, 0, 1, 13], stringData: 'Reward text', furniSources: [100, 301], userSources: [202, 0], variableIds: ['pay'] };
    });
    afterEach(cleanup);

    it('keeps the currency category folded and round-trips amount variable and source tails', () => {
        render(<WiredChestRewardForm kind="currency" />);
        expect(screen.getByRole('button', { name: 'Earnings category' }).getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByRole('combobox')).toBeNull();
        expect(screen.getByTestId('editor').getAttribute('data-native')).toBe('true');
        expect(screen.getByTestId('editor').getAttribute('data-footer-collapsible')).toBe('false');
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([0, 7, 1, 0, 1, 13]);
        expect(state.setStringParam).toHaveBeenLastCalledWith('Reward text');
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['pay']);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100, 301]);
        expect(state.setUserSources).toHaveBeenLastCalledWith([202, 0]);
    });

    it('saves category dropdown and literal edits in the same fields, with a 45px three-line 200-character popup', () => {
        render(<WiredChestRewardForm kind="currency" />);
        fireEvent.click(screen.getByRole('button', { name: 'Earnings category' }));
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '11' } });
        fireEvent.change(amount(), { target: { value: '0x20' } });
        const popup = screen.getByRole('textbox', { name: 'Reward popup' }) as HTMLTextAreaElement;
        expect(popup.style.height).toBe('45px');
        fireEvent.change(popup, { target: { value: 'a\nb\nc\nd' } });
        expect(popup.value).toBe('a\nb\nc');
        fireEvent.change(popup, { target: { value: 'x'.repeat(201) } });
        expect(popup.value).toHaveLength(200);
        fireEvent.click(screen.getByRole('checkbox', { name: 'Show by default' }));
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([0, 32, 0, 0, 0, 11]);
        expect(state.setStringParam).toHaveBeenLastCalledWith('x'.repeat(200));
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['n']);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100, 0]);
        expect(state.setUserSources).toHaveBeenLastCalledWith([202, 0]);
    });

    it('keeps the amount visible but disabled in All mode and restores invalid draft validation when enabled', () => {
        render(<WiredChestRewardForm kind="currency" />);
        fireEvent.change(amount(), { target: { value: '2147483648' } });
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        fireEvent.click(screen.getByRole('radio', { name: 'All of the chest' }));
        expect(amount()).toHaveProperty('disabled', true);
        expect(amount().value).toBe('2147483648');
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', false);
        fireEvent.click(screen.getByRole('radio', { name: 'Amount per trigger' }));
        expect(amount()).toHaveProperty('disabled', false);
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        fireEvent.change(amount(), { target: { value: '2147483647' } });
        save();
        expect(state.setIntParams.mock.lastCall![0][1]).toBe(2147483647);
    });

    it('folds furniture iteration initially, preserves it while disabled, and saves the selected iteration', () => {
        state.trigger.intData = [0, 7, 1, 1, 0, 2];
        state.trigger.furniSources = [100, 0];
        state.trigger.userSources = [202, 203];
        render(<WiredChestRewardForm kind="furni" />);
        expect(screen.queryByRole('radio', { name: 'Iteration 2' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Chest iteration type' }));
        expect(screen.getByRole('radio', { name: 'Iteration 2' })).toHaveProperty('checked', true);
        fireEvent.click(screen.getByRole('radio', { name: 'Iteration 1' }));
        fireEvent.click(screen.getByRole('radio', { name: 'All of the chest' }));
        expect(screen.getByRole('radio', { name: 'Iteration 1' })).toHaveProperty('disabled', true);
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 7, 1, 1, 0, 1]);
        expect(state.setUserSources).toHaveBeenLastCalledWith([202, 203]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['pay']);
    });

    it('draws the claimed reference holder (merged [[1,1]]) in the amount popup, not the footer (AIR class_4173.as:166-184)', () => {
        state.trigger.intData = [0, 7, 1, 1, 1, 13]; state.trigger.userSources = [202, 203];
        render(<WiredChestRewardForm kind="currency" />);
        expect(screen.queryByRole('textbox', { name: 'Merged user 1 bare' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Choose variable' }));
        expect(screen.getByRole('textbox', { name: 'Merged user 1 bare' })).toHaveProperty('value', '203');
        fireEvent.click(screen.getByRole('button', { name: 'context' }));
        expect(screen.getByText('holder context')).toBeTruthy();
    });
});
