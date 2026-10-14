import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT, WiredFurniType } from '../../../../api';
import { useWired, useWiredNativeVariables } from '../../../../hooks';
import { VoltInput } from '../../../../layout';
import { AMOUNT_TARGETS } from '../actions/WiredChestRewardForm';
import { WIRED_CMP_GREATER, WiredComparisonOperator } from '../WiredComparisonOperator';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { FurniPickSlotButtons } from './WiredVariableConditionParts';

const MAX_AMOUNT = 1000000;
const clampAmount = (value: number) => (Number.isFinite(value) ? Math.min(MAX_AMOUNT, Math.max(0, Math.trunc(value))) : 0);

/**
 * The two chest conditions (AIR ChestHasAmount and its item type subclass). Owned: [amount, amount option (1 variable), variable target,
 * comparison]; variable: the amount variable. The chests card reads furni [chests, merged furni]; the item type card [item types, chests,
 * merged furni]; both read users [merged user], the holder the variable is read on.
 */
export const WiredChestAmountCondition: FC<{ itemTypes: boolean }> = ({ itemTypes }) => {
    const {
        trigger = null,
        setIntParams = null,
        setFurniSources = null,
        setUserSources = null,
        setVariableIds = null,
        furniIds = [],
        secondaryFurniIds = [],
        setActivePickSlot = null
    } = useWired();
    const {
        userVariableDefinitions = [],
        furniVariableDefinitions = [],
        roomVariableDefinitions = [],
        contextVariableDefinitions = []
    } = useWiredNativeVariables();
    const [amount, setAmount] = useState(0);
    const [useVariable, setUseVariable] = useState(false);
    const [target, setTarget] = useState(AMOUNT_TARGETS[0].target);
    const [variableToken, setVariableToken] = useState('');
    const [comparison, setComparison] = useState(WIRED_CMP_GREATER);
    const [sources, setSources] = useState<number[]>(itemTypes ? [100, 101, 0] : [100, 200]);
    const [mergedUser, setMergedUser] = useState(0);
    const chestSlot = itemTypes ? 1 : 0;
    const mergedSlot = chestSlot + 1;

    const definitions = useMemo(() => {
        switch (target) {
            case 'furni':
                return furniVariableDefinitions;
            case 'global':
                return roomVariableDefinitions;
            case 'context':
                return contextVariableDefinitions;
            default:
                return userVariableDefinitions;
        }
    }, [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, target, userVariableDefinitions]);
    const entries = useMemo(() => buildWiredVariablePickerEntries(target, 'condition', definitions), [definitions, target]);

    useEffect(() => {
        if (!trigger) return;

        const [nextAmount = 0, nextOption = 0, nextTarget = 1, nextComparison = WIRED_CMP_GREATER] = trigger.intData;
        const variableId = trigger.variableIds[0] ?? WIRED_VARIABLE_ABSENT;

        setAmount(clampAmount(nextOption === 1 ? 1 : nextAmount));
        setUseVariable(nextOption === 1 && variableId !== WIRED_VARIABLE_ABSENT);
        setTarget(AMOUNT_TARGETS.find((entry) => entry.code === nextTarget)?.target ?? 'user');
        setVariableToken(tokenOfVariableSlot(variableId));
        setComparison(nextComparison);
        setSources(trigger.furniSources.length ? [...trigger.furniSources] : itemTypes ? [100, 101, 0] : [100, 200]);
        setMergedUser(trigger.userSources[0] ?? 0);
        setActivePickSlot?.((trigger.furniSources[0] ?? 100) === 101 ? 1 : 0);
    }, [itemTypes, setActivePickSlot, trigger]);

    const setSource = (slot: number, source: number) => {
        setSources((previous) => previous.map((value, index) => (index === slot ? source : value)));

        if (source === 100 || source === 101) setActivePickSlot?.(source === 101 ? 1 : 0);
    };

    const save = () => {
        const code = AMOUNT_TARGETS.find((entry) => entry.target === target)?.code ?? 1;

        setIntParams([clampAmount(amount), useVariable ? 1 : 0, code, comparison]);
        setVariableIds([useVariable ? variableSlotOf(variableToken) : WIRED_VARIABLE_ABSENT]);
        setFurniSources(sources.map((source, slot) => (slot === mergedSlot && !(useVariable && target === 'furni') ? 0 : source)));
        setUserSources([useVariable && target === 'user' ? mergedUser : 0]);
    };

    const validate = () => !useVariable || !!variableToken;
    const pickSlots = [0, 1].filter((list) =>
        sources.some((source, slot) => (slot < mergedSlot || (useVariable && target === 'furni')) && source === (list === 0 ? 100 : 101))
    );

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            validate={validate}
            footerCollapsible={false}
            footer={
                <>
                    {itemTypes && (
                        <WiredSourcesSelector
                            showFurni={true}
                            furniSlot={0}
                            furniSource={sources[0] ?? 100}
                            furniTitle="wiredfurni.params.sources.furni.title.item_types"
                            onChangeFurni={(source) => setSource(0, source)}
                        />
                    )}
                    <WiredSourcesSelector
                        showFurni={true}
                        furniSlot={chestSlot}
                        furniSource={sources[chestSlot] ?? 100}
                        furniTitle="wiredfurni.params.sources.furni.title.chests"
                        onChangeFurni={(source) => setSource(chestSlot, source)}
                    />
                    {useVariable && target === 'furni' && (
                        <WiredSourcesSelector
                            showFurni={true}
                            furniSlot={mergedSlot}
                            furniSource={sources[mergedSlot] ?? 0}
                            furniTitle="wiredfurni.params.sources.merged.title.variables_reference"
                            onChangeFurni={(source) => setSource(mergedSlot, source)}
                        />
                    )}
                    {useVariable && target === 'user' && (
                        <WiredSourcesSelector
                            showUsers={true}
                            userSlot={0}
                            userSource={mergedUser}
                            usersTitle="wiredfurni.params.sources.merged.title.variables_reference"
                            onChangeUsers={setMergedUser}
                        />
                    )}
                    {itemTypes && (
                        <FurniPickSlotButtons
                            slots={pickSlots.map((slot) => ({ slot: slot as 0 | 1, count: slot === 0 ? furniIds.length : secondaryFurniIds.length }))}
                        />
                    )}
                </>
            }
        >
            <WiredSection title={localizeWithFallback('wiredfurni.params.comparison_selection', 'Choose type:')}>
                <WiredComparisonOperator
                    name={itemTypes ? 'chestHasItemTypeComparison' : 'chestHasItemsComparison'}
                    title=""
                    value={comparison}
                    onChange={setComparison}
                />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.chest_compare_amount', 'Compare value:')}>
                <WiredRadioGroup
                    name={itemTypes ? 'chestItemTypeAmountOption' : 'chestItemsAmountOption'}
                    value={useVariable ? 1 : 0}
                    onChange={(value) => setUseVariable(value === 1)}
                    options={[
                        { id: 0, label: localizeWithFallback('wiredfurni.params.variables.reference_value.set_value', 'Set value:') },
                        { id: 1, label: localizeWithFallback('wiredfurni.params.variables.reference_value.from_variable', 'From Variable:') }
                    ]}
                />
                {!useVariable && (
                    <VoltInput
                        type="number"
                        min={0}
                        max={MAX_AMOUNT}
                        value={amount}
                        onChange={(event) => setAmount(clampAmount(Number(event.target.value)))}
                    />
                )}
                {useVariable && (
                    <>
                        <WiredRadioGroup
                            name={itemTypes ? 'chestItemTypeAmountTarget' : 'chestItemsAmountTarget'}
                            value={AMOUNT_TARGETS.findIndex((entry) => entry.target === target)}
                            onChange={(index) => {
                                setTarget(AMOUNT_TARGETS[index].target);
                                setVariableToken('');
                            }}
                            options={AMOUNT_TARGETS.map((entry, index) => ({ id: index, label: localizeWithFallback(entry.label, entry.target) }))}
                        />
                        <WiredVariablePicker
                            entries={entries}
                            recentScope="chest-compare-amount"
                            selectedToken={variableToken}
                            onSelect={(entry) => setVariableToken(entry.token)}
                        />
                    </>
                )}
            </WiredSection>
        </WiredConditionBaseView>
    );
};
