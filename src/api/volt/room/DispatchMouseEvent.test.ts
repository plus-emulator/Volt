import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DispatchMouseEvent } from './DispatchMouseEvent';

const roomEngine = vi.hoisted(() => ({ dispatchMouseEvent: vi.fn() }));

vi.mock('@volt/renderer', () => ({
    GetRoomEngine: () => roomEngine,
    MouseEventType: {
        MOUSE_CLICK: 'click',
        DOUBLE_CLICK: 'double_click',
        MOUSE_MOVE: 'mousemove',
        MOUSE_DOWN: 'mousedown',
        MOUSE_DOWN_LONG: 'mousedown_long',
        MOUSE_UP: 'mouseup',
        ROLL_OVER: 'mouseover',
        ROLL_OUT: 'mouseout',
        RIGHT_CLICK: 'contextmenu'
    },
    TouchEventType: {
        TOUCH_START: 'touchstart',
        TOUCH_MOVE: 'touchmove',
        TOUCH_CANCEL: 'touchcancel',
        TOUCH_END: 'touchend',
        TOUCH_LONG: 'touchlong'
    }
}));

const dispatchedTypes = () => roomEngine.dispatchMouseEvent.mock.calls.map((call) => call[3]);

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
    roomEngine.dispatchMouseEvent.mockClear();
});

describe('DispatchMouseEvent (AIR MouseEventProcessor)', () => {
    it('forwards every click as a click, however fast the clicks come', () => {
        DispatchMouseEvent(new MouseEvent('click', { clientX: 5, clientY: 6, shiftKey: true }));
        vi.advanceTimersByTime(100);
        DispatchMouseEvent(new MouseEvent('click', { clientX: 5, clientY: 6, shiftKey: true }));

        expect(dispatchedTypes()).toEqual(['click', 'click']);
    });

    it('turns the native dblclick into a double-click after the click that completed it', () => {
        DispatchMouseEvent(new MouseEvent('click'));
        DispatchMouseEvent(new MouseEvent('click'));
        DispatchMouseEvent(new MouseEvent('dblclick'));

        expect(dispatchedTypes()).toEqual(['click', 'click', 'double_click']);
    });

    it('passes the modifier keys the event carries and whether the primary button is held', () => {
        DispatchMouseEvent(new MouseEvent('mousedown', { clientX: 30, clientY: 40, altKey: true, buttons: 1 }), 2);
        DispatchMouseEvent(new MouseEvent('click', { clientX: 31, clientY: 41, ctrlKey: true, shiftKey: true }));

        expect(roomEngine.dispatchMouseEvent.mock.calls).toEqual([
            [2, 30, 40, 'mousedown', true, false, false, true],
            [1, 31, 41, 'click', false, true, true, false]
        ]);
    });

    it('treats meta as ctrl', () => {
        DispatchMouseEvent(new MouseEvent('click', { metaKey: true }));

        expect(roomEngine.dispatchMouseEvent.mock.calls[0][5]).toBe(true);
    });

    it('ignores events the room does not handle', () => {
        DispatchMouseEvent(new MouseEvent('mouseover'));
        DispatchMouseEvent(new MouseEvent('auxclick'));

        expect(roomEngine.dispatchMouseEvent).not.toHaveBeenCalled();
    });
});
