import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredQuantifierSection, WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const TEAM_OPTIONS = [0, 1, 2, 3, 4];
const PLACEMENT_OPTIONS = [0, 1, 2, 3];

export const WiredConditionTeamHasRankView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setUserSources, quantifier: nativeQuantifier, setQuantifier: setNativeQuantifier } = useWired();
    const [team, setTeam] = useState(0);
    const [placement, setPlacement] = useState(0);
    const [userSource, setUserSource] = useState(0);
    const [quantifier, setQuantifier] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        const nextTeam = trigger.intData.length > 0 ? trigger.intData[0] : 0;
        const nextPlacement = trigger.intData.length > 1 ? trigger.intData[1] : 0;
        const nextUserSource = trigger.userSources[0] ?? 0;
        const nextQuantifier = nativeQuantifier;

        setTeam(TEAM_OPTIONS.includes(nextTeam) ? nextTeam : 0);
        setPlacement(PLACEMENT_OPTIONS.includes(nextPlacement) ? nextPlacement : 0);
        setUserSource(nextUserSource);
        setQuantifier(nextQuantifier === 1 ? 1 : 0);
    }, [trigger, nativeQuantifier]);

    const save = () => {
        setIntParams([team, placement]);
        setUserSources([userSource]);
        setNativeQuantifier(quantifier);
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<>
                <WiredQuantifierSection name="teamHasRankQuantifier" kind="users" value={quantifier} onChange={setQuantifier} />
                <WiredSourcesSelector showUsers userSource={userSource} onChangeUsers={setUserSource} />
            </>}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.team')}>
                <WiredRadioGroup name="teamHasRank" columns={2} options={TEAM_OPTIONS.map(id => ({ id, label: LocalizeText(id === 0 ? 'wiredfurni.params.team.triggerer' : `wiredfurni.params.team.${id}`), newLine: id === 0 }))} value={team} onChange={setTeam} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.placement_selection')}>
                <WiredRadioGroup name="teamRankPlacement" columns={4} options={PLACEMENT_OPTIONS.map(id => ({ id, label: LocalizeText(`wiredfurni.params.placement.${id + 1}`) }))} value={placement} onChange={setPlacement} />
            </WiredSection>
        </WiredConditionBaseView>
    );
};
