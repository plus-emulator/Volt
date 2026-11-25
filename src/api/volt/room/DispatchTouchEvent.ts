import { CreateLinkEvent, GetRoomEngine, MouseEventType, RoomAreaSelectionManager, RoomObjectCategory, TouchEventType } from '@volt/renderer';
import { applyRoomZoom, getLogicalRoomZoomScale } from '../../../components/room/widgets/room-tools/roomZoom.helpers';
import { GetConfigurationValue } from '../GetConfigurationValue';

/** Two taps this close together, with no drag in between, also make a double-click. */
const DOUBLE_TAP_INTERVAL_MS = 300;
/** A finger that moves further than this pans or drags; lifting it never clicks. */
const TAP_SLOP_PX = 10;
const LONG_PRESS_MS = 500;
const PINCH_IN_RATIO = 1.25;
const PINCH_OUT_RATIO = 0.8;

interface PinchState {
    startDistance: number;
    baseScale: number;
    applied: boolean;
}

let didMouseMove = false;
let lastTapAt = 0;
let startX = 0;
let startY = 0;
let lastPoint: { x: number; y: number } = null;
let longPressTimer: ReturnType<typeof setTimeout> = null;
let didLongPress = false;
let pinch: PinchState = null;

const touchDistance = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

const clearLongPress = () => {
    if (longPressTimer === null) return;

    clearTimeout(longPressTimer);
    longPressTimer = null;
};

const isAreaSelecting = () => {
    const state = GetRoomEngine().areaSelectionManager?.areaSelectionState;

    return state === RoomAreaSelectionManager.AWAITING_MOUSE_DOWN || state === RoomAreaSelectionManager.SELECTING;
};

const findObjectAt = (roomId: number, x: number, y: number) => {
    const roomEngine = GetRoomEngine();

    for (const category of [RoomObjectCategory.UNIT, RoomObjectCategory.FLOOR, RoomObjectCategory.WALL]) {
        let found: number = null;
        let foundArea = Number.POSITIVE_INFINITY;

        for (const roomObject of roomEngine.getRoomObjects(roomId, category) ?? []) {
            if (!roomObject || roomObject.id < 0) continue;

            const bounds = roomEngine.getRoomObjectBoundingRectangle(roomId, roomObject.id, category, 1);

            if (!bounds || !bounds.contains(x, y)) continue;

            const area = bounds.width * bounds.height;

            if (area < foundArea) {
                found = roomObject.id;
                foundArea = area;
            }
        }

        if (found !== null) return { id: found, category };
    }

    return null;
};

/** A still long press selects what is under the finger and asks for its context menu. It never walks. */
const onLongPress = () => {
    longPressTimer = null;

    if (didMouseMove || pinch || isAreaSelecting()) return;

    const roomEngine = GetRoomEngine();
    const roomId = roomEngine.activeRoomId;

    if (roomEngine.getSelectedRoomObjectData(roomId)?.operation) return;

    didLongPress = true;

    const target = findObjectAt(roomId, startX, startY);

    if (!target) return;

    if (target.category === RoomObjectCategory.UNIT) CreateLinkEvent(`avatar-info/touch-menu/${target.id}`);

    roomEngine.selectRoomObject(roomId, target.id, target.category);
};

const startPinch = (event: TouchEvent, canvasId: number) => {
    clearLongPress();

    if (!pinch && lastPoint) GetRoomEngine().dispatchMouseEvent(canvasId, lastPoint.x, lastPoint.y, MouseEventType.MOUSE_UP, false, false, false, false);

    const roomId = GetRoomEngine().activeRoomId;

    pinch = {
        startDistance: Math.max(1, touchDistance(event.touches[0], event.touches[1])),
        baseScale: getLogicalRoomZoomScale(roomId),
        applied: false
    };
};

/** Pinching steps the room between 1x and 2x once per gesture, like the room tools zoom button. */
const updatePinch = (event: TouchEvent) => {
    if (pinch.applied || !GetConfigurationValue('room.zoom.enabled', true)) return;

    const [first, second] = [event.touches[0], event.touches[1]];
    const ratio = touchDistance(first, second) / pinch.startDistance;
    let target: number = null;

    if (ratio >= PINCH_IN_RATIO && pinch.baseScale < 2) target = pinch.baseScale < 1 ? 1 : 2;
    else if (ratio <= PINCH_OUT_RATIO && pinch.baseScale > 1) target = pinch.baseScale > 2 ? 2 : 1;

    if (target === null) return;

    pinch.applied = true;

    applyRoomZoom(GetRoomEngine().activeRoomId, target, false, {
        x: (first.clientX + second.clientX) / 2,
        y: (first.clientY + second.clientY) / 2
    });
};

const blurTextInput = () => {
    const active = document.activeElement as HTMLElement;

    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) active.blur();
};

/**
 * Touch counterpart of DispatchMouseEvent. A tap is delivered as a click; a quick second
 * tap is followed by a double-click, the same click-then-double-click order the AIR client
 * uses for the mouse. A drag pans (or moves the item being placed) and never clicks on
 * lift, two fingers pinch-zoom, and a still long press opens the context menu.
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

    // Without this the browser replays the touch as mouse events and the room gets every tap twice.
    if (event.type !== TouchEventType.TOUCH_START && event.cancelable) event.preventDefault();

    switch (event.type) {
        case TouchEventType.TOUCH_START:
            if (event.touches.length >= 2) {
                startPinch(event, canvasId);
                return;
            }

            if (pinch) return;

            didMouseMove = false;
            didLongPress = false;
            startX = x;
            startY = y;
            lastPoint = { x, y };
            dispatch(MouseEventType.MOUSE_DOWN);
            clearLongPress();
            if (!isAreaSelecting()) longPressTimer = setTimeout(onLongPress, LONG_PRESS_MS);
            return;
        case TouchEventType.TOUCH_MOVE:
            if (pinch) {
                if (event.touches.length >= 2) updatePinch(event);
                return;
            }

            if (didLongPress) return;

            if (Math.abs(x - startX) > TAP_SLOP_PX || Math.abs(y - startY) > TAP_SLOP_PX) {
                didMouseMove = true;
                clearLongPress();
            }

            lastPoint = { x, y };
            dispatch(MouseEventType.MOUSE_MOVE);
            return;
        case TouchEventType.TOUCH_CANCEL:
            clearLongPress();

            if (pinch) {
                if (!event.touches.length) pinch = null;
                return;
            }

            dispatch(MouseEventType.MOUSE_UP);
            return;
        case TouchEventType.TOUCH_END:
        case MouseEventType.MOUSE_CLICK: {
            clearLongPress();

            if (pinch) {
                if (!event.touches?.length) pinch = null;
                return;
            }

            // RoomEngine commits an area selection on MOUSE_CLICK; a dragged touch normally only sends MOUSE_UP.
            const areaState = GetRoomEngine().areaSelectionManager?.areaSelectionState;

            if (areaState === RoomAreaSelectionManager.SELECTING) {
                dispatch(MouseEventType.MOUSE_UP);
                dispatch(MouseEventType.MOUSE_CLICK);
                lastTapAt = 0;
                return;
            }

            if (areaState === RoomAreaSelectionManager.AWAITING_MOUSE_DOWN) {
                dispatch(MouseEventType.MOUSE_UP);
                lastTapAt = 0;
                return;
            }

            if (didMouseMove || didLongPress) {
                dispatch(MouseEventType.MOUSE_UP);
                lastTapAt = 0;
                return;
            }

            blurTextInput();

            const now = Date.now();
            const isDoubleTap = lastTapAt > 0 && now - lastTapAt <= DOUBLE_TAP_INTERVAL_MS;

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

/**
 * Drops the item being placed or moved where its preview is now: a click at the last
 * point the finger touched the room, which is the tile the preview follows.
 */
export const CommitRoomTouchPlacement = (canvasId: number = 1): boolean => {
    if (!lastPoint) return false;

    GetRoomEngine().dispatchMouseEvent(canvasId, lastPoint.x, lastPoint.y, MouseEventType.MOUSE_CLICK, false, false, false, false);

    return true;
};
