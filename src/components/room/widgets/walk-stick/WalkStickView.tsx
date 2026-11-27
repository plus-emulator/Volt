import {
    AvatarAction,
    GetRoomEngine,
    IRoomSession,
    RoomObjectCategory,
    RoomObjectVariable,
    RoomUnitWalkComposer,
    RoomWalkPreviewComposer,
    RoomWalkPreviewEvent,
    Vector3d
} from '@volt/renderer';
import { Point } from 'pixi.js';
import { FC, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import {
    AddAnimationTickerCallback,
    BuildWalkGrid,
    FindWalkRoute,
    IsTouchLayout,
    SendMessageComposer,
    Tile,
    useVoltLayout,
    walkStickTarget
} from '../../../../api';
import blockedCursor from '../../../../assets/images/room/walk-stick/tile-cursor-blocked.png';
import pathCursor from '../../../../assets/images/room/walk-stick/tile-cursor-path.png';
import stopCursor from '../../../../assets/images/room/walk-stick/tile-cursor-stop.png';
import { useMessageEvent, useRoom } from '../../../../hooks';

const STICK_RADIUS = 60;
const KNOB_TRAVEL = 36;
const CANVAS_ID = 1;
// The route is drawn from the client's own room data at once; the server only confirms a target the thumb rests on.
const PREVIEW_SETTLE_MS = 200;
const PREVIEW_INTERVAL = 400;
const PREVIEW_TIMEOUT_MS = 1500;
const PREVIEW_REFRESH_MS = 1250;
const WALK_INTERVAL = 300;
const HOLD_STEP_MS = 400;
const HOLD_DELAY = 400;
// While aiming, the camera follows the stop marker once it leaves this part of the screen. Bottom leaves room for the stick and toolbar.
const VIEW_MARGIN = { left: 48, right: 48, top: 72, bottom: 180 };
const PAN_EASE = 0.25;
// A committed route clears once the avatar stops short of the goal, or when the walk never starts.
const WALK_START_TIMEOUT_MS = 1500;
const sameTile = (a: Tile | null, b: Tile | null) => a?.x === b?.x && a?.y === b?.y;
let nextRequestId = 0;

type Gesture = { pointer: number; origin: Tile; dx: number; dy: number; edgeSince: number | null };
type Selection = {
    goal: Tile;
    origin: Tile;
    requestId: number | null;
    route: Tile[] | null;
    committed: boolean;
    walking: boolean;
    lastMove: number;
    goalSince: number;
};

export const WalkStickView: FC = () => {
    const isTouch = IsTouchLayout(useVoltLayout());
    const { roomSession } = useRoom();
    if (!isTouch || !roomSession || roomSession.isSpectator) return null;

    return <RoomWalkStick key={roomSession.roomId} roomSession={roomSession} />;
};

const RoomWalkStick: FC<{ roomSession: IRoomSession }> = ({ roomSession }) => {
    const roomId = roomSession.roomId;
    const gesture = useRef<Gesture | null>(null);
    const selected = useRef<Selection | null>(null);
    const lastRequest = useRef(-Infinity);
    const lastWalk = useRef(-Infinity);
    const panned = useRef(false);
    const received = useRef<number | null>(null);
    const layerRef = useRef<HTMLDivElement>(null);
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const [plan, setPlan] = useState<Selection | null>(null);

    const avatarTile = (): Tile | null => {
        const loc = GetRoomEngine().getRoomObject(roomId, roomSession.ownRoomIndex, RoomObjectCategory.UNIT)?.getLocation();
        return loc ? { x: Math.round(loc.x), y: Math.round(loc.y) } : null;
    };

    // Same projection as RoomEngine.getRoomObjectScreenLocation: canvas zoom, centre and scroll offset, mirrored when flipped.
    const projectTile = (tile: Tile): { x: number; y: number; spriteScale: number } | null => {
        const engine = GetRoomEngine();
        const geometry = engine.getRoomInstanceGeometry(roomId, CANVAS_ID);
        const canvas = engine.getRoomInstanceRenderingCanvas(roomId, CANVAS_ID);
        const heightMap = engine.getFurnitureStackingHeightMap(roomId);

        if (!geometry || !canvas) return null;

        const zoom = canvas.isFlipped ? -canvas.scale : canvas.scale;
        const originX = (canvas.isFlipped ? -canvas.width : canvas.width) / 2 + canvas.screenOffsetX;
        const originY = (canvas.isFlipped ? -canvas.height : canvas.height) / 2 + canvas.screenOffsetY;
        const point = geometry.getScreenPoint(new Vector3d(tile.x, tile.y, heightMap?.getTileHeight(Math.round(tile.x), Math.round(tile.y)) ?? 0));

        if (!point) return null;

        return { x: point.x * zoom + originX, y: point.y * zoom + originY, spriteScale: Math.abs(zoom) * (geometry.scale / 64) };
    };

    const followMarker = (goal: Tile) => {
        const marker = projectTile(goal);
        const canvas = GetRoomEngine().getRoomInstanceRenderingCanvas(roomId, CANVAS_ID);

        if (!marker || !canvas) return;

        const shift = (low: number, high: number, value: number) => (value < low ? low - value : value > high ? high - value : 0);
        const dx = shift(VIEW_MARGIN.left, window.innerWidth - VIEW_MARGIN.right, marker.x);
        const dy = shift(VIEW_MARGIN.top, window.innerHeight - VIEW_MARGIN.bottom, marker.y);

        if (!dx && !dy) return;

        panned.current = true;

        const step = (value: number) => (value ? Math.sign(value) * Math.max(1, Math.round(Math.abs(value) * PAN_EASE)) : 0);

        GetRoomEngine().setRoomInstanceRenderingCanvasOffset(roomId, CANVAS_ID, new Point(canvas.screenOffsetX + step(dx), canvas.screenOffsetY + step(dy)));
    };

    // Snaps back to the avatar the way the room's follow camera frames it: centred, feet at about 70% of the height.
    const restoreCamera = () => {
        if (!panned.current) return;

        panned.current = false;

        const engine = GetRoomEngine();
        const location = engine.getRoomObject(roomId, roomSession.ownRoomIndex, RoomObjectCategory.UNIT)?.getLocation();
        const canvas = engine.getRoomInstanceRenderingCanvas(roomId, CANVAS_ID);
        const avatar = location && projectTile({ x: location.x, y: location.y });

        if (!avatar || !canvas) return;

        const x = window.innerWidth / 2 - avatar.x;
        const y = window.innerHeight * 0.7 - avatar.y;

        engine.setRoomInstanceRenderingCanvasOffset(roomId, CANVAS_ID, new Point(Math.round(canvas.screenOffsetX + x), Math.round(canvas.screenOffsetY + y)));
    };

    const localRoute = (origin: Tile, goal: Tile): Tile[] => {
        const grid = BuildWalkGrid(roomId, roomSession.ownRoomIndex);

        return (grid && FindWalkRoute(grid, origin, goal)) ?? [];
    };

    const select = (value: Selection | null) => {
        selected.current = value;
        setPlan(value);
    };

    const updateGoal = (now: number) => {
        const g = gesture.current;
        if (!g) return;
        const engine = GetRoomEngine();
        const map = engine.getFurnitureStackingHeightMap(roomId);
        if (!map) return;
        // Pause between extensions so the room can reply with a complete path at each distance.
        const extensions = g.edgeSince === null || now - g.edgeSince < HOLD_DELAY ? 0 : 1 + Math.floor((now - g.edgeSince - HOLD_DELAY) / HOLD_STEP_MS);
        const extra = extensions * 24;
        const target = walkStickTarget(g.origin, g.dx, g.dy, extra, map.width, map.height, engine.getRoomInstanceRenderingCanvasIsFlipped(roomId, CANVAS_ID));

        if (sameTile(target, selected.current?.goal ?? null)) return;
        if (!target) {
            select(null);
            return;
        }
        const origin = avatarTile() ?? g.origin;
        select({ goal: target, origin, route: localRoute(origin, target), requestId: null, committed: false, walking: false, lastMove: now, goalSince: now });
    };

    useMessageEvent<RoomWalkPreviewEvent>(RoomWalkPreviewEvent, (event) => {
        const value = selected.current;
        const reply = event.getParser();
        if (!value || reply.roomId !== roomId || value.requestId !== reply.requestId || !sameTile(reply, value.goal)) return;

        const here = avatarTile();
        if (!here) return;
        received.current = reply.requestId;
        if (!reply.route) return;
        const reached = reply.route.findIndex((tile) => sameTile(tile, here));
        const route = reply.route.slice(reached + 1);
        if (!sameTile(here, { x: reply.originX, y: reply.originY }) && reached < 0) return;
        select({ ...value, origin: here, route });
    });

    useEffect(
        () =>
            AddAnimationTickerCallback(() => {
                if (!gesture.current && !selected.current) return;
                const now = performance.now();
                updateGoal(now);
                if (gesture.current && selected.current) followMarker(selected.current.goal);
                let value = selected.current;
                const here = avatarTile();
                if (!value || !here) return;
                if (value.committed) {
                    const posture = GetRoomEngine()
                        .getRoomObject(roomId, roomSession.ownRoomIndex, RoomObjectCategory.UNIT)
                        ?.model.getValue<string>(RoomObjectVariable.FIGURE_POSTURE);
                    const isWalking = posture === AvatarAction.POSTURE_WALK;
                    const stopped = value.walking ? !isWalking : now - value.lastMove > WALK_START_TIMEOUT_MS;

                    if (sameTile(here, value.goal) || stopped) {
                        select(null);
                        return;
                    }

                    if (isWalking && !value.walking) {
                        value = { ...value, walking: true };
                        selected.current = value;
                    }
                }
                if (!sameTile(here, value.origin)) {
                    const reached = value.route?.findIndex((tile) => sameTile(tile, here)) ?? -1;
                    value = { ...value, origin: here, lastMove: now, route: reached >= 0 ? value.route.slice(reached + 1) : localRoute(here, value.goal) };
                    select(value);
                }
                if (value.committed) return;
                // One preview at a time, only for a target the thumb rests on. Refresh it while held so seats and gates stay current.
                const waiting = value.requestId !== null && received.current !== value.requestId && now - lastRequest.current < PREVIEW_TIMEOUT_MS;
                const due = value.requestId === null ? now - value.goalSince >= PREVIEW_SETTLE_MS : now - lastRequest.current >= PREVIEW_REFRESH_MS;
                if (!waiting && due && now - lastRequest.current >= PREVIEW_INTERVAL) {
                    lastRequest.current = now;
                    nextRequestId = (nextRequestId + 1) & 0x7fffffff;
                    selected.current = { ...value, requestId: nextRequestId };
                    SendMessageComposer(new RoomWalkPreviewComposer(nextRequestId, roomId, value.goal.x, value.goal.y));
                }
            }),
        [roomSession]
    );

    useEffect(() => {
        const layer = layerRef.current;

        if (!layer || !plan) return;

        const place = () => {
            for (const element of Array.from(layer.children) as HTMLImageElement[]) {
                const point = projectTile({ x: Number(element.dataset.x), y: Number(element.dataset.y) });

                if (!point) continue;

                element.style.transform = `translate(${Math.round(point.x)}px, ${Math.round(point.y)}px) translate(-50%, -50%) scale(${point.spriteScale})`;
            }
        };

        place();

        return AddAnimationTickerCallback(place);
    }, [roomId, plan]);

    const track = (event: ReactPointerEvent<HTMLDivElement>) => {
        const g = gesture.current;
        if (!g || g.pointer !== event.pointerId) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        g.dx = event.clientX - (bounds.left + bounds.width / 2);
        g.dy = event.clientY - (bounds.top + bounds.height / 2);
        const distance = Math.hypot(g.dx, g.dy);
        const now = performance.now();
        g.edgeSince = distance >= STICK_RADIUS * 0.9 && distance <= STICK_RADIUS * 1.1 ? (g.edgeSince ?? now) : null;
        const factor = KNOB_TRAVEL / Math.max(STICK_RADIUS, distance);
        setKnob({ x: g.dx * factor, y: g.dy * factor });
        updateGoal(now);
    };

    const end = (event: ReactPointerEvent<HTMLDivElement>, commit: boolean) => {
        if (gesture.current?.pointer !== event.pointerId) return;
        if (commit) track(event);
        const value = selected.current;
        gesture.current = null;
        setKnob({ x: 0, y: 0 });
        restoreCamera();
        const now = performance.now();
        if (!commit || !value || value.route?.length === 0 || now - lastWalk.current < WALK_INTERVAL) {
            select(null);
            return;
        }
        lastWalk.current = now;
        select({ ...value, committed: true, walking: false, lastMove: now });
        SendMessageComposer(new RoomUnitWalkComposer(value.goal.x, value.goal.y));
    };

    const isBlocked = plan?.route?.length === 0 && !sameTile(plan.origin, plan.goal);

    return (
        <>
            <div ref={layerRef} className="volt-walk-path-layer">
                {plan?.route?.slice(0, -1).map(({ x, y }) => (
                    <img key={`${x}-${y}`} alt="" draggable={false} src={pathCursor} data-x={x} data-y={y} />
                ))}
                {plan && (
                    <img
                        alt=""
                        draggable={false}
                        className={isBlocked ? 'is-blocked' : undefined}
                        src={isBlocked ? blockedCursor : stopCursor}
                        data-x={plan.goal.x}
                        data-y={plan.goal.y}
                    />
                )}
            </div>
            <div
                className={`volt-walk-stick${gesture.current ? ' is-active' : ''}${isBlocked ? ' is-blocked' : ''}`}
                onPointerDown={(event) => {
                    const origin = avatarTile();
                    if (gesture.current || !origin) return;
                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    select(null);
                    gesture.current = { pointer: event.pointerId, origin, dx: 0, dy: 0, edgeSince: null };
                    track(event);
                }}
                onPointerMove={track}
                onPointerUp={(event) => end(event, true)}
                onPointerCancel={(event) => end(event, false)}
                onLostPointerCapture={(event) => end(event, false)}
            >
                <div className="volt-walk-stick__knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
            </div>
        </>
    );
};
