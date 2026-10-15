import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const setIntParams = vi.fn(), setFurniSources = vi.fn(), setUserSources = vi.fn(), setVariableIds = vi.fn();
let trigger: { intData: number[]; variableIds: string[]; furniSources: number[]; userSources: number[] };
let base: { save: () => void; validate: () => boolean; nativeLayout: boolean; footerCollapsible: boolean };
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setFurniSources, setUserSources, setVariableIds }),
    useWiredNativeVariables: () => ({ userVariableDefinitions: [{ variableId: 'custom:123', name: 'Quantity', availability: 0, hasValue: true }], furniVariableDefinitions: [], roomVariableDefinitions: [], contextVariableDefinitions: [] })
}));
vi.mock('../../../../api', async original => ({ ...await original<object>(), localizeWithFallback: (_key: string, fallback: string) => fallback }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: ({ furniSlot, userSlot }: { furniSlot?: number; userSlot?: number }) => <button>{`source-${furniSlot ?? userSlot}`}</button>, WiredHolderSourceSection: ({ scope }: any) => <span>{`holder ${scope}`}</span>, WiredMergedSourceSection: ({ scope, bare, disabled, furniSlot = 0, userSlot = 0, furniSource, userSource, onChangeFurni, onChangeUsers }: any) => { const content = scope === 'global' || scope === 'context' ? <span>{`holder ${scope}`}</span> : <input aria-label={`Merged ${scope === 'furni' ? 'furni' : 'user'} ${scope === 'furni' ? furniSlot : userSlot}${bare ? ' bare' : ''}`} value={scope === 'furni' ? furniSource : userSource} onChange={event => (scope === 'furni' ? onChangeFurni : onChangeUsers)(Number(event.target.value))} />; return disabled ? <fieldset disabled>{content}</fieldset> : content; } }));
vi.mock('../conditions/WiredVariableConditionParts', () => ({ FurniPickSlotButtons: () => null }));
vi.mock('./WiredActionBaseView', () => ({ WiredActionBaseView: (props: PropsWithChildren<typeof base & { footer?: ReactNode }>) => {
    base = props; return <WiredNativeContext.Provider value={true}>{props.children}{props.footer}</WiredNativeContext.Provider>;
} }));
import { WiredActionInitTransactionView } from './WiredActionInitTransactionView';
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); trigger = { intData: [1, 8, 0, 1, 0, 300], variableIds: ['n'], furniSources: [100, 101, 200], userSources: [201, 200] }; });

describe('AIR transaction editor', () => {
    it('shows the disabled timeout attachment and saves an edited literal without shifting source slots', () => {
        render(<WiredActionInitTransactionView />);
        expect(screen.getByRole('textbox', { name: 'Seconds:' })).toBeDisabled();
        fireEvent.change(screen.getByRole('textbox', { name: 'Multiplier selection:' }), { target: { value: '12' } });
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.change(screen.getByRole('textbox', { name: 'Seconds:' }), { target: { value: '450' } });
        act(() => base.save());
        expect(base.nativeLayout).toBe(true); expect(base.footerCollapsible).toBe(false);
        expect(setIntParams).toHaveBeenCalledWith([1, 12, 0, 1, 1, 450]);
        expect(setFurniSources).toHaveBeenCalledWith([100, 101, 0]);
        expect(setUserSources).toHaveBeenCalledWith([201, 0]);
        expect(setVariableIds).toHaveBeenCalledWith(['n']);
    });
    it('preserves a selected variable and merged source while mode zero disables both controls', () => {
        trigger.intData = [0, 1, 1, 1, 1, 600]; trigger.variableIds = ['custom:123'];
        render(<WiredActionInitTransactionView />);
        expect(screen.getByRole('textbox', { name: 'Multiplier selection:' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Choose variable' })).toBeDisabled();
        // The merged reference holder lives in the (closed, disabled) multiplier popup, not in the footer (class_4180 claim).
        expect(screen.queryByRole('textbox', { name: 'Merged user 1 bare' })).toBeNull();
        fireEvent.click(screen.getByRole('radio', { name: 'Mode 2' }));
        expect(screen.getByRole('textbox', { name: 'Auto-multiplier limit:' })).not.toBeDisabled();
        act(() => base.save());
        expect(setIntParams).toHaveBeenCalledWith([2, 1, 1, 1, 1, 600]);
        expect(setUserSources).toHaveBeenCalledWith([201, 200]);
        expect(setVariableIds).toHaveBeenCalledWith(['custom:123']);
    });
    it('rejects an invalid typed multiplier and keeps the disabled timeout value when unchecked', () => {
        render(<WiredActionInitTransactionView />);
        fireEvent.change(screen.getByRole('textbox', { name: 'Multiplier selection:' }), { target: { value: '501' } });
        expect(base.validate()).toBe(false);
        fireEvent.change(screen.getByRole('textbox', { name: 'Multiplier selection:' }), { target: { value: '2' } });
        expect(base.validate()).toBe(true);
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.change(screen.getByRole('textbox', { name: 'Seconds:' }), { target: { value: '1000' } });
        fireEvent.click(screen.getByRole('checkbox')); act(() => base.save());
        expect(setIntParams).toHaveBeenCalledWith([1, 2, 0, 1, 0, 1000]);
    });
    it('draws the claimed merged holder [[2,1]] in the multiplier popup for every holder type (AIR class_4180.as:130-153)', () => {
        trigger.intData = [1, 1, 1, 1, 0, 300]; trigger.variableIds = ['custom:123'];
        render(<WiredActionInitTransactionView />);
        fireEvent.click(screen.getByRole('button', { name: 'Choose variable' }));
        expect(screen.getByRole('textbox', { name: 'Merged user 1 bare' })).toHaveProperty('value', '200');
        fireEvent.click(screen.getByRole('button', { name: 'Furniture' }));
        expect(screen.getByRole('textbox', { name: 'Merged furni 2 bare' })).toHaveProperty('value', '200');
        fireEvent.click(screen.getByRole('button', { name: 'Room' }));
        expect(screen.getByText('holder global')).toBeTruthy();
    });
});
