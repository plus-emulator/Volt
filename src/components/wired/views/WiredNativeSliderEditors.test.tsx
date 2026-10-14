import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ComponentType, PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from './WiredNativeContext';

const state = vi.hoisted(() => ({
    trigger: { intData: [125, 2], furniSources: [200], userSources: [201], selectedItems: [], maximumItemSelectionCount: 20 },
    setIntParams: vi.fn(), setFurniSources: vi.fn(), setUserSources: vi.fn(),
    setStringParam: vi.fn(), setQuantifier: vi.fn(), setFurniIds: vi.fn(), setFilter: vi.fn(), setInverse: vi.fn()
}));

vi.mock('../../../api', async () => ({
    ...(await vi.importActual('../../../api/wired/WiredSliderConverters')),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1, STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT: 2 }
}));
vi.mock('../../../hooks', () => ({ useWired: () => ({ ...state, quantifier: 1, filter: true, inverse: false, furniIds: [] }) }));
vi.mock('../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span>, Slider: () => <div data-testid="legacy-slider" /> }));
vi.mock('./WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('./WiredShellHeaderView', () => ({ WiredShellButton: ({ children, onClick, disabled }: PropsWithChildren<{ onClick: () => void; disabled: boolean }>) => <button disabled={disabled} onClick={onClick}>{children}</button> }));
vi.mock('./WiredSourcesSelector', () => ({
    WiredSourcesSelector: () => null,
    sortWiredSourceOptions: (options: unknown[]) => options,
    useAvailableUserSources: (_trigger: unknown, options: unknown[]) => options
}));
vi.mock('./WiredFurniSelectionSourceRow', () => ({ WiredFurniSelectionSourceRow: ({ headerContent }: { headerContent: ReactNode }) => <div>{headerContent}</div> }));

const Base = ({ children, save, nativeLayout }: PropsWithChildren<{ save: () => void; nativeLayout: boolean }>) => (
    <WiredNativeContext.Provider value={true}>
        <div data-testid="editor" data-native-layout={String(nativeLayout)}>{children}<button onClick={save}>Save</button></div>
    </WiredNativeContext.Provider>
);
vi.mock('./actions/WiredActionBaseView', () => ({ WiredActionBaseView: (props: Parameters<typeof Base>[0]) => <Base {...props} /> }));
vi.mock('./conditions/WiredConditionBaseView', () => ({ WiredConditionBaseView: (props: Parameters<typeof Base>[0]) => <Base {...props} /> }));
vi.mock('./selectors/WiredSelectorBaseView', () => ({ WiredSelectorBaseView: (props: Parameters<typeof Base>[0]) => <Base {...props} /> }));

import { WiredActionSetAltitudeView } from './actions/WiredActionSetAltitudeView';
import { WiredConditionHasAltitudeView } from './conditions/WiredConditionHasAltitudeView';
import { WiredConditionSelectionQuantityView } from './conditions/WiredConditionSelectionQuantityView';
import { WiredConditionTeamHasScoreView } from './conditions/WiredConditionTeamHasScoreView';
import { WiredSelectorFurniAltitudeView } from './selectors/WiredSelectorFurniAltitudeView';

const headerInput = () => {
    const input = document.querySelector<HTMLInputElement>('.volt-wired__native-section-header input[type="text"]');
    expect(input).not.toBeNull();
    return input!;
};
const save = () => fireEvent.click(screen.getByText('Save'));

// AIR25 source: SetFurniAltitude, FurniHasAltitude, FurniWithAltitude, TeamHasScore and class_4137.
// Exercise the actual SliderSection/NumberInput so display precision and saved integer units cannot drift.
describe('AIR slider editor header inputs and wire values', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.trigger = { intData: [125, 2], furniSources: [200], userSources: [201], selectedItems: [], maximumItemSelectionCount: 20 };
    });
    afterEach(cleanup);

    it.each<[string, ComponentType]>([
        ['altitude action', WiredActionSetAltitudeView],
        ['altitude condition', WiredConditionHasAltitudeView],
        ['altitude selector', WiredSelectorFurniAltitudeView]
    ])('%s displays hundredths, edits exactly, and keeps the last valid value on invalid input', (_name, Editor) => {
        render(<Editor />);
        const input = headerInput();
        expect(input.value).toBe('1.25');
        expect(screen.getByTestId('editor').getAttribute('data-native-layout')).toBe('true');
        fireEvent.change(input, { target: { value: '79.99' } });
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([7999, 2]);
        fireEvent.change(input, { target: { value: '80.01' } });
        expect(input.parentElement?.classList.contains('is-invalid')).toBe(true);
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([7999, 2]);
        fireEvent.change(input, { target: { value: '0.01' } });
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 2]);
        fireEvent.click(document.querySelector('.volt-wired__slider-row button:last-child')!);
        expect(input.value).toBe('0.02');
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([2, 2]);
    });

    it('keeps selector filter and inverse outside its owned altitude integers', () => {
        render(<WiredSelectorFurniAltitudeView />);
        const checks = screen.getAllByRole('checkbox');
        expect((checks[0] as HTMLInputElement).checked).toBe(true);
        fireEvent.click(checks[1]);
        expect(state.setInverse).toHaveBeenCalledWith(true);
        save();
        expect(state.setIntParams).toHaveBeenCalledWith([125, 2]);
    });

    it('keeps team/comparison fields and rejects scores outside the AIR range', () => {
        state.trigger.intData = [4, 123, 2];
        render(<WiredConditionTeamHasScoreView />);
        const input = headerInput();
        expect(input.value).toBe('123');
        fireEvent.change(input, { target: { value: '1000' } });
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([4, 1000, 2]);
        fireEvent.change(input, { target: { value: '1001' } });
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([4, 1000, 2]);
        expect(state.setUserSources).toHaveBeenCalledWith([201]);
        expect(state.setQuantifier).toHaveBeenCalledWith(1);
    });

    it('does not apply the team score limit or native layout to the shared currency dialog', () => {
        state.trigger.intData = [1, 250000, 5];
        render(<WiredConditionTeamHasScoreView scoped={false} />);
        expect(screen.getByTestId('editor').getAttribute('data-native-layout')).toBe('false');
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 250000, 5]);
    });

    it('preserves the quantity source group, comparison and source fields when typing a count', () => {
        state.trigger.intData = [1, 12, 0];
        render(<WiredConditionSelectionQuantityView />);
        const input = headerInput();
        expect(input.value).toBe('12');
        fireEvent.change(input, { target: { value: '100' } });
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 100, 0]);
        expect(state.setUserSources).toHaveBeenLastCalledWith([201]);
        fireEvent.change(input, { target: { value: '101' } });
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 100, 0]);
    });

    it('leaves the shared radius variant on its existing layout and hundredths contract', () => {
        state.trigger.intData = [345, 1];
        render(<WiredConditionHasAltitudeView variant="userRange" />);
        expect(screen.getByTestId('editor').getAttribute('data-native-layout')).toBe('false');
        expect(document.querySelector('.volt-wired__native-section-header')).toBeNull();
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([345, 1]);
    });
});
