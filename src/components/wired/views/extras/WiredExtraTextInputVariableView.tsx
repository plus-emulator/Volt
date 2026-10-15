import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { getNativeVariableId } from '../../../../api';
import { tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { WiredSection } from '../WiredSection';
import { flatPlaceholderVariableName, WiredPlaceholderNameSection, WiredVariablePlaceholderModeSection } from './WiredTextPlaceholderSections';

const DISPLAY_NUMERIC = 0;
const DISPLAY_TEXTUAL = 1;
const DEFAULT_CAPTURER_NAME = '';
// AS3 PlaceholderNameSection: a TextInputParam of 32 characters that lets "a-zA-Z_0-9 " through, turns spaces into "_" and lower-cases.
const MAX_CAPTURER_NAME_LENGTH = 32;
const PLACEHOLDER_WRAPPER_PATTERN = /^#(.*)#$/;

const normalizeDisplayType = (value: number) => (value === DISPLAY_TEXTUAL ? DISPLAY_TEXTUAL : DISPLAY_NUMERIC);
const typedCapturerName = (value: string) =>
    (value ?? '')
        .replace(/[^a-zA-Z0-9_ ]/g, '')
        .split(' ')
        .join('_')
        .toLowerCase()
        .slice(0, MAX_CAPTURER_NAME_LENGTH);
const normalizeCapturerName = (value: string) => {
    let normalizedValue = (value ?? '').trim().replace(/[\t\r\n]/g, '');

    if (PLACEHOLDER_WRAPPER_PATTERN.test(normalizedValue)) {
        normalizedValue = normalizedValue.substring(1, normalizedValue.length - 1).trim();
    }

    return typedCapturerName(normalizedValue);
};


export const WiredExtraTextInputVariableView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const { contextVariableDefinitions = [] } = useWiredNativeVariables();
    const [variableToken, setVariableToken] = useState('');
    const [capturerName, setCapturerName] = useState(DEFAULT_CAPTURER_NAME);
    const [displayType, setDisplayType] = useState(DISPLAY_NUMERIC);

    // AS3 VariableCapturerAddon.variableSelectionFilter: hasValue && canCreateAndDelete && canWriteValue.
    const targetDefinitions = useMemo(
        () => contextVariableDefinitions.filter((definition) => !!definition.hasValue && !definition.isReadOnly && definition.canCreateAndDelete === true),
        [contextVariableDefinitions]
    );
    const variableEntries = useMemo(
        () => buildWiredVariablePickerEntries('context', 'change-reference', targetDefinitions).filter((entry) => entry.kind === 'custom'),
        [targetDefinitions]
    );
    const resolvedVariableEntries = useMemo(() => {
        if (!variableToken || !getNativeVariableId(variableToken)) return variableEntries;
        if (flattenWiredVariablePickerEntries(variableEntries).some((entry) => entry.token === variableToken)) return variableEntries;

        const fallbackEntry = createFallbackVariableEntry('context', variableToken);

        return fallbackEntry && fallbackEntry.kind === 'custom' ? [fallbackEntry, ...variableEntries] : variableEntries;
    }, [variableEntries, variableToken]);

    const selectedVariableDefinition = useMemo(() => {
        const variableId = getNativeVariableId(variableToken);

        if (!variableId) return null;

        return targetDefinitions.find((definition) => definition.variableId === variableId) ?? null;
    }, [targetDefinitions, variableToken]);

    const canUseTextDisplay = !!selectedVariableDefinition?.isTextConnected;

    useEffect(() => {
        if (!trigger) return;

        setVariableToken(tokenOfVariableSlot(trigger.variableIds[0]));
        setCapturerName(normalizeCapturerName(trigger.stringData.split('\t')[0]));
        setDisplayType(normalizeDisplayType(trigger.intData.length > 0 ? trigger.intData[0] : DISPLAY_NUMERIC));
    }, [trigger]);

    useEffect(() => {
        if (!selectedVariableDefinition || canUseTextDisplay || displayType !== DISPLAY_TEXTUAL) return;

        setDisplayType(DISPLAY_NUMERIC);
    }, [canUseTextDisplay, displayType, selectedVariableDefinition]);

    const save = () => {
        setIntParams([canUseTextDisplay ? normalizeDisplayType(displayType) : DISPLAY_NUMERIC]);
        setStringParam(normalizeCapturerName(capturerName));
        setVariableIds([variableSlotOf(variableToken)]);
    };

    const validate = () => !!normalizeCapturerName(capturerName).length && !!getNativeVariableId(variableToken);

    useEffect(() => {
        if (selectedVariableDefinition && !capturerName) setCapturerName(flatPlaceholderVariableName(selectedVariableDefinition.name));
    }, [selectedVariableDefinition]);
    const selectVariable = (entry: { token: string }) => {
        const next = targetDefinitions.find(definition => definition.variableId === getNativeVariableId(entry.token));
        if (!capturerName || (selectedVariableDefinition && capturerName === flatPlaceholderVariableName(selectedVariableDefinition.name))) setCapturerName(next ? flatPlaceholderVariableName(next.name) : '');
        setVariableToken(entry.token);
    };
    return <WiredExtraBaseView hasSpecialInput nativeLayout requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate}>
        <WiredPlaceholderNameSection capturer name={capturerName} onChange={setCapturerName} />
        <WiredSection title={LocalizeText('wiredfurni.params.variables.variable_selection')}>
            <WiredVariablePicker entries={resolvedVariableEntries} recentScope="variable-text-input" selectedToken={variableToken} onSelect={selectVariable} />
        </WiredSection>
        <WiredVariablePlaceholderModeSection input textual={displayType === DISPLAY_TEXTUAL} canText={canUseTextDisplay} onChange={value => setDisplayType(value ? DISPLAY_TEXTUAL : DISPLAY_NUMERIC)} />
    </WiredExtraBaseView>;
};
