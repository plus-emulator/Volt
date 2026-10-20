import {
    FurnitureMultiStateComposer,
    GetRoomEngine,
    RoomAreaSelectionManager,
    RoomEngineAreaHideStateEvent,
    RoomControllerLevel,
    RoomEngineTriggerWidgetEvent,
    RoomObjectVariable,
    SetAreaHideComposer
} from '@volt/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HasPermission, Permission, SendMessageComposer } from '../../../../api';
import { useVoltEvent } from '../../../events';
import { useRoom } from '../../useRoom';

/** AIR AreaHideFurniWidget saves every change at once (AUTO_SAVE) and the server clamps the size to 0..64. */
const MAX_AREA_SIZE = 64;

const clampSize = (value: number) => Math.max(0, Math.min(MAX_AREA_SIZE, Math.floor(value) || 0));

type AreaHideValues = {
    rootX: number;
    rootY: number;
    width: number;
    length: number;
    invisibility: boolean;
    wallItems: boolean;
    inverted: boolean;
};

const useFurnitureAreaHideWidgetState = () => {
    const [objectId, setObjectId] = useState<number>(-1);
    const [category, setCategory] = useState<number>(-1);
    const [isOn, setIsOn] = useState<boolean>(false);
    const [rootX, setRootX] = useState<number>(0);
    const [rootY, setRootY] = useState<number>(0);
    const [width, setWidth] = useState<number>(0);
    const [length, setLength] = useState<number>(0);
    const [invisibility, setInvisibility] = useState<boolean>(false);
    const [wallItems, setWallItems] = useState<boolean>(false);
    const [inverted, setInverted] = useState<boolean>(false);
    const { roomSession = null } = useRoom();

    const onClose = () => {
        setObjectId(-1);
        setCategory(-1);
        setIsOn(false);
        setRootX(0);
        setRootY(0);
        setWidth(0);
        setLength(0);
        setInvisibility(false);
        setWallItems(false);
        setInverted(false);

        GetRoomEngine().areaSelectionManager.deactivate();
    };

    const valuesRef = useRef<AreaHideValues>({ rootX: 0, rootY: 0, width: 0, length: 0, invisibility: false, wallItems: false, inverted: false });

    valuesRef.current = { rootX, rootY, width, length, invisibility, wallItems, inverted };

    const objectIdRef = useRef<number>(-1);

    objectIdRef.current = objectId;

    // AIR updateData: out 3831 with the whole rectangle and all three options.
    const save = useCallback((changes: Partial<AreaHideValues>) => {
        if (objectIdRef.current === -1) return;

        const next = { ...valuesRef.current, ...changes };

        next.width = clampSize(next.width);
        next.length = clampSize(next.length);
        next.rootX = Math.max(0, next.rootX);
        next.rootY = Math.max(0, next.rootY);

        valuesRef.current = next;

        setRootX(next.rootX);
        setRootY(next.rootY);
        setWidth(next.width);
        setLength(next.length);
        setInvisibility(next.invisibility);
        setWallItems(next.wallItems);
        setInverted(next.inverted);

        SendMessageComposer(new SetAreaHideComposer(objectIdRef.current, next.rootX, next.rootY, next.width, next.length, next.invisibility, next.wallItems, next.inverted));
    }, []);

    // AIR onClickOnOff: the normal use furniture packet.
    const toggleOnOff = useCallback(() => {
        if (objectIdRef.current === -1) return;

        SendMessageComposer(new FurnitureMultiStateComposer(objectIdRef.current, 0));
    }, []);

    useVoltEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_AREA_HIDE, (event) => {
        // AIR FurnitureAreaHideWidgetHandler: room owner, rights holder or any-room control.
        if (!roomSession || !(roomSession.isRoomOwner || roomSession.controllerLevel >= RoomControllerLevel.GUEST || HasPermission(Permission.RoomOwnerAny))) return;

        setObjectId(event.objectId);
        setCategory(event.category);

        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        const model = roomObject.model;
        const data = model.getValue<number[]>(RoomObjectVariable.FURNITURE_DATA) || [];

        setIsOn(roomObject.getState(0) === 1);
        setRootX(model.getValue<number>(RoomObjectVariable.FURNITURE_AREA_HIDE_ROOT_X) ?? data[1] ?? 0);
        setRootY(model.getValue<number>(RoomObjectVariable.FURNITURE_AREA_HIDE_ROOT_Y) ?? data[2] ?? 0);
        setWidth(model.getValue<number>(RoomObjectVariable.FURNITURE_AREA_HIDE_WIDTH) ?? data[3] ?? 0);
        setLength(model.getValue<number>(RoomObjectVariable.FURNITURE_AREA_HIDE_LENGTH) ?? data[4] ?? 0);
        setInvisibility((model.getValue<number>(RoomObjectVariable.FURNITURE_AREA_HIDE_INVISIBILITY) ?? data[5] ?? 0) === 1);
        setWallItems((model.getValue<number>(RoomObjectVariable.FURNITURE_AREA_HIDE_WALL_ITEMS) ?? data[6] ?? 0) === 1);
        setInverted((model.getValue<number>(RoomObjectVariable.FURNITURE_AREA_HIDE_INVERT) ?? data[7] ?? 0) === 1);
    });

    useVoltEvent<RoomEngineAreaHideStateEvent>(RoomEngineAreaHideStateEvent.UPDATE_STATE_AREA_HIDE, (event) => {
        if (objectId !== event.objectId) return;

        setCategory(event.category);
        setIsOn(event.isOn);
    });

    useEffect(() => {
        if (objectId === -1) return;

        if (!isOn) {
            const callback = (selectedX: number, selectedY: number, selectedWidth: number, selectedLength: number) => {
                save({ rootX: selectedX, rootY: selectedY, width: selectedWidth, length: selectedLength });
            };

            if (GetRoomEngine().areaSelectionManager.activate(callback, RoomAreaSelectionManager.HIGHLIGHT_DARKEN)) {
                const values = valuesRef.current;

                GetRoomEngine().areaSelectionManager.setHighlight(values.rootX, values.rootY, values.width, values.length);
            }
        } else {
            GetRoomEngine().areaSelectionManager.deactivate();
        }
    }, [objectId, isOn, save]);

    return {
        objectId,
        category,
        isOn,
        rootX,
        rootY,
        width,
        length,
        invisibility,
        wallItems,
        inverted,
        save,
        toggleOnOff,
        onClose
    };
};

export const useFurnitureAreaHideWidget = useFurnitureAreaHideWidgetState;
