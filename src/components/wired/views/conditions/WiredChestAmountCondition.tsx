import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { AMOUNT_TARGETS } from '../actions/WiredChestRewardForm';
import { WIRED_CMP_GREATER, WiredComparisonOperator } from '../WiredComparisonOperator';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionValueOrVariableSection } from '../actions/WiredActionValueOrVariableSection';
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
    const [amount, setAmount] = useState(0);
    const [useVariable, setUseVariable] = useState(false);
    const [amountValid, setAmountValid] = useState(true);
    const [target, setTarget] = useState(AMOUNT_TARGETS[0].target);
    const [variableToken, setVariableToken] = useState('');
    const [comparison, setComparison] = useState(WIRED_CMP_GREATER);
    const [sources, setSources] = useState<number[]>(itemTypes ? [100, 101, 0] : [100, 200]);
    const [mergedUser, setMergedUser] = useState(0);
    const chestSlot = itemTypes ? 1 : 0;
    const mergedSlot = chestSlot + 1;

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

    const validate = () => amountValid && (!useVariable || !!variableToken);
    const pickSlots = [0, 1].filter((list) =>
        sources.some((source, slot) => (slot < mergedSlot || (useVariable && target === 'furni')) && source === (list === 0 ? 100 : 101))
    );

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
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
            <WiredActionValueOrVariableSection
                title={localizeWithFallback('wiredfurni.params.chest_compare_amount', 'Compare value:')}
                targetTitle={localizeWithFallback('wiredfurni.params.variables.reference_value.target', 'Variable source:')}
                recentScope="chest-compare-amount"
                variableUsage="condition"
                min={0}
                max={MAX_AMOUNT}
                option={useVariable ? 1 : 0}
                onOptionChange={(option) => setUseVariable(option === 1)}
                literal={amount}
                onLiteralChange={setAmount}
                target={target}
                onTargetChange={setTarget}
                variableToken={variableToken}
                onVariableTokenChange={setVariableToken}
                onValidityChange={setAmountValid}
            />
        </WiredConditionBaseView>
    );
};
