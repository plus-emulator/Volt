import { GetRoomEngine, GetSessionDataManager, IRoomObject, RoomObjectCategory, RoomObjectVariable } from '@volt/renderer';
import type { Tile } from './WalkStick';

const MAX_STEP_UP = 1.5;
const MAX_EXPANSIONS = 4096;
const MAX_ROUTE = 512;
const NEIGHBOURS: readonly [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
];

/** Binary min-heap of tile indexes ordered by their score. */
class TileHeap {
    private readonly items: number[] = [];

    constructor(private readonly score: Float32Array) {}

    public get size(): number {
        return this.items.length;
    }

    public push(index: number): void {
        const items = this.items;
        let i = items.push(index) - 1;

        while (i > 0) {
            const up = (i - 1) >> 1;

            if (this.score[items[up]] <= this.score[index]) break;

            items[i] = items[up];
            i = up;
        }

        items[i] = index;
    }

    public pop(): number {
        const items = this.items;
        const top = items[0];
        const last = items.pop();

        if (items.length && last !== undefined) {
            let i = 0;

            for (;;) {
                const left = i * 2 + 1;
                const right = left + 1;
                let child = left;

                if (left >= items.length) break;
                if (right < items.length && this.score[items[right]] < this.score[items[left]]) child = right;
                if (this.score[items[child]] >= this.score[last]) break;

                items[i] = items[child];
                i = child;
            }

            items[i] = last;
        }

        return top;
    }
}

/** Walkable surface per tile: NaN when blocked, else the height an avatar stands at. */
export interface WalkGrid {
    readonly width: number;
    readonly height: number;
    readonly surface: Float32Array;
}

const footprint = (object: IRoomObject): Tile[] => {
    const model = object.model;
    const location = object.getLocation();
    let sizeX = Math.max(1, model?.getValue<number>(RoomObjectVariable.FURNITURE_SIZE_X) ?? 1);
    let sizeY = Math.max(1, model?.getValue<number>(RoomObjectVariable.FURNITURE_SIZE_Y) ?? 1);
    const direction = object.getDirection().x;

    if (direction === 90 || direction === 270) [sizeX, sizeY] = [sizeY, sizeX];

    const tiles: Tile[] = [];
    const x0 = Math.round(location.x);
    const y0 = Math.round(location.y);

    for (let y = y0; y < y0 + sizeY; y++) for (let x = x0; x < x0 + sizeX; x++) tiles.push({ x, y });

    return tiles;
};

const isOpenGate = (object: IRoomObject, className: string) => className.toLowerCase().includes('gate') && object.getState(0) > 0;

/** Builds the walk grid from the room the client already has: floor plan, furni and other avatars. */
export const BuildWalkGrid = (roomId: number, ownUnitId: number): WalkGrid | null => {
    const engine = GetRoomEngine();
    const floor = engine.getLegacyWallGeometry(roomId);
    const stacking = engine.getFurnitureStackingHeightMap(roomId);

    if (!floor || !stacking) return null;

    const { width, height } = stacking;
    const surface = new Float32Array(width * height).fill(Number.NaN);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (floor.isRoomTile(x, y)) surface[y * width + x] = floor.getFloorAltitude(x, y);
        }
    }

    const data = GetSessionDataManager();

    for (const object of engine.getRoomObjects(roomId, RoomObjectCategory.FLOOR) ?? []) {
        const furni = data.getFloorItemDataByName(object.type);
        const walkable = !!furni && (furni.canStandOn || furni.canSitOn || furni.canLayOn || isOpenGate(object, furni.className));

        for (const { x, y } of footprint(object)) {
            if (x < 0 || y < 0 || x >= width || y >= height) continue;

            const index = y * width + x;

            if (Number.isNaN(surface[index])) continue;

            surface[index] = walkable ? Math.max(surface[index], stacking.getTileHeight(x, y)) : Number.NaN;
        }
    }

    for (const unit of engine.getRoomObjects(roomId, RoomObjectCategory.UNIT) ?? []) {
        if (unit.id === ownUnitId) continue;

        const location = unit.getLocation();
        const x = Math.round(location.x);
        const y = Math.round(location.y);

        if (x >= 0 && y >= 0 && x < width && y < height) surface[y * width + x] = Number.NaN;
    }

    return { width, height, surface };
};

/**
 * A* over the walk grid, with the server's step-up limit and no corner cutting past two blocked tiles.
 * Returns the tiles after `from` up to and including `to`, or null when there is no way there.
 */
export const FindWalkRoute = (grid: WalkGrid, from: Tile, to: Tile): Tile[] | null => {
    const { width, height, surface } = grid;
    const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;

    if (!inside(from.x, from.y) || !inside(to.x, to.y)) return null;

    const goal = to.y * width + to.x;
    const start = from.y * width + from.x;

    if (Number.isNaN(surface[goal])) return null;
    if (goal === start) return [];

    const cost = new Float32Array(width * height).fill(Number.POSITIVE_INFINITY);
    const parent = new Int32Array(width * height).fill(-1);
    const closed = new Uint8Array(width * height);
    const score = new Float32Array(width * height);
    const open = new TileHeap(score);
    const estimate = (index: number) => {
        const dx = Math.abs((index % width) - to.x);
        const dy = Math.abs(Math.floor(index / width) - to.y);

        return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };
    const startZ = Number.isNaN(surface[start]) ? 0 : surface[start];

    cost[start] = 0;
    open.push(start);

    for (let expansions = 0; open.size && expansions < MAX_EXPANSIONS; expansions++) {
        const current = open.pop();

        if (closed[current]) continue;

        if (current === goal) {
            const route: Tile[] = [];

            for (let index = goal; index !== start; index = parent[index]) route.push({ x: index % width, y: Math.floor(index / width) });

            route.reverse();

            return route.length > MAX_ROUTE ? null : route;
        }

        closed[current] = 1;

        const cx = current % width;
        const cy = Math.floor(current / width);
        const cz = current === start ? startZ : surface[current];

        for (const [dx, dy] of NEIGHBOURS) {
            const nx = cx + dx;
            const ny = cy + dy;

            if (!inside(nx, ny)) continue;

            const next = ny * width + nx;
            const nz = surface[next];

            if (closed[next] || Number.isNaN(nz) || nz - cz > MAX_STEP_UP) continue;
            if (dx && dy && Number.isNaN(surface[cy * width + nx]) && Number.isNaN(surface[ny * width + cx])) continue;

            const nextCost = cost[current] + (dx && dy ? Math.SQRT2 : 1);

            if (nextCost >= cost[next]) continue;

            cost[next] = nextCost;
            parent[next] = current;
            score[next] = nextCost + estimate(next);
            open.push(next);
        }
    }

    return null;
};
