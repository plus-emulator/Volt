import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, normalizeWiredVariableName, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { WiredVariableNameSection } from './WiredExtraUserVariableView';

/** AIR GlobalVariable: name, read-only current-value inspection, availability. */
export const WiredExtraRoomVariableView: FC = () => {
    const { trigger, setIntParams, setStringParam } = useWired();
    const [variableName, setVariableName] = useState('');
    const [availability, setAvailability] = useState(1);
    const current = trigger?.contexts?.find(context => context.type === 3);
    useEffect(() => {
        if (!trigger) return;
        setVariableName(normalizeWiredVariableName(trigger.stringData));
        setAvailability(trigger.intData[0] === 10 || trigger.intData[0] === 11 ? trigger.intData[0] : 1);
    }, [trigger]);
    const save = () => { setStringParam(normalizeWiredVariableName(variableName)); setIntParams([availability]); };
    return <WiredExtraBaseView nativeLayout hasSpecialInput requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
        <WiredVariableNameSection value={variableName} onChange={setVariableName} />
        <WiredSection title={LocalizeText('wiredfurni.params.variables.inspection')}><WiredText text={localizeWithFallback('wiredfurni.params.variables.inspection.current_value', 'Current value: %value%', ['value'], [current?.type === 3 ? String(current.value) : '—'])} /></WiredSection>
        <WiredSection title={LocalizeText('wiredfurni.params.variables.availability')}><WiredRadioGroup name="wiredRoomVariableAvailability" value={availability} onChange={setAvailability} options={[1, 10, 11].map(id => ({ id, label: LocalizeText(`wiredfurni.params.variables.availability.${id}`) }))} /></WiredSection>
    </WiredExtraBaseView>;
};
