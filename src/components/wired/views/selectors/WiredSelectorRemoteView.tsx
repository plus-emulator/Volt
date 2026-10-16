import { WiredSection } from '../WiredSection';
import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';
import { useWired } from '../../../../hooks';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

/** Union (0) or intersection (1) of the selections of the picked Wired stacks (wiredfurni.params.remote_selection.type.info). */
const UNION = 0;
const INTERSECTION = 1;
const STACK_COUNT_MAX = 2147483647;

export const WiredSelectorRemoteView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources = null } = useWired();
    const [unionIntersection, setUnionIntersection] = useState(UNION);
    const [stackCount, setStackCount] = useState(0);
    const [stackFilter, setStackFilter] = useState(false);
    const [furniSource, setFurniSource] = useState(100);

    useEffect(() => {
        if (!trigger) return;

        // own: [unionIntersection, stackCount]; the remote furni source is the F tail.
        setUnionIntersection(trigger.intData.length > 0 && trigger.intData[0] === INTERSECTION ? INTERSECTION : UNION);
        setStackCount(trigger.intData.length > 1 ? trigger.intData[1] : 0);
        setStackFilter((trigger.intData[1] ?? 0) > 0);
        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save.
    const save = useCallback(() => {
        setIntParams([unionIntersection, stackFilter ? stackCount : 0]);
        setFurniSources([furniSource]);
    }, [furniSource, setFurniSources, setIntParams, stackCount, stackFilter, unionIntersection]);

    // AIR UserDefinedRoomEventsCtrl.as:520-556: the stack source row is in the advanced settings, which open when a non-default
    // source is stored.
    return (
        <WiredSelectorBaseView
            hasSpecialInput={true} nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            hideDelay={true}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.remote_selection.type')}>
                <WiredRadioGroup name="remoteUnionIntersection" value={unionIntersection} onChange={setUnionIntersection}
                    options={[0,1].map(id=>({id,label:LocalizeText(`wiredfurni.params.remote_selection.type.${id}`)}))} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.remote_selection.filter')}>
                <WiredRadioGroup name="remoteStackFilter" value={stackFilter ? 1 : 0} onChange={value=>setStackFilter(value===1)}
                    options={[
                        {id:0,label:LocalizeText('wiredfurni.params.remote_selection.filter.0')},
                        {id:1,label:LocalizeText('wiredfurni.params.remote_selection.filter.1'),inlineExtra:<WiredNumberInput value={stackCount} min={0} max={STACK_COUNT_MAX} width={40} onChange={setStackCount} />}
                    ]} />
            </WiredSection>
            <WiredSelectorOptionsSection />
        </WiredSelectorBaseView>
    );
};
