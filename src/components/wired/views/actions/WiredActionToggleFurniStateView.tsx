import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionToggleFurniStateView: FC<{}> = (props) => {
    const { trigger = null, setIntParams = null, setFurniSources } = useWired();
    const [toggleType, setToggleType] = useState(0);
    const [furniSource, setFurniSource] = useState(100);
    useEffect(() => {
        setToggleType(trigger?.intData[0] ?? 0);
        setFurniSource(trigger?.furniSources[0] ?? 100);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () => {
        setIntParams([toggleType]);
        setFurniSources([furniSource]);
    };

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
        >
            <WiredSection title={localizeWithFallback('wiredfurni.params.toggletype_selection', LocalizeText('wiredfurni.params.operator.2'))}>
                <WiredRadioGroup name="toggleType" value={toggleType} onChange={setToggleType}
                    options={[0, 1].map(id => ({ id, label: LocalizeText(`wiredfurni.params.toggletype.${id}`) }))} />
            </WiredSection>
        </WiredActionBaseView>
    );
};
