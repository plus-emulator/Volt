import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType, WiredNativeVariableScope, tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { WiredSection } from '../WiredSection';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredDropdown } from '../WiredDropdown';
import { WiredActionValueOrVariableSection } from '../actions/WiredActionValueOrVariableSection';
import { getNativeVariableId, WIRED_VARIABLE_ABSENT } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredMergedSourceSection } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { FurniPickSlotButtons, VariableQuantifierRadios, VariableScopeButtons, useConditionVariableEntries } from './WiredVariableConditionParts';
import { scopeOfTargetCode, targetCodeOfScope } from '../../../../api';
import { WiredConditionBaseView } from './WiredConditionBaseView';

/** The age card compares the variable's creation or last update with a duration. */
const COMPARE_CREATED = 0;
const COMPARE_UPDATED = 1;
/** Comparison as the native form sends it: 0 is "younger than" (<), 2 is "older than" (>). */
const COMPARISON_LESS = 0;
const COMPARISON_GREATER = 2;
const DURATION_MAX = 2147483647;
const DURATION_MIN = -2147483648;
const DURATION_UNITS = [0, 1, 2, 3, 4, 5, 6, 7];
const SCOPES: WiredNativeVariableScope[] = ['furni', 'user', 'global', 'context'];
const FURNI_SOURCE_SELECTED = 100;
const FURNI_SOURCE_SECONDARY_SELECTED = 101;

/**
 * AIR VariableAge: [target, comparison, clock, duration high/low, unit, reference option, reference target].
 * Both variable slots and both holder/reference source pairs are preserved; text is empty.
 */
export const WiredConditionVariableAgeMatchView: FC<{}> = () => {
    const { trigger = null, nativeCatalog, furniIds = [], secondaryFurniIds = [], setActivePickSlot = null, quantifier = 0, setQuantifier = null, setIntParams = null, setStringParam = null, setVariableIds = null, setFurniSources = null, setUserSources = null } =
        useWired();
    const [scope, setScope] = useState<WiredNativeVariableScope>('user');
    const [variableToken, setVariableToken] = useState('');
    const [compareValue, setCompareValue] = useState(COMPARE_CREATED);
    const [comparison, setComparison] = useState(COMPARISON_LESS);
    const [durationInput, setDurationInput] = useState('0');
    const [referenceOption, setReferenceOption] = useState(0);
    const [referenceScope, setReferenceScope] = useState<WiredNativeVariableScope>('global');
    const [referenceToken, setReferenceToken] = useState('');
    const [referenceUserSource, setReferenceUserSource] = useState(0);
    const [referenceFurniSource, setReferenceFurniSource] = useState(0);
    const [referenceValid, setReferenceValid] = useState(true);
    const [durationUnit, setDurationUnit] = useState(1);
    const [userSource, setUserSource] = useState(0);
    const [furniSource, setFurniSource] = useState(0);
    const entries = useConditionVariableEntries(scope, variableToken, 'age');

    const picksFurni = scope === 'furni' && (furniSource === FURNI_SOURCE_SELECTED || furniSource === FURNI_SOURCE_SECONDARY_SELECTED);
    useEffect(() => {
        if (picksFurni) setActivePickSlot(furniSource === FURNI_SOURCE_SECONDARY_SELECTED ? 1 : 0);
    }, [furniSource, picksFurni, setActivePickSlot]);

    const picksReference = referenceOption === 1 && referenceScope === 'furni' && [100, 101].includes(referenceFurniSource);
    const requiresFurni = picksFurni || picksReference ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;
    useEffect(() => {
        if (picksReference && !picksFurni) setActivePickSlot(referenceFurniSource === 101 ? 1 : 0);
    }, [picksReference, picksFurni, referenceFurniSource, setActivePickSlot]);

    useEffect(() => {
        if (!trigger) return;

        const ints = trigger.intData ?? [];

        setScope(scopeOfTargetCode(ints[0]));
        setComparison(ints[1] === COMPARISON_GREATER ? COMPARISON_GREATER : COMPARISON_LESS);
        setCompareValue(ints[2] === COMPARE_UPDATED ? COMPARE_UPDATED : COMPARE_CREATED);
        setDurationInput(String(ints[4] ?? 0));
        setDurationUnit(DURATION_UNITS.includes(ints[5]) ? ints[5] : 1);
        setReferenceOption(ints[6] === 1 ? 1 : 0);
        setReferenceScope(scopeOfTargetCode(ints[7] ?? -10));
        setReferenceToken(tokenOfVariableSlot(trigger.variableIds?.[1]));
        // Older native records carried a single merged source; current AIR uses a second source pair.
        setReferenceFurniSource(trigger.furniSources?.[1] ?? trigger.furniSources?.[0] ?? 0);
        setReferenceUserSource(trigger.userSources?.[1] ?? trigger.userSources?.[0] ?? 0);
        setVariableToken(tokenOfVariableSlot(trigger.variableIds?.[0]));
        setFurniSource(trigger.furniSources?.[0] ?? 0);
        setUserSource(trigger.userSources?.[0] ?? 0);
    }, [trigger]);

    const selectedVariable = nativeCatalog?.rows.get(getNativeVariableId(variableToken))?.variable;
    const creationDisabled = selectedVariable ? !selectedVariable.canReadCreationTime : false;
    const updateDisabled = selectedVariable ? !selectedVariable.canReadLastUpdateTime : false;

    const parsedDuration = Number(durationInput.trim());
    const durationValid = /^-?\d+$/.test(durationInput.trim()) && parsedDuration >= DURATION_MIN && parsedDuration <= DURATION_MAX;

    const save = () => {
        setIntParams([targetCodeOfScope(scope), comparison, compareValue, durationValid && parsedDuration < 0 ? -1 : 0, durationValid ? parsedDuration : 0, durationUnit, referenceOption, targetCodeOfScope(referenceScope)]);
        setFurniSources([furniSource, referenceFurniSource]);
        setUserSources([userSource, referenceUserSource]);
        setVariableIds([variableSlotOf(variableToken), referenceOption === 1 ? variableSlotOf(referenceToken) : WIRED_VARIABLE_ABSENT]);
        setStringParam('');
    };

    const validate = () => {
        if (!variableToken.length) return false;
        if (!referenceValid || (referenceOption === 0 ? !durationValid : !referenceToken)) return false;

        return true;
    };

    const handleScopeChange = (next: WiredNativeVariableScope) => {
        if (next === scope) return;

        setScope(next);
        setVariableToken('');
    };

    return (
        <WiredConditionBaseView nativeLayout hasSpecialInput requiresFurni={requiresFurni} save={save} validate={validate} footerCollapsible={false}
            footer={<>
                <VariableQuantifierRadios name="wiredConditionVariableAgeQuantifier" value={quantifier} onChange={setQuantifier} />
                {/* AIR mergedSelections [[0,0],[1,1]]: slot 0 is the footer "Variables" section; slot 1 is claimed by the reference value section and lives in its popup. */}
                <WiredMergedSourceSection scope={scope} title="wiredfurni.params.sources.merged.title.variables" furniSlot={0} userSlot={0}
                    furniSource={furniSource} userSource={userSource} onChangeFurni={value => { setFurniSource(value); if ([100, 101].includes(value)) setActivePickSlot(value === 101 ? 1 : 0); }} onChangeUsers={setUserSource} />
            </>}>
            <WiredSection title={LocalizeText('wiredfurni.params.variables.variable_selection')} headerOptionsRight={<VariableScopeButtons scopes={SCOPES} value={scope} onChange={handleScopeChange} />}>
                <WiredVariablePicker entries={entries} recentScope="variable-conditions" selectedToken={variableToken} onSelect={entry => setVariableToken(entry.token)} onClear={() => setVariableToken('')} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.variables.compare_value')}>
                <WiredRadioGroup name="variable-age-clock" columns={2} value={compareValue} onChange={setCompareValue} options={[0, 1].map(id => ({ id, label: LocalizeText(`wiredfurni.params.variables.compare_value.${id}`), disabled: id === 0 ? creationDisabled : updateDisabled }))} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.comparison_selection')}>
                <WiredRadioGroup name="variable-age-comparison" columns={2} value={comparison} onChange={setComparison} options={[0, 2].map(id => ({ id, label: LocalizeText(`wiredfurni.params.comparison.${id}`) }))} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.variables.time_selection')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <WiredActionValueOrVariableSection inline title={LocalizeText('wiredfurni.params.variables.time_selection')}
                        targetTitle={LocalizeText('wiredfurni.params.sources.merged.title.variables_reference')} recentScope="variable-age-reference"
                        min={DURATION_MIN} max={DURATION_MAX} option={referenceOption} onOptionChange={setReferenceOption}
                        literal={Number(durationInput)} onLiteralChange={value => setDurationInput(String(value))}
                        target={referenceScope} onTargetChange={next => { setReferenceScope(next); setReferenceToken(''); }}
                        variableToken={referenceToken} onVariableTokenChange={setReferenceToken} onValidityChange={setReferenceValid}
                        popupSources={<WiredMergedSourceSection bare scope={referenceScope} title="wiredfurni.params.sources.merged.title.variables" furniSlot={1} userSlot={1} furniSource={referenceFurniSource} userSource={referenceUserSource} onChangeFurni={value => { setReferenceFurniSource(value); if ([100, 101].includes(value)) setActivePickSlot(value === 101 ? 1 : 0); }} onChangeUsers={setReferenceUserSource} />} />
                    <div style={{ width: 90, flexShrink: 0 }}><WiredDropdown caption={LocalizeText('wiredfurni.params.variables.duration')} value={durationUnit} onChange={setDurationUnit} options={DURATION_UNITS.map(id => ({ id, label: LocalizeText(`wiredfurni.params.variables.duration.${id}`) }))} /></div>
                </div>
            </WiredSection>
            {(picksFurni || picksReference) && <FurniPickSlotButtons slots={[...(picksFurni ? [{ slot: (furniSource === 101 ? 1 : 0) as 0 | 1, count: furniSource === 101 ? secondaryFurniIds.length : furniIds.length }] : []), ...(picksReference ? [{ slot: (referenceFurniSource === 101 ? 1 : 0) as 0 | 1, count: referenceFurniSource === 101 ? secondaryFurniIds.length : furniIds.length }] : [])]} />}
        </WiredConditionBaseView>
    );
};
