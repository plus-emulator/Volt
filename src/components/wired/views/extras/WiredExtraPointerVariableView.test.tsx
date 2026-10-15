import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    trigger: { intData: [0], stringData: 'my_pointer', variableIds: ['accessor-42'] },
    nativeCatalog: null,
    setIntParams: vi.fn(), setStringParam: vi.fn(), setVariableIds: vi.fn()
}));
vi.mock('../../../../hooks', () => ({ useWired: () => state }));
vi.mock('../../../../api', () => ({
    expandLocalizedText: (value: string) => value,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    normalizeWiredVariableName: (name: string) => name,
    handleWiredVariableNameKeyDown: vi.fn(),
    tokenOfVariableSlot: (value: string) => `custom:${value}`,
    variableSlotOf: (value: string) => value.slice(7),
    WIRED_NATIVE_VARIABLE_TARGET: { furni: 0, user: 1, global: -10, context: -20 },
    WIRED_VARIABLE_NAME_MAX: 40,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredVariablePickerData', () => ({
    buildWiredVariablePickerEntries: () => [],
    flattenWiredVariablePickerEntries: (entries: unknown[]) => entries,
    createFallbackVariableEntry: (_scope: string, token: string) => ({ token })
}));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: ({ selectedToken }: { selectedToken: string }) => <span>{selectedToken}</span> }));
vi.mock('./WiredExtraBaseView', () => ({ WiredExtraBaseView: ({ children, headerControls, save }: PropsWithChildren<{ headerControls: ReactNode; save: () => void }>) => <><header>{headerControls}</header><main>{children}</main><button onClick={save}>Save</button></> }));

import { WiredExtraPointerVariableView } from './WiredExtraPointerVariableView';

describe('Pointer Variable AIR header controls', () => {
    afterEach(() => { cleanup(); vi.clearAllMocks(); });

    it('changes the source from the header while preserving the variable name and accessor id', () => {
        render(<WiredExtraPointerVariableView />);
        const header = screen.getByRole('banner');
        expect(within(header).getByRole('button', { name: 'Furniture' }).getAttribute('aria-pressed')).toBe('true');
        expect(within(screen.getByRole('main')).queryByRole('button', { name: 'Context' })).toBeNull();
        fireEvent.click(within(header).getByRole('button', { name: 'Context' }));
        fireEvent.click(screen.getByText('Save'));
        expect(state.setIntParams).toHaveBeenLastCalledWith([-20]);
        expect(state.setStringParam).toHaveBeenLastCalledWith('my_pointer');
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['accessor-42']);
    });
});
