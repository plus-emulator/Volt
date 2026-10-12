import { GetRoomEngine } from '@volt/renderer';
import { applyRoomZoom, getLogicalRoomZoomScale, getNextZoomScale } from '../../../components/room/widgets/room-tools/roomZoom.helpers';
import { GetConfigurationValue } from '../GetConfigurationValue';

/** AIR `shouldProcessZoomScroll`: small wheel steps zoom at most once per this interval. */
const ZOOM_SCROLL_INTERVAL_MS = 400;
/** A pixel-mode wheel step at least this large counts as a full notch (Flash delta >= 2). */
const PIXEL_NOTCH = 50;

let lastZoomScrollAt = 0;

const isFullWheelNotch = (event: WheelEvent) => (event.deltaMode === 0 ? Math.abs(event.deltaY) >= PIXEL_NOTCH : Math.abs(event.deltaY) >= 2);

/**
 * AIR RoomDesktop `mouseWheelHandler` for the room canvas. Without modifiers the wheel
 * turns the floor item being moved or placed; ctrl+wheel steps the room zoom around
 * the pointer. Wheeling up (a negative deltaY in the browser) is AIR's positive delta.
 * Returns true when the room used the wheel, so the page must not scroll or zoom.
 */
export const DispatchWheelEvent = (event: WheelEvent, roomId: number, now: number = Date.now()): boolean => {
    const ctrlKey = event.ctrlKey || event.metaKey;

    if (!event.deltaY) return false;

    if (!ctrlKey && !event.altKey && !event.shiftKey) {
        const roomEngine = GetRoomEngine();

        if (!roomEngine.rotateActiveObjectPreview(event.deltaY < 0)) return false;

        event.preventDefault();

        return true;
    }

    if (!ctrlKey || event.altKey || event.shiftKey) return false;

    // The browser would zoom the page on ctrl+wheel; the room owns it here.
    event.preventDefault();

    if (!GetConfigurationValue('room.zoom.enabled', true)) return true;

    if (!isFullWheelNotch(event) && lastZoomScrollAt > 0 && now - lastZoomScrollAt <= ZOOM_SCROLL_INTERVAL_MS) return true;

    const currentScale = getLogicalRoomZoomScale(roomId);
    const nextScale = getNextZoomScale(currentScale, event.deltaY < 0 ? 1 : -1);

    if (Math.abs(nextScale - currentScale) <= 0.001) return true;

    applyRoomZoom(roomId, nextScale, false, { x: event.clientX, y: event.clientY });

    lastZoomScrollAt = now;

    return true;
};
