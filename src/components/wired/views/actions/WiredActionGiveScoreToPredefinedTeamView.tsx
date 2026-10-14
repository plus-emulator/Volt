import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WIRED_SLIDER_ECHO, WiredFurniType, wiredSliderCountOrUnlimited } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSliderSection } from '../WiredSlider';
import { WiredActionBaseView } from './WiredActionBaseView';

/** GiveScore.as, which class_4040 extends: the times-per-game slider runs 1 to 10 and its last step, 11, is "unlimited" (saved as 0). */
const TIMES_UNLIMITED = 11;
const TIMES_CONVERTER = wiredSliderCountOrUnlimited(TIMES_UNLIMITED);

/** The official card has no user selector (r62-batch-02: no user or furni sources offered), only the team radio. */
export const WiredActionGiveScoreToPredefinedTeamView: FC<{}> = (props) => {
    const [points, setPoints] = useState(1);
    const [quota, setQuota] = useState(TIMES_UNLIMITED);
    const [operation, setOperation] = useState(0);
    const [selectedTeam, setSelectedTeam] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => {
        setIntParams([operation === 1 ? -points : points, quota === TIMES_UNLIMITED ? 0 : quota, selectedTeam]);
    };

    useEffect(() => {
        if (trigger.intData.length >= 3) {
            setPoints(Math.max(1, Math.abs(trigger.intData[0])));
            setOperation(trigger.intData[0] < 0 ? 1 : 0);
            setQuota(trigger.intData[1] === 0 ? TIMES_UNLIMITED : Math.min(TIMES_UNLIMITED, Math.max(1, trigger.intData[1])));
            setSelectedTeam(trigger.intData[2]);
        } else {
            setQuota(TIMES_UNLIMITED);
            setPoints(1);
            setOperation(0);
            setSelectedTeam(1);
        }
    }, [trigger]);

    return (
        <WiredActionBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSliderSection converter={WIRED_SLIDER_ECHO} max={1000} min={1} titleKey="wiredfurni.params.setpoints2" value={points} onChange={setPoints} />
            <WiredSliderSection
                converter={TIMES_CONVERTER}
                max={TIMES_UNLIMITED}
                min={1}
                titleKey="wiredfurni.params.settimesingame"
                unit="times"
                value={quota}
                withInput={false}
                onChange={setQuota}
            />
            <WiredSection title={localizeWithFallback('wiredfurni.params.points_operation', 'Type of effect:')}>
                <WiredRadioGroup
                    name="pointsOperation"
                    options={[0, 1].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.points_operation.${id}`) }))}
                    value={operation}
                    onChange={setOperation}
                />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.team')}>
                <WiredRadioGroup
                    columns={2}
                    name="selectedTeam"
                    options={[1, 2, 3, 4].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.team.${id}`) }))}
                    value={selectedTeam}
                    onChange={setSelectedTeam}
                />
            </WiredSection>
        </WiredActionBaseView>
    );
};
