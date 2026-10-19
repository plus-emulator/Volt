import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const PICKED_SOURCE = 100;

/**
 * Habbo's "teleport to room": sends the users to the room the other half of a picked WIRED Room
 * Linker stands in. AIR TeleportToRoom extends DefaultActionType without any owned form inputs, and
 * the client lets any furni be picked (UserDefinedRoomEventsCtrl.stuffSelected); the server refuses
 * the save with wiredfurni.error.require_room_linker.
 */
export const WiredActionTeleportToRoomView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setFurniSources, setUserSources } = useWired();
    const [userSource, setUserSource] = useState(0);
    const [furniSource, setFurniSource] = useState(PICKED_SOURCE);

    useEffect(() => {
        if (!trigger) return;

        setUserSource(trigger.userSources[0] ?? 0);
        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

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
