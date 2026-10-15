import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType, WIRED_SLIDER_PULSES } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSlider';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const MINUTES_MIN = 0;
const MINUTES_MAX = 99;
const HALF_SECONDS_MIN = 0;
const HALF_SECONDS_MAX = 119;

const normalizeOperator = (value: number) => {
    if (value < 0 || value > 2) return 2;

    return value;
};

const normalizeMinutes = (value: number) => Math.max(MINUTES_MIN, Math.min(MINUTES_MAX, value));
const normalizeHalfSeconds = (value: number) => Math.max(HALF_SECONDS_MIN, Math.min(HALF_SECONDS_MAX, value));

export const WiredActionAdjustClockView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources } = useWired();
    const [operator, setOperator] = useState(2);
    const [furniSource, setFurniSource] = useState(100);
    const [minutes, setMinutes] = useState(0);
    const [halfSeconds, setHalfSeconds] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        setOperator(normalizeOperator(trigger.intData[3] ?? 2));
        setFurniSource(trigger.furniSources[0] ?? 100);
        setMinutes(normalizeMinutes(trigger.intData[1] ?? 0));
        setHalfSeconds(normalizeHalfSeconds((trigger.intData[0] ?? 0) * 2 + (trigger.intData[2] ?? 0)));
    }, [trigger]);

    const save = () => {
        setIntParams([Math.floor(halfSeconds / 2), minutes, halfSeconds % 2, operator]);
        setFurniSources([furniSource]);
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.choose_type')}>
                <WiredRadioGroup name="WiredActionAdjustClockViewComparison" options={[0, 1, 2].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.operator.${id}`) }))} value={operator} onChange={setOperator} />
            </WiredSection>
            <WiredSliderSection titleKey="wiredfurni.params.clock_minutes" unit="minutes" min={MINUTES_MIN} max={MINUTES_MAX} step={1} withInput={false} value={minutes} onChange={setMinutes} />
            <WiredSliderSection titleKey="wiredfurni.params.clock_seconds" unit="seconds" converter={WIRED_SLIDER_PULSES} min={HALF_SECONDS_MIN} max={HALF_SECONDS_MAX} step={1} withInput={false} value={halfSeconds} onChange={setHalfSeconds} />
        </WiredActionBaseView>
    );
};
