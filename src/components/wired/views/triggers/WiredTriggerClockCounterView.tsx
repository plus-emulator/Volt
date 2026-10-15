import { FC, useEffect, useState } from 'react';
import { WiredFurniType, WIRED_SLIDER_PULSES } from '../../../../api';
import { WiredSliderSection } from '../WiredSlider';
import { useWired } from '../../../../hooks';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const MINUTES_MIN = 0;
const MINUTES_MAX = 99;
const HALF_SECONDS_MIN = 0;
const HALF_SECONDS_MAX = 119;
const TRIGGER_FURNI_SOURCES: WiredSourceOption[] = [
    { value: 100, label: 'wiredfurni.params.sources.furni.100' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' }
];

const normalizeMinutes = (value: number) => Math.max(MINUTES_MIN, Math.min(MINUTES_MAX, value));
const normalizeHalfSeconds = (value: number) => Math.max(HALF_SECONDS_MIN, Math.min(HALF_SECONDS_MAX, value));

export const WiredTriggerClockCounterView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources } = useWired();
    const [furniSource, setFurniSource] = useState(100);
    const [minutes, setMinutes] = useState(0);
    const [halfSeconds, setHalfSeconds] = useState(0);

    const save = () => {
        setIntParams([Math.floor(halfSeconds / 2), minutes, halfSeconds % 2]);
        setFurniSources([furniSource]);
    };

    useEffect(() => {
        if (!trigger) return;

        setMinutes(normalizeMinutes(trigger.intData[1] ?? 0));
        setHalfSeconds(normalizeHalfSeconds((trigger.intData[0] ?? 0) * 2 + (trigger.intData[2] ?? 0)));
        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    return (
        <WiredTriggerBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} furniSources={TRIGGER_FURNI_SOURCES} onChangeFurni={setFurniSource} />}
        >
            <WiredSliderSection titleKey="wiredfurni.params.clock_minutes_elapsed" unit="minutes" min={MINUTES_MIN} max={MINUTES_MAX} step={1} withInput={false} value={minutes} onChange={setMinutes} />
            <WiredSliderSection titleKey="wiredfurni.params.clock_seconds_elapsed" unit="seconds" converter={WIRED_SLIDER_PULSES} min={HALF_SECONDS_MIN} max={HALF_SECONDS_MAX} step={1} withInput={false} value={halfSeconds} onChange={setHalfSeconds} />
        </WiredTriggerBaseView>
    );
};
