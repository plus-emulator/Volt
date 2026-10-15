import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const state = vi.hoisted(() => ({ trigger: { intData: [-1, 1, 7], variableIds: ['source'], stringData: 'my_alias', furniSources: [201], inputSources: { furniAllowed: [[100, 201]], furniDefaults: [100] } }, setIntParams: vi.fn(), setVariableIds: vi.fn(), setStringParam: vi.fn(), setFurniSources: vi.fn(), definitions: [{ variableId: 'source', name: 'source', hasValue: true, availability: 0, requiresExecutionContext: false }] }));
vi.mock('../../../../api', async () => ({
    ...(await vi.importActual('../../../../api/wired/WiredNativeVariables')),
    ...(await vi.importActual('../../../../api/wired/WiredVariableName')),
    LocalizeText: (key: string) => key, localizeWithFallback: (key: string) => key,
    normalizeNativeSource: (value: number) => value,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT: 3 }
}));
vi.mock('../../../../hooks', () => ({ useWired: () => state, useWiredNativeVariables: () => ({ userVariableDefinitions: state.definitions }), useNotificationActions: () => ({ showConfirm: vi.fn() }) }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: () => null }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: ({ furniSource, onChangeFurni }: any) => <input aria-label="Source" value={furniSource} onChange={event => onChangeFurni(Number(event.target.value))} /> }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: ({ entries, selectedToken, onSelect }: any) => <select aria-label="Variable" value={selectedToken} onChange={event => onSelect(entries.find((entry: any) => entry.token === event.target.value))}>{entries.filter((entry: any) => entry.selectable).map((entry: any) => <option key={entry.token} value={entry.token}>{entry.displayLabel}</option>)}</select> }));
vi.mock('./WiredExtraBaseView', () => ({ WiredExtraBaseView: ({ children, footer, save, nativeLayout }: PropsWithChildren<any>) => <WiredNativeContext.Provider value={nativeLayout}>{children}{footer}<button onClick={save}>Save</button></WiredNativeContext.Provider> }));
import { WiredExtraOrEvalView } from './WiredExtraOrEvalView';
import { WiredExtraVariableEchoView } from './WiredExtraVariableEchoView';
import { WiredExtraVariableTextConnectorView } from './WiredExtraVariableTextConnectorView';
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
describe('Native evaluation, Echo and text connector', () => {
    beforeEach(() => { vi.clearAllMocks(); state.trigger = { intData: [-1, 1, 7], variableIds: ['source'], stringData: 'my_alias', furniSources: [201], inputSources: { furniAllowed: [[100, 201]], furniDefaults: [100] } }; state.definitions = [{ variableId: 'source', name: 'source', hasValue: true, availability: 0, requiresExecutionContext: false }]; });
    afterEach(cleanup);
    it('saves native evaluation triples, retains independent comparison drafts and shows initial usage info', () => {
        render(<WiredExtraOrEvalView />);
        expect(screen.getByRole('button', { name: 'wiredfurni.params.general_box_info' }).getAttribute('aria-expanded')).toBe('true');
        save(); expect(state.setIntParams).toHaveBeenLastCalledWith([-1, 1, 7]); expect(state.setFurniSources).toHaveBeenLastCalledWith([201]);
        fireEvent.click(screen.getByRole('radio', { name: 'wiredfurni.params.eval_mode.cmp.0' }));
        const value = screen.getByRole('textbox', { name: 'wiredfurni.params.eval_mode.cmp.0' });
        fireEvent.change(value, { target: { value: '5' } }); save(); expect(state.setIntParams).toHaveBeenLastCalledWith([-1, 0, 5]);
        fireEvent.click(screen.getByRole('radio', { name: 'wiredfurni.params.eval_mode.cmp.1' })); save(); expect(state.setIntParams).toHaveBeenLastCalledWith([-1, 1, 7]);
        fireEvent.click(screen.getByRole('radio', { name: 'wiredfurni.params.eval_mode.2' })); save(); expect(state.setIntParams).toHaveBeenLastCalledWith([2, 0, 0]);
    });
    it('keeps edited Echo names through an async catalogue refresh and preserves opaque ID', () => {
        const view = render(<WiredExtraVariableEchoView />); const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'New Alias' } });
        state.definitions = [...state.definitions]; view.rerender(<WiredExtraVariableEchoView />); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([]); expect(state.setStringParam).toHaveBeenLastCalledWith('new_alias'); expect(state.setVariableIds).toHaveBeenLastCalledWith(['source']);
    });
    it('shows a 100px native text connector and enforces its line limit only when edited', () => {
        render(<WiredExtraVariableTextConnectorView />);
        const input = screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(input.parentElement?.style.height).toBe('100px'); expect(input.maxLength).toBe(1000); expect(input.wrap).toBe('off');
        fireEvent.change(input, { target: { value: Array.from({ length: 31 }, (_, index) => `${index}=text`).join('\n') } }); save();
        expect(state.setStringParam.mock.lastCall?.[0].split('\n')).toHaveLength(30); expect(state.setIntParams).toHaveBeenLastCalledWith([]);
    });
});
