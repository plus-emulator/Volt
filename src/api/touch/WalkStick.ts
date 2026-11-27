export interface Tile {
    readonly x: number;
    readonly y: number;
}

const DEAD_ZONE = 15;
const PIXELS_PER_TILE = 6;

/** Project the thumb's screen displacement onto the two isometric room axes. */
export const walkStickTarget = (
    origin: Tile, dx: number, dy: number, extraReach: number, width: number, height: number, flipped: boolean
): Tile | null => {
    const distance = Math.hypot(dx, dy);
    if (distance <= DEAD_ZONE || !width || !height) return null;

    const scale = (distance - DEAD_ZONE + extraReach) / (distance * PIXELS_PER_TILE) * (flipped ? -1 : 1);
    const offsetX = (dx / 2 + dy) * scale;
    const offsetY = (dy - dx / 2) * scale;
    // Keep the destination on the same ray when the thumb points beyond the map.
    const toEdge = (start: number, offset: number, size: number) =>
        offset > 0 ? (size - 1 - start) / offset : offset < 0 ? -start / offset : 1;
    const reach = Math.min(1, toEdge(origin.x, offsetX, width), toEdge(origin.y, offsetY, height));
    const x = Math.round(origin.x + offsetX * reach);
    const y = Math.round(origin.y + offsetY * reach);

    return x === origin.x && y === origin.y ? null : { x, y };
};
