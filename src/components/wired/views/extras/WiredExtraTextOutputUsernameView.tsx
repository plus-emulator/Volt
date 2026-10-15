import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { typedPlaceholderName, WiredPlaceholderNameSection, WiredPlaceholderTypeSection } from './WiredTextPlaceholderSections';

/** AIR UsernamePlaceholderAddon: boolean multiple flag; name and optional TAB delimiter. */
export const WiredExtraTextOutputUsernameView: FC = () => {
    const { trigger, setIntParams, setStringParam, setUserSources } = useWired();
    const [name, setName] = useState('');
    const [multiple, setMultiple] = useState(false);
    const [delimiter, setDelimiter] = useState('');
    const [source, setSource] = useState(0);
    useEffect(() => {
        if (!trigger) return;
        const [name = '', delimiter = ''] = trigger.stringData.split('\t');
        setName(typedPlaceholderName(name)); setDelimiter(delimiter); setMultiple(trigger.intData[0] === 1); setSource(trigger.userSources[0] ?? 0);
    }, [trigger]);

    const save = () => {
        setIntParams([multiple ? 1 : 0]); setUserSources([source]); setStringParam(multiple ? `${name}\t${delimiter}` : name);
    };
    const sources = <WiredSourcesSelector showUsers={true} userSource={source} onChangeUsers={setSource} />;
    return <WiredExtraBaseView hasSpecialInput nativeLayout requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} showSelection={false} save={save} footer={sources}>
        <WiredPlaceholderNameSection name={name} onChange={setName} />
        <WiredPlaceholderTypeSection name="user-placeholder-mode" kind="user" multiple={multiple} onChange={setMultiple} delimiter={delimiter} onDelimiter={setDelimiter} />

    </WiredExtraBaseView>;
};
