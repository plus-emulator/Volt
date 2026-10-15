import { FC, useEffect, useMemo, useState } from 'react';
import { getNativeVariableId, joinWiredLiteral, LocalizeText, parseWiredLiteral, splitWiredLiteral, tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT, WiredFurniType } from '../../../../api';
import { useWired, useWiredNativeVariables } from '../../../../hooks';
import { WiredDropdown } from '../WiredDropdown';
import { WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredSourceTypeSelector } from '../WiredSourceTypeSelector';
import { WiredText } from '../WiredText';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { FurniPickSlotButtons } from '../conditions/WiredVariableConditionParts';
import { WiredActionBaseView } from './WiredActionBaseView';
import { getWiredValueTargetCode, normalizeWiredValueTarget, WiredActionValueOrVariableSection, WiredValueTargetType } from './WiredActionValueOrVariableSection';
import { localizeWiredVariableOperation, WIRED_VARIABLE_OPERATIONS, WIRED_VARIABLE_UNARY_OPERATIONS } from './WiredVariableOperations';

/** AIR25 GiveVariable/RemoveVariable/ChangeVariable share destination and merged-source controls. */
export const WiredVariableActionEditor: FC<{ kind: 'give' | 'remove' | 'change' }> = ({ kind }) => {
    const { trigger, setIntParams, setVariableIds, setStringParam, setFurniSources, setUserSources, furniIds = [], secondaryFurniIds = [], setActivePickSlot } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredNativeVariables();
    const [target, setTarget] = useState<WiredValueTargetType>('user');
    const [variable, setVariable] = useState('');
    const [overrideExisting, setOverrideExisting] = useState(false);
    const [operation, setOperation] = useState(0);
    const [option, setOption] = useState(0);
    const [literal, setLiteral] = useState('0');
    const [referenceTarget, setReferenceTarget] = useState<WiredValueTargetType>('global');
    const [reference, setReference] = useState('');
    const [sameHolder, setSameHolder] = useState(false);
    const [validInput, setValidInput] = useState(true);
    const [furni, setFurni] = useState([0, 200]);
    const [users, setUsers] = useState([0, 200]);
    const definitions = { user: userVariableDefinitions, furni: furniVariableDefinitions, global: roomVariableDefinitions, context: contextVariableDefinitions }[target];
    const entries = useMemo(() => {
        const available = buildWiredVariablePickerEntries(target, kind === 'change' ? 'change-destination' : kind, definitions);
        if (!variable || flattenWiredVariablePickerEntries(available).some(entry => entry.token === variable)) return available;
        const fallback = createFallbackVariableEntry(target, variable);
        return fallback ? [fallback, ...available] : available;
    }, [definitions, kind, target, variable]);
    const selectedDefinition = definitions.find(definition => definition.variableId === getNativeVariableId(variable));
    const referenceDisabled = kind === 'change' ? WIRED_VARIABLE_UNARY_OPERATIONS.includes(operation) : kind === 'give' && (!variable || (!!selectedDefinition && !selectedDefinition.hasValue));
    const effectiveSameHolder = option === 1 && sameHolder && target === referenceTarget && (target === 'user' || target === 'furni');

    useEffect(() => {
        if (!trigger) return;
        const data = trigger.intData;
        setTarget(normalizeWiredValueTarget(data[0] ?? 1));
        setVariable(tokenOfVariableSlot(trigger.variableIds[0]));
        setOverrideExisting(data[3] === 1);
        setOperation(kind === 'change' ? data[1] ?? 0 : 0);
        setOption(kind === 'give' ? data[4] ?? 0 : kind === 'change' ? data[2] ?? 0 : 0);
        const high = kind === 'give' ? data[1] : data[3];
        const low = kind === 'give' ? data[2] : data[4];
        setLiteral(high !== undefined && low !== undefined ? joinWiredLiteral(high, low) : '0');
        setReferenceTarget(normalizeWiredValueTarget(data[5] ?? -10));
        setReference(tokenOfVariableSlot(trigger.variableIds[1]));
        setSameHolder(data[6] === 1);
        setValidInput(true);
        setFurni([trigger.furniSources[0] ?? trigger.inputSources?.furniDefaults[0] ?? (kind === 'remove' ? 100 : 0), trigger.furniSources[1] ?? trigger.inputSources?.furniDefaults[1] ?? 200]);
        setUsers([trigger.userSources[0] ?? trigger.inputSources?.userDefaults[0] ?? 0, trigger.userSources[1] ?? trigger.inputSources?.userDefaults[1] ?? 200]);
    }, [trigger, kind]);

    const pickSlots = [
        ...(target === 'furni' && (furni[0] === 100 || furni[0] === 101) ? [furni[0] === 101 ? 1 : 0] : []),
        ...(!referenceDisabled && option === 1 && !effectiveSameHolder && referenceTarget === 'furni' && (furni[1] === 100 || furni[1] === 101) ? [furni[1] === 101 ? 1 : 0] : [])
    ];
    const firstPickSlot = pickSlots[0];
    useEffect(() => { if (firstPickSlot !== undefined) setActivePickSlot(firstPickSlot as 0 | 1); }, [firstPickSlot, setActivePickSlot]);
    const save = () => {
        const [high, low] = splitWiredLiteral(parseWiredLiteral(literal) ?? 0n);
        const valueOption = referenceDisabled ? 0 : option;
        const holder = !referenceDisabled && effectiveSameHolder ? 1 : 0;
        const destination = getWiredValueTargetCode(target);
        setIntParams(kind === 'remove' ? [destination] : kind === 'give'
            ? [destination, high, low, overrideExisting ? 1 : 0, valueOption, getWiredValueTargetCode(referenceTarget), holder]
            : [destination, operation, valueOption, high, low, getWiredValueTargetCode(referenceTarget), holder]);
        setVariableIds(kind === 'remove' ? [variableSlotOf(variable)] : [variableSlotOf(variable), valueOption === 1 ? variableSlotOf(reference) : WIRED_VARIABLE_ABSENT]);
        setFurniSources(kind === 'remove' ? furni.slice(0, 1) : furni);
        setUserSources(kind === 'remove' ? users.slice(0, 1) : users);
        setStringParam('');
    };
    const validate = () => !!getNativeVariableId(variable) && (kind === 'remove' || referenceDisabled || (validInput && (option === 1 ? !!getNativeVariableId(reference) : parseWiredLiteral(literal) !== null)));
    const sourceControl = (slot: number, sourceTarget: WiredValueTargetType, title: string, disabled = false) => (
        <fieldset disabled={disabled} inert={disabled} style={{ minWidth: 0, border: 0, padding: 0, margin: 0, opacity: disabled ? 0.5 : undefined }}>
            {sourceTarget === 'global' || sourceTarget === 'context'
                ? <WiredSection title={LocalizeText(title)}><WiredText text={LocalizeText(sourceTarget === 'global' ? 'wiredfurni.params.sources.global' : 'wiredfurni.params.sources.context.current')} /></WiredSection>
                : <WiredSourcesSelector furniSlot={slot} userSlot={slot} showFurni={sourceTarget === 'furni'} showUsers={sourceTarget === 'user'} furniTitle={title} usersTitle={title}
                    furniSource={furni[slot]} userSource={users[slot]}
                    onChangeFurni={value => { setFurni(current => current.map((source, index) => index === slot ? value : source)); if (value === 100 || value === 101) setActivePickSlot(value === 101 ? 1 : 0); }}
                    onChangeUsers={value => setUsers(current => current.map((source, index) => index === slot ? value : source))} />}
        </fieldset>
    );
    const referenceTitle = LocalizeText(kind === 'give' ? 'wiredfurni.params.variables.value_settings.initial_value' : 'wiredfurni.params.variables.reference_value');
    return <WiredActionBaseView nativeLayout hasSpecialInput requiresFurni={pickSlots.length ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE} selectionPreview={<></>} save={save} validate={validate} footerCollapsible={false}
        footer={<>
            {sourceControl(0, target, kind === 'remove' ? 'wiredfurni.params.sources.merged.title.variables' : 'wiredfurni.params.sources.merged.title.variables_destination')}
            {/* AIR ChangeVariable/GiveVariable.mergedSelections [[0,0],[1,1]]: the reference holder is the second footer section,
                disabled without an operand or with the same holder (isInputSourceDisabled). */}
            {kind !== 'remove' && sourceControl(1, referenceTarget, 'wiredfurni.params.sources.merged.title.variables_reference', referenceDisabled || effectiveSameHolder)}
        </>}>
        <FurniPickSlotButtons slots={[...new Set(pickSlots)].map(slot => ({ slot: slot as 0 | 1, count: slot === 0 ? furniIds.length : secondaryFurniIds.length }))} />
        <WiredSection title={LocalizeText('wiredfurni.params.variables.variable_selection')} headerOption={<WiredSourceTypeSelector types={kind === 'change' ? ['furni', 'user', 'global', 'context'] : ['furni', 'user', 'context']} value={target} onChange={next => { setTarget(next); setVariable(''); }} />}>
            <WiredVariablePicker entries={entries} recentScope="variable-effects" selectedToken={variable} onSelect={entry => setVariable(entry.token)} />
            {kind === 'give' && <WiredCheckboxOption label={LocalizeText('wiredfurni.params.variables.value_settings.override_existing')} checked={overrideExisting} onChange={setOverrideExisting} />}
        </WiredSection>
        {kind === 'change' && <WiredSection title={LocalizeText('wiredfurni.params.variables.operation')}><WiredDropdown options={WIRED_VARIABLE_OPERATIONS.map(id => ({ id, label: localizeWiredVariableOperation(id), advanced: id >= 40 }))} advancedCaption={LocalizeText('wiredfurni.params.variables.operation.advanced')} caption={LocalizeText('wiredfurni.params.variables.operation.tooltip')} value={operation} onChange={setOperation} /></WiredSection>}
        {kind !== 'remove' && <WiredActionValueOrVariableSection title={referenceTitle} targetTitle={LocalizeText('wiredfurni.params.variables.reference_value.target')} recentScope="variable-effects-reference"
            min={-2147483648} max={2147483647} option={option} onOptionChange={setOption} literal={0} onLiteralChange={value => setLiteral(String(value))} literalText={literal} onLiteralTextChange={setLiteral}
            target={referenceTarget} onTargetChange={setReferenceTarget} variableToken={reference} onVariableTokenChange={setReference} disabled={referenceDisabled} onValidityChange={setValidInput}
            primaryTarget={target} sameHolder={sameHolder} onSameHolderChange={setSameHolder}
 />}
    </WiredActionBaseView>;
};
