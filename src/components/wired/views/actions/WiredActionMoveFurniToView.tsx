import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { nativeSourceOptions } from '../WiredSourcesSelector';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSlider';
import { WiredSection } from '../WiredSection';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionMoveFurniToView: FC<{}> = (props) => {
    const [spacing, setSpacing] = useState(1);
    const [movement, setMovement] = useState(0);
    const { trigger = null, setIntParams = null, setFurniSources, setActivePickSlot, activePickSlot, furniIds = [], secondaryFurniIds = [] } = useWired();
    const [furniSource, setFurniSource] = useState(100);
    const [targetSource, setTargetSource] = useState(101);
    const save = () => {
        setIntParams([movement, spacing]);
        setFurniSources([furniSource, targetSource]);
    };
    useEffect(() => {
        setMovement(trigger?.intData[0] ?? 0);
        setSpacing(trigger?.intData[1] ?? 1);
        setFurniSource(trigger?.furniSources[0] ?? 100);
        setTargetSource(trigger?.furniSources[1] ?? 101);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={
                <>
                    {[furniSource, targetSource].map((source, slot) => <WiredFurniSelectionSourceRow key={slot}
                        title={`wiredfurni.params.sources.furni.title.mv.${slot}`}
                        options={nativeSourceOptions(trigger?.inputSources?.furniAllowed[slot] ?? [100, 101, 200, 201, 0], 'furni')}
                        value={source} onChange={slot === 0 ? onChangeFurniSource : setTargetSource}
                        selectionKind={source === 101 ? 'secondary' : 'primary'} selectionActive={activePickSlot === (source === 101 ? 1 : 0)}
                        selectionCount={source === 101 ? secondaryFurniIds.length : furniIds.length} selectionLimit={trigger?.maximumItemSelectionCount ?? 0}
                        selectionEnabledValues={[100, 101]} onSelectionActivate={() => setActivePickSlot(source === 101 ? 1 : 0)} />)}
                </>
            }
        >
            <WiredSection title={localizeWithFallback('wiredfurni.params.movefurni', LocalizeText('wiredfurni.params.startdir'))}>
                <WiredRadioGroup name="move-furni-to" value={movement} onChange={setMovement}
                    options={[0, 2, 4, 6].map(id => ({ id, label: LocalizeText(`wiredfurni.params.movefurni.${id}`) }))} />
            </WiredSection>
            <WiredSliderSection titleKey="wiredfurni.params.emptytiles" unit="tiles" min={1} max={5} value={spacing} onChange={setSpacing} />
        </WiredActionBaseView>
    );
};
