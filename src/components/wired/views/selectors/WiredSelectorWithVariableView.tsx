import { WiredActionValueOrVariableSection } from '../actions/WiredActionValueOrVariableSection';
import { WiredSection } from '../WiredSection';
import { WiredCheckboxGroup, WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { joinWiredLiteral, parseWiredLiteral, splitWiredLiteral, WIRED_VARIABLE_ABSENT, tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { FurniPickSlotButtons } from '../conditions/WiredVariableConditionParts';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { CLICKED_USER_SOURCE, nativeSourceOptions, sortWiredSourceOptions, USER_SOURCES, useAvailableUserSources, WiredSourceOption } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries, WiredVariablePickerTarget } from '../WiredVariablePickerData';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

type VariableTargetType = 'user' | 'furni' | 'global' | 'context';
type ReferenceMode = 'constant' | 'variable';


interface WiredSelectorWithVariableViewProps {
    selectorTarget: 'user' | 'furni';
}

const TARGET_USER = 1;
const TARGET_FURNI = 0;
const TARGET_CONTEXT = -20;
const TARGET_GLOBAL = -10;
const REFERENCE_CONSTANT = 0;
const REFERENCE_VARIABLE = 1;
const SOURCE_TRIGGER = 0;
const SOURCE_SELECTED = 100;
const SOURCE_SECONDARY_SELECTED = 101;

// The native radio values, which the server maps to its own comparators: 0 <, 1 =, 2 >, 3 ≤, 4 ≠, 5 ≥.
const COMPARISON_OPTIONS = [2, 5, 1, 3, 0, 4].map(id => ({ id, label: ['<', '=', '>', '≤', '≠', '≥'][id] }));

/** The with-variable selector limits its numeric input to signed 32-bit values (encoded as high/low words), so a wider literal is refused. */
const isSigned32Literal = (value: string) => {
    const literal = parseWiredLiteral(value.trim());

    return literal !== null && literal >= -(1n << 31n) && literal < 1n << 31n;
};


const GLOBAL_SOURCE_OPTIONS: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.global' }];
const CONTEXT_SOURCE_OPTIONS: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.context' }];


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

const resolveSourceOptions = (baseOptions: WiredSourceOption[], selectedValue: number, fallbackOptions: WiredSourceOption[]) => {
    if (!baseOptions.length) return baseOptions;
    if (baseOptions.some((option) => option.value === selectedValue)) return baseOptions;

    const fallbackOption = fallbackOptions.find((option) => option.value === selectedValue);

    return fallbackOption ? [...baseOptions, fallbackOption] : baseOptions;
};

export const WiredSelectorWithVariableView: FC<WiredSelectorWithVariableViewProps> = ({ selectorTarget }) => {
    const { trigger = null, furniIds = [], secondaryFurniIds = [], activePickSlot = 0, setActivePickSlot = null, setIntParams = null, setStringParam = null, setVariableIds = null, setUserSources = null, setFurniSources = null, filter = false, setFilter = null, inverse = false, setInverse = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredNativeVariables();
    const [variableToken, setVariableToken] = useState('');
    const [selectByValue, setSelectByValue] = useState(false);
    const [comparison, setComparison] = useState(2);
    const [referenceMode, setReferenceMode] = useState<ReferenceMode>('constant');
    const [referenceConstantValueInput, setReferenceConstantValueInput] = useState('0');
    const [referenceTargetType, setReferenceTargetType] = useState<VariableTargetType>('user');
    const [referenceVariableToken, setReferenceVariableToken] = useState('');
    const [referenceUserSource, setReferenceUserSource] = useState(SOURCE_TRIGGER);
    const [referenceFurniSource, setReferenceFurniSource] = useState(SOURCE_TRIGGER);
    const [sameHolder, setSameHolder] = useState(false);
    const [referenceValid, setReferenceValid] = useState(true);
    const sameHolderActive = sameHolder && referenceTargetType === selectorTarget;

    const availableUserSources = useAvailableUserSources(trigger, USER_SOURCES);
    const orderedUserSources = useMemo(() => sortWiredSourceOptions(availableUserSources, 'users'), [availableUserSources]);
    const orderedFurniSources = nativeSourceOptions(trigger?.inputSources?.furniAllowed[0], 'furni');
    const userSourceFallbackOptions = useMemo(() => sortWiredSourceOptions([...USER_SOURCES, CLICKED_USER_SOURCE], 'users'), []);
    const mainDefinitions = selectorTarget === 'user' ? userVariableDefinitions : furniVariableDefinitions;
    const mainEntries = useMemo(
        () => buildWiredVariablePickerEntries(selectorTarget as WiredVariablePickerTarget, 'condition', mainDefinitions),
        [mainDefinitions, selectorTarget]
    );
    const resolvedMainEntries = useMemo(() => {
        if (!variableToken) return mainEntries;
        if (flattenWiredVariablePickerEntries(mainEntries).some((entry) => entry.token === variableToken)) return mainEntries;

        const fallbackEntry = createFallbackVariableEntry(selectorTarget, variableToken);
        return fallbackEntry ? [fallbackEntry, ...mainEntries] : mainEntries;
    }, [mainEntries, selectorTarget, variableToken]);
    const selectedMainEntry = useMemo(
        () => flattenWiredVariablePickerEntries(resolvedMainEntries).find((entry) => entry.token === variableToken) || null,
        [resolvedMainEntries, variableToken]
    );
    const canSelectByValue = !!selectedMainEntry?.hasValue;

    const referenceSelectionEnabled =
        selectByValue && !sameHolderActive && referenceMode === 'variable' && referenceTargetType === 'furni' && (referenceFurniSource === SOURCE_SELECTED || referenceFurniSource === SOURCE_SECONDARY_SELECTED);
    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;
    const requiresFurni = referenceSelectionEnabled ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;
    const selectedReferenceSourceValue =
        referenceTargetType === 'furni'
            ? referenceFurniSource
            : referenceTargetType === 'global' || referenceTargetType === 'context'
              ? SOURCE_TRIGGER
              : referenceUserSource;

    const referenceSourceOptions = useMemo(() => {
        if (referenceTargetType === 'furni') return resolveSourceOptions(orderedFurniSources, selectedReferenceSourceValue, orderedFurniSources);
        if (referenceTargetType === 'global') return GLOBAL_SOURCE_OPTIONS;
        if (referenceTargetType === 'context') return CONTEXT_SOURCE_OPTIONS;

        return resolveSourceOptions(orderedUserSources, selectedReferenceSourceValue, userSourceFallbackOptions);
    }, [orderedFurniSources, orderedUserSources, referenceTargetType, selectedReferenceSourceValue, userSourceFallbackOptions]);

    useEffect(() => {
        if (!trigger) return;

        // variableIds: [0] is the tested variable, [1] the reference variable when the card compares by variable.
        setVariableToken(tokenOfVariableSlot(trigger.variableIds[0]));
        setReferenceVariableToken(tokenOfVariableSlot(trigger.variableIds[1]));
        // AIR owns six ints: comparison, mode, high, low, target, reference-on-target.
        const ints = trigger.intData;
        const valueMode = ints.length > 1 ? ints[1] : 0;

        setComparison(ints.length > 0 ? ints[0] : 2);
        setSelectByValue(valueMode !== 0);
        setReferenceMode(valueMode === 2 ? 'variable' : 'constant');
        setReferenceConstantValueInput(ints.length > 3 ? joinWiredLiteral(ints[2], ints[3]).toString() : '0');
        setReferenceTargetType(normalizeTargetType(ints.length > 4 ? ints[4] : TARGET_USER));
        setSameHolder((ints[5] ?? 0) !== 0);
        // The reference's user and furni sources are the U and F tails, not owned ints.
        setReferenceUserSource(trigger.userSources.length > 0 ? trigger.userSources[0] : SOURCE_TRIGGER);
        setReferenceFurniSource(trigger.furniSources.length > 0 ? trigger.furniSources[0] : SOURCE_TRIGGER);
    }, [trigger]);

    useEffect(() => {
        if (!canSelectByValue && selectByValue) setSelectByValue(false);
    }, [canSelectByValue, selectByValue]);

    useEffect(() => {
        if (referenceSelectionEnabled) setActivePickSlot(referenceFurniSource === SOURCE_SECONDARY_SELECTED ? 1 : 0);
    }, [referenceFurniSource, referenceSelectionEnabled, setActivePickSlot]);

    useEffect(() => {
        if (referenceTargetType !== 'user') return;
        if (orderedUserSources.some((option) => option.value === referenceUserSource)) return;

        setReferenceUserSource(SOURCE_TRIGGER);
    }, [orderedUserSources, referenceTargetType, referenceUserSource]);

    const save = () => {
        const constantValue = parseWiredLiteral(referenceConstantValueInput.trim());

        setStringParam('');
        setVariableIds([variableSlotOf(variableToken), selectByValue && referenceMode === 'variable' ? variableSlotOf(referenceVariableToken) : WIRED_VARIABLE_ABSENT]);
        const [high, low] = splitWiredLiteral(constantValue ?? 0n);
        const valueMode = !selectByValue ? 0 : referenceMode === 'variable' ? 2 : 1;

        setIntParams([comparison, valueMode, high, low, getTargetValue(referenceTargetType), valueMode === 2 && sameHolderActive ? 1 : 0]);
        setUserSources([referenceUserSource]);
        setFurniSources([referenceFurniSource]);
    };

    const validate = () => {
        if (!variableToken) return false;
        if (selectByValue && !referenceValid) return false;
        if (selectByValue && !canSelectByValue) return false;
        if (selectByValue && referenceMode === 'variable' && !referenceVariableToken) return false;
        if (selectByValue && referenceMode === 'constant' && !isSigned32Literal(referenceConstantValueInput)) return false;

        return true;
    };

    const handleReferenceTargetChange = (targetType: VariableTargetType) => {
        if (targetType === referenceTargetType) return;


        setReferenceTargetType(targetType);
        setReferenceVariableToken('');
    };

    // AIR WithVariable.as:108-115,150,154-182 (WIN63-202610131318): merged [[0,0]] is claimed by the reference section and drawn in its popup;
    // it stays visible (greyed by the popup) while the same holder locks the source, like ValueOrVariablePopupPreset L337-363.
    const sources = <WiredFurniSelectionSourceRow
        bare
        title="wiredfurni.params.sources.merged.title.variables"
        options={referenceSourceOptions} value={selectedReferenceSourceValue}
        selectionKind={referenceFurniSource === SOURCE_SECONDARY_SELECTED ? 'secondary' : 'primary'}
        selectionActive={activePickSlot === (referenceFurniSource === SOURCE_SECONDARY_SELECTED ? 1 : 0)}
        selectionCount={referenceFurniSource === SOURCE_SECONDARY_SELECTED ? secondaryFurniIds.length : furniIds.length}
        selectionLimit={selectionLimit} selectionEnabledValues={[SOURCE_SELECTED, SOURCE_SECONDARY_SELECTED]} showSelectionToggle={false}
        onChange={value => {
            if (referenceTargetType === 'furni') {
                setReferenceFurniSource(value);
                if (value === SOURCE_SELECTED || value === SOURCE_SECONDARY_SELECTED) setActivePickSlot(value === SOURCE_SECONDARY_SELECTED ? 1 : 0);
            } else if (referenceTargetType === 'user') setReferenceUserSource(value);
        }}
    />;

    return (
        <WiredSelectorBaseView nativeLayout hasSpecialInput requiresFurni={requiresFurni} save={save} validate={validate} hideDelay>
            {referenceSelectionEnabled && <FurniPickSlotButtons slots={[referenceFurniSource === SOURCE_SECONDARY_SELECTED ? { slot: 1, count: secondaryFurniIds.length } : { slot: 0, count: furniIds.length }]} />}
            <WiredSection title={LocalizeText('wiredfurni.params.variables.variable_selection')}>
                <WiredVariablePicker entries={resolvedMainEntries} recentScope={`variable-selectors-${selectorTarget}`} selectedToken={variableToken} onSelect={entry => setVariableToken(entry.token)} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.choose_type')}>
                <WiredCheckboxOption label={LocalizeText('wiredfurni.params.variables.value_settings.select_by_value')} checked={selectByValue} disabled={!canSelectByValue} onChange={setSelectByValue} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.comparison_selection')}>
                <WiredRadioGroup name="variable-selector-comparison" columns={6} options={COMPARISON_OPTIONS.map(option => ({ ...option, disabled: !selectByValue }))} value={comparison} onChange={setComparison} />
            </WiredSection>
            <WiredActionValueOrVariableSection
                title={LocalizeText('wiredfurni.params.variables.reference_value')}
                targetTitle={LocalizeText('wiredfurni.params.sources.merged.title.variables_reference')}
                recentScope="variable-selectors-reference" min={-2147483648} max={2147483647}
                option={referenceMode === 'variable' ? REFERENCE_VARIABLE : REFERENCE_CONSTANT}
                onOptionChange={option => setReferenceMode(option === REFERENCE_VARIABLE ? 'variable' : 'constant')}
                literal={Number(referenceConstantValueInput)} onLiteralChange={value => setReferenceConstantValueInput(String(value))}
                target={referenceTargetType} onTargetChange={handleReferenceTargetChange}
                variableToken={referenceVariableToken} onVariableTokenChange={setReferenceVariableToken}
                primaryTarget={selectorTarget} sameHolder={sameHolderActive} onSameHolderChange={setSameHolder}
                popupSources={sources} disabled={!selectByValue} onValidityChange={setReferenceValid}
            />
            <WiredSection title={LocalizeText('wiredfurni.params.selector_options_selector')}>
                <WiredCheckboxGroup>
                    <WiredCheckboxOption checked={filter} label={LocalizeText('wiredfurni.params.selector_option.0')} onChange={setFilter} />
                    <WiredCheckboxOption checked={inverse} label={LocalizeText('wiredfurni.params.selector_option.1')} onChange={setInverse} last />
                </WiredCheckboxGroup>
            </WiredSection>
        </WiredSelectorBaseView>
    );
};
