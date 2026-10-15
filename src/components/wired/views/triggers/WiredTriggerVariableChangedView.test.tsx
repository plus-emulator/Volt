import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { IWiredVariableData, IWiredVariableDiffEntry } from '@volt/renderer';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const state = vi.hoisted(() => ({
    trigger: { intData: [1, 0, 1, 5, 0, 0], variableIds: ['user.variable'], selectedItems: [42, 43], stringData: '' },
    nativeCatalog: { rows: new Map<string, IWiredVariableDiffEntry>() },
    setIntParams: vi.fn(), setVariableIds: vi.fn(), setStringParam: vi.fn()
}));
vi.mock('../../../../api', async () => ({ ...(await vi.importActual('../../../../api/wired/WiredNativeVariables')), LocalizeText: (key: string) => key, localizeWithFallback: (_key: string, fallback: string) => fallback, WiredFurniType: { STUFF_SELECTION_OPTION_BY_ID: 1 } }));
vi.mock('../../../../hooks', () => ({ useWired: () => state }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: () => null }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: ({ entries, selectedToken, onSelect }: any) => <select aria-label="Variable" value={selectedToken} onChange={event => onSelect(entries.find((entry: any) => entry.token === event.target.value))}>{entries.map((entry: any) => <option key={entry.token} value={entry.token} disabled={!entry.selectable}>{entry.displayLabel}</option>)}</select> }));
vi.mock('./WiredTriggerBaseView', () => ({ WiredTriggerBaseView: ({ children, save, nativeLayout, requiresFurni }: PropsWithChildren<{ save: () => void; nativeLayout: boolean; requiresFurni: number }>) => <WiredNativeContext.Provider value={nativeLayout}><div data-testid="editor" data-furni={requiresFurni}>{children}<button onClick={save}>Save</button></div></WiredNativeContext.Provider> }));
import { variableUpdateControls, WiredTriggerVariableChangedView } from './WiredTriggerVariableChangedView';
const variable = (overrides: Partial<IWiredVariableData> = {}): IWiredVariableData => ({ variableId: 'user.variable', variableName: 'Main', variableType: 0, variableTarget: 1, availabilityType: 0, alwaysAvailable: false, canCreateAndDelete: true, hasValue: true, canWriteValue: true, canInterceptChanges: true, isInvisible: false, canReadCreationTime: true, canReadLastUpdateTime: true, requiresExecutionContext: false, textConnector: null, hasTextConnectorFallback: false, textConnectorFallback: null, ...overrides });
const rows = (...values: IWiredVariableData[]) => new Map(values.map(value => [value.variableId, { hash: 1, variable: value }]));
const save = () => fireEvent.click(screen.getByText('Save'));
const expand = (suffix: string) => fireEvent.click(screen.getByRole('button', { name: `wiredfurni.params.variables.${suffix}` }));
const check = (suffix: string) => screen.getByRole('checkbox', { name: `wiredfurni.params.variables.${suffix}` });

describe('AIR VariableUpdate native form', () => {
    beforeEach(() => { vi.clearAllMocks(); state.trigger = { intData: [1, 0, 1, 5, 0, 0], variableIds: ['user.variable'], selectedItems: [42, 43], stringData: '' }; state.nativeCatalog.rows = rows(variable()); });
    afterEach(cleanup);
    it('saves exactly six native integers and opaque slot, preserving folded/disabled submask and zero origins', () => {
        render(<WiredTriggerVariableChangedView />);
        expect(screen.getByRole('button', { name: 'wiredfurni.params.variables.trigger_options' })).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByRole('button', { name: 'wiredfurni.params.variables.trigger_origin' })).toHaveAttribute('aria-expanded', 'false');
        save(); expect(state.setIntParams).toHaveBeenLastCalledWith([1, 0, 1, 5, 0, 0]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['user.variable']); expect(state.setStringParam).toHaveBeenLastCalledWith('');
        expand('trigger_options'); expect(check('trigger_options.1.0')).toBeDisabled(); expect(check('trigger_options.1.0')).toBeChecked();
        fireEvent.click(check('trigger_options.1')); fireEvent.click(check('trigger_options.1.1')); save(); expect(state.setIntParams).toHaveBeenLastCalledWith([1, 1, 1, 7, 0, 0]);
    });
    it('switches to selected variable boxes without discarding the inactive variable or furniture picks', () => {
        render(<WiredTriggerVariableChangedView />); fireEvent.click(screen.getByRole('radio', { name: 'wiredfurni.params.variables.trigger_mode.1' }));
        expect(screen.getByLabelText('Variable')).toBeDisabled(); expect(screen.getByTestId('editor')).toHaveAttribute('data-furni', '1'); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 0, 1, 5, 0, 1]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['user.variable']); expect(state.trigger.selectedItems).toEqual([42, 43]);
        fireEvent.click(screen.getByRole('radio', { name: 'wiredfurni.params.variables.trigger_mode.0' })); expect(screen.getByLabelText('Variable')).toHaveValue('custom:user.variable');
    });
    it('filters real native permissions and keeps an unavailable saved id unselectable', () => {
        state.nativeCatalog.rows = rows(variable({ canInterceptChanges: false }), variable({ variableId: 'blocked', variableName: 'Blocked', requiresExecutionContext: true }), variable({ variableId: 'allowed', variableName: 'Allowed', variableType: 1 }));
        render(<WiredTriggerVariableChangedView />);
        expect(screen.queryByRole('option', { name: 'Blocked' })).toBeNull(); expect(screen.getByRole('option', { name: '#user.variable' })).toBeDisabled();
        fireEvent.change(screen.getByLabelText('Variable'), { target: { value: 'custom:allowed' } }); save(); expect(state.setVariableIds).toHaveBeenLastCalledWith(['allowed']);
    });
    it('derives controls from native type/availability and retains checked disabled origin flags', () => {
        state.trigger.variableIds = ['room']; state.trigger.intData = [1, 1, 1, 7, -1, 0]; state.nativeCatalog.rows = rows(variable({ variableId: 'room', variableTarget: -10, availabilityType: 11, canCreateAndDelete: false, hasValue: false }));
        render(<WiredTriggerVariableChangedView />); expand('trigger_options'); expect(check('trigger_options.0')).toBeDisabled(); expect(check('trigger_options.1')).toBeDisabled();
        expand('trigger_origin'); expect(check('trigger_origin.1')).toBeEnabled(); expect(check('trigger_origin.3')).toBeEnabled(); expect(screen.getByText('wiredfurni.params.variables.trigger_origin.2.info')).toBeVisible();
        fireEvent.click(check('trigger_origin.2')); save(); expect(state.setIntParams).toHaveBeenLastCalledWith([1, 1, 1, 7, 11, 0]);
        expect(variableUpdateControls(variable({ variableType: 1, canCreateAndDelete: false, hasValue: false })).canCreateDelete).toBe(true);
        expect(variableUpdateControls(variable({ variableType: 2, canCreateAndDelete: false, hasValue: false })).canChange).toBe(false);
        expect(variableUpdateControls(variable({ variableType: 3, canCreateAndDelete: false, hasValue: false })).canChange).toBe(true);
        expect(variableUpdateControls(variable({ availabilityType: 21, canCreateAndDelete: false })).canCreateDelete).toBe(true);
    });
    it('does not reset edited masks when the native catalog refreshes', () => {
        const view = render(<WiredTriggerVariableChangedView />); expand('trigger_options'); fireEvent.click(check('trigger_options.0'));
        state.nativeCatalog.rows = rows(variable({ variableTarget: 0 })); view.rerender(<WiredTriggerVariableChangedView />); save(); expect(state.setIntParams).toHaveBeenLastCalledWith([0, 0, 1, 5, 0, 0]);
    });
});
