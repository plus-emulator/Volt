import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const state = vi.hoisted(() => ({
    trigger: { intData: [2, 2, 0, 0, 1, 1], variableIds: ['destination', 'reference'], furniSources: [100], userSources: [201] },
    setIntParams: vi.fn(), setVariableIds: vi.fn(), setStringParam: vi.fn(), setFurniSources: vi.fn(), setUserSources: vi.fn(), setActivePickSlot: vi.fn(), setFilter: vi.fn(), setInverse: vi.fn()
}));
vi.mock('../../../../api', async () => ({
    ...(await vi.importActual('../../../../api/wired/WiredNativeVariables')),
    ...(await vi.importActual('../../../../api/wired/WiredLiteral')),
    LocalizeText: (key: string) => key, localizeWithFallback: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 }
}));
const definitions = ['destination', 'reference'].map(variableId => ({ variableId, name: variableId, availability: 0, hasValue: true, isReadOnly: false }));
vi.mock('../../../../hooks', () => ({ useWired: () => state, useWiredNativeVariables: () => ({ userVariableDefinitions: definitions, furniVariableDefinitions: definitions }) }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: () => null }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredNumberInput', () => ({ WiredNumberInput: () => null }));
vi.mock('../conditions/WiredVariableConditionParts', () => ({ FurniPickSlotButtons: () => null }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: ({ entries, selectedToken, onSelect }: any) => <select aria-label="Variable picker" value={selectedToken} onChange={event => onSelect(entries.find((entry: any) => entry.token === event.target.value))}>{entries.filter((entry: any) => entry.selectable).map((entry: any) => <option key={entry.token} value={entry.token}>{entry.displayLabel}</option>)}</select> }));
vi.mock('../WiredSourcesSelector', () => ({
    USER_SOURCES: [{ value: 0 }, { value: 201 }], CLICKED_USER_SOURCE: { value: 10 },
    useAvailableUserSources: () => [{ value: 0 }, { value: 201 }],
    sortWiredSourceOptions: (options: any) => options,
    nativeSourceOptions: () => [{ value: 0 }, { value: 100 }]
}));
vi.mock('../WiredFurniSelectionSourceRow', () => ({ WiredFurniSelectionSourceRow: ({ value, onChange }: any) => <input aria-label="Reference source" value={value} onChange={event => onChange(Number(event.target.value))} /> }));
vi.mock('./WiredSelectorBaseView', () => ({ WiredSelectorBaseView: ({ children, save, validate, nativeLayout }: PropsWithChildren<{ save: () => void; validate: () => boolean; nativeLayout: boolean }>) => <WiredNativeContext.Provider value={nativeLayout}>{children}<button disabled={!validate()} onClick={save}>Save</button></WiredNativeContext.Provider> }));
import { WiredSelectorWithVariableView } from './WiredSelectorWithVariableView';
const choose = () => fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
const reference = () => screen.getByRole('textbox', { name: 'wiredfurni.params.variables.reference_value' });
describe('AIR WithVariable selector read/edit/save', () => {
    beforeEach(() => { vi.clearAllMocks(); state.trigger = { intData: [2, 2, 0, 0, 1, 1], variableIds: ['destination', 'reference'], furniSources: [100], userSources: [201] }; });
    afterEach(cleanup);
    it.each(['user', 'furni'] as const)('preserves all six ints and source slots with the same %s holder', selectorTarget => {
        state.trigger.intData[4] = selectorTarget === 'user' ? 1 : 0;
        render(<WiredSelectorWithVariableView selectorTarget={selectorTarget} />);
        expect(reference()).toHaveProperty('value', 'reference'); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([2, 2, 0, 0, selectorTarget === 'user' ? 1 : 0, 1]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['destination', 'reference']);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100]);
        expect(state.setUserSources).toHaveBeenLastCalledWith([201]);
        choose(); const popup = screen.getByRole('dialog');
        expect(within(popup).getByRole('checkbox')).toHaveProperty('checked', true);
        expect(within(popup).queryByRole('textbox', { name: 'Reference source' })).toBeNull();
        fireEvent.click(within(popup).getByRole('checkbox')); save();
        expect(state.setIntParams.mock.lastCall![0][5]).toBe(0);
        expect(within(popup).getByRole('textbox', { name: 'Reference source' })).toHaveProperty('value', selectorTarget === 'user' ? '201' : '100');
    });
    it('shows comparisons in AIR order and saves signed32 literal boundaries with sign extension', () => {
        state.trigger.intData = [2, 1, 0, 1, 1, 0]; state.trigger.variableIds[1] = 'n';
        render(<WiredSelectorWithVariableView selectorTarget="user" />);
        expect(screen.getAllByRole('radio').map(input => input.parentElement!.textContent)).toEqual(['>', '≥', '=', '≤', '<', '≠']);
        fireEvent.change(reference(), { target: { value: '-2147483648' } });
        fireEvent.click(screen.getByRole('radio', { name: '≤' })); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([3, 1, -1, -2147483648, 1, 0]);
        fireEvent.change(reference(), { target: { value: '2147483648' } });
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        fireEvent.change(reference(), { target: { value: '2147483647' } }); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([3, 1, 0, 2147483647, 1, 0]);
    });
    it('disables the reference controls when value comparison is off without losing its draft', () => {
        render(<WiredSelectorWithVariableView selectorTarget="user" />);
        fireEvent.change(reference(), { target: { value: 'invalid draft' } });
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        fireEvent.click(screen.getByRole('checkbox', { name: 'wiredfurni.params.variables.value_settings.select_by_value' }));
        expect(reference()).toHaveProperty('disabled', true); save();
        expect(state.setIntParams.mock.lastCall![0][1]).toBe(0);
        expect(state.setIntParams.mock.lastCall![0][5]).toBe(0);
        fireEvent.click(screen.getByRole('checkbox', { name: 'wiredfurni.params.variables.value_settings.select_by_value' }));
        expect(reference()).toHaveProperty('value', 'invalid draft');
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
    });
});
