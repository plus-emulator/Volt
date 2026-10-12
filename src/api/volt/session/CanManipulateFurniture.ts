import { GetRoomEngine, IRoomSession, RoomControllerLevel } from '@volt/renderer';
import { HasPermission, Permission } from '../../permissions';
import { IsOwnerOfFurniture } from './IsOwnerOfFurniture';

/**
 * AIR RoomDesktop `checkFurniManipulationRights`: rights in the room, any-room control,
 * owning the furni, or a room whose ConfigurationItemStates enable free furni movement.
 */
export function CanManipulateFurniture(roomSession: IRoomSession, objectId: number, category: number): boolean {
    if (!roomSession) return false;

    const roomEngine = GetRoomEngine();

    return (
        roomSession.isRoomOwner ||
        roomSession.controllerLevel >= RoomControllerLevel.GUEST ||
        HasPermission(Permission.RoomOwnerAny) ||
        IsOwnerOfFurniture(roomEngine.getRoomObject(roomSession.roomId, objectId, category)) ||
        roomEngine.activeRoomHasFreeFurniMovementsMode === true
    );
}
