import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredQuantifierSection, WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredTextInput } from '../WiredTextInput';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const ENTITY_HABBO = 1;
const ENTITY_PET = 2;
const ENTITY_BOT = 4;
const AVATAR_MODE_ANY = 0;
const AVATAR_MODE_CERTAIN = 1;
const SOURCE_SPECIFIED_USERNAME = 101;

const MATCH_USER_SOURCES: WiredSourceOption[] = [
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];

const COMPARE_USER_SOURCES: WiredSourceOption[] = [...MATCH_USER_SOURCES, { value: SOURCE_SPECIFIED_USERNAME, label: 'wiredfurni.params.sources.users.101' }];

interface WiredConditionTriggererMatchViewProps {
    negative?: boolean;
}

export const WiredConditionTriggererMatchView: FC<WiredConditionTriggererMatchViewProps> = ({ negative = false }) => {
    const [entityType, setEntityType] = useState(ENTITY_HABBO);
    const [avatarMode, setAvatarMode] = useState(AVATAR_MODE_ANY);
    const [username, setUsername] = useState('');
    const [matchUserSource, setMatchUserSource] = useState(0);
    const [compareUserSource, setCompareUserSource] = useState(0);
    const [quantifier, setQuantifier] = useState(0);
    const {
        trigger = null,
        setIntParams = null,
        setStringParam = null,
        setUserSources,
        quantifier: nativeQuantifier,
        setQuantifier: setNativeQuantifier
    } = useWired();

    const needsUsername = avatarMode === AVATAR_MODE_CERTAIN || compareUserSource === SOURCE_SPECIFIED_USERNAME;

    const save = () => {
        setIntParams([entityType]);
        setUserSources([matchUserSource, avatarMode === AVATAR_MODE_CERTAIN ? SOURCE_SPECIFIED_USERNAME : compareUserSource]);
        setNativeQuantifier(quantifier);
        setStringParam(username);
    };

    useEffect(() => {
        if (!trigger) return;

        setEntityType(trigger.intData.length > 0 ? trigger.intData[0] : ENTITY_HABBO);
        setAvatarMode(trigger.userSources[1] === SOURCE_SPECIFIED_USERNAME ? AVATAR_MODE_CERTAIN : AVATAR_MODE_ANY);
        setMatchUserSource(trigger.userSources[0] ?? 0);
        setCompareUserSource(trigger.userSources[1] ?? 0);
        setQuantifier(nativeQuantifier);
        setUsername(trigger.stringData || '');
    }, [trigger, nativeQuantifier]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<>
                <WiredQuantifierSection name="triggererMatchQuantifier" kind="users" negative={negative} value={quantifier} onChange={setQuantifier} />
                <WiredSourcesSelector showUsers userSource={matchUserSource} userSources={MATCH_USER_SOURCES} usersTitle="wiredfurni.params.sources.users.title.match.0" onChangeUsers={setMatchUserSource} />
                <WiredSourcesSelector showUsers userSlot={1} userSource={compareUserSource} userSources={COMPARE_USER_SOURCES} usersTitle="wiredfurni.params.sources.users.title.match.1" onChangeUsers={setCompareUserSource} />
            </>}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.usertype')}>
                <WiredRadioGroup name="triggererEntityType" options={[ENTITY_HABBO, ENTITY_PET, ENTITY_BOT].map(id => ({ id, label: LocalizeText(`wiredfurni.params.usertype.${id}`) }))} value={entityType} onChange={setEntityType} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.picktriggerer')}>
                <WiredRadioGroup name="triggererAvatarMode" options={[
                    { id: AVATAR_MODE_ANY, label: LocalizeText('wiredfurni.params.anyavatar') },
                    { id: AVATAR_MODE_CERTAIN, label: LocalizeText('wiredfurni.params.certainavatar'), extra: <span title={LocalizeText('wiredfurni.tooltip.avatarname')}><WiredTextInput value={username} maxLength={32} disabled={!needsUsername} onChange={setUsername} /></span> }
                ]} value={avatarMode} onChange={setAvatarMode} />
            </WiredSection>
        </WiredConditionBaseView>
    );
};
