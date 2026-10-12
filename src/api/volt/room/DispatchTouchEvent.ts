import { GetRoomEngine, MouseEventType, TouchEventType } from '@volt/renderer';

/** Two taps this close together, with no drag in between, also make a double-click. */
const DOUBLE_TAP_INTERVAL_MS = 300;

let didMouseMove = false;
let lastTapAt = 0;

/**
 * Touch counterpart of DispatchMouseEvent. A tap is always delivered as a click; a
 * quick second tap is followed by a double-click, the same click-then-double-click
 * order the AIR client uses for the mouse, so the second tap is never lost.
 */
export const DispatchTouchEvent = (
    event: TouchEvent,
    canvasId: number = 1,
    longTouch: boolean = false,
    altKey: boolean = false,
    ctrlKey: boolean = false,
    shiftKey: boolean = false
) => {
    let x = 0;
    let y = 0;

    if (event.touches[0]) {
        x = event.touches[0].clientX;
        y = event.touches[0].clientY;
    } else if (event.changedTouches[0]) {
        x = event.changedTouches[0].clientX;
        y = event.changedTouches[0].clientY;
    }

    const dispatch = (eventType: string) => GetRoomEngine().dispatchMouseEvent(canvasId, x, y, eventType, altKey, ctrlKey, shiftKey, false);

    if (longTouch) {
        dispatch(MouseEventType.MOUSE_DOWN_LONG);
        return;
    }

    switch (event.type) {
        case TouchEventType.TOUCH_START:
            didMouseMove = false;
            dispatch(MouseEventType.MOUSE_DOWN);
            return;
        case TouchEventType.TOUCH_MOVE:
            didMouseMove = true;
            dispatch(MouseEventType.MOUSE_MOVE);
            return;
        case TouchEventType.TOUCH_END:
        case MouseEventType.MOUSE_CLICK: {
            const now = Date.now();
            const isDoubleTap = lastTapAt > 0 && now - lastTapAt <= DOUBLE_TAP_INTERVAL_MS && !didMouseMove;

            dispatch(MouseEventType.MOUSE_CLICK);

            if (isDoubleTap) {
                dispatch(MouseEventType.DOUBLE_CLICK);
                lastTapAt = 0;
            } else {
                lastTapAt = now;
            }
            return;
        }
    }
};
