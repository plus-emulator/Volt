import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { WiredQuantifierSection } from '../WiredOptions';
import { WiredUserActionSections } from '../WiredUserActionSections';
import { useWired } from '../../../../hooks';
import { parseUserActionText, USER_ACTION, userActionText } from '../../../../api';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const USER_ACTION_SOURCES: WiredSourceOption[] = [
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];

interface WiredConditionUserPerformsActionViewProps {
    negative?: boolean;
}

export const WiredConditionUserPerformsActionView: FC<WiredConditionUserPerformsActionViewProps> = (props) => {
    const { negative = false } = props;
    const [selectedAction, setSelectedAction] = useState<number>(USER_ACTION.WAVE);
    const [signFilterEnabled, setSignFilterEnabled] = useState(false);
    const [signId, setSignId] = useState(0);
    const [danceFilterEnabled, setDanceFilterEnabled] = useState(false);
    const [danceId, setDanceId] = useState(1);
    const [userSource, setUserSource] = useState(0);
    const { trigger = null, quantifier = 0, setQuantifier = null, setIntParams = null, setStringParam = null, setUserSources = null } = useWired();

    const save = () => {
        const filtered = selectedAction === USER_ACTION.SIGN ? signFilterEnabled : selectedAction === USER_ACTION.DANCE && danceFilterEnabled;

        setIntParams([selectedAction]);
        setStringParam(userActionText(selectedAction, filtered && (selectedAction === USER_ACTION.SIGN ? signId : danceId) >= 0, selectedAction === USER_ACTION.SIGN ? signId : danceId));
        setUserSources([userSource]);
    };

    useEffect(() => {
        if (!trigger) return;

        const action = trigger.intData.length > 0 ? trigger.intData[0] : USER_ACTION.WAVE;
        const parsed = parseUserActionText(trigger.stringData, action);
        const nextUserSource = trigger.userSources.length > 0 ? trigger.userSources[0] : 0;

        setSelectedAction(action);
        setSignFilterEnabled(action === USER_ACTION.SIGN && parsed.filtered);
        setSignId(action === USER_ACTION.SIGN && parsed.filtered ? parsed.id : -1);
        setDanceFilterEnabled(action === USER_ACTION.DANCE && parsed.filtered);
        setDanceId(action === USER_ACTION.DANCE && parsed.filtered ? parsed.id : -1);
        setUserSource(nextUserSource);
    }, [trigger]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true} nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<>
                <WiredQuantifierSection kind="users" name="userActionQuantifier" negative={negative} value={quantifier} onChange={setQuantifier} />
                <WiredSourcesSelector showUsers userSource={userSource} userSources={USER_ACTION_SOURCES} onChangeUsers={setUserSource} />
            </>}
        >
            <WiredUserActionSections action={selectedAction} onActionChange={setSelectedAction}
                signEnabled={signFilterEnabled} onSignEnabledChange={setSignFilterEnabled} signId={signId} onSignChange={setSignId}
                danceEnabled={danceFilterEnabled} onDanceEnabledChange={setDanceFilterEnabled} danceId={danceId} onDanceChange={setDanceId} />
        </WiredConditionBaseView>
    );
};
