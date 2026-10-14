import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredTextInput } from '../WiredTextInput';
import { normalizeWiredVariableName, handleWiredVariableNameKeyDown, WIRED_VARIABLE_NAME_MAX } from '../../../../api';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/**
 * The quest box is itself a read-only user variable: owned [], text "variableName TAB questName", no variable ids.
 * Progress, target and completion are read through the variable it creates, not from the editor.
 */
// AirSourceOnly (wf_var_quest): AS3 wired_setup/variables/QuestVariable.as
export const WiredExtraQuestView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const [variableName, setVariableName] = useState('');
    const [questName, setQuestName] = useState('');

    useEffect(() => {
        if (!trigger) return;

        const [nextVariableName = '', nextQuestName = ''] = (trigger.stringData ?? '').split('\t');

        setVariableName(normalizeWiredVariableName(nextVariableName));
        setQuestName(nextQuestName);
    }, [trigger]);

    const save = () => {
        setIntParams([]);
        setVariableIds([]);
        setStringParam(`${normalizeWiredVariableName(variableName)}\t${questName.replace(/[\t\r\n]/g, '')}`);
    };

    const validate = () => !!normalizeWiredVariableName(variableName).length && !!questName.trim().length;

    return (
        <WiredExtraBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate}>
            <WiredSection title={localizeWithFallback('wiredfurni.params.variables.variable_name', 'Variable name:')}>
                <WiredTextInput
                    maxLength={WIRED_VARIABLE_NAME_MAX}
                    value={variableName}
                    onChange={(value) => setVariableName(normalizeWiredVariableName(value))}
                    onKeyDown={(event) => handleWiredVariableNameKeyDown(event, setVariableName)}
                />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.variables.quest_name', 'Quest name:')}>
                <WiredTextInput maxLength={500} value={questName} onChange={(value) => setQuestName(value.replace(/[\t\r\n]/g, ''))} />
            </WiredSection>
        </WiredExtraBaseView>
    );
};
