import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
    trigger: null as any, setIntParams: vi.fn(), setFurniSources: vi.fn(), setUserSources: vi.fn(),
    furniIds: [11, 12], secondaryFurniIds: [21], activePickSlot: 0, setActivePickSlot: vi.fn(), showConfirm: vi.fn(),
    base: null as any
}));
vi.mock('../../../../hooks', () => ({ useWired: () => state, useNotificationActions: () => ({ showConfirm: state.showConfirm }) }));
vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE: 1, STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT: 2 }
}));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredSourcesSelector', () => ({
    nativeSourceOptions: (values: number[], kind: string) => values.map(value => ({ value, label: `${kind}.${value}` })),
    useAvailableUserSources: (_trigger: unknown, values: unknown) => values,
    WiredSourcesSelector: () => null
}));
vi.mock('../WiredFurniSelectionSourceRow', () => ({
    WiredFurniSelectionSourceRow: (p: any) => <section aria-label={p.title}>{p.headerContent}<span>{p.value}</span><button onClick={p.onSelectionActivate}>{p.title}: picks</button></section>
}));
vi.mock('../WiredSourceTypeSelector', () => ({
    WiredSourceTypeSelector: (p: any) => <>{p.types.map((type: string) => <button key={type} aria-pressed={type === p.value} onClick={() => p.onChange(type)}>{type}</button>)}</>
}));
vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: any) => { state.base = props; return <div>{props.children}{props.footer}</div>; }
}));
import { WiredActionSendSignalView } from './WiredActionSendSignalView';
import { WiredActionTeleportView } from './WiredActionTeleportView';
import { WiredActionMoveFurniAsGroupView } from './WiredActionMoveFurniAsGroupView';

beforeEach(() => {
    vi.clearAllMocks();
    state.trigger = { id: 1, code: 30, intData: [0, 0], furniSources: [100, 101], userSources: [201], maximumItemSelectionCount: 20,
        inputSources: { furniAllowed: [[100, 200], [101, 201]], usersAllowed: [[0, 200, 201]] } };
});
afterEach(cleanup);

describe('Send Signal native split confirmation', () => {
    it.each([30, 37])('loads code %i flags without prompting and preserves both sources on cancel', code => {
        state.trigger = { ...state.trigger, code, intData: [1, 0] };
        render(<WiredActionSendSignalView />);
        expect(state.showConfirm).not.toHaveBeenCalled();
        const splitUsers = screen.getByRole('checkbox', { name: 'wiredfurni.params.signal.split_users' }) as HTMLInputElement;
        fireEvent.click(splitUsers);
        expect(splitUsers.checked).toBe(true);
        expect(state.showConfirm.mock.lastCall?.[0]).toBe('wiredfurni.params.signal_warning.desc');
        act(() => state.showConfirm.mock.lastCall![2]());
        expect(splitUsers.checked).toBe(false);
        state.base.save();
        expect(state.setIntParams).toHaveBeenCalledWith([1, 0]);
        expect(state.setFurniSources).toHaveBeenCalledWith([100, 101]);
        expect(state.setUserSources).toHaveBeenCalledWith([201]);
    });
    it('keeps an accepted split, toggles off without warning, and routes secondary picks', () => {
        render(<WiredActionSendSignalView />);
        const split = screen.getByRole('checkbox', { name: 'wiredfurni.params.signal.split_furni' });
        fireEvent.click(split);
        act(() => state.showConfirm.mock.lastCall![1]());
        state.base.save(); expect(state.setIntParams).toHaveBeenLastCalledWith([1, 0]);
        fireEvent.click(split); expect(state.showConfirm).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.sources.furni.title.signal_forward: picks' }));
        expect(state.setActivePickSlot).toHaveBeenCalledWith(1);
    });
    it('ignores a stale cancellation after opening another Wired', () => {
        const { rerender } = render(<WiredActionSendSignalView />);
        fireEvent.click(screen.getByRole('checkbox', { name: 'wiredfurni.params.signal.split_furni' }));
        const cancel = state.showConfirm.mock.lastCall![2];
        state.trigger = { ...state.trigger, id: 2, intData: [1, 1] };
        rerender(<WiredActionSendSignalView />);
        act(cancel);
        state.base.save(); expect(state.setIntParams).toHaveBeenCalledWith([1, 1]);
    });
});

describe('Teleport / User to Furni shared editor', () => {
    it('keeps teleport fast mode and native source slots', () => {
        state.trigger = { ...state.trigger, code: 8, intData: [1] };
        render(<WiredActionTeleportView />);
        expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
        fireEvent.click(screen.getByRole('checkbox'));
        state.base.save();
        expect(state.setIntParams).toHaveBeenCalledWith([0]);
        expect(state.setFurniSources).toHaveBeenCalledWith([100]);
        expect(state.setUserSources).toHaveBeenCalledWith([201]);
    });
    it.each([0, 1, 2])('round-trips user-to-furni walk mode %i with sources always visible', mode => {
        state.trigger = { ...state.trigger, code: 43, intData: [mode] };
        render(<WiredActionTeleportView />);
        expect((screen.getByRole('radio', { name: `wiredfurni.params.user_move.walkmode.${mode}` }) as HTMLInputElement).checked).toBe(true);
        expect(state.base.footerCollapsible).toBe(false);
        state.base.save(); expect(state.setIntParams).toHaveBeenCalledWith([mode]);
    });
    it('keeps furniture-to-user code35 free of unrelated teleport/walk flags', () => {
        state.trigger = { ...state.trigger, code: 35, intData: [] };
        render(<WiredActionTeleportView />);
        expect(screen.queryAllByRole('radio')).toHaveLength(0);
        expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
        state.base.save(); expect(state.setIntParams).toHaveBeenCalledWith([]);
    });
});

describe('Move as Group native offsets and merged source', () => {
    it('retains inactive target sources while changing target kind and offset limits', () => {
        state.trigger = { ...state.trigger, code: 57, intData: [0, -64, 64] };
        render(<WiredActionMoveFurniAsGroupView />);
        expect(state.base.footerCollapsible).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: 'user' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'wiredfurni.params.place_furni.offsets.x' }), { target: { value: '64' } });
        state.base.save();
        expect(state.setIntParams).toHaveBeenCalledWith([1, 64, 64]);
        expect(state.setFurniSources).toHaveBeenCalledWith([100, 101]);
        expect(state.setUserSources).toHaveBeenCalledWith([201]);
        fireEvent.click(screen.getByRole('button', { name: 'furni' }));
        fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.sources.merged.title.target_location: picks' }));
        expect(state.setActivePickSlot).toHaveBeenCalledWith(1);
        state.base.save(); expect(state.setIntParams).toHaveBeenLastCalledWith([0, 64, 64]);
    });
    it('keeps invalid offset drafts visibly invalid rather than coercing to zero or accepting fractions', () => {
        state.trigger = { ...state.trigger, code: 57, intData: [1, 3, 4] };
        render(<WiredActionMoveFurniAsGroupView />);
        const input = screen.getByRole('textbox', { name: 'wiredfurni.params.place_furni.offsets.x' });
        for (const value of ['', '65', '-65', '1.5']) {
            fireEvent.change(input, { target: { value } });
            expect(input.parentElement?.classList.contains('is-invalid')).toBe(true);
            expect(state.base.validate()).toBe(false);
            // The editor rejects save while the draft is invalid; owned state retains its last valid value.
            state.base.save(); expect(state.setIntParams).toHaveBeenLastCalledWith([1, 3, 4]);
        }
        fireEvent.change(input, { target: { value: '-64' } });
        expect(input.parentElement?.classList.contains('is-invalid')).toBe(false);
        expect(state.base.validate()).toBe(true);
        state.base.save(); expect(state.setIntParams).toHaveBeenLastCalledWith([1, -64, 4]);
    });
});
