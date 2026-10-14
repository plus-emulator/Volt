import { FC, useEffect, useState } from 'react';
import { LocalizeText, normalizeWiredVariableName, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { WiredVariableNameSection } from './WiredExtraUserVariableView';

/** AIR ContextVariable has only a name and has-value flag. */
export const WiredExtraContextVariableView: FC = () => {
    const { trigger, setIntParams, setStringParam } = useWired();
    const [variableName, setVariableName] = useState('');
    const [hasValue, setHasValue] = useState(false);
    useEffect(() => { if (trigger) { setVariableName(normalizeWiredVariableName(trigger.stringData)); setHasValue(trigger.intData[0] === 1); } }, [trigger]);
    const save = () => { setStringParam(normalizeWiredVariableName(variableName)); setIntParams([hasValue ? 1 : 0]); };
    return <WiredExtraBaseView nativeLayout hasSpecialInput requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
        <WiredVariableNameSection value={variableName} onChange={setVariableName} />
        <WiredSection title={LocalizeText('wiredfurni.params.variables.settings')}><WiredCheckboxOption last checked={hasValue} onChange={setHasValue} label={LocalizeText('wiredfurni.params.variables.settings.has_value')} /></WiredSection>
    </WiredExtraBaseView>;
};
