import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { normalizeNativeSource } from '../../../../api';
import { IWiredNativeVariableDefinition, tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { getNativeVariableId } from '../../../../api';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { WiredSection } from '../WiredSection';
import { WiredSourceTypeSelector } from '../WiredSourceTypeSelector';
import { flatPlaceholderVariableName, WiredPlaceholderNameSection, WiredPlaceholderTypeSection, WiredVariablePlaceholderModeSection, WiredTextAlwaysAdvanced } from './WiredTextPlaceholderSections';

type VariableTargetType = 'user' | 'furni' | 'global' | 'context';

type IVariableDefinition = IWiredNativeVariableDefinition;

const TARGET_USER = 1;
const TARGET_FURNI = 0;
const TARGET_CONTEXT = -20;
const TARGET_GLOBAL = -10;
const DISPLAY_NUMERIC = 0;
const DISPLAY_TEXTUAL = 1;
const TYPE_SINGLE = 0;
const TYPE_MULTIPLE = 1;
const DEFAULT_PLACEHOLDER_NAME = '';
const DEFAULT_DELIMITER = '';
const MAX_PLACEHOLDER_NAME_LENGTH = 32;
const PLACEHOLDER_WRAPPER_PATTERN = /^\$\((.*)\)$/;

const normalizeTargetType = (value: number): VariableTargetType => {
    switch (value) {
        case TARGET_FURNI:
            return 'furni';
        case TARGET_GLOBAL:
            return 'global';
        case TARGET_CONTEXT:
            return 'context';
        default:
            return 'user';
    }
};

const getTargetValue = (value: VariableTargetType) => {
    switch (value) {
        case 'furni':
            return TARGET_FURNI;
        case 'global':
            return TARGET_GLOBAL;
        case 'context':
            return TARGET_CONTEXT;
        default:
            return TARGET_USER;
    }
};

const normalizePlaceholderType = (value: number) => (value === TYPE_MULTIPLE ? TYPE_MULTIPLE : TYPE_SINGLE);
const normalizePlaceholderName = (value: string) => {
    let normalizedValue = (value ?? '').trim().replace(/[\t\r\n]/g, '');

    if (PLACEHOLDER_WRAPPER_PATTERN.test(normalizedValue)) {
        normalizedValue = normalizedValue.substring(2, normalizedValue.length - 1).trim();
    }

    return normalizedValue.split(' ').join('_').toLowerCase().slice(0, MAX_PLACEHOLDER_NAME_LENGTH);
};

const normalizeDelimiter = (value: string) => {
    if (value === undefined || value === null) return DEFAULT_DELIMITER;

    return value.replace(/[\t\r\n]/g, '');
};

/** The text is "placeholder name TAB delimiter"; the variable itself travels in variableIds. */
const splitStringData = (value: string) => {
    if (!value?.length) return [DEFAULT_PLACEHOLDER_NAME, DEFAULT_DELIMITER];

    const parts = value.split('\t');

    return [parts[0], parts.length > 1 ? parts[1] : DEFAULT_DELIMITER];
};


const getTargetDefinitions = (
    targetType: VariableTargetType,
    userDefinitions: IVariableDefinition[],
    furniDefinitions: IVariableDefinition[],
    roomDefinitions: IVariableDefinition[],
    contextDefinitions: IVariableDefinition[]
) => {
    switch (targetType) {
        case 'furni':
            return furniDefinitions;
        case 'global':
            return roomDefinitions;
        case 'context':
            return contextDefinitions;
        default:
            return userDefinitions;
    }
};

const serializeStringData = (placeholderName: string, delimiter: string) => `${normalizePlaceholderName(placeholderName)}\t${normalizeDelimiter(delimiter)}`;

export const WiredExtraTextOutputVariableView: FC<{}> = () => {
    const { trigger = null, setActivePickSlot = null, setIntParams = null, setStringParam = null, setVariableIds = null, setUserSources = null, setFurniSources = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredNativeVariables();
    // The card's own groups and defaults decide which sources are valid.
    const userAllowed = trigger?.inputSources?.usersAllowed[0];
    const userDefault = trigger?.inputSources?.userDefaults[0] ?? 0;
    const furniAllowed = trigger?.inputSources?.furniAllowed[0];
    const furniDefault = trigger?.inputSources?.furniDefaults[0] ?? 0;
    const normalizeUserSource = (value: number) => normalizeNativeSource(value, userAllowed, userDefault);
    const normalizeFurniSource = (value: number) => normalizeNativeSource(value, furniAllowed, furniDefault);
    const [targetType, setTargetType] = useState<VariableTargetType>('user');
    const [variableToken, setVariableToken] = useState('');
    const [displayType, setDisplayType] = useState(DISPLAY_NUMERIC);
    const [placeholderType, setPlaceholderType] = useState(TYPE_SINGLE);
    const [placeholderName, setPlaceholderName] = useState(DEFAULT_PLACEHOLDER_NAME);
    const [delimiter, setDelimiter] = useState(DEFAULT_DELIMITER);
    const [userSource, setUserSource] = useState(0);
    const [furniSource, setFurniSource] = useState(0);
    // NewVariablePicker.var_1589: the last selection per variable target, restored when the target comes back
    // (AIR WIN63-202610131318-860371703, newvariablepicker/NewVariablePicker.as:195-220, 276-283).
    const selectionByTarget = useRef(new Map<VariableTargetType, string>());

    const targetDefinitions = useMemo(
        () => getTargetDefinitions(targetType, userVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, contextVariableDefinitions),
        [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, targetType, userVariableDefinitions]
    );
    const variableEntries = useMemo(() => buildWiredVariablePickerEntries(targetType, 'change-reference', targetDefinitions), [targetDefinitions, targetType]);
    const resolvedVariableEntries = useMemo(() => {
        if (!variableToken) return variableEntries;
        if (flattenWiredVariablePickerEntries(variableEntries).some((entry) => entry.token === variableToken)) return variableEntries;

        const fallbackEntry = createFallbackVariableEntry(targetType, variableToken);

        return fallbackEntry ? [fallbackEntry, ...variableEntries] : variableEntries;
    }, [targetType, variableEntries, variableToken]);

    const selectedCustomDefinition = useMemo(() => {
        const variableId = getNativeVariableId(variableToken);

        if (!variableId) return null;

        return targetDefinitions.find((definition) => definition.variableId === variableId) ?? null;
    }, [targetDefinitions, variableToken]);

    const picksFurni = targetType === 'furni' && (furniSource === 100 || furniSource === 101);

    useEffect(() => {
        if (picksFurni) setActivePickSlot(furniSource === 101 ? 1 : 0);
    }, [furniSource, picksFurni, setActivePickSlot]);

    const canUseTextDisplay = !!selectedCustomDefinition?.isTextConnected;

    useEffect(() => {
        if (!trigger) return;

        const [nextPlaceholderName, nextDelimiter] = splitStringData(trigger.stringData);

        // owned: [placeholder (1 multiple), target, display (1 textual)].
        setPlaceholderType(trigger.intData.length > 0 && trigger.intData[0] === 1 ? TYPE_MULTIPLE : TYPE_SINGLE);
        setTargetType(normalizeTargetType(trigger.intData.length > 1 ? trigger.intData[1] : TARGET_USER));
        const storedTarget = normalizeTargetType(trigger.intData.length > 1 ? trigger.intData[1] : TARGET_USER);
        const storedToken = tokenOfVariableSlot(trigger.variableIds[0]);

        selectionByTarget.current = new Map([[storedTarget, storedToken]]);
        setVariableToken(storedToken);
        setDisplayType(trigger.intData.length > 2 && trigger.intData[2] === 1 ? DISPLAY_TEXTUAL : DISPLAY_NUMERIC);
        setUserSource(normalizeNativeSource(trigger.userSources.length > 0 ? trigger.userSources[0] : userDefault, userAllowed, userDefault));
        setFurniSource(normalizeNativeSource(trigger.furniSources.length > 0 ? trigger.furniSources[0] : furniDefault, furniAllowed, furniDefault));
        setPlaceholderName(normalizePlaceholderName(nextPlaceholderName));
        setDelimiter(normalizeDelimiter(nextDelimiter));
    }, [furniAllowed, furniDefault, trigger, userAllowed, userDefault]);

    // VariablePlaceholderAddon.onChangeVariable (addons/VariablePlaceholderAddon.as:110-117): Textual is disabled and
    // the mode falls back to Numeric when no variable is chosen or the variable has no text connector. A stored id
    // whose definition has not arrived yet is left alone.
    useEffect(() => {
        if (canUseTextDisplay || displayType !== DISPLAY_TEXTUAL) return;
        if (variableToken && !selectedCustomDefinition) return;

        setDisplayType(DISPLAY_NUMERIC);
    }, [canUseTextDisplay, displayType, selectedCustomDefinition, variableToken]);

    const save = () => {
        setIntParams([
            normalizePlaceholderType(placeholderType) === TYPE_MULTIPLE ? 1 : 0,
            getTargetValue(targetType),
            canUseTextDisplay && displayType === DISPLAY_TEXTUAL ? 1 : 0
        ]);
        setStringParam(placeholderType === TYPE_MULTIPLE ? serializeStringData(placeholderName, delimiter) : normalizePlaceholderName(placeholderName));
        setVariableIds([variableSlotOf(variableToken)]);
        setUserSources([normalizeUserSource(userSource)]);
        setFurniSources([normalizeFurniSource(furniSource)]);
    };

    const validate = () => {
        return !!variableToken;
    };

    const footer = useMemo(() => {
        if (targetType === 'global') {
            return (
                <WiredFurniSelectionSourceRow
                    title="wiredfurni.params.sources.merged.title.variables"
                    options={[{ value: 0, label: 'wiredfurni.params.sources.global' }]}
                    value={0}
                    selectionKind="primary"
                    selectionActive={false}
                    selectionCount={0}
                    selectionLimit={0}
                    selectionEnabledValues={[]}
                    showSelectionToggle={false}
                    onChange={() => null}
                />
            );
        }

        if (targetType === 'context') {
            return (
                <WiredFurniSelectionSourceRow
                    title="wiredfurni.params.sources.merged.title.variables"
                    options={[{ value: 0, label: 'wiredfurni.params.sources.context' }]}
                    value={0}
                    selectionKind="primary"
                    selectionActive={false}
                    selectionCount={0}
                    selectionLimit={0}
                    selectionEnabledValues={[]}
                    showSelectionToggle={false}
                    onChange={() => null}
                />
            );
        }

        return (
            <WiredSourcesSelector
                showFurni={targetType === 'furni'}
                showUsers={targetType === 'user'}
                furniSource={furniSource}
                userSource={userSource}
                furniTitle="wiredfurni.params.sources.merged.title.variables"
                usersTitle="wiredfurni.params.sources.merged.title.variables"
                onChangeFurni={(value) => setFurniSource(normalizeFurniSource(value))}
                onChangeUsers={(value) => setUserSource(normalizeUserSource(value))}
            />
        );
    }, [furniSource, targetType, userSource]);

    /** VariablePlaceholderAddon.onChangeVariable (addons/VariablePlaceholderAddon.as:110-123): the name follows the variable while it is empty or still the previous variable's name. */
    const changeVariable = (token: string, definitions: IVariableDefinition[]) => {
        const next = token ? definitions.find((definition) => definition.variableId === getNativeVariableId(token)) : null;

        if (!placeholderName || (selectedCustomDefinition && placeholderName === flatPlaceholderVariableName(selectedCustomDefinition.name))) {
            setPlaceholderName(next ? flatPlaceholderVariableName(next.name) : '');
        }

        setVariableToken(token);
    };

    const handleTargetChange = (nextTargetType: VariableTargetType) => {
        if (nextTargetType === targetType) return;

        // NewVariablePicker.variableTarget setter: keep this target's choice and restore the next target's one (or none).
        selectionByTarget.current.set(targetType, variableToken);
        setTargetType(nextTargetType);
        changeVariable(
            selectionByTarget.current.get(nextTargetType) ?? '',
            getTargetDefinitions(nextTargetType, userVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, contextVariableDefinitions)
        );
    };

    useEffect(() => {
        if (targetType === 'global' || targetType === 'context') setPlaceholderType(TYPE_SINGLE);
    }, [targetType]);
    useEffect(() => {
        if (selectedCustomDefinition && !placeholderName) setPlaceholderName(flatPlaceholderVariableName(selectedCustomDefinition.name));
    }, [selectedCustomDefinition]);
    const selectVariable = (entry: { token: string }) => {
        selectionByTarget.current.set(targetType, entry.token);
        changeVariable(entry.token, targetDefinitions);
    };
    const clearVariable = () => {
        selectionByTarget.current.set(targetType, '');
        changeVariable('', targetDefinitions);
    };

    return <WiredExtraBaseView hasSpecialInput nativeLayout requiresFurni={picksFurni ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE} showSelection={false} save={save} validate={validate}>
        <WiredPlaceholderNameSection name={placeholderName} onChange={setPlaceholderName} />
        <WiredSection title={LocalizeText('wiredfurni.params.variables.variable_selection')} headerOptionsRight={<WiredSourceTypeSelector types={['furni', 'user', 'global', 'context']} value={targetType} onChange={handleTargetChange} />}>
            <WiredVariablePicker entries={resolvedVariableEntries} recentScope="variable-text-output" selectedToken={variableToken} onSelect={selectVariable} onClear={clearVariable} />
        </WiredSection>
        <WiredVariablePlaceholderModeSection textual={displayType === DISPLAY_TEXTUAL} canText={canUseTextDisplay} onChange={value => setDisplayType(value ? DISPLAY_TEXTUAL : DISPLAY_NUMERIC)} />
        <WiredPlaceholderTypeSection name="variable-output-multiple" multiple={placeholderType === TYPE_MULTIPLE} onChange={value => setPlaceholderType(value ? TYPE_MULTIPLE : TYPE_SINGLE)} delimiter={delimiter} onDelimiter={setDelimiter} multipleDisabled={targetType === 'global' || targetType === 'context'} />
        <WiredTextAlwaysAdvanced>{footer}</WiredTextAlwaysAdvanced>
    </WiredExtraBaseView>;
};
