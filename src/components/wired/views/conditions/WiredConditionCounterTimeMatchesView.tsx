import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType, WIRED_SLIDER_PULSES } from '../../../../api';
import { Text } from '../../../../common';
import { WiredSliderSection } from '../WiredSlider';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const MINUTES_MIN = 0;
const MINUTES_MAX = 99;
const HALF_SECONDS_MIN = 0;
const HALF_SECONDS_MAX = 119;

const normalizeComparison = (value: number) => {
    if (value < 0 || value > 2) return 1;

    return value;
};

const normalizeMinutes = (value: number) => Math.max(MINUTES_MIN, Math.min(MINUTES_MAX, value));
const normalizeHalfSeconds = (value: number) => Math.max(HALF_SECONDS_MIN, Math.min(HALF_SECONDS_MAX, value));

export const WiredConditionCounterTimeMatchesView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources, quantifier: nativeQuantifier, setQuantifier: setNativeQuantifier } = useWired();
    const [comparison, setComparison] = useState(1);
    const [furniSource, setFurniSource] = useState<number>(() => {
        return trigger?.furniSources[0] ?? 100;
    });
    const [minutes, setMinutes] = useState(0);
    const [halfSeconds, setHalfSeconds] = useState(0);
    const [quantifier, setQuantifier] = useState(0);

    const save = () => {
        setIntParams([Math.floor(halfSeconds / 2), normalizeMinutes(minutes), halfSeconds % 2, normalizeComparison(comparison)]);
        setFurniSources([furniSource]);
        setNativeQuantifier(quantifier);
    };

    useEffect(() => {
        if (!trigger) return;

        setComparison(normalizeComparison(trigger.intData[3] ?? 1));
        setMinutes(trigger.intData.length > 1 ? normalizeMinutes(trigger.intData[1]) : 0);
        setHalfSeconds(normalizeHalfSeconds((trigger.intData[0] ?? 0) * 2 + (trigger.intData[2] ?? 0)));
        setFurniSource(trigger.furniSources[0] ?? 100);
        setQuantifier(nativeQuantifier);
    }, [trigger, nativeQuantifier]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                        {[0, 1].map((value) => (
                            <label key={value} className="flex items-center gap-1">
                                <input
                                    checked={quantifier === value}
                                    className="form-check-input"
                                    name="counterTimeQuantifier"
                                    type="radio"
                                    onChange={() => setQuantifier(value)}
                                />
                                <Text>{LocalizeText(`wiredfurni.params.quantifier.furni.${value}`)}</Text>
                            </label>
                        ))}
                    </div>
                    <WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />
                </div>
            }
        >
            <WiredSection title={LocalizeText('wiredfurni.params.comparison_selection')}>
                <WiredRadioGroup name="WiredConditionCounterTimeMatchesViewComparison" options={[0, 1, 2].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.comparison.${id}`) }))} value={comparison} onChange={setComparison} />
            </WiredSection>
            <WiredSliderSection titleKey="wiredfurni.params.clock_minutes_elapsed" unit="minutes" min={MINUTES_MIN} max={MINUTES_MAX} step={1} withInput={false} value={minutes} onChange={setMinutes} />
            <WiredSliderSection titleKey="wiredfurni.params.clock_seconds_elapsed" unit="seconds" converter={WIRED_SLIDER_PULSES} min={HALF_SECONDS_MIN} max={HALF_SECONDS_MAX} step={1} withInput={false} value={halfSeconds} onChange={setHalfSeconds} />
        </WiredConditionBaseView>
    );
};
