import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { typedPlaceholderName, WiredPlaceholderNameSection, WiredPlaceholderTypeSection, WiredTextAlwaysAdvanced } from './WiredTextPlaceholderSections';

/** AIR class_4328: boolean multiple flag; name and optional TAB delimiter. */
export const WiredExtraTextOutputFurniNameView: FC = () => {
    const { trigger, setIntParams, setStringParam, setFurniSources, setActivePickSlot } = useWired();
    const [name, setName] = useState('');
    const [multiple, setMultiple] = useState(false);
    const [delimiter, setDelimiter] = useState('');
    const [source, setSource] = useState(0);
    useEffect(() => {
        if (!trigger) return;
        const [name = '', delimiter = ''] = trigger.stringData.split('\t');
        setName(typedPlaceholderName(name)); setDelimiter(delimiter); setMultiple(trigger.intData[0] === 1); setSource(trigger.furniSources[0] ?? 0);
    }, [trigger]);
    useEffect(() => { if (source === 100 || source === 101) setActivePickSlot(source === 101 ? 1 : 0); }, [source, setActivePickSlot]);
    const save = () => {
        setIntParams([multiple ? 1 : 0]); setFurniSources([source]); setStringParam(multiple ? `${name}\t${delimiter}` : name);
    };
    const sources = <WiredSourcesSelector showFurni={true} furniSource={source} onChangeFurni={setSource} />;
    return <WiredExtraBaseView hasSpecialInput nativeLayout requiresFurni={source === 100 || source === 101 ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE} showSelection={false} save={save} >
        <WiredPlaceholderNameSection name={name} onChange={setName} />
        <WiredPlaceholderTypeSection name="furni-placeholder-mode" kind="furni" multiple={multiple} onChange={setMultiple} delimiter={delimiter} onDelimiter={setDelimiter} />
        <WiredTextAlwaysAdvanced>{sources}</WiredTextAlwaysAdvanced>
    </WiredExtraBaseView>;
};
