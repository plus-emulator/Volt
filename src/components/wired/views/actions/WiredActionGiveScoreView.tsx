import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType, WIRED_SLIDER_ECHO, wiredSliderCountOrUnlimited } from '../../../../api';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSliderSection } from '../WiredSlider';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

/** GiveScore.as: the times-per-game slider runs 1 to 10 and its last step, 11, is "unlimited", which is saved as 0. */
const TIMES_UNLIMITED = 11;
const TIMES_CONVERTER = wiredSliderCountOrUnlimited(TIMES_UNLIMITED);

export const WiredActionGiveScoreView: FC<{}> = (props) => {
    const [points, setPoints] = useState(1);
    const [operation, setOperation] = useState(0);
    const { trigger = null, setIntParams = null, setUserSources = null } = useWired();
    const [userSource, setUserSource] = useState(0);
    const [quota, setQuota] = useState(TIMES_UNLIMITED);
    const save = () => {
        setIntParams([operation === 1 ? -points : points, quota === TIMES_UNLIMITED ? 0 : quota]);
        setUserSources([userSource]);
    };
    useEffect(() => {
        setPoints(Math.abs(trigger.intData[0]));
        setOperation(trigger.intData[0] < 0 ? 1 : 0);
        setQuota(trigger.intData[1] === 0 ? TIMES_UNLIMITED : Math.min(TIMES_UNLIMITED, Math.max(1, trigger.intData[1])));
        setUserSource(trigger.userSources[0]);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
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
                    options={[0, 1].map((value) => ({ id: value, label: LocalizeText(`wiredfurni.params.points_operation.${value}`) }))}
                    value={operation}
                    onChange={setOperation}
                />
            </WiredSection>
        </WiredActionBaseView>
    );
};
