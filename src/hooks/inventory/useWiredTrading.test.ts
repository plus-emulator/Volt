import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ handlers: new Map<unknown, (event: unknown) => void>(), send: vi.fn(), alert: vi.fn() }));

vi.mock('@volt/renderer', () => ({
    WIRED_TRADE_FAILURE_SILENT: 0,
    WIRED_TRADE_REQUIREMENT_ANY: 2,
    WIRED_TRADE_REQUIREMENT_RULES: 4,
    WIRED_TRADE_RULES_NORMAL: 0,
    WiredTradeOpenEvent: class Open {},
    WiredTradeItemsEvent: class Items {},
    WiredTradeCancelledEvent: class Cancelled {},
    WiredTradeCompletedEvent: class Completed {},
    WiredTradeAcceptComposer: class Accept { constructor(public confirm: boolean) {} },
    WiredTradeCancelComposer: class Cancel {},
    WiredTradeOfferItemsComposer: class Offer { public ids: number[]; constructor(public remove: boolean, ...ids: number[]) { this.ids = ids; } },
}));
vi.mock('../../api', () => ({ localizeWithFallback: (key: string) => key, SendMessageComposer: state.send }));
vi.mock('@/state/useSharedHook', () => ({ registerSharedHook: vi.fn(), useSharedHook: (hook: () => unknown) => hook() }));
vi.mock('../events', () => ({ useMessageEvent: (type: unknown, handler: (event: unknown) => void) => state.handlers.set(type, handler) }));
vi.mock('../notification', () => ({ useNotification: () => ({ simpleAlert: state.alert }) }));

import { WiredTradeAcceptComposer, WiredTradeCancelledEvent, WiredTradeItemsEvent, WiredTradeOpenEvent } from '@volt/renderer';
import {
    useWiredTrading,
    WIRED_TRADING_COUNTDOWN_SECONDS,
    WIRED_TRADING_STATE_ADDING_ITEMS,
    WIRED_TRADING_STATE_CLOSED,
    WIRED_TRADING_STATE_CONFIRMED,
    WIRED_TRADING_STATE_CONFIRMING,
    WIRED_TRADING_STATE_COUNTDOWN,
} from './useWiredTrading';

const emit = (type: unknown, parser: object) => act(() => state.handlers.get(type)?.({ getParser: () => parser }));
const open = (overrides: object = {}) => emit(WiredTradeOpenEvent, {
    requirementType: 2, youGetText: '', layoutType: 'generic', giveRules: null, getRule: null, rulesType: 0, multiplier: 1,
    autoMultiplierMax: 0, showRequirementsImmediate: true, overridePreviousTrade: false, timeoutSeconds: 60, ...overrides,
});
const items = (ids: number[], canAccept: boolean, extra = 1) => emit(WiredTradeItemsEvent, {
    firstUserItemArray: ids.map(itemId => ({ itemId })), firstUserNumCredits: 0, secondUserItemArray: [], secondUserNumCredits: 25, canAccept, extra,
});
const accepts = () => state.send.mock.calls.map(([composer]) => composer).filter(composer => composer instanceof WiredTradeAcceptComposer).map(composer => (composer as unknown as { confirm: boolean }).confirm);

beforeEach(() => {
    vi.useFakeTimers();
    state.handlers.clear();
    vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

describe('wired trading state machine (AIR WiredTradingModel)', () => {
    it('accepts with 609(false), counts down locally, then confirms with 609(true)', () => {
        const { result } = renderHook(() => useWiredTrading());

        open();
        expect(result.current.isOpen).toBe(true);
        expect(result.current.state).toBe(WIRED_TRADING_STATE_ADDING_ITEMS);

        act(() => result.current.progress());
        expect(accepts()).toEqual([]);

        items([7], true);
        expect(result.current.rewardCredits).toBe(25);
        act(() => result.current.progress());
        expect(accepts()).toEqual([false]);
        expect(result.current.state).toBe(WIRED_TRADING_STATE_COUNTDOWN);

        act(() => result.current.progress());
        expect(accepts()).toEqual([false]);

        for(let i = 0; i < WIRED_TRADING_COUNTDOWN_SECONDS; i++) act(() => { vi.advanceTimersByTime(1000); });
        expect(result.current.state).toBe(WIRED_TRADING_STATE_CONFIRMING);

        act(() => result.current.progress());
        expect(accepts()).toEqual([false, true]);
        expect(result.current.state).toBe(WIRED_TRADING_STATE_CONFIRMED);
    });

    it('drops an unconfirmed acceptance when the table changes', () => {
        const { result } = renderHook(() => useWiredTrading());

        open();
        items([7], true);
        act(() => result.current.progress());
        items([7, 8], true);
        expect(result.current.state).toBe(WIRED_TRADING_STATE_ADDING_ITEMS);
    });

    it('ignores a rules trade without a give side and closes with an alert on a cancellation reason', () => {
        const { result } = renderHook(() => useWiredTrading());

        open({ requirementType: 4, giveRules: null });
        expect(result.current.isOpen).toBe(false);

        open();
        emit(WiredTradeCancelledEvent, { failureId: 2 });
        expect(result.current.isOpen).toBe(false);
        expect(result.current.state).toBe(WIRED_TRADING_STATE_CLOSED);
        expect(state.alert).toHaveBeenCalledTimes(1);
    });
});
