import { FC, useEffect, useState } from 'react';
import { handleWiredVariableNameKeyDown, localizeWithFallback, normalizeWiredVariableName, WIRED_VARIABLE_NAME_MAX, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { VoltInput } from '../../../../layout';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const DAILY_TASK_TEXT_MAX_LENGTH = 100;

/**
 * DailyTaskVariable.as (variable code 8, var_6061), build WIN63-202610131318-860371703: a variable name and the daily task
 * code text input (max 100, placeholder 1234..). Saved as string `variableName TAB taskText` (readStringParamFromForm L46,
 * STRING_PARAM_SPLITTER TAB), no int params and no variable ids; onEditStart L51 splits the string back.
 */
// AirSourceOnly (wf_var_dailytask): DailyTaskVariable.as
export const WiredExtraDailyTaskNativeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const [variableName, setVariableName] = useState('');
    const [taskText, setTaskText] = useState('');

    useEffect(() => {
        if (!trigger) return;

        const [nextVariableName = '', nextTaskText = ''] = (trigger.stringData ?? '').split('\t');

        setVariableName(normalizeWiredVariableName(nextVariableName));
        setTaskText(nextTaskText);
    }, [trigger]);

    const save = () => {
        setIntParams([]);
        setVariableIds([]);
        setStringParam(`${normalizeWiredVariableName(variableName)}\t${taskText.replace(/[\t\r\n]/g, '')}`);
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 380 }}>
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text>{localizeWithFallback('wiredfurni.params.variables.variable_name', 'Variable name:')}</Text>
                    <VoltInput
                        maxLength={WIRED_VARIABLE_NAME_MAX}
                        type="text"
                        value={variableName}
                        onChange={(event) => setVariableName(normalizeWiredVariableName(event.target.value))}
                        onKeyDown={(event) => handleWiredVariableNameKeyDown(event, setVariableName)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <Text>{localizeWithFallback('wiredfurni.params.variables.daily_task_name', 'Daily task code:')}</Text>
                    <VoltInput
                        maxLength={DAILY_TASK_TEXT_MAX_LENGTH}
                        placeholder="1234.."
                        type="text"
                        value={taskText}
                        onChange={(event) => setTaskText(event.target.value.replace(/[\t\r\n]/g, ''))}
                    />
                </div>
            </div>
        </WiredExtraBaseView>
    );
};
