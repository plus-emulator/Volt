import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType, WIRED_SLIDER_HUNDREDTH } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSliderSection } from '../WiredSlider';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionSetAltitudeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources = null } = useWired();
    const [operator, setOperator] = useState(2);
    const [furniSource, setFurniSource] = useState(0);
    // AIR SetFurniAltitude stores hundredths directly; the input converter displays tile heights.
    const [altitude, setAltitude] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        const nextOperator = trigger.intData[1] ?? 2;
        setOperator(nextOperator >= 0 && nextOperator <= 2 ? nextOperator : 2);
        setFurniSource(trigger.furniSources[0]);
        setAltitude(Math.min(8000, Math.max(0, trigger.intData[0] ?? 0)));
    }, [trigger]);

    const save = () => {
        setIntParams([altitude, operator]);
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
                <WiredRadioGroup
                    name="setAltitudeOperator"
                    options={[0, 1, 2].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.operator.${id}`) }))}
                    value={operator}
                    onChange={setOperator}
                />
            </WiredSection>
            <WiredSliderSection converter={WIRED_SLIDER_HUNDREDTH} min={0} max={8000} step={1} titleKey="wiredfurni.params.setaltitude" value={altitude} onChange={setAltitude} />
        </WiredActionBaseView>
    );
};
