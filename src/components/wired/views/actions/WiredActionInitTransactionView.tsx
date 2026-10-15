import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { FurniPickSlotButtons } from '../conditions/WiredVariableConditionParts';
import { WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { WiredMergedSourceSection, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionValueOrVariableSection } from './WiredActionValueOrVariableSection';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import { WiredVariablePickerTarget } from '../WiredVariablePickerData';
import { tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT } from '../../../../api';
import { WiredActionBaseView } from './WiredActionBaseView';

/** AIR's merged variable targets for the multiplier: furni 0, user 1, room -10, context -20. */
const MULTIPLIER_TARGETS: { target: WiredVariablePickerTarget; code: number; label: string }[] = [
    { target: 'user', code: 1, label: 'wiredfurni.params.sources.users.title' },
    { target: 'furni', code: 0, label: 'wiredfurni.params.sources.furni.title' },
    { target: 'global', code: -10, label: 'wiredfurni.params.sources.global' },
    { target: 'context', code: -20, label: 'wiredfurni.params.sources.context' }
];

const MULTIPLIER_MIN = 1;
const MULTIPLIER_MAX = 500;
const TIMEOUT_MIN = 30;
const TIMEOUT_MAX = 3600;
const TIMEOUT_DEFAULT = 300;

const clamp = (value: number, min: number, max: number) => (Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : min);

/**
 * Owned: [mode, multiplier value, option (0 value, 1 variable), variable target, timeout flag, timeout seconds];
 * furni: [chests, contracts, merged furni]; users: [default, merged user]; variables: [the multiplier variable].
 */
export const WiredActionInitTransactionView: FC<{}> = () => {
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
    const [mode, setMode] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    const [multiplierValid, setMultiplierValid] = useState(true);
    const [useVariable, setUseVariable] = useState(false);
    const [target, setTarget] = useState<WiredVariablePickerTarget>('user');
    const [variableToken, setVariableToken] = useState('');
    const [timeoutEnabled, setTimeoutEnabled] = useState(false);
    const [timeoutSeconds, setTimeoutSeconds] = useState(TIMEOUT_DEFAULT);
    const [chestSource, setChestSource] = useState(100);
    const [contractSource, setContractSource] = useState(101);
    const [mergedFurniSource, setMergedFurniSource] = useState(0);
    const [defaultUserSource, setDefaultUserSource] = useState(0);
    const [mergedUserSource, setMergedUserSource] = useState(0);

    const targetCode = MULTIPLIER_TARGETS.find((entry) => entry.target === target)?.code ?? 1;
    useEffect(() => {
        if (!trigger) return;

        const [nextMode = 0, nextMultiplier = 1, nextOption = 0, nextTarget = 1, nextTimeout = 0, nextSeconds = TIMEOUT_DEFAULT] = trigger.intData;
        const variableId = trigger.variableIds[0] ?? WIRED_VARIABLE_ABSENT;

        setMode(nextMode);
        setMultiplierValid(true);
        setMultiplier(clamp(nextMultiplier, MULTIPLIER_MIN, MULTIPLIER_MAX));
        setUseVariable(nextOption === 1 && variableId !== WIRED_VARIABLE_ABSENT);
        setTarget(MULTIPLIER_TARGETS.find((entry) => entry.code === nextTarget)?.target ?? 'user');
        setVariableToken(tokenOfVariableSlot(variableId));
        setTimeoutEnabled(nextTimeout === 1);
        setTimeoutSeconds(clamp(nextSeconds, TIMEOUT_MIN, TIMEOUT_MAX));
        setChestSource(trigger.furniSources[0] ?? 100);
        setContractSource(trigger.furniSources[1] ?? 101);
        setActivePickSlot?.([trigger.furniSources[0], trigger.furniSources[1]].find((source) => source === 100 || source === 101) === 101 ? 1 : 0);
        setMergedFurniSource(trigger.furniSources[2] ?? 0);
        setDefaultUserSource(trigger.userSources[0] ?? 0);
        setMergedUserSource(trigger.userSources[1] ?? 0);
    }, [setActivePickSlot, trigger]);

    const save = () => {
        setIntParams([mode, multiplier, useVariable ? 1 : 0, targetCode, timeoutEnabled ? 1 : 0, clamp(timeoutSeconds, TIMEOUT_MIN, TIMEOUT_MAX)]);
        setVariableIds([useVariable ? variableSlotOf(variableToken) : WIRED_VARIABLE_ABSENT]);
        setFurniSources([chestSource, contractSource, useVariable && target === 'furni' ? mergedFurniSource : 0]);
        setUserSources([defaultUserSource, useVariable && target === 'user' ? mergedUserSource : 0]);
    };

    const validate = () => mode === 0 || (multiplierValid && (!useVariable || !!variableToken));
    // AIR disables the multiplier (and the variable's holder sources) in the normal mode, and calls it the limit in the auto mode.
    const multiplierDisabled = mode === 0;
    const pick = (source: number, set: (value: number) => void) => {
        set(source);

        if (source === 100 || source === 101) setActivePickSlot?.(source === 101 ? 1 : 0);
    };
    const lists = [0, 1].filter((list) => [chestSource, contractSource].includes(list === 0 ? 100 : 101));

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout
            footerCollapsible={false}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            validate={validate}
            footer={
                <>
                    <WiredSourcesSelector showFurni={true} furniSlot={0} furniSource={chestSource} furniTitle="wiredfurni.params.sources.furni.title.chests" onChangeFurni={(source) => pick(source, setChestSource)} />
                    <WiredSourcesSelector showFurni={true} furniSlot={1} furniSource={contractSource} furniTitle="wiredfurni.params.sources.furni.title.contracts" onChangeFurni={(source) => pick(source, setContractSource)} />
                    <FurniPickSlotButtons slots={lists.map((slot) => ({ slot: slot as 0 | 1, count: slot === 0 ? furniIds.length : secondaryFurniIds.length }))} />
                </>
            }
        >
            <WiredSection title={localizeWithFallback('wiredfurni.params.contract.mode', 'Transaction mode:')}>
                <WiredRadioGroup name="transactionMode" value={mode} onChange={setMode}
                    options={[0, 1, 2].map(value => ({ id: value, label: localizeWithFallback(`wiredfurni.params.contract.mode.${value}`, `Mode ${value}`) }))} />
            </WiredSection>
            <WiredActionValueOrVariableSection
                title={mode === 2 ? localizeWithFallback('wiredfurni.params.contract.multiplier_selection2', 'Auto-multiplier limit:')
                    : localizeWithFallback('wiredfurni.params.contract.multiplier_selection', 'Multiplier selection:')}
                targetTitle={localizeWithFallback('wiredfurni.params.sources.merged.title.variables_reference', 'Variable reference:')}
                recentScope="transaction-multiplier" min={MULTIPLIER_MIN} max={MULTIPLIER_MAX}
                literal={multiplier} onLiteralChange={setMultiplier} option={useVariable ? 1 : 0} onOptionChange={option => setUseVariable(option === 1)}
                target={target} onTargetChange={setTarget} variableToken={variableToken} onVariableTokenChange={setVariableToken}
                disabled={multiplierDisabled} onValidityChange={setMultiplierValid}
                // AIR class_4180.as:84,98-105,130-153 (WIN63-202610131318): merged [[2,1]] is claimed by the multiplier section and drawn in its
                // popup; isInputSourceDisabled(0) mirrors the section's disabled state.
                popupSources={<WiredMergedSourceSection bare scope={target} title="wiredfurni.params.sources.merged.title.variables" furniSlot={2} userSlot={1}
                    furniSource={mergedFurniSource} userSource={mergedUserSource} disabled={multiplierDisabled} onChangeFurni={setMergedFurniSource} onChangeUsers={setMergedUserSource} />} />
            <WiredSection title={localizeWithFallback('wiredfurni.params.contract.timeout', 'Time-out:')}>
                <WiredCheckboxOption checked={timeoutEnabled} label={localizeWithFallback('wiredfurni.params.contract.timeout.desc', 'Automatically cancel trade after timeout')} onChange={setTimeoutEnabled} last />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 25, marginTop: 3, opacity: timeoutEnabled ? 1 : .5 }}>
                    <WiredText text={localizeWithFallback('wiredfurni.params.contract.timeout.selection', 'Seconds:')} />
                    <WiredNumberInput ariaLabel={localizeWithFallback('wiredfurni.params.contract.timeout.selection', 'Seconds:')}
                        min={TIMEOUT_MIN} max={TIMEOUT_MAX} value={timeoutSeconds} disabled={!timeoutEnabled} onChange={setTimeoutSeconds} />
                </div>
            </WiredSection>
        </WiredActionBaseView>
    );
};
