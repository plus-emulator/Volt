import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { WiredSection } from '../WiredSection';
import { WiredRadioGroup } from '../WiredOptions';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const CONTROL_OPTIONS = [
    { value: 0, label: 'wiredfurni.params.clock_control.0' },
    { value: 1, label: 'wiredfurni.params.clock_control.1' },
    { value: 2, label: 'wiredfurni.params.clock_control.2' },
    { value: 3, label: 'wiredfurni.params.clock_control.3' },
    { value: 4, label: 'wiredfurni.params.clock_control.4' }
];

const normalizeControl = (value: number) => {
    if (value < 0 || value > 4) return 0;

    return value;
};

export const WiredActionControlClockView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources = null } = useWired();
    const [control, setControl] = useState(0);
    const [furniSource, setFurniSource] = useState<number>(() => {
        if (trigger?.furniSources?.length) return trigger.furniSources[0];
        return (trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0;
    });

    const save = () => {
        setIntParams([control]);
        setFurniSources([furniSource]);
    };

    useEffect(() => {
        if (!trigger) return;

        setControl(trigger.intData.length > 0 ? normalizeControl(trigger.intData[0]) : 0);
        setFurniSource(trigger.furniSources[0]);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.clock_control')}>
                <WiredRadioGroup name="controlClock" value={control} onChange={setControl} options={CONTROL_OPTIONS.map(option => ({ id: option.value, label: LocalizeText(option.label) }))} />
            </WiredSection>
        </WiredActionBaseView>
    );
};
