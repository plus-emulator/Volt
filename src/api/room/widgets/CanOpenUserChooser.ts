import { GetRoomEngine, IRoomSession, RoomControllerLevel } from '@volt/renderer';

/**
 * AIR `ChatInputWidgetHandler` `:chooser` + `UserChooserWidgetHandler.isChooserDisabled`:
 * a room whose ConfigurationItemStates disable the chooser keeps the user list
 * closed for visitors below rights (controller level 1).
 */
export const CanOpenUserChooser = (roomSession: IRoomSession): boolean =>
    !GetRoomEngine()?.activeRoomHasChooserDisabled || (roomSession?.controllerLevel ?? 0) >= RoomControllerLevel.GUEST;
