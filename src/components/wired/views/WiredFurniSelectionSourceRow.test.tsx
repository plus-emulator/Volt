import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren, useCallback, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from './WiredNativeContext';
const state = vi.hoisted(() => ({
    trigger: { intData: [], stringData: '', furniSources: [100, 101], selectedItems: [11], secondarySelectedItems: [22], maximumItemSelectionCount: 20 },
    setFurniIds: vi.fn(), setSecondaryFurniIds: vi.fn(), setFurniSources: vi.fn(), setQuantifier: vi.fn(), setIntParams: vi.fn(), setStringParam: vi.fn(), setAllowsFurni: vi.fn()
}));
vi.mock('../../../api', () => ({ LocalizeText: (key: string) => key, WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE: 2 }, WiredSelectionVisualizer: { clearSelectionShaderFromFurni: vi.fn(), clearSecondarySelectionShaderFromFurni: vi.fn(), applySelectionShaderToFurni: vi.fn(), applySecondarySelectionShaderToFurni: vi.fn() } }));
vi.mock('../../../hooks', () => ({ useWired: () => {
    const [furniIds, update] = useState([11]);
    const setFurniIds = useCallback((ids: number[]) => { state.setFurniIds(ids); update(ids); }, []);
    return { ...state, furniIds, setFurniIds, quantifier: 1 };
} }));
vi.mock('../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span>, Button: ({ children, onClick }: PropsWithChildren<{ onClick: () => void }>) => <button onClick={onClick}>{children}</button> }));
vi.mock('./WiredText', async () => ({ ...(await vi.importActual('./WiredText')), WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('./WiredShellHeaderView', () => ({ WiredShellButton: ({ children, onClick, disabled, style }: ButtonHTMLAttributes<HTMLButtonElement>) => <button style={style} disabled={disabled} onClick={onClick}>{children}</button> }));
vi.mock('../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: ({ width, height, state, color }: any) => <canvas data-state={state} data-color={color} width={width} height={height} /> }));
vi.mock('./conditions/WiredConditionBaseView', () => ({ WiredConditionBaseView: ({ selectionPreview, nativeLayout, save }: { selectionPreview: React.ReactNode; nativeLayout: boolean; save: () => void }) => <WiredNativeContext.Provider value={nativeLayout}>{selectionPreview}<button onClick={save}>Save</button></WiredNativeContext.Provider> }));
import { WiredMergedSourceSection, WiredSourceRow } from './WiredSourcesSelector';
import { WiredFurniSelectionSourceRow } from './WiredFurniSelectionSourceRow';
import { WiredConditionFurniIsOfTypeView } from './conditions/WiredConditionFurniIsOfTypeView';
const options = [{ value: 100, label: 'selected' }, { value: 0, label: 'trigger' }];
const props = { title: 'Title', options, value: 100, selectionKind: 'primary' as const, selectionActive: false, selectionCount: 2, selectionLimit: 20, selectionEnabledValues: [100], onChange: vi.fn(), onSelectionActivate: vi.fn() };

describe('AIR native furniture source controls', () => {
    beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} }); });
    afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
    it('reuses native LR arrows, count and 19px native pick button without vector icons', () => {
        const { container } = render(<WiredNativeContext.Provider value={true}><WiredFurniSelectionSourceRow {...props} /></WiredNativeContext.Provider>);
        expect(screen.getByText('selected [2/20]')).toBeVisible(); expect(container.querySelectorAll('svg')).toHaveLength(0);
        const pick = screen.getByRole('button', { name: 'wiredfurni.params.furni_picking.tooltip 1' }); expect(pick).toHaveStyle({ width: '19px', height: '19px' });
        expect(pick.querySelector('img')).toHaveStyle({ left: '3px', top: '2px', width: '13px', height: '15px' });
        fireEvent.mouseEnter(pick); expect(pick.querySelector('canvas')).toHaveAttribute('data-color', String(0xabb14f)); fireEvent.click(pick); expect(props.onSelectionActivate).toHaveBeenCalledOnce();
        const buttons = container.querySelectorAll('.volt-wired__slider-row button'); fireEvent.click(buttons[1]); expect(props.onChange).toHaveBeenCalledWith(0);
    });
    it('hides pick button for non-picked sources and keeps selected blue button pressed', () => {
        const view = render(<WiredNativeContext.Provider value={true}><WiredFurniSelectionSourceRow {...props} value={0} /></WiredNativeContext.Provider>);
        expect(screen.queryByRole('button', { name: /furni_picking/ })).toBeNull();
        view.rerender(<WiredNativeContext.Provider value={true}><WiredFurniSelectionSourceRow {...props} selectionKind="secondary" selectionActive /></WiredNativeContext.Provider>);
        const pick = screen.getByRole('button', { name: 'wiredfurni.params.furni_picking.tooltip 2' }); expect(pick).toHaveAttribute('aria-pressed', 'true'); expect(pick.querySelector('canvas')).toHaveAttribute('data-state', 'pressed'); expect(pick.querySelector('canvas')).toHaveAttribute('data-color', String(0x6168ad));
        fireEvent.click(pick); expect(props.onSelectionActivate).not.toHaveBeenCalled();
    });
    it('disables both native source arrows when a mode locks the selection', () => {
        const change = vi.fn();
        render(<WiredNativeContext.Provider value={true}><WiredSourceRow label="Fixed" disabled onPrevious={change} onNext={change} /></WiredNativeContext.Provider>);
        for (const button of screen.getAllByRole('button')) { expect(button).toBeDisabled(); fireEvent.click(button); }
        expect(change).not.toHaveBeenCalled();
    });
    it('renders quantifier then two source sections and saves both selected lists', () => {
        const { container } = render(<WiredConditionFurniIsOfTypeView negative />);
        const titles = [...container.querySelectorAll('.volt-wired__native-section-header')].map(element => element.textContent);
        expect(titles).toEqual(['wiredfurni.params.quantifier_selection', 'wiredfurni.params.sources.furni.title.match.0', 'wiredfurni.params.sources.furni.title.match.1']);
        expect(container.querySelector('.volt-wired__native-advanced-body')).not.toBeNull(); expect(screen.getByRole('radio', { name: 'wiredfurni.params.quantifier.furni.neg.1' })).toBeChecked();
        fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.furni_picking.tooltip 2' })); fireEvent.click(screen.getByText('Save'));
        expect(state.setFurniIds).toHaveBeenLastCalledWith([11]); expect(state.setSecondaryFurniIds).toHaveBeenLastCalledWith([22]); expect(state.setFurniSources).toHaveBeenLastCalledWith([100, 101]); expect(state.setIntParams).toHaveBeenLastCalledWith([]); expect(state.setQuantifier).toHaveBeenLastCalledWith(1);
    });
    it('draws only the source row in bare mode (popup-claimed slot) and fixes the arrows for a room holder', () => {
        render(<WiredNativeContext.Provider value={true}><WiredFurniSelectionSourceRow {...props} bare options={[{ value: 0, label: 'wiredfurni.params.sources.global' }]} value={0} /></WiredNativeContext.Provider>);
        expect(screen.queryByText('Title')).toBeNull();
        expect(screen.getByText('wiredfurni.params.sources.global')).toBeTruthy();
        expect(screen.getAllByRole('button').every(button => (button as HTMLButtonElement).disabled)).toBe(true);
    });
    it('greys only the merged row, keeping the title and header type selector live (InputSourceControlPreset.updateUI L89-94)', () => {
        render(<WiredNativeContext.Provider value={true}><WiredMergedSourceSection scope="context" title="Merged" disabled headerOption={<button>type</button>} /></WiredNativeContext.Provider>);
        expect(screen.getByText('Merged').closest('fieldset')).toBeNull();
        expect(screen.getByRole('button', { name: 'type' }).closest('fieldset')).toBeNull();
        expect(screen.getByText('wiredfurni.params.sources.context').closest('fieldset')).toHaveProperty('disabled', true);
    });
});
