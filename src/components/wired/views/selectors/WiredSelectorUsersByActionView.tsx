import { FC, useCallback, useEffect, useState } from 'react';
import { WiredUserActionSections } from '../WiredUserActionSections';
import { useWired } from '../../../../hooks';
import { parseUserActionText, USER_ACTION, userActionText } from '../../../../api';
import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorUsersByActionView: FC<{}> = () => {
    const [selectedAction, setSelectedAction] = useState<number>(USER_ACTION.WAVE);
    const [signFilterEnabled, setSignFilterEnabled] = useState(false);
    const [signId, setSignId] = useState(0);
    const [danceFilterEnabled, setDanceFilterEnabled] = useState(false);
    const [danceId, setDanceId] = useState(1);
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        // own: [action code]; the text is the sign number or "dance N" when the action is filtered.
        const action = trigger.intData.length > 0 ? trigger.intData[0] : USER_ACTION.WAVE;
        const parsed = parseUserActionText(trigger.stringData, action);

        setSelectedAction(action);
        setSignFilterEnabled(action === USER_ACTION.SIGN && parsed.filtered);
        setSignId(action === USER_ACTION.SIGN && parsed.filtered ? parsed.id : -1);
        setDanceFilterEnabled(action === USER_ACTION.DANCE && parsed.filtered);
        setDanceId(action === USER_ACTION.DANCE && parsed.filtered ? parsed.id : -1);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = useCallback(() => {
        const filtered = selectedAction === USER_ACTION.SIGN ? signFilterEnabled : selectedAction === USER_ACTION.DANCE && danceFilterEnabled;

        setIntParams([selectedAction]);
        setStringParam(userActionText(selectedAction, filtered && (selectedAction === USER_ACTION.SIGN ? signId : danceId) >= 0, selectedAction === USER_ACTION.SIGN ? signId : danceId));
    }, [danceFilterEnabled, danceId, selectedAction, setIntParams, setStringParam, signFilterEnabled, signId]);

    return (
        <WiredSelectorBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={0} save={save} hideDelay={true}>
            <WiredUserActionSections action={selectedAction} onActionChange={setSelectedAction}
                signEnabled={signFilterEnabled} onSignEnabledChange={setSignFilterEnabled} signId={signId} onSignChange={setSignId}
                danceEnabled={danceFilterEnabled} onDanceEnabledChange={setDanceFilterEnabled} danceId={danceId} onDanceChange={setDanceId} />
            <WiredSelectorOptionsSection />
        </WiredSelectorBaseView>
    );
};
