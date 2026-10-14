import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WIRED_FX_CATEGORY, defaultWiredVariableFxParams, writeWiredVariableFxParams } from '../../../../api/wired/WiredVariableFx';

const setIntParams = vi.fn(), setStringParam = vi.fn(), setVariableIds = vi.fn();
let trigger: { id: number; stringData: string; intData: number[]; variableIds: string[] };
let baseProps: { save: () => void; validate?: () => boolean };
vi.mock('../../../../hooks', () => ({
    useWiredTools: () => ({ activeWiredStyle: 'illumina' }),
    useWired: () => ({ trigger, setIntParams, setStringParam, setVariableIds }),
    useWiredNativeVariables: () => ({ userVariableDefinitions: [{ itemId: 300, name: 'max_hp', availability: 0, hasValue: true }, { itemId: 301, name: 'visitor_tag', availability: 0, hasValue: false }], furniVariableDefinitions: [], roomVariableDefinitions: [{ itemId: 500, name: 'boss_max', availability: 0, hasValue: true }] })
}));
vi.mock('../../../../api', async importOriginal => ({ ...await importOriginal<object>(), localizeWithFallback: (_key: string, fallback: string) => fallback }));
vi.mock('../../../../common', () => ({ VoltCardView: ({ children }: PropsWithChildren) => <div>{children}</div>, Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredDropdown', () => ({ WiredDropdown: (props: { caption: string; value: number; disabled?: boolean; options: {id: number;label: string}[]; onChange: (value: number) => void }) => (
    <select aria-label={props.caption} value={props.value} disabled={props.disabled} onChange={event => props.onChange(Number(event.target.value))}>
        {props.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
) }));
vi.mock('./WiredExtraBaseView', () => ({ WiredExtraBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean; headerControls?: ReactNode }>) => {
    baseProps = props; return <div>{props.headerControls}{props.children}</div>;
} }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: (props: { entries: { token: string; children?: { token: string }[] }[]; selectedToken: string; onSelect: (entry: {token: string}) => void; recentScope: string }) => (
    <div data-testid={`picker-${props.recentScope}`} data-selected={props.selectedToken}>
        {props.entries.flatMap(entry => entry.children?.length ? entry.children : [entry]).map(entry => <button key={entry.token} onClick={() => props.onSelect(entry)}>{entry.token}</button>)}
    </div>
) }));
vi.mock('./WiredVariableFxPreviewView', () => ({ WiredVariableFxPreviewView: () => <div>Preview</div> }));
import { WiredExtraVariableFxView } from './WiredExtraVariableFxView';

afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); trigger = { id: 731, stringData: '', intData: [], variableIds: [] }; });

describe('AIR Variable FX sections', () => {
    it('keeps advanced sections folded on opening and preserves the 23-int save shape', () => {
        render(<WiredExtraVariableFxView category={WIRED_FX_CATEGORY.PROGRESS_BAR} />);
        for (const name of ['Visibility', 'Advanced range', 'Order in FX stack']) expect(screen.getByRole('button', { name })).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('radio')).toBeNull();
        act(() => baseProps.save());
        expect(setIntParams.mock.calls[0][0]).toHaveLength(23);
        expect(setIntParams.mock.calls[0][0].slice(0, 6)).toEqual([1, 2, 0, 7, 0, 3000]);
        expect(setStringParam).toHaveBeenCalledWith('');
        expect(setVariableIds).toHaveBeenCalledWith(['n', 'n', 'n']);
    });
    it('enables the attached mask, duration and hover controls only for changes and saves their fields', () => {
        render(<WiredExtraVariableFxView category={WIRED_FX_CATEGORY.PROGRESS_BAR} />);
        fireEvent.click(screen.getByRole('button', { name: 'Visibility' }));
        expect(screen.getByLabelText('Duration (milliseconds)')).toBeDisabled();
        expect(screen.getByRole('checkbox', { name: 'Show on mouse hover' })).toBeDisabled();
        fireEvent.click(screen.getByRole('radio', { name: 'Visible when the variable updates' }));
        fireEvent.change(screen.getByLabelText('Duration (milliseconds)'), { target: { value: '1750' } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'Increased variable' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Show on mouse hover' }));
        act(() => baseProps.save());
        expect(setIntParams.mock.calls[0][0].slice(0, 6)).toEqual([1, 2, 1, 5, 1, 1750]);
        fireEvent.click(screen.getByRole('radio', { name: 'Never visible' }));
        expect(screen.getByLabelText('Duration (milliseconds)')).toBeDisabled();
        expect(screen.getByLabelText('Duration (milliseconds)')).toHaveValue('1750');
    });
    it('keeps range values intact while folded overrides are expanded and disabled', () => {
        const params = defaultWiredVariableFxParams(WIRED_FX_CATEGORY.HEALTH_POINTS);
        trigger.intData = writeWiredVariableFxParams({ ...params, minValue: 10, maxValue: 250 }, WIRED_FX_CATEGORY.HEALTH_POINTS);
        render(<WiredExtraVariableFxView category={WIRED_FX_CATEGORY.HEALTH_POINTS} />);
        fireEvent.click(screen.getByRole('button', { name: 'Advanced range' }));
        expect(screen.getByTestId('picker-variable-fx-override-min').closest('fieldset')).toBeDisabled();
        fireEvent.change(screen.getByRole('textbox', { name: 'Maximum' }), { target: { value: '300' } });
        act(() => baseProps.save());
        expect(setIntParams.mock.calls[0][0].slice(10, 16)).toEqual([0, 10, 0, 300, 0, 0]);
    });
    it('keeps number display icon alignment visible without an icon and hides range-only sections', () => {
        render(<WiredExtraVariableFxView category={WIRED_FX_CATEGORY.NUMBER_DISPLAY} />);
        expect(screen.getByRole('combobox', { name: 'Icon alignment' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Advanced range' })).toBeNull();
        expect(screen.queryByLabelText('Minimum')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Order in FX stack' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Order in FX stack' }), { target: { value: '-25' } });
        act(() => baseProps.save());
        expect(setIntParams.mock.calls[0][0][22]).toBe(-25);
    });
    it('rejects an invalid range without changing the stored settings', () => {
        render(<WiredExtraVariableFxView category={WIRED_FX_CATEGORY.HEALTH_POINTS} />);
        fireEvent.change(screen.getByRole('textbox', { name: 'Maximum' }), { target: { value: '0' } });
        let valid = true;
        act(() => { valid = baseProps.validate(); });
        expect(valid).toBe(false);
        expect(screen.getByText('The maximum has to be above the minimum.')).toBeInTheDocument();
        expect(setIntParams).not.toHaveBeenCalled();
    });
});


describe('AIR audience popup', () => {
    it('keeps edits local until Save and cancels without changing the audience', () => {
        render(<WiredExtraVariableFxView category={WIRED_FX_CATEGORY.PROGRESS_BAR} />);
        fireEvent.click(screen.getByRole('button', { name: 'Visibility' }));
        fireEvent.change(screen.getByRole('combobox', { name: 'Audience' }), { target: { value: '3' } });
        expect(screen.getByRole('dialog', { name: 'Variable audience' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'custom:300' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Select a value' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Audience value' }), { target: { value: '42' } });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        act(() => baseProps.save());
        expect(setIntParams.mock.calls.at(-1)[0][1]).toBe(2);
        fireEvent.change(screen.getByRole('combobox', { name: 'Audience' }), { target: { value: '3' } });
        fireEvent.click(screen.getByRole('button', { name: 'custom:300' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Select a value' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Audience value' }), { target: { value: '42' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(screen.queryByRole('dialog')).toBeNull();
        act(() => baseProps.save());
        expect(setIntParams.mock.calls.at(-1)[0][1]).toBe(4);
        expect(setIntParams.mock.calls.at(-1)[0].slice(18, 20)).toEqual([0, 42]);
        expect(setVariableIds.mock.calls.at(-1)[0]).toEqual(['n', 'n', '300']);
    });
    it('allows tags but disables value matching for variables without a value', () => {
        render(<WiredExtraVariableFxView category={WIRED_FX_CATEGORY.PROGRESS_BAR} />);
        fireEvent.click(screen.getByRole('button', { name: 'Visibility' }));
        fireEvent.change(screen.getByRole('combobox', { name: 'Audience' }), { target: { value: '3' } });
        fireEvent.click(screen.getByRole('button', { name: 'custom:301' }));
        expect(screen.getByRole('checkbox', { name: 'Select a value' })).toBeDisabled();
        expect(screen.getByRole('textbox', { name: 'Audience value' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        act(() => baseProps.save());
        expect(setIntParams.mock.calls.at(-1)[0][1]).toBe(3);
        expect(setVariableIds.mock.calls.at(-1)[0][2]).toBe('301');
    });
});
