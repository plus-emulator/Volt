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
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../../../../common/native-text/NativeText', () => ({ NativeText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: () => null }));
vi.mock('../WiredText', async () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span>, WiredSurfaceContext: (await import('react')).createContext(0xffffff) }));
vi.mock('../WiredVariablePickerData', () => ({ buildWiredVariablePickerEntries: () => [], flattenWiredVariablePickerEntries: () => [] }));
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
});
