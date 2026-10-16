import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredMergedSourceSection } from '../WiredSourcesSelector';
import { isWiredNullVariableId, tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT } from '../../../../api';
import { FurniPickSlotButtons } from '../conditions/WiredVariableConditionParts';
import { WiredActionValueOrVariableSection, WiredValueTargetType } from '../actions/WiredActionValueOrVariableSection';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MIN_FILTER = 1;
const MAX_FILTER = 1000;

/** AIR variable targets of the count: furni 0, user 1, room -10, context -20. */
const COUNT_TARGETS: { target: WiredValueTargetType; code: number; label: string }[] = [
    { target: 'user', code: 1, label: 'wiredfurni.params.sources.users.title' },
    { target: 'furni', code: 0, label: 'wiredfurni.params.sources.furni.title' },
    { target: 'global', code: -10, label: 'wiredfurni.params.sources.global' },
    { target: 'context', code: -20, label: 'wiredfurni.params.sources.context' }
];

const clampCount = (value: number) => (Number.isFinite(value) ? Math.min(MAX_FILTER, Math.max(MIN_FILTER, Math.trunc(value))) : MIN_FILTER);

/**
 * AIR addons/SelectorFilter.as:69-72 uses ValueOrVariableSection with range 1..1000.
 * The filter cards: owned [count, option (0 value, 1 variable), variable target]; the source groups select the reference-variable holder; the count variable is the one variable slot.
 */
export const WiredExtraFilterCountView: FC<{ furni: boolean }> = ({ furni }) => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null, setFurniSources = null, setUserSources = null, furniIds = [], secondaryFurniIds = [] } = useWired();
    const [valueValid, setValueValid] = useState(true);
    const [count, setCount] = useState(MIN_FILTER);
    const [useVariable, setUseVariable] = useState(false);
    const [target, setTarget] = useState<WiredValueTargetType>('user');
    const [variableToken, setVariableToken] = useState('');
    const [furniSource, setFurniSource] = useState(100);
    const [userSource, setUserSource] = useState(0);
    const userDefault = trigger?.inputSources?.userDefaults[0] ?? 0;

    useEffect(() => {
        if (!trigger) return;

        const [nextCount = MIN_FILTER, nextOption = 0, nextTarget = 1] = trigger.intData;
        const variableId = trigger.variableIds[0] ?? WIRED_VARIABLE_ABSENT;

        setCount(clampCount(nextCount));
        setUseVariable(nextOption === 1 && !isWiredNullVariableId(variableId));
        setTarget(COUNT_TARGETS.find((entry) => entry.code === nextTarget)?.target ?? 'user');
        setVariableToken(tokenOfVariableSlot(variableId));
        setFurniSource(trigger.furniSources[0] ?? 100);
        setUserSource(trigger.userSources[0] ?? userDefault);
    }, [trigger, userDefault]);

    const save = () => {
        const code = COUNT_TARGETS.find((entry) => entry.target === target)?.code ?? 1;

        setIntParams([clampCount(count), useVariable ? 1 : 0, code]);
        setStringParam('');
        setVariableIds([useVariable ? variableSlotOf(variableToken) : WIRED_VARIABLE_ABSENT]);
        setFurniSources([useVariable && target === 'furni' ? furniSource : 0]);
        setUserSources([useVariable && target === 'user' ? userSource : 0]);
    };

    const validate = () => valueValid && (!useVariable || !!variableToken);

    // AIR SelectorFilter.as:71,75-103 (WIN63-202610131318): merged [[0,0]] is claimed by the amount section and drawn as a bare row in its popup,
    // for every holder type (room/context read as the fixed holder row).
    const sources = <WiredMergedSourceSection bare scope={target} title="wiredfurni.params.sources.merged.title.variables" furniSlot={0} userSlot={0}
        furniSource={furniSource} userSource={userSource} onChangeFurni={setFurniSource} onChangeUsers={setUserSource} />;

    return (
        <WiredExtraBaseView nativeLayout hasSpecialInput
            requiresFurni={useVariable && target === 'furni' && (furniSource === 100 || furniSource === 101) ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save} validate={validate}>
            {useVariable && target === 'furni' && <FurniPickSlotButtons slots={furniSource === 100 ? [{ slot: 0, count: furniIds.length }] : furniSource === 101 ? [{ slot: 1, count: secondaryFurniIds.length }] : []} />}
            <WiredActionValueOrVariableSection
                title={localizeWithFallback('wiredfurni.params.setfilter', 'Amount')}
                targetTitle={localizeWithFallback('wiredfurni.params.sources.merged.title.variables_reference', 'Variable source')}
                recentScope={furni ? 'filter-furni-count' : 'filter-user-count'} variableUsage="filter-main"
                min={MIN_FILTER} max={MAX_FILTER} option={useVariable ? 1 : 0}
                onOptionChange={option => setUseVariable(option === 1)}
                literal={count} onLiteralChange={setCount}
                target={target} onTargetChange={next => { setTarget(next); setVariableToken(''); }}
                variableToken={variableToken} onVariableTokenChange={setVariableToken}
                onValidityChange={setValueValid} popupSources={sources}
            />
        </WiredExtraBaseView>
    );
};
