import { FC, useEffect, useState } from 'react';
import {
    joinWiredLiteral,
    LocalizeText,
    parseWiredLiteral,
    splitWiredLiteral,
    tokenOfVariableSlot,
    variableSlotOf,
    WIRED_VARIABLE_ABSENT,
    WiredFurniType,
    WiredNativeVariableScope
} from '../../../../api';
import { WiredSection } from '../WiredSection';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredActionValueOrVariableSection } from '../actions/WiredActionValueOrVariableSection';
import { useWired } from '../../../../hooks';
import { normalizeWiredComparison, WIRED_CMP_EQUAL } from '../WiredComparisonOperator';
import { WiredMergedSourceSection } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { FurniPickSlotButtons, VariableQuantifierRadios, VariableScopeButtons, useConditionVariableEntries } from './WiredVariableConditionParts';
import { scopeOfTargetCode, targetCodeOfScope } from '../../../../api';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const SCOPES: WiredNativeVariableScope[] = ['furni', 'user', 'global', 'context'];
/** The reference option: a typed constant, or the value of another variable. */
const REFERENCE_CONSTANT = 0;
const REFERENCE_VARIABLE = 1;
/** Native furni sources 100 and 101 read the primary and secondary pick lists, regardless of variable role. */
const FURNI_SOURCE_SELECTED = 100;
const FURNI_SOURCE_SECONDARY_SELECTED = 101;

/**
 * Owned: [destination target, comparison (native radio value), reference option, value high, value low, reference target, same holder];
 * furni: [destination furni source, reference furni source]; users: [destination user source, reference user source];
 * variables: [destination variable, reference variable]; the quantifier is the condition's own field; the text is empty.
 * The value is kept as the exact decimal the user typed, and split into its signed words only when saved.
 */
export const WiredConditionVariableValueMatchView: FC<{}> = () => {
    const {
        trigger = null,
        furniIds = [],
        setActivePickSlot = null,
        secondaryFurniIds = [],
        quantifier = 0,
        setQuantifier = null,
        setIntParams = null,
        setStringParam = null,
        setVariableIds = null,
        setFurniSources = null,
        setUserSources = null
    } = useWired();
    const [scope, setScope] = useState<WiredNativeVariableScope>('user');
    const [variableToken, setVariableToken] = useState('');
    const [comparison, setComparison] = useState(WIRED_CMP_EQUAL);
    const [option, setOption] = useState(REFERENCE_CONSTANT);
    const [constantInput, setConstantInput] = useState('0');
    const [referenceScope, setReferenceScope] = useState<WiredNativeVariableScope>('user');
    const [sameHolder, setSameHolder] = useState(false);
    const [referenceValid, setReferenceValid] = useState(true);
    const [referenceToken, setReferenceToken] = useState('');
    const [userSource, setUserSource] = useState(0);
    const [furniSource, setFurniSource] = useState(0);
    const [referenceUserSource, setReferenceUserSource] = useState(0);
    const [referenceFurniSource, setReferenceFurniSource] = useState(0);
    const entries = useConditionVariableEntries(scope, variableToken, 'value');
    const sameHolderActive = sameHolder && referenceScope === scope && (scope === 'user' || scope === 'furni');

    const usesReference = option === REFERENCE_VARIABLE;
    const picksFurni = scope === 'furni' && (furniSource === FURNI_SOURCE_SELECTED || furniSource === FURNI_SOURCE_SECONDARY_SELECTED);
    const picksReference = usesReference && !sameHolderActive && referenceScope === 'furni' && (referenceFurniSource === FURNI_SOURCE_SELECTED || referenceFurniSource === FURNI_SOURCE_SECONDARY_SELECTED);
    const requiresFurni = picksFurni || picksReference ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;
    useEffect(() => {
        if (picksReference && !picksFurni) setActivePickSlot(referenceFurniSource === 101 ? 1 : 0);
    }, [picksReference, picksFurni, referenceFurniSource, setActivePickSlot]);

    useEffect(() => {
        if (!trigger) return;

        const ints = trigger.intData ?? [];

        setScope(scopeOfTargetCode(ints[0]));
        setComparison(ints.length > 1 ? normalizeWiredComparison(ints[1]) : WIRED_CMP_EQUAL);
        setOption(ints[2] === REFERENCE_VARIABLE ? REFERENCE_VARIABLE : REFERENCE_CONSTANT);
        setConstantInput(ints.length > 4 ? joinWiredLiteral(ints[3], ints[4]) : '0');
        setReferenceScope(scopeOfTargetCode(ints[5]));
        setSameHolder((ints[6] ?? 0) !== 0);
        setVariableToken(tokenOfVariableSlot(trigger.variableIds?.[0]));
        setReferenceToken(tokenOfVariableSlot(trigger.variableIds?.[1]));
        setFurniSource(trigger.furniSources?.[0] ?? 0);
        setReferenceFurniSource(trigger.furniSources?.[1] ?? 0);
        setUserSource(trigger.userSources?.[0] ?? 0);
        setReferenceUserSource(trigger.userSources?.[1] ?? 0);
        if (scopeOfTargetCode(ints[0]) === 'furni' && [100, 101].includes(trigger.furniSources?.[0])) setActivePickSlot(trigger.furniSources[0] === 101 ? 1 : 0);
        else if (ints[2] === REFERENCE_VARIABLE && scopeOfTargetCode(ints[5]) === 'furni' && [100, 101].includes(trigger.furniSources?.[1])) setActivePickSlot(trigger.furniSources[1] === 101 ? 1 : 0);
    }, [setActivePickSlot, trigger]);

    const constantValid = parseWiredLiteral(constantInput.trim()) !== null;

    const save = () => {
        const [high, low] = splitWiredLiteral(parseWiredLiteral(constantInput.trim()) ?? 0n);

        setIntParams([targetCodeOfScope(scope), comparison, option, high, low, targetCodeOfScope(referenceScope), usesReference && sameHolderActive ? 1 : 0]);
        setVariableIds([variableSlotOf(variableToken), usesReference ? variableSlotOf(referenceToken) : WIRED_VARIABLE_ABSENT]);
        setFurniSources([furniSource, referenceFurniSource]);
        setUserSources([userSource, referenceUserSource]);
        setStringParam('');
    };

    const validate = () => {
        if (!variableToken || !referenceValid) return false;
        if (!usesReference) return constantValid;

        return !!referenceToken;
    };

    const handleScopeChange = (next: WiredNativeVariableScope) => {
        if (next === scope) return;

        setScope(next);
        setVariableToken('');
    };

    const handleReferenceScopeChange = (next: WiredNativeVariableScope) => {
        if (next === referenceScope) return;

        setReferenceScope(next);
        setReferenceToken('');
    };

    return (
        <WiredConditionBaseView nativeLayout hasSpecialInput requiresFurni={requiresFurni} save={save} validate={validate} footerCollapsible={false}
            footer={<>
                <VariableQuantifierRadios name="wiredConditionVariableValueQuantifier" value={quantifier} onChange={setQuantifier} />
                {/* AIR mergedSelections [[0,0],[1,1]]: slot 0 is the footer "Variables" section; slot 1 is claimed by the reference value section and lives in its popup. */}
                <WiredMergedSourceSection scope={scope} title="wiredfurni.params.sources.merged.title.variables" furniSlot={0} userSlot={0}
                    furniSource={furniSource} userSource={userSource} onChangeFurni={value => { setFurniSource(value); if ([100, 101].includes(value)) setActivePickSlot(value === 101 ? 1 : 0); }} onChangeUsers={setUserSource} />
            </>}>
            <WiredSection title={LocalizeText('wiredfurni.params.variables.variable_selection')} headerOptionsRight={<VariableScopeButtons scopes={SCOPES} value={scope} onChange={handleScopeChange} />}>
                <WiredVariablePicker entries={entries} recentScope="variable-conditions" selectedToken={variableToken} onSelect={entry => setVariableToken(entry.token)} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.comparison_selection')}>
                <WiredRadioGroup name="variable-value-comparison" columns={6} value={comparison} onChange={setComparison} options={[2, 5, 1, 3, 0, 4].map(id => ({ id, label: ['<', '=', '>', '≤', '≠', '≥'][id] }))} />
            </WiredSection>
            <WiredActionValueOrVariableSection title={LocalizeText('wiredfurni.params.variables.reference_value')}
                targetTitle={LocalizeText('wiredfurni.params.sources.merged.title.variables_reference')} recentScope="variable-value-reference"
                min={-2147483648} max={2147483647} option={option} onOptionChange={setOption}
                literal={Number(constantInput)} literalText={constantInput} onLiteralTextChange={setConstantInput} onLiteralChange={value => setConstantInput(String(value))}
                target={referenceScope} onTargetChange={handleReferenceScopeChange} variableToken={referenceToken} onVariableTokenChange={setReferenceToken}
                primaryTarget={scope} sameHolder={sameHolderActive} onSameHolderChange={setSameHolder} onValidityChange={setReferenceValid}
                popupSources={<WiredMergedSourceSection bare scope={referenceScope} title="wiredfurni.params.sources.merged.title.variables" furniSlot={1} userSlot={1} furniSource={referenceFurniSource} userSource={referenceUserSource} onChangeFurni={value => { setReferenceFurniSource(value); if ([100, 101].includes(value)) setActivePickSlot(value === 101 ? 1 : 0); }} onChangeUsers={setReferenceUserSource} />} />
            {(picksFurni || picksReference) && <FurniPickSlotButtons slots={[...(picksFurni ? [{ slot: (furniSource === 101 ? 1 : 0) as 0 | 1, count: furniSource === 101 ? secondaryFurniIds.length : furniIds.length }] : []), ...(picksReference ? [{ slot: (referenceFurniSource === 101 ? 1 : 0) as 0 | 1, count: referenceFurniSource === 101 ? secondaryFurniIds.length : furniIds.length }] : [])]} />}
        </WiredConditionBaseView>
    );
};
