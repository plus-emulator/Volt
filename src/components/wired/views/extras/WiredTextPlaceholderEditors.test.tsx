import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const state = vi.hoisted(() => ({
    trigger: { intData: [1, 1, 1], variableIds: ['value'], stringData: 'names\t | ', userSources: [201], furniSources: [100], inputSources: undefined },
    setIntParams: vi.fn(), setStringParam: vi.fn(), setVariableIds: vi.fn(), setUserSources: vi.fn(), setFurniSources: vi.fn(), setActivePickSlot: vi.fn()
}));
const defs = vi.hoisted(() => [{ variableId: 'value', name: 'Score.Value', availability: 0, hasValue: true, isReadOnly: false, canCreateAndDelete: true, isTextConnected: true, textConnector: [] }]);
vi.mock('../../../../api', async () => ({ ...(await vi.importActual('../../../../api/wired/WiredNativeVariables')), ...(await vi.importActual('../../../../api/wired/WiredGlobalPlaceholder')), normalizeNativeSource: (value: number) => value, LocalizeText: (key: string, _names?: string[], values?: string[]) => values?.length ? `Use ${values[0]}` : key, localizeWithFallback: (_key: string, fallback: string) => fallback, WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 } }));
vi.mock('../../../../hooks', () => ({ useNotification: () => ({ simpleAlert: vi.fn() }), useWired: () => ({ ...state, furniIds: [11], secondaryFurniIds: [22] }), useWiredNativeVariables: () => ({ userVariableDefinitions: defs, furniVariableDefinitions: defs, roomVariableDefinitions: defs, contextVariableDefinitions: defs }) }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', async () => ({ ...(await vi.importActual('../WiredText')), WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: () => <div>Sources</div> }));
vi.mock('../WiredFurniSelectionSourceRow', () => ({ WiredFurniSelectionSourceRow: () => <div>Sources</div> }));
vi.mock('../WiredSourceTypeSelector', () => ({ WiredSourceTypeSelector: ({ value, onChange }: any) => <select aria-label="Scope" value={value} onChange={event => onChange(event.target.value)}>{['user', 'furni', 'global', 'context'].map(type => <option key={type}>{type}</option>)}</select> }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: ({ entries, selectedToken, onSelect }: any) => <select aria-label="Variable" value={selectedToken} onChange={event => onSelect(entries.find((entry: any) => entry.token === event.target.value))}>{entries.map((entry: any) => <option key={entry.token} value={entry.token} disabled={!entry.selectable}>{entry.displayLabel}</option>)}</select> }));
vi.mock('./WiredExtraBaseView', () => ({ WiredExtraBaseView: ({ children, footer, save, nativeLayout, validate }: PropsWithChildren<{ footer: ReactNode; save: () => void; nativeLayout: boolean; validate?: () => boolean }>) => <WiredNativeContext.Provider value={nativeLayout}><div data-testid="editor" data-native={nativeLayout}>{children}{footer}<button onClick={save} disabled={validate && !validate()}>Save</button></div></WiredNativeContext.Provider> }));
import { WiredExtraTextOutputUsernameView } from './WiredExtraTextOutputUsernameView';
import { WiredExtraTextOutputFurniNameView } from './WiredExtraTextOutputFurniNameView';
import { WiredExtraTextOutputVariableView } from './WiredExtraTextOutputVariableView';
import { WiredExtraTextInputVariableView } from './WiredExtraTextInputVariableView';
import { WiredExtraGlobalPlaceholderNativeView } from './WiredExtraGlobalPlaceholderNativeView';
const save = () => fireEvent.click(screen.getByText('Save'));

describe('AIR text placeholder/capture editors', () => {
    afterEach(cleanup); beforeEach(() => { vi.clearAllMocks(); state.trigger = { intData: [1, 1, 1], variableIds: ['value'], stringData: 'names\t | ', userSources: [201], furniSources: [100], inputSources: undefined }; });
    it.each([['user', WiredExtraTextOutputUsernameView], ['furni', WiredExtraTextOutputFurniNameView]] as const)('%s uses boolean modes, attached5-character delimiter and preserves its inactive draft', (kind, Editor) => {
        render(<Editor />); expect(screen.getByTestId('editor')).toHaveAttribute('data-native', 'true');
        const [name, delimiter] = screen.getAllByRole('textbox'); expect(name).toHaveAttribute('maxLength', '32'); expect(delimiter).toHaveAttribute('maxLength', '5'); expect(delimiter.parentElement).toHaveStyle({ width: '63px' });
        expect(delimiter.closest('.volt-wired__option-extra')).not.toBeNull();
        fireEvent.change(name, { target: { value: 'My Bad! Name' } }); expect(name).toHaveValue('my_bad_name');
        fireEvent.click(screen.getByRole('radio', { name: `wiredfurni.params.texts.placeholder_type.${kind}.1` })); expect(delimiter).toBeDisabled(); save(); expect(state.setIntParams).toHaveBeenLastCalledWith([0]); expect(state.setStringParam).toHaveBeenLastCalledWith('my_bad_name');
        fireEvent.click(screen.getByRole('radio', { name: `wiredfurni.params.texts.placeholder_type.${kind}.2` })); expect(delimiter).toHaveValue(' | '); save(); expect(state.setIntParams).toHaveBeenLastCalledWith([1]); expect(state.setStringParam).toHaveBeenLastCalledWith('my_bad_name\t | ');
        expect(kind === 'user' ? state.setUserSources : state.setFurniSources).toHaveBeenLastCalledWith(kind === 'user' ? [201] : [100]);
    });
    it('saves native capture text mode0/1 and slot with original name, no implementation-only empty-state text', () => {
        state.trigger.stringData = 'capture'; state.trigger.intData = [1]; render(<WiredExtraTextInputVariableView />);
        expect(screen.getByRole('radio', { name: 'wiredfurni.params.texts.variable_display_type.2' })).toBeChecked(); expect(screen.getByText('Use #(capture)')).toBeVisible(); save(); expect(state.setIntParams).toHaveBeenLastCalledWith([1]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['value']);
        fireEvent.click(screen.getByRole('radio', { name: 'wiredfurni.params.texts.variable_display_type.1' })); save(); expect(state.setIntParams).toHaveBeenLastCalledWith([0]); expect(state.setStringParam).toHaveBeenLastCalledWith('capture');
        expect(screen.queryByText(/wf_var_context/)).toBeNull();
    });
    it('keeps variable output native3 integers and prohibits multiple values for global/context', () => {
        render(<WiredExtraTextOutputVariableView />); save(); expect(state.setIntParams).toHaveBeenLastCalledWith([1, 1, 1]); expect(state.setStringParam).toHaveBeenLastCalledWith('names\t | '); expect(state.setVariableIds).toHaveBeenLastCalledWith(['value']);
        fireEvent.change(screen.getByLabelText('Scope'), { target: { value: 'global' } });
        expect(screen.getByRole('radio', { name: 'wiredfurni.params.texts.placeholder_type.2' })).toBeDisabled(); expect(screen.getAllByRole('textbox')[1]).toBeDisabled();
        fireEvent.change(screen.getByLabelText('Variable'), { target: { value: 'custom:value' } }); save(); /* AIR onChangeVariable(null) on the target switch forces Numeric (VariablePlaceholderAddon.as:110-117). */ expect(state.setIntParams).toHaveBeenLastCalledWith([0, -10, 0]); expect(state.setStringParam).toHaveBeenLastCalledWith('names');
        fireEvent.change(screen.getByLabelText('Scope'), { target: { value: 'user' } }); expect(screen.getAllByRole('textbox')[1]).toHaveValue(' | ');
    });
    it('restores each variable target its own last choice, like AIR NewVariablePicker.variableTarget', () => {
        state.trigger.stringData = ''; render(<WiredExtraTextOutputVariableView />);
        expect(screen.getByLabelText('Variable')).toHaveValue('custom:value'); expect(screen.getAllByRole('textbox')[0]).toHaveValue('score_value');
        fireEvent.change(screen.getByLabelText('Scope'), { target: { value: 'global' } });
        expect(screen.getAllByRole('textbox')[0]).toHaveValue(''); save(); expect(state.setVariableIds).not.toHaveBeenLastCalledWith(['value']);
        fireEvent.change(screen.getByLabelText('Scope'), { target: { value: 'user' } });
        expect(screen.getByLabelText('Variable')).toHaveValue('custom:value'); expect(screen.getAllByRole('textbox')[0]).toHaveValue('score_value');
    });
    it('uses the native global name preview and 100-character value field without changing the wire form', () => {
        state.trigger.intData = [0, 0, 0]; state.trigger.stringData = 'global_name\tvalue'; render(<WiredExtraGlobalPlaceholderNativeView />);
        const [name, value] = screen.getAllByRole('textbox'); expect(name).toHaveAttribute('maxLength', '32'); expect(value).toHaveAttribute('maxLength', '100');
        expect(name).toHaveClass('volt-wired__input-field'); expect(value).toHaveClass('volt-wired__input-field'); expect(screen.getByText('Use $(global_name)')).toBeVisible();
        fireEvent.change(value, { target: { value: 'new value' } }); save(); expect(state.setIntParams).toHaveBeenLastCalledWith([0, 0, 0]); expect(state.setStringParam).toHaveBeenLastCalledWith('global_name\tnew value');
    });
    it('suggests the selected variable flattened name only when the name is empty', () => {
        state.trigger.stringData = ''; state.trigger.intData = [0]; render(<WiredExtraTextInputVariableView />);
        expect(screen.getByRole('textbox')).toHaveValue('score_value');
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'custom' } }); save(); expect(state.setStringParam).toHaveBeenLastCalledWith('custom');
    });
});
