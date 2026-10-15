import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { WiredNativeContext } from '../WiredNativeContext';
const state = vi.hoisted(() => ({
    trigger: { intData: [1, 0, 0, 1, 1, 1, 1], variableIds: ['destination', 'reference'], furniSources: [100, 201], userSources: [0, 200] },
    hideDefinitions: false,
    setIntParams: vi.fn(), setVariableIds: vi.fn(), setStringParam: vi.fn(), setFurniSources: vi.fn(), setUserSources: vi.fn(), setActivePickSlot: vi.fn()
}));
vi.mock('../../../../api', async () => ({
    ...(await vi.importActual('../../../../api/wired/WiredNativeVariables')),
    ...(await vi.importActual('../../../../api/wired/WiredLiteral')),
    LocalizeText: (key: string) => key, localizeWithFallback: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 }
}));
const definitions = ['destination', 'reference'].map(variableId => ({ variableId, name: variableId, availability: 0, hasValue: true, isReadOnly: false }));
vi.mock('../../../../hooks', () => ({ useWired: () => state, useWiredNativeVariables: () => ({ userVariableDefinitions: state.hideDefinitions ? [] : definitions, furniVariableDefinitions: state.hideDefinitions ? [] : definitions }) }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: () => null }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredNumberInput', () => ({ WiredNumberInput: () => null }));
vi.mock('../conditions/WiredVariableConditionParts', () => ({ FurniPickSlotButtons: () => null }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: ({ entries, selectedToken, onSelect }: any) => <select aria-label="Variable picker" value={selectedToken} onChange={event => onSelect(entries.find((entry: any) => entry.token === event.target.value))}>{entries.filter((entry: any) => entry.selectable).map((entry: any) => <option key={entry.token} value={entry.token}>{entry.displayLabel}</option>)}</select> }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: ({ furniSlot, userSlot, showFurni, furniSource, userSource, onChangeFurni, onChangeUsers }: any) => <input aria-label={`Source ${furniSlot ?? userSlot}`} value={showFurni ? furniSource : userSource} onChange={event => (showFurni ? onChangeFurni : onChangeUsers)(Number(event.target.value))} /> }));
vi.mock('../WiredDropdown', () => ({ WiredDropdown: ({ options, value, onChange }: any) => <select aria-label="Operation" value={value} onChange={event => onChange(Number(event.target.value))}>{options.map((option: any) => <option key={option.id} value={option.id}>{option.label}</option>)}</select> }));
vi.mock('./WiredActionBaseView', () => ({ WiredActionBaseView: ({ children, footer, save, validate, nativeLayout }: PropsWithChildren<{ footer: ReactNode; save: () => void; validate: () => boolean; nativeLayout: boolean }>) => <WiredNativeContext.Provider value={nativeLayout}>{children}{footer}<button disabled={!validate()} onClick={save}>Save</button></WiredNativeContext.Provider> }));
import { WiredActionGiveVariableView } from './WiredActionGiveVariableView';
import { WiredActionRemoveVariableView } from './WiredActionRemoveVariableView';
import { WiredActionChangeVariableValueView } from './WiredActionChangeVariableValueView';
const choose = () => fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
describe('Native variable action read/edit/save', () => {
    beforeEach(() => { vi.clearAllMocks(); state.hideDefinitions = false; state.trigger = { intData: [1, 0, 0, 1, 1, 1, 1], variableIds: ['destination', 'reference'], furniSources: [100, 201], userSources: [0, 200] }; });
    afterEach(cleanup);
    it('preserves Give reference, same holder and both source slots while editing override', () => {
        render(<WiredActionGiveVariableView />);
        expect(screen.getByRole('textbox', { name: 'wiredfurni.params.variables.value_settings.initial_value' })).toHaveProperty('value', 'reference');
        fireEvent.click(screen.getByRole('checkbox', { name: 'wiredfurni.params.variables.value_settings.override_existing' }));
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 0, 0, 0, 1, 1, 1]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['destination', 'reference']);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100, 201]);
        expect(state.setUserSources).toHaveBeenLastCalledWith([0, 200]);
        choose(); const popup = screen.getByRole('dialog');
        expect(within(popup).getByRole('checkbox')).toHaveProperty('checked', true);
        expect(within(popup).getByRole('button', { name: 'wiredfurni.params.sourcetype.furni' })).toHaveProperty('disabled', true);
        fireEvent.click(within(popup).getByRole('checkbox'));
        fireEvent.change(screen.getByRole('textbox', { name: 'Source 1' }), { target: { value: '201' } }); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 0, 0, 0, 1, 1, 0]);
        expect(state.setUserSources).toHaveBeenLastCalledWith([0, 201]);
    });
    it.each([[WiredActionGiveVariableView, [1, 2097152, 1, 0, 0, -10, 0], 'wiredfurni.params.variables.value_settings.initial_value'], [WiredActionChangeVariableValueView, [1, 0, 0, 2097152, 1, -10, 0], 'wiredfurni.params.variables.reference_value']] as const)('keeps signed-64 literals exact through display and save', (View, ints, label) => {
        state.trigger.intData = [...ints]; state.trigger.variableIds[1] = 'n'; render(<View />);
        const input = screen.getByRole('textbox', { name: label }); expect(input).toHaveProperty('value', '9007199254740993'); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([...ints]);
        fireEvent.change(input, { target: { value: '-9223372036854775808' } }); save();
        const values = state.setIntParams.mock.lastCall![0]; expect(values.slice(View === WiredActionGiveVariableView ? 1 : 3, View === WiredActionGiveVariableView ? 3 : 5)).toEqual([-2147483648, 0]);
        fireEvent.change(input, { target: { value: '9223372036854775808' } }); expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
    });
    it('shows the reference holder as a second footer section, disabled for unary operations', () => {
        state.trigger.intData = [1, 1, 1, 0, 0, 1, 0]; render(<WiredActionChangeVariableValueView />);
        const reference = screen.getByRole('textbox', { name: 'Source 1' });
        expect(reference.closest('fieldset')).toHaveProperty('disabled', false);
        fireEvent.change(screen.getByRole('combobox', { name: 'Operation' }), { target: { value: '103' } });
        expect(screen.getByRole('textbox', { name: 'Source 1' }).closest('fieldset')).toHaveProperty('disabled', true);
    });
    it('saves Change seven fields and disables but preserves reference UI for unary operations', () => {
        state.trigger.intData = [1, 1, 1, 0, 0, 1, 1]; render(<WiredActionChangeVariableValueView />); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 1, 1, 0, 0, 1, 1]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['destination', 'reference']);
        fireEvent.change(screen.getByRole('combobox', { name: 'Operation' }), { target: { value: '103' } });
        expect(screen.getByRole('textbox', { name: 'wiredfurni.params.variables.reference_value' })).toHaveProperty('disabled', true); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 103, 0, 0, 0, 1, 0]);
        fireEvent.change(screen.getByRole('combobox', { name: 'Operation' }), { target: { value: '2' } }); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 2, 1, 0, 0, 1, 1]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['destination', 'reference']);
    });
    it('only enables same-holder when reference and destination are matching user/furni scopes', () => {
        state.trigger.intData = [1, 0, 0, 0, 1, 0, 0]; render(<WiredActionGiveVariableView />); choose();
        const popup = screen.getByRole('dialog'); expect(within(popup).getByRole('checkbox')).toHaveProperty('disabled', true);
        fireEvent.click(within(popup).getByRole('button', { name: 'wiredfurni.params.sourcetype.users' }));
        expect(within(popup).getByRole('checkbox')).toHaveProperty('disabled', false);
        fireEvent.change(within(popup).getByRole('combobox'), { target: { value: 'custom:reference' } });
        choose(); fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox')); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 0, 0, 0, 1, 1, 1]);
    });
    it('preserves saved Give references while the variable catalogue is unavailable', () => {
        state.hideDefinitions = true; render(<WiredActionGiveVariableView />); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 0, 0, 1, 1, 1, 1]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['destination', 'reference']);
    });
    it.each(['give', 'remove'] as const)('uses the native create/delete permission for %s pickers', usage => {
        const entries = buildWiredVariablePickerEntries('user', usage, [
            { variableId: 'builtin', name: 'Builtin', availability: 0, hasValue: true, isReadOnly: false, canCreateAndDelete: false },
            { variableId: 'owned', name: 'Owned', availability: 0, hasValue: false, isReadOnly: true, canCreateAndDelete: true }
        ]);
        expect(entries.find(entry => entry.token === 'custom:builtin')!.selectable).toBe(false);
        expect(entries.find(entry => entry.token === 'custom:owned')!.selectable).toBe(true);
    });
    it('Remove keeps its single-slot contract and native source selection', () => {
        state.trigger.intData = [0]; state.trigger.variableIds = ['destination']; state.trigger.furniSources = [100]; state.trigger.userSources = [201];
        render(<WiredActionRemoveVariableView />); fireEvent.change(screen.getByRole('textbox', { name: 'Source 0' }), { target: { value: '200' } }); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([0]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['destination']);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([200]); expect(state.setUserSources).toHaveBeenLastCalledWith([201]);
        expect(screen.queryByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' })).toBeNull();
    });
});
