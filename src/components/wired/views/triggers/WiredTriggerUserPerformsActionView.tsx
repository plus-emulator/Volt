import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { WiredUserActionSections } from '../WiredUserActionSections';
import { useWired } from '../../../../hooks';
import { parseUserActionText, USER_ACTION, userActionText } from '../../../../api';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggerUserPerformsActionView: FC<{}> = () => {
    const [selectedAction, setSelectedAction] = useState<number>(USER_ACTION.WAVE);
    const [signFilterEnabled, setSignFilterEnabled] = useState(false);
    const [signId, setSignId] = useState(0);
    const [danceFilterEnabled, setDanceFilterEnabled] = useState(false);
    const [danceId, setDanceId] = useState(1);
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();

    const save = () => {
        const filtered = selectedAction === USER_ACTION.SIGN ? signFilterEnabled : selectedAction === USER_ACTION.DANCE && danceFilterEnabled;

        setIntParams([selectedAction]);
        setStringParam(userActionText(selectedAction, filtered && (selectedAction === USER_ACTION.SIGN ? signId : danceId) >= 0, selectedAction === USER_ACTION.SIGN ? signId : danceId));
    };

    useEffect(() => {
        if (!trigger) return;

        const action = trigger.intData.length > 0 ? trigger.intData[0] : USER_ACTION.WAVE;
        const parsed = parseUserActionText(trigger.stringData, action);

        setSelectedAction(action);
        setSignFilterEnabled(action === USER_ACTION.SIGN && parsed.filtered);
        setSignId(action === USER_ACTION.SIGN && parsed.filtered ? parsed.id : -1);
        setDanceFilterEnabled(action === USER_ACTION.DANCE && parsed.filtered);
        setDanceId(action === USER_ACTION.DANCE && parsed.filtered ? parsed.id : -1);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredUserActionSections action={selectedAction} onActionChange={setSelectedAction}
                signEnabled={signFilterEnabled} onSignEnabledChange={setSignFilterEnabled} signId={signId} onSignChange={setSignId}
                danceEnabled={danceFilterEnabled} onDanceEnabledChange={setDanceFilterEnabled} danceId={danceId} onDanceChange={setDanceId} />
        </WiredTriggerBaseView>
    );
};
