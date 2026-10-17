import { GetRoomEngine, RoomControllerLevel, RoomEngineTriggerWidgetEvent } from '@volt/renderer';
import { useState } from 'react';
import { GetRoomSession, HasPermission, Permission } from '../../../../api';
import { useVoltEvent } from '../../../events';
import { useFurniRemovedEvent } from '../../engine';

const useFurnitureFootballGateWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [category, setCategory] = useState(-1);

    const onClose = () => {
        setObjectId(-1);
        setCategory(-1);
    };

    useVoltEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_CLOTHING_CHANGE, (event) => {
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);
        const roomSession = GetRoomSession();

        // AIR WIN63-202610151745-318700621 FurnitureClothingChangeWidgetHandler.as:85: room owner, any-room controller or room rights.
        const canEdit =
            roomSession?.isRoomOwner || HasPermission(Permission.RoomOwnerAny) || (roomSession?.controllerLevel ?? 0) >= RoomControllerLevel.GUEST;

        if (!roomObject || !canEdit) return;

        setObjectId(event.objectId);
        setCategory(event.category);
    });

    useFurniRemovedEvent(objectId !== -1 && category !== -1, (event) => {
        if (event.id !== objectId || event.category !== category) return;

        onClose();
    });

    return { objectId, setObjectId, onClose };
};

export const useFurnitureFootballGateWidget = useFurnitureFootballGateWidgetState;
