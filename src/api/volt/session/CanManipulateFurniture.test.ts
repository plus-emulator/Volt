import { IRoomSession } from '@volt/renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CanManipulateFurniture } from './CanManipulateFurniture';

const room = vi.hoisted(() => ({ freeFurniMovements: false, ownerId: 0, permissions: new Map<string, number>() }));

vi.mock('@volt/renderer', () => ({
    GetRoomEngine: () => ({
        activeRoomHasFreeFurniMovementsMode: room.freeFurniMovements,
        getRoomObject: () => ({ model: { getValue: () => room.ownerId } })
    }),
    GetSessionDataManager: () => ({ userId: 42, getPermissionsSnapshot: () => room.permissions }),
    RoomControllerLevel: { NONE: 0, GUEST: 1 },
    RoomObjectVariable: { FURNITURE_OWNER_ID: 'furniture_owner_id' }
}));

const visitor = { roomId: 3, isRoomOwner: false, controllerLevel: 0 } as unknown as IRoomSession;

beforeEach(() => {
    room.freeFurniMovements = false;
    room.ownerId = 0;
    room.permissions.clear();
});

describe('CanManipulateFurniture (AIR checkFurniManipulationRights)', () => {
    it('refuses a visitor without rights on someone else’s furni', () => {
        expect(CanManipulateFurniture(visitor, 7, 10)).toBe(false);
    });

    it('lets a visitor move furni in a room with free furni movement', () => {
        room.freeFurniMovements = true;

        expect(CanManipulateFurniture(visitor, 7, 10)).toBe(true);
    });

    it('still allows rights holders and furni owners', () => {
        expect(CanManipulateFurniture({ ...visitor, controllerLevel: 1 } as unknown as IRoomSession, 7, 10)).toBe(true);

        room.ownerId = 42;

        expect(CanManipulateFurniture(visitor, 7, 10)).toBe(true);
    });

    it('refuses without a room session', () => {
        room.freeFurniMovements = true;

        expect(CanManipulateFurniture(null, 7, 10)).toBe(false);
    });
});
