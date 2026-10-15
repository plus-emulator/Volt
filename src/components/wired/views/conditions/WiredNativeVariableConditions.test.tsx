import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
import { buildWiredVariablePickerEntries } from '../WiredVariablePickerData';
const state = vi.hoisted(() => ({
    trigger: { intData: [1, 1, 1, 0, 0, 1, 1], variableIds: ['destination', 'reference'], furniSources: [100, 101], userSources: [200, 201], getBoolean: (index: number) => index === 0 },
    nativeCatalog: undefined as any, quantifier: 1,
    setIntParams: vi.fn(), setVariableIds: vi.fn(), setStringParam: vi.fn(), setFurniSources: vi.fn(), setUserSources: vi.fn(), setActivePickSlot: vi.fn(), setQuantifier: vi.fn()
}));
vi.mock('../../../../api', async () => ({
    ...(await vi.importActual('../../../../api/wired/WiredNativeVariables')),
    ...(await vi.importActual('../../../../api/wired/WiredLiteral')),
    ...(await vi.importActual('../../../../api/wired/WiredVariableScope')),
    LocalizeText: (key: string) => key, localizeWithFallback: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 }
}));
const definitions = ['destination', 'reference'].map(variableId => ({ variableId, name: variableId, availability: 0, hasValue: true, isReadOnly: false }));
vi.mock('../../../../hooks', () => ({
    useWired: () => state,
    useWiredNativeVariables: () => ({ userVariableDefinitions: definitions, furniVariableDefinitions: definitions, roomVariableDefinitions: definitions }),
    useVariableScopeEntries: (scope: any) => buildWiredVariablePickerEntries(scope, 'condition', definitions)
}));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span>, Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
vi.mock('../../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: () => null }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredNumberInput', () => ({ WiredNumberInput: () => null }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: ({ entries, selectedToken, onSelect }: any) => <select aria-label="Variable picker" value={selectedToken} onChange={event => onSelect(entries.find((entry: any) => entry.token === event.target.value))}>{entries.filter((entry: any) => entry.kind === 'custom').map((entry: any) => <option key={entry.token} disabled={!entry.selectable} value={entry.token}>{entry.displayLabel}</option>)}</select> }));
vi.mock('../WiredSourcesSelector', () => { const WiredSourcesSelector = ({ furniSlot = 0, userSlot = 0, showFurni, furniSource, userSource, onChangeFurni, onChangeUsers }: any) => <input aria-label={`${showFurni ? 'Furni' : 'User'} source ${showFurni ? furniSlot : userSlot}`} value={showFurni ? furniSource : userSource} onChange={event => (showFurni ? onChangeFurni : onChangeUsers)(Number(event.target.value))} />; const WiredHolderSourceSection = ({ scope }: any) => <span>{`holder ${scope}`}</span>; return { WiredSourcesSelector, WiredHolderSourceSection, WiredMergedSourceSection: ({ scope, disabled, ...rest }: any) => { const content = scope === 'global' || scope === 'context' ? <WiredHolderSourceSection scope={scope} /> : <WiredSourcesSelector showFurni={scope === 'furni'} showUsers={scope !== 'furni'} {...rest} />; return disabled ? <fieldset disabled>{content}</fieldset> : content; } }; });
vi.mock('../WiredDropdown', () => ({ WiredDropdown: ({ options, value, onChange, caption }: any) => <select aria-label={caption} value={value} onChange={event => onChange(Number(event.target.value))}>{options.map((option: any) => <option key={option.id} value={option.id}>{option.label}</option>)}</select> }));
vi.mock('./WiredConditionBaseView', () => ({ WiredConditionBaseView: ({ children, footer, save, validate, nativeLayout }: PropsWithChildren<{ footer: ReactNode; save: () => void; validate?: () => boolean; nativeLayout: boolean }>) => <WiredNativeContext.Provider value={nativeLayout}>{children}{footer}<button disabled={validate && !validate()} onClick={save}>Save</button></WiredNativeContext.Provider> }));
import { WiredConditionHasVariableView } from './WiredConditionHasVariableView';
import { WiredConditionFurniMatchesSnapshotView } from './WiredConditionFurniMatchesSnapshotView';
import { WiredConditionVariableValueMatchView } from './WiredConditionVariableValueMatchView';
import { WiredConditionVariableAgeMatchView } from './WiredConditionVariableAgeMatchView';
import { wiredWidthMultiplier } from '../../../../api/wired/WiredStyle';
const choose = () => fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
describe('Native AIR variable and snapshot condition editors', () => {
    beforeEach(() => { vi.clearAllMocks(); state.nativeCatalog = undefined; state.trigger = { intData: [1, 1, 1, 0, 0, 1, 1], variableIds: ['destination', 'reference'], furniSources: [100, 101], userSources: [200, 201], getBoolean: index => index === 0 }; });
    afterEach(cleanup);
    it.each([false, true])('saves Snapshot four flags and category quantifier/source (negative=%s)', negative => {
        const { container } = render(<WiredConditionFurniMatchesSnapshotView negative={negative} />);
        expect(container.querySelector('.volt-wired__options--checkbox')).not.toBeNull();
        fireEvent.click(screen.getByRole('checkbox', { name: 'wiredfurni.params.condition.altitude' }));
        fireEvent.click(screen.getByRole('radio', { name: `wiredfurni.params.quantifier.furni${negative ? '.neg' : ''}.0` })); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 0, 0, 1]); expect(state.setQuantifier).toHaveBeenLastCalledWith(0); expect(state.setFurniSources).toHaveBeenLastCalledWith([100]);
    });
    it.each([false, true])('saves HasVariable selected scope and uses native catalogue availability (negative=%s)', negative => {
        state.trigger.intData = [0]; state.trigger.variableIds = ['destination'];
        state.nativeCatalog = { rows: new Map([['destination', { variable: { alwaysAvailable: false } }], ['reference', { variable: { alwaysAvailable: true } }]]) };
        render(<WiredConditionHasVariableView negative={negative} />);
        expect(screen.queryByRole('option', { name: 'reference' })).toBeNull(); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([0]); expect(state.setFurniSources).toHaveBeenLastCalledWith([100]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['destination']);
        expect(screen.getByRole('button', { name: 'wiredfurni.params.sourcetype.furni' }).getAttribute('aria-pressed')).toBe('true');
    });
    it('keeps the HasVariable merged "variables" footer section for every holder (AIR HasVariable.as:82-111)', () => {
        state.trigger.intData = [1]; state.trigger.variableIds = ['destination'];
        render(<WiredConditionHasVariableView />);
        expect(screen.getByRole('textbox', { name: 'User source 0' })).toHaveProperty('value', '200');
        fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.sourcetype.context' }));
        expect(screen.getByText('holder context')).toBeTruthy();
        expect(screen.queryByRole('textbox', { name: 'User source 0' })).toBeNull();
        // Changing the holder clears the variable, so the form stays unsaveable until one is picked (validate).
        expect(screen.getByText('Save')).toHaveProperty('disabled', true);
    });
    it('preserves Value same-holder, two source pairs, comparisons and exact existing signed64 literals', () => {
        render(<WiredConditionVariableValueMatchView />); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 1, 1, 0, 0, 1, 1]);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100, 101]); expect(state.setUserSources).toHaveBeenLastCalledWith([200, 201]);
        choose(); const popup = screen.getByRole('dialog'); expect(within(popup).getByRole('checkbox')).toHaveProperty('checked', true);
        expect(within(popup).getByRole('textbox', { name: 'User source 1' }).closest('fieldset')).toHaveProperty('disabled', true);
        fireEvent.click(within(popup).getByRole('checkbox')); save(); expect(state.setIntParams.mock.lastCall![0][6]).toBe(0);
        expect(within(popup).getByRole('textbox', { name: 'User source 1' }).closest('fieldset')).toHaveProperty('disabled', false);
        fireEvent.change(within(popup).getByRole('textbox', { name: 'User source 1' }), { target: { value: '100' } });
        fireEvent.change(within(popup).getByRole('combobox'), { target: { value: 'custom:reference' } });
        const input = screen.getByRole('textbox', { name: 'wiredfurni.params.variables.reference_value' });
        fireEvent.change(input, { target: { value: '9007199254740993' } }); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 1, 0, 2097152, 1, 1, 0]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['destination', 'n']);
        fireEvent.change(input, { target: { value: '9223372036854775808' } }); expect(screen.getByText('Save')).toHaveProperty('disabled', true);
    });
    it('preserves Age eight ints, duration variable, units, both source pairs and native timestamp permissions', () => {
        state.trigger.intData = [0, 2, 1, -1, -8, 3, 1, 1];
        state.nativeCatalog = { rows: new Map([['destination', { variable: { canReadCreationTime: false, canReadLastUpdateTime: true } }], ['reference', { variable: { canReadCreationTime: false, canReadLastUpdateTime: false } }]]) };
        render(<WiredConditionVariableAgeMatchView />); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([0, 2, 1, -1, -8, 3, 1, 1]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['destination', 'reference']);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100, 101]); expect(state.setUserSources).toHaveBeenLastCalledWith([200, 201]);
        expect(screen.getByRole('radio', { name: 'wiredfurni.params.variables.compare_value.0' })).toHaveProperty('disabled', true);
        choose(); const popup = screen.getByRole('dialog'); fireEvent.change(within(popup).getByRole('textbox', { name: 'User source 1' }), { target: { value: '200' } });
        fireEvent.change(within(popup).getByRole('combobox'), { target: { value: 'custom:reference' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'wiredfurni.params.variables.duration' }), { target: { value: '7' } }); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([0, 2, 1, -1, -8, 7, 1, 1]); expect(state.setUserSources).toHaveBeenLastCalledWith([200, 200]);
        const input = screen.getByRole('textbox', { name: 'wiredfurni.params.variables.time_selection' });
        fireEvent.change(input, { target: { value: '-2147483648' } }); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([0, 2, 1, -1, -2147483648, 7, 0, 1]);
        fireEvent.change(input, { target: { value: '2147483648' } }); expect(screen.getByText('Save')).toHaveProperty('disabled', true);
        expect(wiredWidthMultiplier('condition', 43)).toBe(1.4);
    });
    it('routes the Age reference furniture source to the secondary pick slot', () => {
        state.trigger.intData = [1, 0, 0, 0, 0, 1, 1, 0];
        render(<WiredConditionVariableAgeMatchView />);
        expect(state.setActivePickSlot).toHaveBeenLastCalledWith(1);
        choose(); const popup = screen.getByRole('dialog');
        fireEvent.change(within(popup).getByRole('textbox', { name: 'Furni source 1' }), { target: { value: '100' } });
        expect(state.setActivePickSlot).toHaveBeenLastCalledWith(0);
        fireEvent.change(within(popup).getByRole('combobox'), { target: { value: 'custom:reference' } }); save();
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100, 100]);
    });
    it('upgrades legacy Age six-int/one-source records without dropping their reference source semantics', () => {
        state.trigger.intData = [1, 0, 0, 0, 42, 1]; state.trigger.variableIds = ['destination']; state.trigger.furniSources = [100]; state.trigger.userSources = [201];
        render(<WiredConditionVariableAgeMatchView />); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 0, 0, 0, 42, 1, 0, -10]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['destination', 'n']);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100, 100]); expect(state.setUserSources).toHaveBeenLastCalledWith([201, 201]);
    });
});
