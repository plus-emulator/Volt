import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WIRED_VARIABLE_ABSENT, tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { FurniPickSlotButtons } from '../conditions/WiredVariableConditionParts';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { nativeSourceOptions, sortWiredSourceOptions, USER_SOURCES, useAvailableUserSources, WiredSourceOption } from '../WiredSourcesSelector';
import { WiredActionValueOrVariableSection } from '../actions/WiredActionValueOrVariableSection';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/**
 * Habbo's "movement curve" (wf_xtra_mov_curve): how high the furni the stack moves jump, typed or
 * read from a variable (AIR addons/class_4140.as:69-72).
 * Owned ints: [from variable, strength, variable target]; the user and furni sources are the U and F tails; the native
 * curve is always the jump.
 * Variable IDs: one reference slot; string param is empty.
 */

type VariableTarget = 'user' | 'furni' | 'global' | 'context';

const STRENGTH_MIN = -1000;
const STRENGTH_MAX = 1000;
const STRENGTH_DEFAULT = 80;
const SOURCE_TRIGGER = 0;
const SOURCE_SELECTED = 100;
const SOURCE_SECONDARY_SELECTED = 101;

const TARGETS: Array<{ key: VariableTarget; value: number }> = [{ key: 'furni', value: 0 }, { key: 'user', value: 1 }, { key: 'global', value: -10 }, { key: 'context', value: -20 }];

const GLOBAL_SOURCES: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.global' }];
const CONTEXT_SOURCES: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: localizeWithFallback('wiredfurni.params.sources.context', 'Context variables') }];

const clamp = (value: number, min: number, max: number, fallback: number) => (Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback);
const targetOf = (value: number): VariableTarget => TARGETS.find((target) => target.value === value)?.key ?? 'user';
const targetValue = (key: VariableTarget) => TARGETS.find((target) => target.key === key)?.value ?? 0;

export const WiredExtraMovementCurveView: FC<{}> = () => {
    const { trigger = null, furniIds = [], secondaryFurniIds = [], activePickSlot = 0, setActivePickSlot = null, setIntParams = null, setStringParam = null, setUserSources = null, setFurniSources = null, setVariableIds = null } = useWired();
    const [valueValid, setValueValid] = useState(true);
    const [strengthInput, setStrengthInput] = useState(String(STRENGTH_DEFAULT));
    const [fromVariable, setFromVariable] = useState(false);
    const [target, setTarget] = useState<VariableTarget>('user');
    const [variableToken, setVariableToken] = useState('');
    const [userSource, setUserSource] = useState(SOURCE_TRIGGER);
    const [furniSource, setFurniSource] = useState(SOURCE_TRIGGER);

    const userSources = sortWiredSourceOptions(useAvailableUserSources(trigger, USER_SOURCES), 'users');

    const picksFurni = fromVariable && target === 'furni' && (furniSource === SOURCE_SELECTED || furniSource === SOURCE_SECONDARY_SELECTED);
    const sourceOptions = target === 'furni' ? nativeSourceOptions(trigger?.inputSources?.furniAllowed[0], 'furni') : target === 'global' ? GLOBAL_SOURCES : target === 'context' ? CONTEXT_SOURCES : userSources;
    const sourceValue = target === 'furni' ? furniSource : target === 'user' ? userSource : SOURCE_TRIGGER;

    useEffect(() => {
        if (!trigger) return;

        const ints = trigger.intData ?? [];

        // owned: [from variable, strength, target].
        setFromVariable(ints.length > 0 && ints[0] === 1);
        setStrengthInput(String(ints.length > 1 ? clamp(ints[1], STRENGTH_MIN, STRENGTH_MAX, STRENGTH_DEFAULT) : STRENGTH_DEFAULT));
        setTarget(targetOf(ints.length > 2 ? ints[2] : 1));
        setUserSource(trigger.userSources.length > 0 ? trigger.userSources[0] : SOURCE_TRIGGER);
        setFurniSource(trigger.furniSources.length > 0 ? trigger.furniSources[0] : SOURCE_TRIGGER);
        setVariableToken(tokenOfVariableSlot(trigger.variableIds[0]));
    }, [trigger]);

    useEffect(() => {
        if (picksFurni) setActivePickSlot(furniSource === SOURCE_SECONDARY_SELECTED ? 1 : 0);
    }, [furniSource, picksFurni, setActivePickSlot]);

    const chooseTarget = (next: VariableTarget) => {
        if (next === target) return;

        setTarget(next);
        setVariableToken('');
    };

    const save = () => {
        setIntParams([fromVariable ? 1 : 0, clamp(parseInt(strengthInput, 10), STRENGTH_MIN, STRENGTH_MAX, STRENGTH_DEFAULT), targetValue(target)]);
        setStringParam('');
        setVariableIds([fromVariable ? variableSlotOf(variableToken) : WIRED_VARIABLE_ABSENT]);
        setUserSources([userSource]);
        setFurniSources([furniSource]);
    };

    return (
        <WiredExtraBaseView nativeLayout hasSpecialInput
            requiresFurni={picksFurni ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save} validate={() => valueValid && !(fromVariable && !variableToken)}>
            {picksFurni && <FurniPickSlotButtons slots={[furniSource === SOURCE_SECONDARY_SELECTED ? { slot: 1, count: secondaryFurniIds.length } : { slot: 0, count: furniIds.length }]} />}
            <WiredActionValueOrVariableSection
                title={LocalizeText('wiredfurni.params.jump_strength')}
                targetTitle={LocalizeText('wiredfurni.params.sources.merged.title.variables_reference')}
                recentScope="movement-curve-reference" min={STRENGTH_MIN} max={STRENGTH_MAX}
                option={fromVariable ? 1 : 0} onOptionChange={option => setFromVariable(option === 1)}
                literal={Number(strengthInput)} onLiteralChange={value => setStrengthInput(String(value))}
                target={target} onTargetChange={chooseTarget}
                variableToken={variableToken} onVariableTokenChange={setVariableToken}
                onValidityChange={setValueValid}
                popupSources={<WiredFurniSelectionSourceRow
                    options={sourceOptions}
                    selectionActive={activePickSlot === (furniSource === SOURCE_SECONDARY_SELECTED ? 1 : 0)}
                    selectionCount={furniSource === SOURCE_SECONDARY_SELECTED ? secondaryFurniIds.length : furniIds.length}
                    selectionEnabledValues={[SOURCE_SELECTED, SOURCE_SECONDARY_SELECTED]}
                    selectionKind={furniSource === SOURCE_SECONDARY_SELECTED ? "secondary" : "primary"}
                    selectionLimit={trigger?.maximumItemSelectionCount ?? 0}
                    showSelectionToggle={false}
                    title="wiredfurni.params.sources.merged.title.variables_reference"
                    value={sourceValue}
                    onChange={(value) => {
                        if (target === 'furni') {
                            setFurniSource(value);
                            if (value === SOURCE_SELECTED || value === SOURCE_SECONDARY_SELECTED) setActivePickSlot(value === SOURCE_SECONDARY_SELECTED ? 1 : 0);
                            return;
                        }

                        if (target === 'user') setUserSource(value);
                    }}
                />}
            />
        </WiredExtraBaseView>
    );
};
