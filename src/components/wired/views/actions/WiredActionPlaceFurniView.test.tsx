import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const state = vi.hoisted(() => ({
    trigger: { intData: [] as number[], variableIds: ['n', 'n'], furniSources: [110, 0, 200], userSources: [0, 200] },
    nativeCatalog: null as any, activePickSlot: 0,
    setIntParams: vi.fn(), setVariableIds: vi.fn(), setStringParam: vi.fn(), setFurniSources: vi.fn(), setUserSources: vi.fn(), setActivePickSlot: vi.fn()
}));
vi.mock('../../../../api', async () => ({ ...(await vi.importActual('../../../../api/wired/WiredNativeVariables')),
    LocalizeText: (key: string) => key, localizeWithFallback: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT: 3 }
}));
vi.mock('../../../../hooks', () => ({ useWired: () => state, useWiredNativeVariables: () => ({ furniVariableDefinitions: [
    { variableId: 'spawn', name: 'Spawn', availability: 0, hasValue: true, canCreateAndDelete: true },
    { variableId: 'ref', name: 'Reference', availability: 0, hasValue: true, canCreateAndDelete: true }
] }) }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: () => null }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: ({ entries, selectedToken, onSelect }: any) => <select aria-label="Variable picker" value={selectedToken} onChange={event => onSelect(entries.find((entry: any) => entry.token === event.target.value))}>{entries.filter((entry: any) => entry.selectable).map((entry: any) => <option key={entry.token} value={entry.token}>{entry.displayLabel}</option>)}</select> }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: ({ furniSlot = 0, userSlot = 0, showFurni, furniSource, userSource, onChangeFurni, onChangeUsers }: any) => <input aria-label={`Source ${showFurni ? 'f' : 'u'}${showFurni ? furniSlot : userSlot}`} value={showFurni ? furniSource : userSource} onChange={event => (showFurni ? onChangeFurni : onChangeUsers)(Number(event.target.value))} /> }));
vi.mock('./WiredActionBaseView', () => ({ WiredActionBaseView: ({ children, footer, save, validate, nativeLayout }: PropsWithChildren<{ footer: ReactNode; save: () => void; validate: () => boolean; nativeLayout: boolean }>) => <WiredNativeContext.Provider value={nativeLayout}><div data-testid="editor" data-native={String(nativeLayout)}>{children}{footer}<button disabled={!validate()} onClick={save}>Save</button></div></WiredNativeContext.Provider> }));
import { WiredActionPlaceFurniView } from './WiredActionPlaceFurniView';
const key = (suffix: string) => `wiredfurni.params.place_furni.${suffix}`;
const expand = (suffix: string) => fireEvent.click(screen.getByRole('button', { name: key(suffix) }));
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
const catalog = (hasValue = true) => ({ available: true, rows: new Map([['spawn', { variable: { variableId: 'spawn', variableName: 'Spawn', variableTarget: 0, variableType: 0, availabilityType: 0, hasValue, canCreateAndDelete: true } }]]) });
describe('native Place Furniture editor', () => {
    beforeEach(() => { vi.clearAllMocks(); state.nativeCatalog = null; state.trigger = { intData: [], variableIds: ['n', 'n'], furniSources: [110, 0, 200], userSources: [0, 200] }; });
    afterEach(cleanup);
    it('shows native section order/default expansion and preserves the default packet', () => {
        render(<WiredActionPlaceFurniView />);
        expect(screen.getByTestId('editor').dataset.native).toBe('true');
        expect(screen.getByRole('button', { name: 'wiredfurni.params.general_box_info' }).getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByRole('button', { name: key('target_location') }).getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByRole('button', { name: key('target_altitude') }).getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByRole('button', { name: key('offsets') }).getAttribute('aria-expanded')).toBe('false');
        expect(screen.getByRole('button', { name: key('spawn_with_variable') }).getAttribute('aria-expanded')).toBe('false');
        save(); expect(state.setIntParams).toHaveBeenCalledWith([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        expect(state.setFurniSources).toHaveBeenCalledWith([110, 0, 200]); expect(state.setUserSources).toHaveBeenCalledWith([0, 200]);
    });
    it('reads offsets, disables without discarding drafts and restores values on reselect', () => {
        state.trigger.intData = [1, 1, 2, 4, -3, 750, 0, 0, 0, 0]; render(<WiredActionPlaceFurniView />); expand('offsets');
        const input = screen.getByRole('textbox', { name: key('offsets.x') });
        expect(input).toHaveProperty('value', '4'); expect(input.parentElement!.style.width).toBe('53px');
        fireEvent.change(input, { target: { value: '9' } }); fireEvent.click(screen.getByRole('checkbox', { name: key('offsets.x') }));
        expect(input).toHaveProperty('disabled', true); expect(input).toHaveProperty('value', '9'); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 1, 2, 0, -3, 750, 0, 0, 0, 0]);
        fireEvent.click(screen.getByRole('checkbox', { name: key('offsets.x') })); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 1, 2, 9, -3, 750, 0, 0, 0, 0]);
    });
    it('retains both variable IDs, all ten integers and merged source slots while editing native value', () => {
        state.nativeCatalog = catalog(); state.trigger = { intData: [1, 1, 2, 3, 4, 5, 1, 1, 17, 0], variableIds: ['spawn', 'ref'], furniSources: [110, 101, 201], userSources: [200, 0] };
        render(<WiredActionPlaceFurniView />); expand('spawn_with_variable'); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 1, 2, 3, 4, 5, 1, 1, 17, 0]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['spawn', 'ref']); expect(state.setFurniSources).toHaveBeenLastCalledWith([110, 101, 201]); expect(state.setUserSources).toHaveBeenLastCalledWith([200, 0]);
        fireEvent.change(screen.getByRole('textbox', { name: key('spawn_with_value') }), { target: { value: '2147483647' } }); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 1, 2, 3, 4, 5, 1, 0, 2147483647, 0]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['spawn', 'n']);
    });
    it('disables value for no-value spawn variables and excludes stale reference/literal from saves', () => {
        state.nativeCatalog = catalog(false); state.trigger.intData = [0, 0, 0, 0, 0, 0, 1, 1, 99, 0]; state.trigger.variableIds = ['spawn', 'ref'];
        render(<WiredActionPlaceFurniView />); expand('spawn_with_variable');
        expect(screen.getByRole('textbox', { name: key('spawn_with_value') })).toHaveProperty('disabled', true); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([0, 0, 0, 0, 0, 0, 1, 0, 0, 0]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['spawn', 'n']);
    });
    it('preserves references while catalog is absent and retains spawn/value drafts when unchecked', () => {
        state.trigger.intData = [0, 0, 0, 0, 0, 0, 1, 1, 12, 0]; state.trigger.variableIds = ['spawn', 'ref'];
        render(<WiredActionPlaceFurniView />); expand('spawn_with_variable'); save(); expect(state.setVariableIds).toHaveBeenLastCalledWith(['spawn', 'ref']);
        const checkbox = screen.getByRole('checkbox', { name: key('spawn_with_variable') }); fireEvent.click(checkbox); save();
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['n', 'n']); expect(state.setIntParams).toHaveBeenLastCalledWith([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        fireEvent.click(checkbox); save(); expect(state.setVariableIds).toHaveBeenLastCalledWith(['spawn', 'ref']); expect(state.setIntParams).toHaveBeenLastCalledWith([0, 0, 0, 0, 0, 0, 1, 1, 12, 0]);
    });
});
