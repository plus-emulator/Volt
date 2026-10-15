import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomObjectItem } from '../../../api/room/widgets/RoomObjectItem';

const state = vi.hoisted(() => ({ allowed: true, added: null as (event: any) => void, removed: null as (event: any) => void,
    users: new Map<number, { roomIndex: number; type: number; name: string }>() }));
vi.mock('@volt/renderer', () => ({ RoomObjectCategory: { UNIT: 100 }, GetRoomEngine: () => ({ getRoomObjects: () => [...state.users.keys()].map(id => ({ id })) }) }));
vi.mock('../../../api', () => ({ RoomObjectItem, CanOpenUserChooser: () => state.allowed,
    GetRoomSession: () => ({ roomId: 1, userDataManager: { getUserDataByIndex: (id: number) => state.users.get(id) } }) }));
vi.mock('../engine', () => ({ useUserAddedEvent: (_enabled: boolean, callback: any) => { state.added = callback; }, useUserRemovedEvent: (_enabled: boolean, callback: any) => { state.removed = callback; } }));
import { useUserChooserState } from './useUserChooserState';

afterEach(cleanup);
beforeEach(() => { state.allowed = true; state.users.clear(); });
describe('AIR user chooser contents', () => {
    it('includes humans, pets and both bot types, including room index zero', () => {
        [1, 2, 3, 4, 9].forEach((type, roomIndex) => state.users.set(roomIndex, { roomIndex, type, name: `User ${roomIndex}` }));
        const { result } = renderHook(useUserChooserState);
        act(() => result.current.populateChooser());
        expect(result.current.items.map(item => [item.id, item.type])).toEqual([[0, 'Habbo'], [1, 'Pet'], [2, 'Bot'], [3, 'Bot']]);
    });
    it('updates pets and bots as they enter or leave the room', () => {
        const { result } = renderHook(useUserChooserState);
        act(() => result.current.populateChooser());
        state.users.set(2, { roomIndex: 2, type: 4, name: 'Bot' });
        act(() => state.added({ id: 2, category: 100 }));
        expect(result.current.items[0].type).toBe('Bot');
        act(() => state.removed({ id: 2, category: 100 }));
        expect(result.current.items).toEqual([]);
    });
    it('continues to honor the room chooser restriction', () => {
        state.allowed = false;
        const { result } = renderHook(useUserChooserState);
        act(() => result.current.populateChooser());
        expect(result.current.items).toBeNull();
    });
});
