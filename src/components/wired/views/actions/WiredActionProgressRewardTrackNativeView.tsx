import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredTextInput } from '../WiredTextInput';
import { WiredActionBaseView } from './WiredActionBaseView';
import {
    getWiredValueTargetCode,
    normalizeWiredValueTarget,
    WiredActionValueOrVariableSection,
    WiredValueTargetType
} from './WiredActionValueOrVariableSection';

/**
 * PROGRESS_REWARD_TRACK (code 58), the official progress-reward-track editor. AIR: roomevents/wired_setup/actiontypes/ProgressRewardTrack.as
 * buildInputs L46 (track and task text inputs, a-zA-Z0-9_ up to 100 each), readIntParamsFromForm L58 [addToExisting, option, score, target],
 * readStringParamFromForm L68 ("track" TAB "task"), readVariableIdsFromForm L73, onEditStart L78 (score min 1), mergedSelections L99.
 * Dossier: B/reviews/new-wireds-dossier-r88.json, code 58.
 */

const SCORE_MAX = 2147483647;
const SCORE_MIN = 1;
const ID_MAX_LENGTH = 100;

const cleanId = (value: string) => value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, ID_MAX_LENGTH);

export const WiredActionProgressRewardTrackNativeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const [track, setTrack] = useState('');
    const [task, setTask] = useState('');
    const [addToExisting, setAddToExisting] = useState(false);
    const [option, setOption] = useState(0);
    const [literal, setLiteral] = useState(SCORE_MIN);
    const [target, setTarget] = useState<WiredValueTargetType>('user');
    const [variableToken, setVariableToken] = useState('');

    useEffect(() => {
        if (!trigger) return;

        const [savedTrack = '', savedTask = ''] = (trigger.stringData ?? '').split('\t');

        setTrack(savedTrack);
        setTask(savedTask);
        setAddToExisting(trigger.intData?.[0] === 1);
        setOption(trigger.intData?.[1] === 1 ? 1 : 0);
        setLiteral(Math.min(SCORE_MAX, Math.max(SCORE_MIN, trigger.intData?.[2] ?? SCORE_MIN)));
        setTarget(normalizeWiredValueTarget(trigger.intData?.[3]));
        setVariableToken(tokenOfVariableSlot(trigger.variableIds?.[0]));
    }, [trigger]);

    const save = () => {
        setStringParam(`${track}\t${task}`);
        setIntParams([addToExisting ? 1 : 0, option, literal, getWiredValueTargetCode(target)]);
        setVariableIds([option === 1 ? variableSlotOf(variableToken) : WIRED_VARIABLE_ABSENT]);
    };

    return (
        <WiredActionBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSection title={localizeWithFallback('wiredfurni.params.reward_track.progress.ids', 'Reward track task:')}>
                <div className="flex flex-col gap-1">
                    <WiredTextInput
                        maxLength={ID_MAX_LENGTH}
                        placeholder={localizeWithFallback('wiredfurni.params.reward_track.track_id', 'Track id:')}
                        value={track}
                        onChange={(value) => setTrack(cleanId(value))}
                    />
                    <WiredTextInput
                        maxLength={ID_MAX_LENGTH}
                        placeholder={localizeWithFallback('wiredfurni.params.reward_track.task_id', 'Task id:')}
                        value={task}
                        onChange={(value) => setTask(cleanId(value))}
                    />
                </div>
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.reward_track.progress.mode', 'Progression mode:')}>
                <WiredCheckboxOption
                    checked={addToExisting}
                    label={localizeWithFallback('wiredfurni.params.reward_track.add_to_existing_score', 'Add to existing score')}
                    last={true}
                    onChange={setAddToExisting}
                />
            </WiredSection>
            <WiredActionValueOrVariableSection
                literal={literal}
                max={SCORE_MAX}
                min={SCORE_MIN}
                option={option}
                recentScope="reward-track"
                target={target}
                targetTitle={localizeWithFallback('wiredfurni.params.sources.merged.title.variables_reference', 'Variable reference:')}
                title={localizeWithFallback('wiredfurni.params.reward_track.score', 'Score:')}
                variableToken={variableToken}
                onLiteralChange={setLiteral}
                onOptionChange={setOption}
                onTargetChange={setTarget}
                onVariableTokenChange={setVariableToken}
            />
        </WiredActionBaseView>
    );
};
