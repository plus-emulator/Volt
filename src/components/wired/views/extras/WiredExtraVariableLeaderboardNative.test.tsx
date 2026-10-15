import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    trigger: null as any, nativeCatalog: null,
    setIntParams: vi.fn(), setStringParam: vi.fn(), setVariableIds: vi.fn()
}));
vi.mock('../../../../hooks', () => ({ useWired: () => state, useWiredNativeVariables: () => ({}) }));
vi.mock('../../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 },
    createNativeVariableToken: (id: string) => `custom:${id}`,
    getNativeVariableId: (token: string) => token.replace(/^custom:/, '')
}));
vi.mock('../WiredSourcesSelector', () => ({ WiredHolderSourceSection: ({ scope }: any) => <span>{`holder ${scope}`}</span>, WiredMergedSourceSection: ({ scope, bare, disabled, furniSlot = 0, userSlot = 0, furniSource, userSource, onChangeFurni, onChangeUsers }: any) => { const content = scope === 'global' || scope === 'context' ? <span>{`holder ${scope}`}</span> : <input aria-label={`Merged ${scope === 'furni' ? 'furni' : 'user'} ${scope === 'furni' ? furniSlot : userSlot}${bare ? ' bare' : ''}`} value={scope === 'furni' ? furniSource : userSource} onChange={event => (scope === 'furni' ? onChangeFurni : onChangeUsers)(Number(event.target.value))} />; return disabled ? <fieldset disabled>{content}</fieldset> : content; } }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../../../../common/native-text/NativeText', () => ({ NativeText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: () => null }));
vi.mock('../WiredText', async () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span>, WiredSurfaceContext: (await import('react')).createContext(0xffffff) }));
vi.mock('../WiredVariablePickerData', () => ({ buildWiredVariablePickerEntries: () => [], flattenWiredVariablePickerEntries: () => [], createFallbackVariableEntry: () => null }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: () => null }));
vi.mock('./WiredExtraBaseView', () => ({ WiredExtraBaseView: ({ children, nativeLayout, save }: PropsWithChildren<{ nativeLayout: boolean; save: () => void }>) => <WiredNativeContext.Provider value={nativeLayout}>{children}<button onClick={save}>Save</button></WiredNativeContext.Provider> }));

import { createUnpublishedVariableLeaderboardConfig, decodeVariableLeaderboardConfig, encodeVariableLeaderboardConfig } from '../../../../api/wired/WiredVariableLeaderboard';
import { WiredNativeContext } from '../WiredNativeContext';
import { WiredExtraVariableLeaderboardView } from './WiredExtraVariableLeaderboardView';

describe('Leaderboard AIR general controls', () => {
    beforeEach(() => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ measureText: (text: string) => ({ width: text.length * 6 }) } as unknown as ReturnType<HTMLCanvasElement['getContext']>);
    });
    afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

    it('keeps native information rows and paired sorting controls editable without changing columns or location', () => {
        const config = createUnpublishedVariableLeaderboardConfig();
        config.title = 'Leaderboard';
        config.description = 'Room scores';
        config.location = { tileX: 4, tileY: 5, offsetX: 2, altitude: 100 };
        const payload = encodeVariableLeaderboardConfig(config)!;
        state.trigger = { intData: payload.intParams, stringData: payload.stringParam, variableIds: payload.variableIds, contexts: [] };
        const { container } = render(<WiredExtraVariableLeaderboardView />);
        const information = container.querySelector('.volt-wired-leaderboard__information')!;
        expect(information.querySelectorAll('.volt-wired__input-field').length).toBe(2);
        const title = screen.getByDisplayValue('Leaderboard');
        fireEvent.change(title, { target: { value: 'Updated title' } });
        const pageSize = screen.getByRole('combobox', { name: 'Page size:' });
        expect(pageSize.closest('.volt-wired-leaderboard__sorting')).not.toBeNull();
        fireEvent.click(pageSize);
        fireEvent.pointerDown(screen.getByRole('option', { name: '20' }), { button: 0 });
        fireEvent.click(screen.getByText('Save'));
        const saved = decodeVariableLeaderboardConfig(state.setIntParams.mock.lastCall![0], state.setVariableIds.mock.lastCall![0], state.setStringParam.mock.lastCall![0])!;
        expect(saved.title).toBe('Updated title');
        expect(saved.pageSizeOption).toBe(2);
        expect(saved.description).toBe(config.description);
        expect(saved.columns).toEqual(config.columns);
        expect(saved.location).toEqual(config.location);
    });
    it('keeps the four location fields in the AIR row and saves coordinate edits', () => {
        const config = createUnpublishedVariableLeaderboardConfig();
        config.title = 'Leaderboard';
        config.location = { tileX: 4, tileY: 5, offsetX: 2, altitude: 100 };
        const payload = encodeVariableLeaderboardConfig(config)!;
        state.trigger = { intData: payload.intParams, stringData: payload.stringParam, variableIds: payload.variableIds, contexts: [] };
        const { container } = render(<WiredExtraVariableLeaderboardView />);
        const row = container.querySelector('.volt-wired-leaderboard__location') as HTMLElement;
        expect(row.style.display).toBe('flex'); expect(row.style.gap).toBe('4px');
        const inputs = [...row.querySelectorAll('input')];
        expect(inputs.map(input => input.style.width)).toEqual(['32px','32px','32px','32px']);
        fireEvent.change(inputs[0], {target:{value:'9'}});
        fireEvent.change(inputs[2], {target:{value:'-32'}});
        fireEvent.click(screen.getByText('Save'));
        const saved = decodeVariableLeaderboardConfig(state.setIntParams.mock.lastCall![0],state.setVariableIds.mock.lastCall![0],state.setStringParam.mock.lastCall![0])!;
        expect(saved.location).toEqual({tileX:9,tileY:5,offsetX:-32,altitude:100});
        expect(saved.columns).toEqual(config.columns);
    });

    it('builds the operand as a room-only value-or-variable section whose popup holds the fixed room holder row (AIR VariableLeaderboardAddon.as:169, 642-665)', () => {
        const config = createUnpublishedVariableLeaderboardConfig();
        config.title = 'Leaderboard';
        Object.assign(config, { filterEnabled: true, filterVariableId: '123', comparisonEnabled: true, literal: '7' });
        const payload = encodeVariableLeaderboardConfig(config)!;
        state.trigger = { intData: payload.intParams, stringData: payload.stringParam, variableIds: payload.variableIds, contexts: [] };
        render(<WiredExtraVariableLeaderboardView />);
        expect(screen.getByRole('textbox', { name: 'Compare against:' })).toHaveProperty('value', '7');
        fireEvent.click(screen.getByRole('button', { name: 'Choose variable' }));
        expect(screen.getByText('holder global')).toBeTruthy();
        expect(screen.queryByRole('group', { name: 'Variable selection:' })).toBeNull();
        fireEvent.change(screen.getByRole('textbox', { name: 'Compare against:' }), { target: { value: '-12' } });
        fireEvent.click(screen.getByText('Save'));
        const saved = decodeVariableLeaderboardConfig(state.setIntParams.mock.lastCall![0], state.setVariableIds.mock.lastCall![0], state.setStringParam.mock.lastCall![0])!;
        expect(saved.literal).toBe('-12'); expect(saved.operandKind).toBe(0);
    });
});
