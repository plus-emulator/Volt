import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';

const state = vi.hoisted(() => ({
    trigger: { intData: [1, 1, 1, 7, 0, 1, 1, 1, 9, 1], furniSources: [100, 101, 301, 0], userSources: [0, 202], variableIds: ['pay', 'reward'] },
    setIntParams: vi.fn(), setFurniSources: vi.fn(), setUserSources: vi.fn(), setVariableIds: vi.fn()
}));
vi.mock('../../../../api', async () => ({
    ...(await vi.importActual('../../../../api/wired/WiredNativeVariables')),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_BY_ID: 1 }
}));
vi.mock('../../../../hooks', () => ({ useWired: () => state, useWiredNativeVariables: () => ({}) }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../conditions/WiredVariableConditionParts', () => ({ FurniPickSlotButtons: () => null }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: () => null }));
vi.mock('../WiredSourceTypeSelector', () => ({ WiredSourceTypeSelector: ({ types, onChange }: { types: string[]; onChange: (value: string) => void }) => <div>{types.map(type => <button key={type} onClick={() => onChange(type)}>{type}</button>)}</div> }));
vi.mock('../WiredVariablePickerData', () => ({
    buildWiredVariablePickerEntries: () => [
        { token: 'custom:pay', displayLabel: 'payment_amount', selectable: true },
        { token: 'custom:reward', displayLabel: 'reward_amount', selectable: true }
    ],
    flattenWiredVariablePickerEntries: (entries: unknown[]) => entries,
    createFallbackVariableEntry: () => null
}));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: ({ entries, onSelect }: { entries: { token: string; displayLabel: string }[]; onSelect: (entry: unknown) => void }) => <div>{entries.map(entry => <button key={entry.token} onClick={() => onSelect(entry)}>{entry.displayLabel}</button>)}</div> }));
vi.mock('./WiredExtraBaseView', () => ({ WiredExtraBaseView: ({ children, save, validate, nativeLayout, cardStyle }: PropsWithChildren<{ save: () => void; validate: () => boolean; nativeLayout: boolean; cardStyle: unknown }>) => <WiredNativeContext.Provider value={true}><div data-testid="editor" data-native={String(nativeLayout)} data-width={String(cardStyle)}>{children}<button disabled={!validate()} onClick={save}>Save</button></div></WiredNativeContext.Provider> }));

import { WiredCustomContractView } from './WiredCustomContractView';
import { WiredActionValueOrVariableSection } from '../actions/WiredActionValueOrVariableSection';

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
const open = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const amount = () => screen.getByRole('textbox', { name: 'Amount selection:' }) as HTMLInputElement;

describe('AIR Custom Contract native sections and packets', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.trigger = { intData: [1, 1, 1, 7, 0, 1, 1, 1, 9, 1], furniSources: [100, 101, 301, 0], userSources: [0, 202], variableIds: ['pay', 'reward'] };
    });
    afterEach(cleanup);

    it('retains the existing nonnative value/radio callback contract', () => {
        const onLiteralChange = vi.fn();
        const onOptionChange = vi.fn();
        render(<WiredNativeContext.Provider value={false}><WiredActionValueOrVariableSection title="Amount" targetTitle="Target" recentScope="fallback" min={1} max={100000} option={0} literal={23} target="user" variableToken="" onLiteralChange={onLiteralChange} onOptionChange={onOptionChange} onTargetChange={vi.fn()} onVariableTokenChange={vi.fn()} /></WiredNativeContext.Provider>);
        expect(screen.getAllByRole('radio')).toHaveLength(2);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '99' } });
        expect(onLiteralChange).toHaveBeenCalledWith(99);
        fireEvent.click(screen.getByRole('radio', { name: 'From Variable:' }));
        expect(onOptionChange).toHaveBeenCalledWith(1);
        expect(screen.queryByRole('button', { name: 'Choose variable' })).toBeNull();
    });

    it('starts with payment/reward collapsed and saves all 10 ints, 4 furniture sources, 2 user sources and 2 variable ids unchanged', () => {
        render(<WiredCustomContractView />);
        expect(screen.getByRole('button', { name: 'Payment' }).getAttribute('aria-expanded')).toBe('false');
        expect(screen.getByRole('button', { name: 'Reward' }).getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(screen.getByTestId('editor').getAttribute('data-native')).toBe('true');
        expect(screen.getByTestId('editor').getAttribute('data-width')).toBe('undefined');
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith(state.trigger.intData);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100, 101, 301, 0]);
        expect(state.setUserSources).toHaveBeenLastCalledWith([0, 202]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['pay', 'reward']);
    });

    it('shows disabled nested element and amount controls instead of hiding them', () => {
        state.trigger.intData[0] = 0;
        render(<WiredCustomContractView />);
        open('Payment');
        expect(amount()).toHaveProperty('disabled', true);
        expect(screen.getByRole('radio', { name: 'Credits' }).matches(':disabled')).toBe(true);
        expect(screen.getByRole('radio', { name: 'Furni' }).matches(':disabled')).toBe(true);
        expect(screen.getByRole('button', { name: 'Choose variable' })).toHaveProperty('disabled', true);
        fireEvent.click(screen.getByRole('checkbox', { name: 'Enable payment' }));
        expect(amount()).toHaveProperty('disabled', false);
        expect(screen.getByRole('radio', { name: 'Furni' }).matches(':disabled')).toBe(false);
    });

    it('accepts AIR literal formats, rejects out-of-range values and clears only the inactive variable source on save', () => {
        render(<WiredCustomContractView />);
        open('Payment');
        fireEvent.change(amount(), { target: { value: '0x20' } });
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1, 1, 0, 32, 0, 1, 1, 1, 9, 1]);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100, 101, 0, 0]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['n', 'reward']);
        fireEvent.change(amount(), { target: { value: '100001' } });
        expect(amount().value).toBe('100001');
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        fireEvent.change(amount(), { target: { value: '0b11' } });
        save();
        expect(state.setIntParams.mock.lastCall![0][3]).toBe(3);
    });

    it('switches back to a named variable and the chooser changes target without mixing side fields', () => {
        render(<WiredCustomContractView />);
        open('Payment');
        fireEvent.change(amount(), { target: { value: '42' } });
        fireEvent.change(amount(), { target: { value: 'payment_amount' } });
        save();
        expect(state.setIntParams.mock.lastCall![0]).toEqual([1, 1, 1, 42, 0, 1, 1, 1, 9, 1]);
        open('Choose variable');
        const dialog = screen.getByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'global' }));
        fireEvent.click(within(dialog).getByRole('button', { name: 'reward_amount' }));
        expect(screen.queryByRole('dialog')).toBeNull();
        save();
        expect(state.setIntParams.mock.lastCall![0]).toEqual([1, 1, 1, 42, -10, 1, 1, 1, 9, 1]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['reward', 'reward']);
        expect(state.setUserSources).toHaveBeenLastCalledWith([0, 202]);
        open('Choose variable');
        fireEvent.click(screen.getByRole('checkbox', { name: 'Enable payment' }));
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
