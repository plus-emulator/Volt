import { expect, it, vi } from 'vitest';
import { updateRoomTint } from './updateRoomTint';

it('attaches only non-neutral tint, preserves other filters, and avoids repeated assignments', () => {
    const tint = { red: 1, green: 1, blue: 1 } as any;
    const other = {};
    let filters = [other];
    const set = vi.fn((value: object[]) => { filters = value; });
    const master = { get filters() { return filters; }, set filters(value) { set(value); } } as any;
    updateRoomTint(master, tint, 0xffffff);
    expect(set).not.toHaveBeenCalled();
    updateRoomTint(master, tint, 0x804020);
    expect(filters).toEqual([other, tint]);
    expect(tint.red).toBe(128 / 255);
    updateRoomTint(master, tint, 0x102030);
    expect(set).toHaveBeenCalledTimes(1);
    updateRoomTint(master, tint, 0xffffff);
    expect(filters).toEqual([other]);
    expect(set).toHaveBeenCalledTimes(2);
});
