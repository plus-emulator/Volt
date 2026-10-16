import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType, createNativeVariableToken, tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT } from '../../../../api';
import { useWired, useWiredNativeVariables } from '../../../../hooks';
import { WiredActionValueOrVariableSection, getWiredValueTargetCode, normalizeWiredValueTarget, WiredValueTargetType } from '../actions/WiredActionValueOrVariableSection';
import { FurniPickSlotButtons } from '../conditions/WiredVariableConditionParts';
import { WiredDropdown } from '../WiredDropdown';
import { WiredSection } from '../WiredSection';
import { WiredMergedSourceSection } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/** AIR addons/VariableFilter: variable picker, supported sort orders, compact ValueOrVariable section. */
export const WiredExtraFilterByVariableView: FC<{ target: 'user' | 'furni' }> = ({ target }) => {
    const { trigger, furniIds = [], secondaryFurniIds = [], setIntParams, setStringParam, setVariableIds, setUserSources, setFurniSources } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [] } = useWiredNativeVariables();
    const [variableToken, setVariableToken] = useState('');
    const [sortBy, setSortBy] = useState(0);
    const [amount, setAmount] = useState(1);
    const [option, setOption] = useState(0);
    const [referenceTarget, setReferenceTarget] = useState<WiredValueTargetType>('user');
    const [referenceToken, setReferenceToken] = useState('');
    const [userSource, setUserSource] = useState(0);
    const [furniSource, setFurniSource] = useState(100);
    const [valid, setValid] = useState(true);
    const definitions = target === 'user' ? userVariableDefinitions : furniVariableDefinitions;
    const definition = definitions.find(item => createNativeVariableToken(item.variableId) === variableToken);
    const sortOptions = [0, 1, 2, 3, 4, 5].filter(order => !definition || (order < 2 ? definition.hasValue : order < 4 ? definition.canReadCreationTime !== false : definition.canReadLastUpdateTime !== false));
    const entries = useMemo(() => {
        const entries = buildWiredVariablePickerEntries(target, 'filter-main', definitions.filter(item => item.hasValue || item.canReadCreationTime !== false || item.canReadLastUpdateTime !== false));
        if (!variableToken || flattenWiredVariablePickerEntries(entries).some(entry => entry.token === variableToken)) return entries;
        const fallback = createFallbackVariableEntry(target, variableToken);
        return fallback ? [fallback, ...entries] : entries;
    }, [definitions, target, variableToken]);
    useEffect(() => {
        if (!trigger) return;
        const [count = 1, order = 0, mode = 0, scope = 1] = trigger.intData;
        setVariableToken(tokenOfVariableSlot(trigger.variableIds[0]));
        setReferenceToken(mode === 1 ? tokenOfVariableSlot(trigger.variableIds[1]) : '');
        setAmount(mode === 1 ? 1 : count);
        setSortBy(order); setOption(mode); setReferenceTarget(normalizeWiredValueTarget(scope));
        setFurniSource(trigger.furniSources[0] ?? trigger.inputSources?.furniDefaults[0] ?? 100);
        setUserSource(trigger.userSources[0] ?? trigger.inputSources?.userDefaults[0] ?? 0);
    }, [trigger]);
    useEffect(() => { if (sortOptions.length && !sortOptions.includes(sortBy)) setSortBy(sortOptions[0]); }, [sortBy, sortOptions]);
    const picks = option === 1 && referenceTarget === 'furni' && (furniSource === 100 || furniSource === 101);
    const save = () => {
        setIntParams([amount, sortBy, option, getWiredValueTargetCode(referenceTarget)]);
        setVariableIds([variableSlotOf(variableToken), option === 1 ? variableSlotOf(referenceToken) : WIRED_VARIABLE_ABSENT]);
        setStringParam(''); setUserSources([userSource]); setFurniSources([furniSource]);
    };
    return <WiredExtraBaseView nativeLayout hasSpecialInput requiresFurni={picks ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE}
        save={save} validate={() => valid && !!variableToken && (option !== 1 || !!referenceToken)}>
        <WiredSection title={LocalizeText('wiredfurni.params.variables.variable_selection')}>
            <WiredVariablePicker entries={entries} recentScope={`variable-extra-${target}`} selectedToken={variableToken} onSelect={entry => setVariableToken(entry.token)} onClear={() => setVariableToken('')} />
        </WiredSection>
        <WiredSection title={LocalizeText('wiredfurni.params.variables.sort_by')}>
            <WiredDropdown caption={LocalizeText('wiredfurni.params.variables.sort_by.caption')} value={sortBy}
                options={sortOptions.map(id => ({ id, label: LocalizeText(`wiredfurni.params.variables.sort_by.${id}`) }))} onChange={setSortBy} />
        </WiredSection>
        <WiredActionValueOrVariableSection title={LocalizeText('wiredfurni.params.setfilter')} targetTitle={LocalizeText('wiredfurni.params.sources.merged.title.variables_reference')}
            recentScope={`variable-extra-reference-${target}`} min={1} max={1000} literal={amount} onLiteralChange={setAmount}
            option={option} onOptionChange={setOption} target={referenceTarget} onTargetChange={setReferenceTarget}
            variableToken={referenceToken} onVariableTokenChange={setReferenceToken} onValidityChange={setValid}
            // AIR VariableFilter.as:128,132-160 (WIN63-202610131318): merged [[0,0]] is claimed by the amount section and drawn as a bare row in its popup.
            popupSources={<>
                {referenceTarget === 'furni' && <FurniPickSlotButtons slots={furniSource === 100 ? [{ slot: 0, count: furniIds.length }] : furniSource === 101 ? [{ slot: 1, count: secondaryFurniIds.length }] : []} />}
                <WiredMergedSourceSection bare scope={referenceTarget} title="wiredfurni.params.sources.merged.title.variables" furniSlot={0} userSlot={0}
                    furniSource={furniSource} userSource={userSource} onChangeFurni={setFurniSource} onChangeUsers={setUserSource} />
            </>} />
    </WiredExtraBaseView>;
};
