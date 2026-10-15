import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType, normalizeNativeSource } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredCollapsibleSection } from '../WiredCollapsibleSection';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredText } from '../WiredText';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/** AIR class_4014: [mode, comparison, count]; mode -1 selects one of three independent comparison drafts. */
export const WiredExtraOrEvalView: FC = () => {
    const { trigger, setIntParams, setStringParam, setFurniSources } = useWired();
    const [mode, setMode] = useState(1);
    const [counts, setCounts] = useState([0, 0, 0]);
    const [source, setSource] = useState(100);
    useEffect(() => {
        if (!trigger) return;
        const [nextMode = 1, comparison = 0, value = 0] = trigger.intData;
        setMode(nextMode === -1 ? 4 + comparison : nextMode);
        setCounts([0, 1, 2].map(index => nextMode === -1 && comparison === index ? value : 0));
        setSource(normalizeNativeSource(trigger.furniSources[0], trigger.inputSources?.furniAllowed[0], trigger.inputSources?.furniDefaults[0] ?? 100));
    }, [trigger]);
    const save = () => {
        setIntParams(mode >= 4 ? [-1, mode - 4, counts[mode - 4]] : [mode, 0, 0]);
        setFurniSources([source]); setStringParam('');
    };
    return <WiredExtraBaseView nativeLayout hasSpecialInput requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT} save={save}
        footer={<WiredSourcesSelector showFurni furniSource={source} onChangeFurni={setSource} />}>
        <WiredCollapsibleSection defaultExpanded title={LocalizeText('wiredfurni.params.general_box_info')}><WiredText soft wrap text={LocalizeText('wiredfurni.params.cond_eval.note')} /></WiredCollapsibleSection>
        <WiredSection title={LocalizeText('wiredfurni.params.eval_mode')}>
            <WiredRadioGroup name="condition-evaluation" value={mode} onChange={setMode} options={[0, 1, 2, 3, 4, 5, 6].map(id => ({
                id, label: LocalizeText(id < 4 ? `wiredfurni.params.eval_mode.${id}` : `wiredfurni.params.eval_mode.cmp.${id - 4}`),
                inlineExtra: id >= 4 ? <WiredNumberInput ariaLabel={LocalizeText(`wiredfurni.params.eval_mode.cmp.${id - 4}`)} width={35} min={0} max={1000} value={counts[id - 4]} disabled={mode !== id}
                    onChange={value => setCounts(previous => previous.map((count, index) => index === id - 4 ? value : count))} /> : undefined
            }))} />
        </WiredSection>
    </WiredExtraBaseView>;
};
