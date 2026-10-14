import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { WiredVariableNameSection } from './WiredExtraUserVariableView';
import { WiredSection } from '../WiredSection';
import { WiredSourceTypeSelector } from '../WiredSourceTypeSelector';

const MAX_NAME_LENGTH = 40;

type EchoSourceTarget = 'user' | 'furni' | 'global' | 'context';

/** The name an echo takes from the variable it mirrors (the official Util.flatVariableName): no @ or ~, dots become underscores. */
const defaultEchoName = (label: string) => normalizeVariableName((label ?? '').replace('@', '').replace('~', '').replace(/\./g, '_'));

const normalizeVariableName = (value: string) => {
    let normalizedValue = (value ?? '').replace(/[\t\r\n]/g, '');

    if (normalizedValue.includes('=')) normalizedValue = normalizedValue.substring(0, normalizedValue.indexOf('=')).trim();

    while (normalizedValue.startsWith('@') || normalizedValue.startsWith('~')) {
        normalizedValue = normalizedValue.substring(1);
    }

    normalizedValue = normalizedValue.replace(/\s+/g, '_');
    normalizedValue = normalizedValue.replace(/[^A-Za-z0-9_]/g, '').toLowerCase();

    return normalizedValue.slice(0, MAX_NAME_LENGTH);
};

export const WiredExtraVariableEchoView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredNativeVariables();
    const [variableName, setVariableName] = useState('');
    const [sourceTargetType, setSourceTargetType] = useState<EchoSourceTarget>('user');
    const [sourceVariableToken, setSourceVariableToken] = useState('');

    const targetDefinitions = useMemo(() => {
        switch (sourceTargetType) {
            case 'furni':
                return furniVariableDefinitions;
            case 'global':
                return roomVariableDefinitions;
            case 'context':
                return contextVariableDefinitions;
            default:
                return userVariableDefinitions;
        }
    }, [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, sourceTargetType, userVariableDefinitions]);

    const variableEntries = useMemo(() => buildWiredVariablePickerEntries(sourceTargetType, 'echo', targetDefinitions), [sourceTargetType, targetDefinitions]);
    const resolvedVariableEntries = useMemo(() => {
        if (!sourceVariableToken) return variableEntries;
        if (flattenWiredVariablePickerEntries(variableEntries).some((entry) => entry.token === sourceVariableToken)) return variableEntries;

        const fallbackEntry = createFallbackVariableEntry(sourceTargetType, sourceVariableToken);

        return fallbackEntry ? [fallbackEntry, ...variableEntries] : variableEntries;
    }, [sourceTargetType, sourceVariableToken, variableEntries]);

    const selectedEntry = useMemo(
        () => flattenWiredVariablePickerEntries(resolvedVariableEntries).find((entry) => entry.token === sourceVariableToken) ?? null,
        [resolvedVariableEntries, sourceVariableToken]
    );

    useEffect(() => {
        if (!trigger) {
            setVariableName('');
            setSourceTargetType('user');
            setSourceVariableToken('');
            return;
        }

        // The echo's owned list is empty: its target is the catalog target of the variable it names.
        const variableId = trigger.variableIds.length > 0 ? trigger.variableIds[0] : '';
        const owner = variableId
            ? ([['user', userVariableDefinitions], ['furni', furniVariableDefinitions], ['global', roomVariableDefinitions], ['context', contextVariableDefinitions]] as const).find(
                  ([, definitions]) => definitions.some((definition) => definition.variableId === variableId)
              )
            : undefined;

        setVariableName(normalizeVariableName(trigger.stringData));
        setSourceTargetType(owner ? owner[0] : 'user');
        // An unpicked echo stores the absent id "n"; it reads as no selection, never as a variable "#n".
        setSourceVariableToken(tokenOfVariableSlot(variableId));
    }, [trigger]);
    useEffect(() => {
        const variableId = trigger?.variableIds[0];
        if (!variableId || sourceVariableToken !== tokenOfVariableSlot(variableId)) return;
        const owner = ([['user', userVariableDefinitions], ['furni', furniVariableDefinitions], ['global', roomVariableDefinitions], ['context', contextVariableDefinitions]] as const).find(([, definitions]) => definitions.some(definition => definition.variableId === variableId));
        if (owner) setSourceTargetType(owner[0]);
    }, [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, trigger, userVariableDefinitions]);

    const save = () => {
        setIntParams([]);
        setStringParam(normalizeVariableName(variableName));
        setVariableIds([variableSlotOf(sourceVariableToken)]);
    };

    // The official editor has no check here: an echo may be saved before its variable is picked, and then mirrors nothing.
    // Picking a variable names the echo after it while the name is empty or still the previous pick's default.
    const pickVariable = (entry: { token: string; label: string }) => {
        const previousDefault = selectedEntry ? defaultEchoName(selectedEntry.label) : '';

        if (!variableName.length || (previousDefault.length > 0 && variableName === previousDefault)) setVariableName(defaultEchoName(entry.label));

        setSourceVariableToken(entry.token);
    };

    const handleTargetTypeChange = (nextValue: EchoSourceTarget) => {
        if (nextValue === sourceTargetType) return;

        setSourceTargetType(nextValue);
        setSourceVariableToken('');
    };

    return <WiredExtraBaseView nativeLayout hasSpecialInput requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
        <WiredVariableNameSection value={variableName} onChange={setVariableName} />
        <WiredSection title={LocalizeText('wiredfurni.params.variables.variable_selection')}
            headerOptionsRight={<WiredSourceTypeSelector types={['furni', 'user', 'global', 'context']} value={sourceTargetType} onChange={handleTargetTypeChange} />}>
            <WiredVariablePicker entries={resolvedVariableEntries} recentScope="variable-echo" selectedToken={sourceVariableToken} onSelect={pickVariable} />
        </WiredSection>
    </WiredExtraBaseView>;
};
