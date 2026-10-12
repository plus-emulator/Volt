import { GetRoomEngine, RoomGeometry } from '@volt/renderer';

export const ROOM_ZOOM_SCALES = [0.5, 1, 2, 4] as const;

/** AIR RoomDesktop `ROOM_ZOOM_SCALES`: the steps the zoom buttons and ctrl+wheel move through. */
export const ROOM_CANVAS_ZOOM_SCALES = [0.5, 1, 2, 4, 8, 16] as const;

export const getNearestZoomScale = (scale: number): number => {
    if (Number.isNaN(scale) || scale <= 0) return 1;

    return ROOM_CANVAS_ZOOM_SCALES.reduce<number>(
        (nearest, current) => (Math.abs(current - scale) < Math.abs(nearest - scale) ? current : nearest),
        ROOM_CANVAS_ZOOM_SCALES[0]
    );
};

export const getNextZoomScale = (scale: number, direction: number): number => {
    const currentScale = getNearestZoomScale(scale);

    if (direction > 0) {
        return ROOM_CANVAS_ZOOM_SCALES.find((zoomScale) => zoomScale > currentScale + 0.001) ?? currentScale;
    }

    if (direction < 0) {
        return [...ROOM_CANVAS_ZOOM_SCALES].reverse().find((zoomScale) => zoomScale < currentScale - 0.001) ?? currentScale;
    }

    return currentScale;
};

/** The zoom the player sees: the canvas scale, halved while the room uses its small (32px) geometry. */
export const getLogicalRoomZoomScale = (roomId: number): number => {
    const displayScale = GetRoomEngine().getRoomInstanceRenderingCanvasScale(roomId, 1);
    const geometry = GetRoomEngine().getRoomInstanceGeometry(roomId, 1);
    const geometryRatio = geometry ? geometry.scale / RoomGeometry.SCALE_ZOOMED_IN : 1;

    return getNearestZoomScale(displayScale * geometryRatio);
};

/** `point` keeps the room under that canvas position in place (AIR zooms around the pointer). */
export const applyRoomZoom = (roomId: number, logicalScale: number, isFlipForced: boolean = false, point: { x: number; y: number } = null): void => {
    if (isFlipForced) {
        GetRoomEngine().setRoomInstanceRenderingCanvasScale(roomId, 1, logicalScale, null, null, true);
        return;
    }

    const geometry = GetRoomEngine().getRoomInstanceGeometry(roomId, 1);
    const wantZoomedOutGeometry = logicalScale < 1;

    if (geometry) {
        if (wantZoomedOutGeometry) geometry.performZoomOut();
        else geometry.performZoomIn();
    }

    const displayScale = wantZoomedOutGeometry ? logicalScale * (RoomGeometry.SCALE_ZOOMED_IN / RoomGeometry.SCALE_ZOOMED_OUT) : logicalScale;

    GetRoomEngine().setRoomInstanceRenderingCanvasScale(roomId, 1, displayScale, point);
};

export const getRoomZoomLevel = (scale: number): number => {
    if (!Number.isFinite(scale)) return 1;

    const closestIndex = ROOM_ZOOM_SCALES.reduce((closest, candidate, index) => {
        return Math.abs(candidate - scale) < Math.abs(ROOM_ZOOM_SCALES[closest] - scale) ? index : closest;
    }, 0);

    return closestIndex;
};

export const getRoomZoomScale = (level: number): number => ROOM_ZOOM_SCALES[Math.max(0, Math.min(ROOM_ZOOM_SCALES.length - 1, Math.round(level)))];

export const stepRoomZoom = (currentScale: number, direction: -1 | 1): number => getRoomZoomScale(getRoomZoomLevel(currentScale) + direction);
