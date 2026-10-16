import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { WiredMergedSourceSection, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredVariablePickerTarget } from '../WiredVariablePickerData';
import { isWiredNullVariableId, tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT } from '../../../../api';
import { WiredActionBaseView } from './WiredActionBaseView';
import { WiredActionValueOrVariableSection } from './WiredActionValueOrVariableSection';
import { WiredSection } from '../WiredSection';
import { WiredCollapsibleSection } from '../WiredCollapsibleSection';
import { WiredDropdown } from '../WiredDropdown';

/** AIR's merged targets for the amount: furni 0, user 1, room -10, context -20. */
export const AMOUNT_TARGETS: { target: WiredVariablePickerTarget; code: number; label: string }[] = [
    { target: 'user', code: 1, label: 'wiredfurni.params.sources.users.title' },
    { target: 'furni', code: 0, label: 'wiredfurni.params.sources.furni.title' },
    { target: 'global', code: -10, label: 'wiredfurni.params.sources.global' },
    { target: 'context', code: -20, label: 'wiredfurni.params.sources.context' }
];

/** Currency categories the editor offers (AIR's dropdown); furni iteration types are 0 to 2. */
const CURRENCY_CATEGORIES = [11, 13];
const ITERATION_TYPES = [0, 1, 2];
const MAX_AMOUNT = 2147483647;
const POPUP_TEXT_MAX = 200;

const clampAmount = (value: number) => (Number.isFinite(value) ? Math.min(MAX_AMOUNT, Math.max(1, Math.trunc(value))) : 1);

/**
 * Owned: [rewarding mode (1 all), amount, amount option (1 variable), amount target, show by default, currency category
 * or iteration type]; text: the reward popup; variable: the amount variable; furni: [chests, merged furni]; users: [reward user, merged user].
 */
export const WiredChestRewardForm: FC<{ kind: 'currency' | 'furni' }> = ({ kind }) => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null, setFurniSources = null, setUserSources = null } = useWired();
    const [amountValid, setAmountValid] = useState(true);
    const [mode, setMode] = useState(0);
    const [amount, setAmount] = useState(1);
    const [useVariable, setUseVariable] = useState(false);
    const [target, setTarget] = useState<WiredVariablePickerTarget>('user');
    const [variableToken, setVariableToken] = useState('');
    const [showByDefault, setShowByDefault] = useState(false);
    const [popupText, setPopupText] = useState('');
    const [category, setCategory] = useState(CURRENCY_CATEGORIES[0]);
    const [iteration, setIteration] = useState(0);
    const [chestSource, setChestSource] = useState(100);
    const [mergedFurniSource, setMergedFurniSource] = useState(0);
    const [rewardUserSource, setRewardUserSource] = useState(0);
    const [mergedUserSource, setMergedUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        const [nextMode = 0, nextAmount = 1, nextOption = 0, nextTarget = 1, nextShow = 0, nextLast = 0] = trigger.intData;
        const variableId = trigger.variableIds[0] ?? WIRED_VARIABLE_ABSENT;

        setMode(nextMode === 1 ? 1 : 0);
        setAmount(clampAmount(nextAmount));
        setUseVariable(nextOption === 1 && !isWiredNullVariableId(variableId));
        setTarget(AMOUNT_TARGETS.find((entry) => entry.code === nextTarget)?.target ?? 'user');
        setVariableToken(tokenOfVariableSlot(variableId));
        setShowByDefault(nextShow === 1);
        setPopupText((trigger.stringData ?? '').slice(0, POPUP_TEXT_MAX));
        if (kind === 'currency') setCategory(CURRENCY_CATEGORIES.includes(nextLast) ? nextLast : CURRENCY_CATEGORIES[0]);
        else setIteration(ITERATION_TYPES.includes(nextLast) ? nextLast : 0);
        setChestSource(trigger.furniSources[0] ?? 100);
        setMergedFurniSource(trigger.furniSources[1] ?? 0);
        setRewardUserSource(trigger.userSources[0] ?? 0);
        setMergedUserSource(trigger.userSources[1] ?? 0);
    }, [kind, trigger]);

    const save = () => {
        const code = AMOUNT_TARGETS.find((entry) => entry.target === target)?.code ?? 1;

        setIntParams([mode, clampAmount(amount), useVariable ? 1 : 0, code, showByDefault ? 1 : 0, kind === 'currency' ? category : iteration]);
        setStringParam(popupText.slice(0, POPUP_TEXT_MAX));
        setVariableIds([useVariable ? variableSlotOf(variableToken) : WIRED_VARIABLE_ABSENT]);
        setFurniSources([chestSource, useVariable && target === 'furni' ? mergedFurniSource : 0]);
        setUserSources([rewardUserSource, useVariable && target === 'user' ? mergedUserSource : 0]);
    };

    const validate = () => mode === 1 || (amountValid && (!useVariable || !!variableToken));

    return (
        <WiredActionBaseView advancedAlwaysVisible
            hasSpecialInput={true}
            nativeLayout={true}
            footerCollapsible={false}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            validate={validate}
            footer={
                <>
                    <WiredSourcesSelector showFurni={true} furniSlot={0} furniSource={chestSource} furniTitle="wiredfurni.params.sources.furni.title.chests" onChangeFurni={setChestSource} />
                    <WiredSourcesSelector showUsers={true} userSlot={0} userSource={rewardUserSource} usersTitle="wiredfurni.params.sources.users.title.reward_user" onChangeUsers={setRewardUserSource} />
                </>
            }
        >
            <WiredSection title={localizeWithFallback('wiredfurni.params.rewarding_mode', 'Rewarding mode')}>
                <WiredRadioGroup name="chestRewardMode" value={mode} onChange={setMode} options={[
                    { id: 0, label: localizeWithFallback('wiredfurni.params.rewarding_mode.0', 'Amount per trigger') },
                    { id: 1, label: localizeWithFallback('wiredfurni.params.rewarding_mode.1', 'All of the chest') }
                ]} />
            </WiredSection>
            <WiredActionValueOrVariableSection
                title={localizeWithFallback('wiredfurni.params.amount_to_give', 'Amount')}
                targetTitle={localizeWithFallback('wiredfurni.params.variables.reference_value.target', 'Variable target:')}
                recentScope="chest-reward-amount" min={1} max={MAX_AMOUNT} disabled={mode === 1}
                option={useVariable ? 1 : 0} onOptionChange={value => setUseVariable(value === 1)}
                literal={amount} onLiteralChange={setAmount} target={target} onTargetChange={setTarget}
                variableToken={variableToken} onVariableTokenChange={setVariableToken} onValidityChange={setAmountValid}
                // AIR class_4173.as:108-115,127,166-184 (WIN63-202610131318): merged [[1,1]] is claimed by the amount section and drawn in its
                // popup; isInputSourceDisabled(0) follows the section's disabled state (all-of-chest mode), which already closes the popup.
                popupSources={<WiredMergedSourceSection bare scope={target} title="wiredfurni.params.sources.merged.title.variables" furniSlot={1} userSlot={1}
                    furniSource={mergedFurniSource} userSource={mergedUserSource} disabled={mode === 1} onChangeFurni={setMergedFurniSource} onChangeUsers={setMergedUserSource} />}
            />
            <WiredSection title={localizeWithFallback('wiredfurni.reward_contract.reward_popup', 'Reward popup')}>
                <textarea className="form-control form-control-sm" aria-label={localizeWithFallback('wiredfurni.reward_contract.reward_popup', 'Reward popup')} title={localizeWithFallback('wiredfurni.reward_contract.reward_popup.text.tooltip', 'Reward popup text')}
                    style={{ height: 45, resize: 'none' }} maxLength={POPUP_TEXT_MAX} rows={3} value={popupText}
                    onChange={event => setPopupText(event.target.value.replace(/\r\n?/g, '\n').split('\n').slice(0, 3).join('\n').slice(0, POPUP_TEXT_MAX))} />
                <WiredCheckboxOption checked={showByDefault} label={localizeWithFallback('wiredfurni.reward_contract.reward_popup.show_by_default', 'Show by default')} onChange={setShowByDefault} />
            </WiredSection>
            {kind === 'currency' ? (
                <WiredCollapsibleSection title={localizeWithFallback('wiredfurni.params.earnings_category', 'Earnings category')}>
                    <WiredDropdown caption={localizeWithFallback('wiredfurni.params.earnings_category', 'Earnings category')} value={category} onChange={setCategory}
                        options={CURRENCY_CATEGORIES.map(value => ({ id: value, label: localizeWithFallback(`wiredfurni.params.earnings_category.${value}`, `Category ${value}`) }))} />
                </WiredCollapsibleSection>
            ) : (
                <WiredCollapsibleSection title={localizeWithFallback('wiredfurni.params.chest_iteration_type', 'Chest iteration type')}>
                    <WiredRadioGroup name="chestRewardIteration" value={iteration} onChange={setIteration}
                        options={ITERATION_TYPES.map(value => ({ id: value, disabled: mode === 1, label: localizeWithFallback(`wiredfurni.params.chest_iteration_type.${value}`, `Iteration ${value}`) }))} />
                </WiredCollapsibleSection>
            )}
        </WiredActionBaseView>
    );
};
