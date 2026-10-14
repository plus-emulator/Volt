import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT, WiredFurniType } from '../../../../api';
import { useAchievements, useWired } from '../../../../hooks';
import { WiredDropdown } from '../WiredDropdown';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredActionBaseView } from './WiredActionBaseView';
import {
    getWiredValueTargetCode,
    normalizeWiredValueTarget,
    WiredActionValueOrVariableSection,
    WiredValueTargetType
} from './WiredActionValueOrVariableSection';

/**
 * PROGRESS_ACHIEVEMENT (code 51), the official progress-achievement editor. AIR: roomevents/wired_setup/actiontypes/ProgressAchievement.as
 * readIntParamsFromForm L36 [mode, option, numberValue, target], readStringParamFromForm L46 (achievement name),
 * readVariableIdsFromForm L51, onEditStart L56, mergedSelections L120 [[0,1]], custom sources L135.
 * Achievements: roomEvents.achievementsInRoom (L88-99), here useAchievements().enabledWiredAchievements.
 * Dossier: B/reviews/new-wireds-dossier-r88.json, code 51.
 */

const MODE_SET_PROGRESS = 0;
const MODE_ADD_TO_EXISTING = 1;
const SCORE_MAX = 2147483647;

export const WiredActionProgressAchievementNativeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const { enabledWiredAchievements = [] } = useAchievements();
    const [achievement, setAchievement] = useState('');
    const [mode, setMode] = useState(MODE_ADD_TO_EXISTING);
    const [option, setOption] = useState(0);
    const [literal, setLiteral] = useState(0);
    const [target, setTarget] = useState<WiredValueTargetType>('user');
    const [variableToken, setVariableToken] = useState('');

    useEffect(() => {
        if (!trigger) return;

        setAchievement(trigger.stringData ?? '');
        setMode(trigger.intData?.[0] === MODE_SET_PROGRESS ? MODE_SET_PROGRESS : MODE_ADD_TO_EXISTING);
        setOption(trigger.intData?.[1] === 1 ? 1 : 0);
        setLiteral(Math.min(SCORE_MAX, Math.max(0, trigger.intData?.[2] ?? 0)));
        setTarget(normalizeWiredValueTarget(trigger.intData?.[3]));
        setVariableToken(tokenOfVariableSlot(trigger.variableIds?.[0]));
    }, [trigger]);

    // A saved name the hotel no longer lists is kept, so the card still shows what it will send.
    const names = useMemo(
        () => (achievement && !enabledWiredAchievements.includes(achievement) ? [achievement, ...enabledWiredAchievements] : [...enabledWiredAchievements]),
        [achievement, enabledWiredAchievements]
    );
    const dropdownOptions = useMemo(() => names.map((name, id) => ({ id, label: name })), [names]);

    const validate = () => option !== 1 || variableSlotOf(variableToken) !== WIRED_VARIABLE_ABSENT;

    const save = () => {
        setStringParam(achievement);
        setIntParams([mode, option, literal, getWiredValueTargetCode(target)]);
        setVariableIds([option === 1 ? variableSlotOf(variableToken) : WIRED_VARIABLE_ABSENT]);
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={validate}
        >
            <WiredSection title={localizeWithFallback('wiredfurni.params.progress_achievement.name', 'Achievement to progress:')}>
                <WiredDropdown options={dropdownOptions} value={names.indexOf(achievement)} onChange={(id) => setAchievement(names[id] ?? '')} />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.progress_achievement.mode', 'Progression mode:')}>
                <WiredRadioGroup
                    name="progressAchievementMode"
                    options={[
                        { id: MODE_ADD_TO_EXISTING, label: localizeWithFallback('wiredfurni.params.progress_achievement.mode.1', 'Add to existing progress') },
                        { id: MODE_SET_PROGRESS, label: localizeWithFallback('wiredfurni.params.progress_achievement.mode.0', 'Set progress') }
                    ]}
                    value={mode}
                    onChange={setMode}
                />
            </WiredSection>
            <WiredActionValueOrVariableSection
                literal={literal}
                max={SCORE_MAX}
                min={0}
                option={option}
                recentScope="progress-achievement"
                target={target}
                targetTitle={localizeWithFallback('wiredfurni.params.sources.merged.title', 'Select source:')}
                title={localizeWithFallback('wiredfurni.params.progress_achievement.score', 'Select progress:')}
                variableToken={variableToken}
                onLiteralChange={setLiteral}
                onOptionChange={setOption}
                onTargetChange={setTarget}
                onVariableTokenChange={setVariableToken}
            />
        </WiredActionBaseView>
    );
};
