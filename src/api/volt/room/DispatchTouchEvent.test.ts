import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DispatchTouchEvent } from './DispatchTouchEvent';

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

const touch = (type: string, x: number = 10, y: number = 20) =>
    ({ type, touches: type === 'touchend' ? [] : [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] }) as unknown as TouchEvent;

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
    roomEngine.dispatchMouseEvent.mockClear();
});

describe('DispatchTouchEvent', () => {
    it('keeps the click of a quick second tap and follows it with a double-click', () => {
        DispatchTouchEvent(touch('touchstart'));
        DispatchTouchEvent(touch('touchend'));
        vi.advanceTimersByTime(150);
        DispatchTouchEvent(touch('touchstart'));
        DispatchTouchEvent(touch('touchend'));

        expect(dispatchedTypes()).toEqual(['mousedown', 'click', 'mousedown', 'click', 'double_click']);
    });

    it('does not make a double-click from slow taps or a drag', () => {
        DispatchTouchEvent(touch('touchstart'));
        DispatchTouchEvent(touch('touchend'));
        vi.advanceTimersByTime(400);
        DispatchTouchEvent(touch('touchstart'));
        DispatchTouchEvent(touch('touchend'));
        vi.advanceTimersByTime(100);
        DispatchTouchEvent(touch('touchstart'));
        DispatchTouchEvent(touch('touchmove', 40, 60));
        DispatchTouchEvent(touch('touchend', 40, 60));

        expect(dispatchedTypes()).not.toContain('double_click');
    });

    it('reports a long touch as a long press', () => {
        DispatchTouchEvent(touch('touchstart'), 1, true);

        expect(dispatchedTypes()).toEqual(['mousedown_long']);
    });
});
