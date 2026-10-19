import { FC, useEffect, useMemo, useState } from 'react';
import { isWiredNullVariableId, localizeWithFallback, tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT, WiredFurniType } from '../../../../api';
import { useAchievements, useWired } from '../../../../hooks';
import { WiredDropdown } from '../WiredDropdown';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredMergedSourceSection } from '../WiredSourcesSelector';
import { WiredAdvancedSourceRows } from '../WiredAdvancedSourceRows';
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
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null, setFurniSources = null, setUserSources = null, furniSources = [], userSources = [] } = useWired();
    const { enabledWiredAchievements = [] } = useAchievements();
    const [achievement, setAchievement] = useState('');
    const [mode, setMode] = useState(MODE_ADD_TO_EXISTING);
    const [option, setOption] = useState(0);
    const [literal, setLiteral] = useState(0);
    const [target, setTarget] = useState<WiredValueTargetType>('user');
    const [variableToken, setVariableToken] = useState('');
    // Merged [[0,1]]: the reference holder reads furni slot 0 or user slot 1.
    const [mergedFurniSource, setMergedFurniSource] = useState(0);
    const [mergedUserSource, setMergedUserSource] = useState(0);
    const [sourcesEdited, setSourcesEdited] = useState(false);
    const [valueValid, setValueValid] = useState(true);

    useEffect(() => {
        if (!trigger) return;

        setAchievement(trigger.stringData ?? '');
        setMode(trigger.intData?.[0] === MODE_SET_PROGRESS ? MODE_SET_PROGRESS : MODE_ADD_TO_EXISTING);
        setOption(trigger.intData?.[1] === 1 ? 1 : 0);
        setLiteral(Math.min(SCORE_MAX, Math.max(0, trigger.intData?.[2] ?? 0)));
        setTarget(normalizeWiredValueTarget(trigger.intData?.[3]));
        setVariableToken(tokenOfVariableSlot(trigger.variableIds?.[0]));
        setMergedFurniSource(trigger.furniSources?.[0] ?? 0);
        setMergedUserSource(trigger.userSources?.[1] ?? 0);
        setSourcesEdited(false);
    }, [trigger]);

    // A saved name the hotel no longer lists is kept, so the card still shows what it will send.
    const names = useMemo(
        () => (achievement && !enabledWiredAchievements.includes(achievement) ? [achievement, ...enabledWiredAchievements] : [...enabledWiredAchievements]),
        [achievement, enabledWiredAchievements]
    );
    const dropdownOptions = useMemo(() => names.map((name, id) => ({ id, label: name })), [names]);

    const validate = () => valueValid && (option !== 1 || !isWiredNullVariableId(variableSlotOf(variableToken)));

    const save = () => {
        setStringParam(achievement);
        setIntParams([mode, option, literal, getWiredValueTargetCode(target)]);
        setVariableIds([option === 1 ? variableSlotOf(variableToken) : WIRED_VARIABLE_ABSENT]);
        // Untouched source tails stay as loaded (useWired keeps the trigger's arrays); an edited holder writes only its own slot.
        if (sourcesEdited) {
            const furni = [...furniSources];
            const users = [...userSources];
            furni[0] = mergedFurniSource;
            users[0] = users[0] ?? 0;
            users[1] = mergedUserSource;
            setFurniSources?.(furni);
            setUserSources?.(users);
        }
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={validate}
            footer={<WiredAdvancedSourceRows rows={[{ kind: 'users', slot: 0 }]} />}
        >
            <WiredSection title={localizeWithFallback('wiredfurni.params.progress_achievement.name', 'Achievement to progress:')}>
                <WiredDropdown caption={localizeWithFallback('wiredfurni.params.progress_achievement.name', 'Achievement to progress:')} options={dropdownOptions} value={names.indexOf(achievement)} onChange={(id) => setAchievement(names[id] ?? '')} />
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
                // AIR ProgressAchievement.as:84,120-138 (WIN63-202610131318): merged [[0,1]] is claimed by this value-or-variable section and drawn in its popup.
                popupSources={<WiredMergedSourceSection bare scope={target} title="wiredfurni.params.sources.merged.title.variables" furniSlot={0} userSlot={1}
                    furniSource={mergedFurniSource} userSource={mergedUserSource}
                    onChangeFurni={(source) => { setMergedFurniSource(source); setSourcesEdited(true); }}
                    onChangeUsers={(source) => { setMergedUserSource(source); setSourcesEdited(true); }} />}
                onValidityChange={setValueValid}
            />
        </WiredActionBaseView>
    );
};
