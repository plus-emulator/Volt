import { GetRoomEngine, MouseEventType } from '@volt/renderer';

/** The DOM `dblclick` event; the renderer calls it `MouseEventType.DOUBLE_CLICK`. */
const DOM_DOUBLE_CLICK = 'dblclick';

/**
 * Forwards a canvas mouse event to the room engine the way the AIR client does
 * (MouseEventProcessor): the modifier keys are the ones the event itself carries,
 * every click is delivered as a click, and a native double-click arrives as its own
 * event after the click that completed it. Meta counts as ctrl for Mac users.
 */
export const DispatchMouseEvent = (event: MouseEvent, canvasId: number = 1) => {
    const eventType = event.type === DOM_DOUBLE_CLICK ? MouseEventType.DOUBLE_CLICK : event.type;

    switch (eventType) {
        case MouseEventType.MOUSE_CLICK:
        case MouseEventType.DOUBLE_CLICK:
        case MouseEventType.MOUSE_MOVE:
        case MouseEventType.MOUSE_DOWN:
        case MouseEventType.MOUSE_UP:
        case MouseEventType.RIGHT_CLICK:
            break;
        default:
            return;
    }

    GetRoomEngine().dispatchMouseEvent(
        canvasId,
        event.clientX,
        event.clientY,
        eventType,
        event.altKey,
        event.ctrlKey || event.metaKey,
        event.shiftKey,
        (event.buttons & 1) !== 0
    );
};
