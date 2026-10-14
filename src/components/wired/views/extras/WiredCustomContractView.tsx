import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { VoltInput } from '../../../../layout';
import { FurniPickSlotButtons } from '../conditions/WiredVariableConditionParts';
import { WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, WiredVariablePickerTarget } from '../WiredVariablePickerData';
import { tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { AMOUNT_TARGETS } from '../actions/WiredChestRewardForm';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MAX_AMOUNT = 100000;
const FURNI_DEFAULTS = [100, 101];
const USER_DEFAULT = 0;
const TARGET_FURNI = 0;
const TARGET_USER = 1;

/** One half of the contract: what the user pays, or what they receive. */
interface IContractSide {
    enabled: boolean;
    furni: boolean;
    furniSource: number;
    fromVariable: boolean;
    amount: number;
    target: number;
    variableToken: string;
    holderFurniSource: number;
    holderUserSource: number;
}

const emptySide = (index = 0): IContractSide => ({
    enabled: false,
    furni: false,
    furniSource: FURNI_DEFAULTS[index],
    fromVariable: false,
    amount: 1,
    target: TARGET_USER,
    variableToken: '',
    holderFurniSource: 0,
    holderUserSource: USER_DEFAULT
});

const clampAmount = (value: number) => (Number.isFinite(value) ? Math.min(MAX_AMOUNT, Math.max(1, Math.trunc(value))) : 1);

/** One side's five ints, starting at `offset`: enabled, kind (1 furni), option (1 variable), amount, target. */
const sideFromWire = (ints: number[], offset: number, furniSource: number, holderFurniSource: number, holderUserSource: number, variableId: string): IContractSide => {
    const target = ints[offset + 4] ?? TARGET_USER;

    return {
        enabled: ints[offset] === 1,
        furni: ints[offset + 1] === 1,
        furniSource,
        fromVariable: ints[offset + 2] === 1,
        amount: clampAmount(ints[offset + 3] ?? 1),
        target: AMOUNT_TARGETS.some((entry) => entry.code === target) ? target : TARGET_USER,
        variableToken: tokenOfVariableSlot(variableId),
        holderFurniSource,
        holderUserSource
    };
};

/** The side's ints as the server stores them; the target is AIR's code. */
const intsOf = (side: IContractSide): number[] => [
    side.enabled ? 1 : 0,
    side.furni ? 1 : 0,
    side.fromVariable ? 1 : 0,
    clampAmount(side.amount),
    side.target
];

/** The variable reads the holder's furni or user only when the side is active and sourced from a variable. */
const readsHolder = (side: IContractSide, target: number) => side.enabled && side.fromVariable && side.target === target;

interface IContractSideFormProps {
    title: string;
    enableLabel: string;
    furniTitle: string;
    holderTitle: string;
    side: IContractSide;
    index: number;
    onChange: (changes: Partial<IContractSide>) => void;
}

/** One half of the contract: its activity, its element, its amount and the sources the variable reads. */
const ContractSideForm: FC<IContractSideFormProps> = ({ title, enableLabel, furniTitle, holderTitle, side, index, onChange }) => {
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredNativeVariables();
    const pickerTarget: WiredVariablePickerTarget = AMOUNT_TARGETS.find((entry) => entry.code === side.target)?.target ?? 'user';
    const targetIndex = Math.max(0, AMOUNT_TARGETS.findIndex((entry) => entry.code === side.target));
    const entries = useMemo(() => {
        const definitions = {
            furni: furniVariableDefinitions,
            global: roomVariableDefinitions,
            context: contextVariableDefinitions,
            user: userVariableDefinitions
        }[pickerTarget];

        return buildWiredVariablePickerEntries(pickerTarget, 'give', definitions);
    }, [contextVariableDefinitions, furniVariableDefinitions, pickerTarget, roomVariableDefinitions, userVariableDefinitions]);

    return (
        <div className="flex flex-col gap-2">
            <Text bold>{title}</Text>
            <WiredCheckboxOption checked={side.enabled} label={enableLabel} onChange={(enabled) => onChange({ enabled })} />

            {side.enabled && (
                <>
                    <WiredRadioGroup
                        name={`contractKind${index}`}
                        value={side.furni ? 1 : 0}
                        onChange={(value) => onChange({ furni: value === 1 })}
                        options={[
                            { id: 0, label: localizeWithFallback('wiredfurni.params.custom_contract.element_type_selection.0', 'Credits') },
                            { id: 1, label: localizeWithFallback('wiredfurni.params.custom_contract.element_type_selection.1', 'Furni') }
                        ]}
                    />
                    {side.furni && (
                        <WiredSourcesSelector showFurni={true} furniSlot={index} furniSource={side.furniSource} furniTitle={furniTitle} onChangeFurni={(furniSource) => onChange({ furniSource })} />
                    )}

                    <Text bold>{localizeWithFallback('wiredfurni.params.custom_contract.amount_selection', 'Amount selection:')}</Text>
                    <WiredRadioGroup
                        name={`contractOption${index}`}
                        value={side.fromVariable ? 1 : 0}
                        onChange={(value) => onChange({ fromVariable: value === 1, variableToken: '' })}
                        options={[
                            { id: 0, label: localizeWithFallback('wiredfurni.params.variables.reference_value.set_value', 'Set value:') },
                            { id: 1, label: localizeWithFallback('wiredfurni.params.variables.reference_value.from_variable', 'From Variable:') }
                        ]}
                    />

                    {!side.fromVariable && (
                        <VoltInput type="number" min={1} max={MAX_AMOUNT} value={side.amount} onChange={(event) => onChange({ amount: clampAmount(Number(event.target.value)) })} />
                    )}

                    {side.fromVariable && (
                        <>
                            <WiredRadioGroup
                                name={`contractTarget${index}`}
                                value={targetIndex}
                                onChange={(next) => onChange({ target: AMOUNT_TARGETS[next].code, variableToken: '' })}
                                options={AMOUNT_TARGETS.map((entry, next) => ({ id: next, label: localizeWithFallback(entry.label, entry.target) }))}
                            />
                            <WiredVariablePicker
                                entries={entries}
                                recentScope={`contract-amount-${index}`}
                                selectedToken={side.variableToken}
                                onSelect={(entry) => onChange({ variableToken: entry.token })}
                            />
                            {side.target === TARGET_FURNI && (
                                <WiredSourcesSelector
                                    showFurni={true}
                                    furniSlot={index + 2}
                                    furniSource={side.holderFurniSource}
                                    furniTitle={holderTitle}
                                    onChangeFurni={(holderFurniSource) => onChange({ holderFurniSource })}
                                />
                            )}
                            {side.target === TARGET_USER && (
                                <WiredSourcesSelector
                                    showUsers={true}
                                    userSlot={index}
                                    userSource={side.holderUserSource}
                                    usersTitle={holderTitle}
                                    onChangeUsers={(holderUserSource) => onChange({ holderUserSource })}
                                />
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

/**
 * Custom contract: one payment and one reward, each its own element (currency or furni), amount (literal or variable)
 * and target. Owned: [enabled, furni, variable option, amount, target] for the payment, then the same for the reward;
 * furni: [payment item, reward item, payment holder, reward holder]; users: [payment holder, reward holder];
 * variables: [payment amount variable, reward amount variable].
 */
export const WiredCustomContractView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources = null, setUserSources = null, setVariableIds = null, furniIds = [], secondaryFurniIds = [], setActivePickSlot = null } = useWired();
    const [payment, setPayment] = useState<IContractSide>(() => emptySide(0));
    const [reward, setReward] = useState<IContractSide>(() => emptySide(1));

    useEffect(() => {
        if (!trigger) return;

        const furni = trigger.furniSources ?? [];
        const users = trigger.userSources ?? [];
        const variables = trigger.variableIds ?? [];
        const ints = trigger.intData ?? [];

        setPayment(sideFromWire(ints, 0, furni[0] ?? FURNI_DEFAULTS[0], furni[2] ?? 0, users[0] ?? USER_DEFAULT, variables[0] ?? WIRED_VARIABLE_ABSENT));
        setReward(sideFromWire(ints, 5, furni[1] ?? FURNI_DEFAULTS[1], furni[3] ?? 0, users[1] ?? USER_DEFAULT, variables[1] ?? WIRED_VARIABLE_ABSENT));
    }, [trigger]);

    // The pick buttons offer the lists the active furni sides read from.
    const picked = [payment, reward].flatMap((side) => (side.enabled && side.furni ? [side.furniSource] : []));
    const lists = [0, 1].filter((list) => picked.includes(list === 0 ? 100 : 101));

    // A contract needs a side to act on, and every active side that reads a variable needs one picked.
    const validate = () => (payment.enabled || reward.enabled) && [payment, reward].every((side) => !(side.enabled && side.fromVariable) || !!side.variableToken);

    const save = () => {
        setIntParams([...intsOf(payment), ...intsOf(reward)]);
        setFurniSources([
            payment.enabled && payment.furni ? payment.furniSource : FURNI_DEFAULTS[0],
            reward.enabled && reward.furni ? reward.furniSource : FURNI_DEFAULTS[1],
            readsHolder(payment, TARGET_FURNI) ? payment.holderFurniSource : 0,
            readsHolder(reward, TARGET_FURNI) ? reward.holderFurniSource : 0
        ]);
        setUserSources([
            readsHolder(payment, TARGET_USER) ? payment.holderUserSource : USER_DEFAULT,
            readsHolder(reward, TARGET_USER) ? reward.holderUserSource : USER_DEFAULT
        ]);
        setVariableIds([
            payment.enabled && payment.fromVariable ? variableSlotOf(payment.variableToken) : WIRED_VARIABLE_ABSENT,
            reward.enabled && reward.fromVariable ? variableSlotOf(reward.variableToken) : WIRED_VARIABLE_ABSENT
        ]);
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save} validate={validate} cardStyle={{ width: 420 }}>
            <div className="flex flex-col gap-2">
                <Text className="whitespace-pre-line">
                    {localizeWithFallback(
                        'wiredfurni.params.custom_contract.usage_warning',
                        'This is a contract that can act as a Payment, Trade, or Reward contract depending on the configuration.'
                    )}
                </Text>
                <ContractSideForm
                    title={localizeWithFallback('wiredfurni.params.custom_contract.payment', 'Payment')}
                    enableLabel={localizeWithFallback('wiredfurni.params.custom_contract.enable_payment', 'Enable payment')}
                    furniTitle="wiredfurni.params.sources.furni.title.payment"
                    holderTitle="wiredfurni.params.sources.merged.title.variables_reference_payment"
                    side={payment}
                    index={0}
                    onChange={(changes) => {
                        setPayment((previous) => ({ ...previous, ...changes }));

                        if (changes.furniSource === 100 || changes.furniSource === 101) setActivePickSlot?.(changes.furniSource === 101 ? 1 : 0);
                    }}
                />
                <div className="volt-wired__divider" />
                <ContractSideForm
                    title={localizeWithFallback('wiredfurni.params.custom_contract.reward', 'Reward')}
                    enableLabel={localizeWithFallback('wiredfurni.params.custom_contract.enable_reward', 'Enable reward')}
                    furniTitle="wiredfurni.params.sources.furni.title.reward"
                    holderTitle="wiredfurni.params.sources.merged.title.variables_reference_reward"
                    side={reward}
                    index={1}
                    onChange={(changes) => {
                        setReward((previous) => ({ ...previous, ...changes }));

                        if (changes.furniSource === 100 || changes.furniSource === 101) setActivePickSlot?.(changes.furniSource === 101 ? 1 : 0);
                    }}
                />
                <FurniPickSlotButtons slots={lists.map((slot) => ({ slot: slot as 0 | 1, count: slot === 0 ? furniIds.length : secondaryFurniIds.length }))} />
            </div>
        </WiredExtraBaseView>
    );
};
