import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    trigger: { intData: [1], furniSources: [100, 101], variableIds: ['42'] },
    setIntParams: vi.fn(), setFurniSources: vi.fn(), setVariableIds: vi.fn(), setActivePickSlot: vi.fn()
}));
vi.mock('../../../../hooks', () => ({ useWired: () => state, useWiredNativeVariables: () => ({}) }));
vi.mock('../../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    tokenOfVariableSlot: (id: string) => id,
    variableSlotOf: (id: string) => id,
    WiredFurniType: { STUFF_SELECTION_OPTION_BY_ID: 1 },
    WIRED_VARIABLE_ABSENT: '0'
}));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredVariablePickerData', () => ({ buildWiredVariablePickerEntries: () => [] }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: ({ selectedToken }: { selectedToken: string }) => <span>{selectedToken}</span> }));
vi.mock('../conditions/WiredVariableConditionParts', () => ({ FurniPickSlotButtons: () => null }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: () => null }));
vi.mock('../extras/WiredExtraBaseView', () => ({ WiredExtraBaseView: ({ children, nativeLayout, save }: PropsWithChildren<{ nativeLayout: boolean; save: () => void }>) => <WiredNativeContext.Provider value={nativeLayout}>{children}<button onClick={save}>Save</button></WiredNativeContext.Provider> }));

import { WiredNativeContext } from '../WiredNativeContext';
import { WiredSelectorScanChestFurniByType } from './WiredSelectorScanChestFurniByType';

describe('Chest scanner AIR sections', () => {
    afterEach(() => { cleanup(); vi.clearAllMocks(); });

    it('starts folded without dropping the saved mode, selected variable or source slots', () => {
        render(<WiredSelectorScanChestFurniByType />);
        expect(screen.getByText('Choose Variable:')).toBeDefined();
        expect(screen.queryByRole('radio')).toBeNull();
        fireEvent.click(screen.getByText('Save'));
        expect(state.setIntParams).toHaveBeenLastCalledWith([1]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['42']);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100, 101]);
        fireEvent.click(screen.getByRole('button', { name: 'Scanning options:' }));
        expect((screen.getByRole('radio', { name: 'Mode 1' }) as HTMLInputElement).checked).toBe(true);
        fireEvent.click(screen.getByRole('radio', { name: 'Mode 0' }));
        fireEvent.click(screen.getByText('Save'));
        expect(state.setIntParams).toHaveBeenLastCalledWith([0]);
    });
});
