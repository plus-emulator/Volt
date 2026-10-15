import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    trigger: { stringData: 'progress\tOriginal quest' },
    setIntParams: vi.fn(), setStringParam: vi.fn(), setVariableIds: vi.fn()
}));
vi.mock('../../../../hooks', () => ({ useWired: () => state }));
vi.mock('../../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    normalizeWiredVariableName: (name: string) => name,
    handleWiredVariableNameKeyDown: vi.fn(),
    WIRED_VARIABLE_NAME_MAX: 40,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('./WiredExtraBaseView', () => ({ WiredExtraBaseView: ({ children, nativeLayout, save }: PropsWithChildren<{ nativeLayout: boolean; save: () => void }>) => <WiredNativeContext.Provider value={nativeLayout}>{children}<button onClick={save}>Save</button></WiredNativeContext.Provider> }));

import { WiredNativeContext } from '../WiredNativeContext';
import { WiredExtraQuestView } from './WiredExtraQuestView';
import { WiredExtraQuestChainView } from './WiredExtraQuestChainView';

describe('AIR Quest variable editors', () => {
    afterEach(() => { cleanup(); vi.clearAllMocks(); });

    it.each([WiredExtraQuestView, WiredExtraQuestChainView])('uses native sections and saves the quest name with its AIR text limit', (View) => {
        render(<View />);
        const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
        expect(inputs.map((input) => input.value)).toEqual(['progress', 'Original quest']);
        expect(inputs[1].maxLength).toBe(500);
        expect(inputs[1].classList.contains('volt-wired__input-field')).toBe(true);
        fireEvent.change(inputs[1], { target: { value: 'Replacement quest' } });
        fireEvent.click(screen.getByText('Save'));
        expect(state.setStringParam).toHaveBeenLastCalledWith('progress\tReplacement quest');
        expect(state.setIntParams).toHaveBeenLastCalledWith([]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith([]);
    });
});
