import { RoomObjectVariable } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import {
    isTeleportToRoomPickable,
    localizeWithFallback,
    WiredFurniType
} from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const PICKED_SOURCE = 100;

/**
 * Habbo's "teleport to room": sends the users to the room a picked room linker, room link or
 * teleporter leads to. AIR TeleportToRoom extends DefaultActionType without any owned form inputs.
 */
export const WiredActionTeleportToRoomView: FC<{}> = () => {
    const {
        trigger = null,
        setIntParams = null,
        setStringParam = null,
        setAllowedFurniCheck = null,
        setAllowedInteractionErrorKey = null,
        setFurniSources,
        setUserSources
    } = useWired();
    const [userSource, setUserSource] = useState(0);
    const [furniSource, setFurniSource] = useState(PICKED_SOURCE);

    useEffect(() => {
        if (!trigger) return;

        setUserSource(trigger.userSources[0] ?? 0);
        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    useEffect(() => {
        if (!setAllowedFurniCheck) return;

        setAllowedFurniCheck((roomObject, furniData) =>
            isTeleportToRoomPickable(roomObject?.model?.getValue<Record<string, unknown>>(RoomObjectVariable.FURNITURE_DATA), [
                furniData?.className,
                furniData?.name
            ])
        );
        setAllowedInteractionErrorKey?.(localizeWithFallback('wiredfurni.error.require_room_linker', 'Pick a room linker.'));

        return () => {
            setAllowedFurniCheck(null);
            setAllowedInteractionErrorKey?.(null);
        };
    }, [setAllowedFurniCheck, setAllowedInteractionErrorKey]);

    const save = () => {
        setStringParam('');
        setIntParams([]);
        setFurniSources([furniSource]);
        setUserSources([userSource]);
    };

    return (
        <WiredActionBaseView
            footer={
                <WiredSourcesSelector
                    furniSource={furniSource}
                    showFurni={true}
                    showUsers={true}
                    userSource={userSource}
                    onChangeFurni={setFurniSource}
                    onChangeUsers={setUserSource}
                />
            }
            hasSpecialInput={false}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
        />
    );
};
