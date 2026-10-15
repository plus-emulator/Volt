import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DispatchWheelEvent } from './DispatchWheelEvent';

const room = vi.hoisted(() => {
    const state = { canvasScale: 1, geometryScale: 64 };
    const geometry = {
        get scale() {
            return state.geometryScale;
        },
        performZoomIn: () => (state.geometryScale = 64),
        performZoomOut: () => (state.geometryScale = 32)
    };
    const engine = {
        rotateActiveObjectPreview: vi.fn(() => false),
        getRoomInstanceRenderingCanvasScale: () => state.canvasScale,
        getRoomInstanceGeometry: () => geometry,
        setRoomInstanceRenderingCanvasScale: vi.fn((_roomId: number, _canvasId: number, scale: number) => (state.canvasScale = scale))
    };

    return { state, engine };
});

vi.mock('@volt/renderer', () => ({
    GetConfiguration: () => ({ getValue: (_key: string, fallback: unknown) => fallback }),
    GetRoomEngine: () => room.engine,
    RoomGeometry: { SCALE_ZOOMED_IN: 64, SCALE_ZOOMED_OUT: 32 }
}));

const wheel = (deltaY: number, init: WheelEventInit = {}) => new WheelEvent('wheel', { deltaY, cancelable: true, clientX: 300, clientY: 200, ...init });

let now = 10_000;

beforeEach(() => {
    room.state.canvasScale = 1;
    room.state.geometryScale = 64;
    room.engine.rotateActiveObjectPreview.mockReset().mockReturnValue(false);
    room.engine.setRoomInstanceRenderingCanvasScale.mockClear();
    now += 10_000;
});

describe('DispatchWheelEvent (AIR RoomDesktop mouseWheelHandler)', () => {
    it('turns the floor item being moved or placed and keeps the page still', () => {
        room.engine.rotateActiveObjectPreview.mockReturnValue(true);

        const up = wheel(-100);
        const down = wheel(100);

        expect(DispatchWheelEvent(up, 7, now)).toBe(true);
        expect(DispatchWheelEvent(down, 7, now)).toBe(true);

        expect(room.engine.rotateActiveObjectPreview.mock.calls).toEqual([[true], [false]]);
        expect(up.defaultPrevented).toBe(true);
        expect(room.engine.setRoomInstanceRenderingCanvasScale).not.toHaveBeenCalled();
    });

    it('leaves a plain wheel alone when nothing is being moved', () => {
        const event = wheel(-100);

        expect(DispatchWheelEvent(event, 7, now)).toBe(false);
        expect(event.defaultPrevented).toBe(false);
    });

    it('zooms in around the pointer on ctrl+wheel up', () => {
        const event = wheel(-100, { ctrlKey: true });

        expect(DispatchWheelEvent(event, 7, now)).toBe(true);

        expect(event.defaultPrevented).toBe(true);
        expect(room.engine.rotateActiveObjectPreview).not.toHaveBeenCalled();
        expect(room.engine.setRoomInstanceRenderingCanvasScale).toHaveBeenCalledWith(7, 1, 2, { x: 300, y: 200 });
    });

    it('zooms out to the small room geometry on ctrl+wheel down', () => {
        DispatchWheelEvent(wheel(100, { ctrlKey: true }), 7, now);

        expect(room.state.geometryScale).toBe(32);
        expect(room.engine.setRoomInstanceRenderingCanvasScale).toHaveBeenCalledWith(7, 1, 1, { x: 300, y: 200 });
    });

    it('steps at most once per 400 ms for small wheel steps, but on every full notch', () => {
        DispatchWheelEvent(wheel(-4, { ctrlKey: true }), 7, now);
        DispatchWheelEvent(wheel(-4, { ctrlKey: true }), 7, now + 100);

        expect(room.engine.setRoomInstanceRenderingCanvasScale).toHaveBeenCalledTimes(1);

        DispatchWheelEvent(wheel(-4, { ctrlKey: true }), 7, now + 500);
        DispatchWheelEvent(wheel(-100, { ctrlKey: true }), 7, now + 550);

        expect(room.engine.setRoomInstanceRenderingCanvasScale).toHaveBeenCalledTimes(3);
        expect(room.state.canvasScale).toBe(8);
    });

    it('stops at the largest AIR zoom step', () => {
        room.state.canvasScale = 16;

        const event = wheel(-100, { ctrlKey: true });

        expect(DispatchWheelEvent(event, 7, now)).toBe(true);
        expect(event.defaultPrevented).toBe(true);
        expect(room.engine.setRoomInstanceRenderingCanvasScale).not.toHaveBeenCalled();
    });

    it('ignores the wheel with other modifier mixes', () => {
        for (const init of [{ ctrlKey: true, altKey: true }, { ctrlKey: true, shiftKey: true }, { altKey: true }, { shiftKey: true }]) {
            const event = wheel(-100, init);

            expect(DispatchWheelEvent(event, 7, now)).toBe(false);
            expect(event.defaultPrevented).toBe(false);
        }

        expect(room.engine.rotateActiveObjectPreview).not.toHaveBeenCalled();
        expect(room.engine.setRoomInstanceRenderingCanvasScale).not.toHaveBeenCalled();
    });
});
