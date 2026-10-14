import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

const TEAM_TYPES = [0, 1, 2, 3, 4];

export const WiredSelectorUsersTeamView: FC<{}> = () => {
    const [teamType, setTeamType] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        setTeamType(trigger.intData.length > 0 ? trigger.intData[0] : 0);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = useCallback(() => {
        setIntParams([teamType]);
    }, [teamType, setIntParams]);

    return (
        <WiredSelectorBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={0} save={save} hideDelay={true}>
            <WiredSection title={LocalizeText('wiredfurni.params.team')}>
                <WiredRadioGroup name="usersTeamSelector" columns={2} value={teamType} onChange={setTeamType}
                    options={TEAM_TYPES.map(id => ({ id, newLine: id === 0, label: LocalizeText(id === 0 ? 'wiredfurni.params.team.any' : `wiredfurni.params.team.${id}`) }))} />
            </WiredSection>
            <WiredSelectorOptionsSection />
        </WiredSelectorBaseView>
    );
};
