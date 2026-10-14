import type { VoltAdjustmentFilter, VoltContainer } from '@volt/renderer';

// Preserve unrelated filters and avoid dirtying Pixi's render instructions for unchanged membership.
export const updateRoomTint = (master: VoltContainer, filter: VoltAdjustmentFilter, color: number): void => {
    filter.red = ((color >> 16) & 0xff) / 255;
    filter.green = ((color >> 8) & 0xff) / 255;
    filter.blue = (color & 0xff) / 255;
    if (!master) return;

    const filters = master.filters ?? [];
    const applied = filters.includes(filter);
    const neutral = (color & 0xffffff) === 0xffffff;
    if (neutral && applied) master.filters = filters.filter(entry => entry !== filter);
    else if (!neutral && !applied) master.filters = [...filters, filter];
};
