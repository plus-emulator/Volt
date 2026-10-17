import {
    FurniRecolorUpdateEvent,
    GetRecolorableFurnitureColors,
    GetRoomEngine,
    GetSessionDataManager,
    IRoomSession,
    RecolorFurnitureComposer,
    RoomObjectCategory,
    RoomObjectVariable
} from '@volt/renderer';
import { useCallback, useRef, useState } from 'react';
import { RoomWidgetFurnitureRecolorEvent, SendMessageComposer } from '../../../../api';
import { HasPermission, Permission } from '../../../../api/permissions';
import { useMessageEvent, useUiEvent } from '../../../events';
import { useWiredToolsState } from '../../../wired-tools/useWiredToolsState';
import { useFurniRemovedEvent } from '../../engine';
import { useRoom } from '../../useRoom';

/** What FurnitureRecolorPreviewView.open (AIR FurnitureRecolorPreviewView.as:46) reads from the room object for its images. */
export interface IFurnitureRecolorPreviewSource {
    typeId: number;
    direction: number;
    extras: string;
    data: { [key: string]: string };
}

/** AIR FurnitureRecolorController.hasRights (FurnitureRecolorController.as:151): owner, rights or any-room controller, not in play test. */
const hasRecolorRights = (roomSession: IRoomSession, playTestMode: boolean): boolean =>
    !!roomSession && !playTestMode && (roomSession.isRoomOwner || roomSession.controllerLevel >= 1 || HasPermission(Permission.RoomOwnerAny));

const getRecolorableColor = (roomId: number, objectId: number): number =>
{
    const roomObject = GetRoomEngine().getRoomObject(roomId, objectId, RoomObjectCategory.FLOOR);
    const color = roomObject?.model?.getValue<number>(RoomObjectVariable.FURNITURE_RECOLORABLE_COLOR);

    return typeof color === 'number' && !isNaN(color) ? color : null;
};

/** FurnitureRecolorController.allowedColors (FurnitureRecolorController.as:162): the palette of the furni's floor class. */
const getAllowedColors = (roomId: number, objectId: number): number[] =>
{
    const roomObject = GetRoomEngine().getRoomObject(roomId, objectId, RoomObjectCategory.FLOOR);

    if (!roomObject) return [];

    const furniData = GetSessionDataManager().getFloorItemData(roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID));

    return furniData ? GetRecolorableFurnitureColors(furniData.className) : [];
};

/** FurnitureRecolorController.collectRoomColors (FurnitureRecolorController.as:77): unique allowed floor colours, sorted numerically. */
const collectRoomColors = (roomId: number, allowedColors: number[]): number[] =>
{
    const colors = new Set<number>();

    for (const roomObject of GetRoomEngine().getRoomObjects(roomId, RoomObjectCategory.FLOOR) ?? [])
    {
        const color = roomObject?.model?.getValue<number>(RoomObjectVariable.FURNITURE_RECOLORABLE_COLOR);

        if (typeof color === 'number' && !isNaN(color) && allowedColors.includes(color)) colors.add(color);
    }

    return [...colors].sort((a, b) => a - b);
};

const useFurnitureRecolorWidgetState = () =>
{
    const [objectId, setObjectId] = useState(-1);
    const [roomId, setRoomId] = useState(-1);
    const [previewSource, setPreviewSource] = useState<IFurnitureRecolorPreviewSource>(null);
    const [originalColor, setOriginalColor] = useState(0);
    const [selectedColor, setSelectedColor] = useState(0);
    const [allowedColors, setAllowedColors] = useState<number[]>([]);
    const [roomColors, setRoomColors] = useState<number[]>([]);
    const [scope, setScope] = useState(0);
    const pendingColorRef = useRef<number>(null);
    const { roomSession = null } = useRoom();
    const { accountPreferences = null } = useWiredToolsState();
    const playTestMode = !!accountPreferences?.playTestMode;

    const onClose = useCallback(() =>
    {
        pendingColorRef.current = null;
        setObjectId(-1);
        setRoomId(-1);
        setPreviewSource(null);
    }, []);

    // FurnitureRecolorController.open (FurnitureRecolorController.as:51-75).
    useUiEvent<RoomWidgetFurnitureRecolorEvent>(RoomWidgetFurnitureRecolorEvent.OPEN, (event) =>
    {
        if (event.category !== RoomObjectCategory.FLOOR || !hasRecolorRights(roomSession, playTestMode)) return;

        const currentRoomId = roomSession.roomId;
        const roomObject = GetRoomEngine().getRoomObject(currentRoomId, event.objectId, RoomObjectCategory.FLOOR);

        if (!roomObject) return;

        const color = getRecolorableColor(currentRoomId, event.objectId);

        if (color === null) return;

        const model = roomObject.model;
        const data = { ...(model.getValue<{ [key: string]: string }>(RoomObjectVariable.FURNITURE_DATA) ?? {}) };

        if (data.state === undefined || data.state === null) data.state = String(roomObject.getState(0));

        const allowed = getAllowedColors(currentRoomId, event.objectId);

        pendingColorRef.current = null;
        setObjectId(event.objectId);
        setRoomId(currentRoomId);
        setPreviewSource({
            typeId: model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID),
            direction: roomObject.getDirection().x,
            extras: model.getValue<string>(RoomObjectVariable.FURNITURE_EXTRAS) ?? null,
            data
        });
        setAllowedColors(allowed);
        setRoomColors(collectRoomColors(currentRoomId, allowed));
        setOriginalColor(color);
        setSelectedColor(color);
        setScope(0);
    });

    // FurnitureRecolorController.apply (FurnitureRecolorController.as:103-116).
    const apply = () =>
    {
        if (objectId === -1) return;

        if (!hasRecolorRights(roomSession, playTestMode) || roomSession.roomId !== roomId || !GetRoomEngine().getRoomObject(roomId, objectId, RoomObjectCategory.FLOOR))
        {
            onClose();

            return;
        }

        if (!getAllowedColors(roomId, objectId).includes(selectedColor)) return;

        pendingColorRef.current = selectedColor;
        SendMessageComposer(new RecolorFurnitureComposer(objectId, scope, selectedColor));
    };

    // FurnitureRecolorController.onFurniRecolorUpdate (FurnitureRecolorController.as:118-136): the room engine already applied the colours.
    useMessageEvent<FurniRecolorUpdateEvent>(FurniRecolorUpdateEvent, (event) =>
    {
        const pendingColor = pendingColorRef.current;

        if (pendingColor === null || objectId === -1 || !roomSession || roomSession.roomId !== roomId) return;

        for (const update of event.getParser().updates ?? [])
        {
            const color = ((update.red & 0xff) << 16) | ((update.green & 0xff) << 8) | (update.blue & 0xff);

            if (color !== pendingColor || !update.furniIds.includes(objectId)) continue;

            pendingColorRef.current = null;
            setOriginalColor(color);
            setRoomColors(collectRoomColors(roomId, allowedColors));

            return;
        }
    });

    // FurnitureRecolorController.onFurnitureRemoved (FurnitureRecolorController.as:138).
    useFurniRemovedEvent(objectId !== -1, (event) =>
    {
        if (event.id !== objectId || event.category !== RoomObjectCategory.FLOOR) return;

        onClose();
    });

    return {
        objectId,
        previewSource,
        originalColor,
        selectedColor,
        setSelectedColor,
        allowedColors,
        roomColors,
        scope,
        setScope,
        apply,
        onClose
    };
};

export const useFurnitureRecolorWidget = useFurnitureRecolorWidgetState;
