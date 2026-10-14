import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorFurniOnFurniView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources = null } = useWired();
    const [selectionType, setSelectionType] = useState(0);
    const [furniSource, setFurniSource] = useState<number>(() => {
        return trigger?.furniSources?.[0] ?? 100;
    });

    useEffect(() => {
        if (!trigger) return;

        setSelectionType(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = () => {
        setIntParams([selectionType]);
        setFurniSources([furniSource]);
    };

    return (
        <WiredSelectorBaseView
            hasSpecialInput={true} nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            hideDelay={true}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.selection_type')}>
                <WiredRadioGroup name="furniOnFurniSelectionType" value={selectionType} onChange={setSelectionType}
                    options={[0, 1, 2, 3].map(id => ({ id, label: LocalizeText(`wiredfurni.params.onfurni.${id}`) }))} />
            </WiredSection>
            <WiredSelectorOptionsSection />
        </WiredSelectorBaseView>
    );
};
