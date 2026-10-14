import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const state = vi.hoisted(() => ({
    trigger: { intData: [1, 80, 1], variableIds: ['reference'], furniSources: [100], userSources: [201] },
    hideDefinitions: false, setIntParams: vi.fn(), setVariableIds: vi.fn(), setStringParam: vi.fn(), setFurniSources: vi.fn(), setUserSources: vi.fn(), setActivePickSlot: vi.fn(), setFilter: vi.fn(), setInverse: vi.fn()
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
vi.mock('../WiredDropdown', () => ({ WiredDropdown: ({ options, value, caption, onChange }: any) => <select aria-label={caption} value={value} onChange={event => onChange(Number(event.target.value))}>{options.map((option: any) => <option key={option.id} value={option.id}>{option.label}</option>)}</select> }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: ({ entries, selectedToken, onSelect }: any) => <select aria-label="Variable picker" value={selectedToken} onChange={event => onSelect(entries.find((entry: any) => entry.token === event.target.value))}>{entries.filter((entry: any) => entry.selectable).map((entry: any) => <option key={entry.token} value={entry.token}>{entry.displayLabel}</option>)}</select> }));
vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: ({ showFurni, furniSource, userSource, onChangeFurni, onChangeUsers }: any) => <input aria-label="Reference source" value={showFurni ? furniSource : userSource} onChange={event => (showFurni ? onChangeFurni : onChangeUsers)(Number(event.target.value))} />,
    USER_SOURCES: [{ value: 0 }, { value: 201 }], CLICKED_USER_SOURCE: { value: 10 },
    useAvailableUserSources: () => [{ value: 0 }, { value: 201 }],
    sortWiredSourceOptions: (options: any) => options,
    nativeSourceOptions: () => [{ value: 0 }, { value: 100 }]
}));
vi.mock('../WiredFurniSelectionSourceRow', () => ({ WiredFurniSelectionSourceRow: ({ value, onChange }: any) => <input aria-label="Reference source" value={value} onChange={event => onChange(Number(event.target.value))} /> }));
vi.mock('./WiredExtraBaseView', () => ({ WiredExtraBaseView: ({ children, save, validate, nativeLayout }: PropsWithChildren<{ save: () => void; validate: () => boolean; nativeLayout: boolean }>) => <WiredNativeContext.Provider value={nativeLayout}>{children}<button disabled={!validate()} onClick={save}>Save</button></WiredNativeContext.Provider> }));
import { WiredExtraMovementCurveView } from './WiredExtraMovementCurveView';
import { WiredExtraFilterCountView } from './WiredExtraFilterCountView';
import { WiredExtraFilterByVariableView } from './WiredExtraFilterByVariableView';
const choose = () => fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
describe('Native compact variable addon fields', () => {
    beforeEach(() => { vi.clearAllMocks(); state.hideDefinitions = false; state.trigger = { intData: [1, 80, 1], variableIds: ['reference'], furniSources: [100], userSources: [201] }; });
    afterEach(cleanup);
    it('keeps jump reference and both sources, edits through native popup, rejects invalid strengths', () => {
        render(<WiredExtraMovementCurveView />);
        const input = screen.getByRole('textbox', { name: 'wiredfurni.params.jump_strength' });
        expect(input).toHaveProperty('value', 'reference'); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 80, 1]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['reference']);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100]);
        expect(state.setUserSources).toHaveBeenLastCalledWith([201]);
        choose(); fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Reference source' }), { target: { value: '200' } });
        fireEvent.change(within(screen.getByRole('dialog')).getByRole('combobox'), { target: { value: 'custom:destination' } }); save();
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['destination']);
        expect(state.setUserSources).toHaveBeenLastCalledWith([200]);
        fireEvent.change(input, { target: { value: '-1000' } }); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([0, -1000, 1]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['n']);
        fireEvent.change(input, { target: { value: '1001' } }); expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        fireEvent.change(input, { target: { value: '1.5' } }); expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        fireEvent.change(input, { target: { value: '1000' } }); save(); expect(state.setIntParams).toHaveBeenLastCalledWith([0, 1000, 1]);
    });
    it.each([true, false])('preserves FilterCount ordered ints and source while editing the reference (furni=%s)', furni => {
        state.trigger.intData = [7, 1, 0]; render(<WiredExtraFilterCountView furni={furni} />); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([7, 1, 0]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['reference']);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100]);
        expect(state.setUserSources).toHaveBeenLastCalledWith([0]);
        choose(); fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Reference source' }), { target: { value: '101' } });
        fireEvent.change(within(screen.getByRole('dialog')).getByRole('combobox'), { target: { value: 'custom:destination' } }); save();
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['destination']);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([101]);
        const input = screen.getByRole('textbox', { name: 'wiredfurni.params.setfilter' });
        fireEvent.change(input, { target: { value: '0' } }); expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        fireEvent.change(input, { target: { value: '1000' } }); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1000, 0, 0]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['n']);
        fireEvent.change(input, { target: { value: '1001' } }); expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
    });
    it.each([['user', 1], ['furni', 0], ['global', -10], ['context', -20]] as const)('roundtrips FilterByVariable native %s target without converting it to a legacy scope', (target, code) => {
        state.trigger.intData = [9, 3, 1, code]; state.trigger.variableIds = ['destination', 'reference'];
        render(<WiredExtraFilterByVariableView target="furni" />); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 3, 1, code]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['destination', 'reference']);
        expect(state.setUserSources).toHaveBeenLastCalledWith([201]); expect(state.setFurniSources).toHaveBeenLastCalledWith([100]);
        const input = screen.getByRole('textbox', { name: 'wiredfurni.params.setfilter' });
        fireEvent.change(input, { target: { value: '1001' } }); expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        fireEvent.change(input, { target: { value: '27' } }); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([27, 3, 0, code]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['destination', 'n']);
    });
    it('does not discard saved references while definitions are loading', () => {
        state.hideDefinitions = true; state.trigger.intData = [3, 1, 1]; render(<WiredExtraFilterCountView furni />); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([3, 1, 1]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['reference']);
    });
});
