import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { WiredSliderSection } from '../WiredSlider';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { useWired } from '../../../../hooks';
import { normalizeWiredComparison, WIRED_CMP_GREATER_EQUAL, WiredComparisonOperator } from '../WiredComparisonOperator';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const TEAM_OPTIONS = [0, 1, 2, 3, 4];
const COMPARISON_OPTIONS = [0, 1, 2];
const MIN_SCORE = 0;
const MAX_SCORE = 1000;
/** What the server's normalizeScore lets through. A credit threshold is useless capped at 999. */
const MAX_AMOUNT = 1_000_000;
const SCORE_PATTERN = /^\d*$/;

const clampScore = (value: number, max: number) => {
    if (isNaN(value)) return MIN_SCORE;

    return Math.max(MIN_SCORE, Math.min(max, Math.floor(value)));
};

interface WiredConditionTeamHasScoreViewProps {
    /**
     * The item-count and currency conditions share this dialog for its amount, user source and
     * quantifier. They have no team, and their comparison uses the six shared wired codes rather than
     * the three team-score ones, so they pass false and get the shared operator selector instead.
     */
    scoped?: boolean;
}

export const WiredConditionTeamHasScoreView: FC<WiredConditionTeamHasScoreViewProps> = ({ scoped = true }) => {
    const { trigger = null, setIntParams = null, setUserSources, quantifier: nativeQuantifier, setQuantifier: setNativeQuantifier } = useWired();
    const ceiling = scoped ? MAX_SCORE : MAX_AMOUNT;
    const [team, setTeam] = useState(scoped ? 0 : 1);
    const [comparison, setComparison] = useState(scoped ? 0 : WIRED_CMP_GREATER_EQUAL);
    const [score, setScore] = useState(0);
    const [scoreInput, setScoreInput] = useState('0');
    const [userSource, setUserSource] = useState(0);
    const [quantifier, setQuantifier] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (!trigger) return;

        const nextTeam = trigger.intData.length > 0 ? trigger.intData[0] : scoped ? 0 : 1;
        const nextComparison = trigger.intData[2] ?? (scoped ? 0 : WIRED_CMP_GREATER_EQUAL);
        const nextScore = clampScore(trigger.intData[1] ?? 0, ceiling);
        const nextUserSource = trigger.userSources[0] ?? 0;
        const nextQuantifier = nativeQuantifier;

        setTeam(TEAM_OPTIONS.includes(nextTeam) ? nextTeam : scoped ? 0 : 1);
        setComparison(scoped ? (COMPARISON_OPTIONS.includes(nextComparison) ? nextComparison : 0) : normalizeWiredComparison(nextComparison));
        setScore(nextScore);
        setScoreInput(nextScore.toString());
        setUserSource(nextUserSource);
        setQuantifier(nextQuantifier === 1 ? 1 : 0);
        setShowAdvanced(nextUserSource !== 0 || nextQuantifier !== 0);
    }, [ceiling, scoped, trigger]);

    const updateScore = (value: number) => {
        const nextValue = clampScore(value, ceiling);

        setScore(nextValue);
        setScoreInput(nextValue.toString());
    };

    const updateScoreInput = (value: string) => {
        if (!SCORE_PATTERN.test(value)) return;

        setScoreInput(value);

        if (!value.length) {
            setScore(0);
            return;
        }

        updateScore(parseInt(value));
    };

    const save = () => {
        setIntParams([team, clampScore(score, ceiling), comparison]);
        setUserSources([userSource]);
        setNativeQuantifier(quantifier);
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={scoped}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <button className="btn btn-link p-0 align-self-start" type="button" onClick={() => setShowAdvanced((value) => !value)}>
                        {LocalizeText(showAdvanced ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                    </button>
                    {showAdvanced && (
                        <>
                            <div className="flex flex-col gap-1">
                                <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                                {[0, 1].map((value) => {
                                    return (
                                        <div key={value} className="flex items-center gap-1">
                                            <input
                                                checked={quantifier === value}
                                                className="form-check-input"
                                                id={`teamScoreQuantifier${value}`}
                                                name="teamScoreQuantifier"
                                                type="radio"
                                                onChange={() => setQuantifier(value)}
                                            />
                                            <Text>{LocalizeText(`wiredfurni.params.quantifier.users.${value}`)}</Text>
                                        </div>
                                    );
                                })}
                            </div>
                            <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />
                        </>
                    )}
                </div>
            }
        >
            {!scoped && <WiredComparisonOperator name="userAmountComparison" value={comparison} onChange={setComparison} />}
            {scoped && (
                <>
                    <WiredSection title={LocalizeText('wiredfurni.params.team')}>
                        <WiredRadioGroup name="teamHasScore" columns={2} options={TEAM_OPTIONS.map((id) => ({ id, newLine: id === 0, label: LocalizeText(id === 0 ? 'wiredfurni.params.team.triggerer' : `wiredfurni.params.team.${id}`) }))} value={team} onChange={setTeam} />
                    </WiredSection>
                    <WiredSection title={LocalizeText('wiredfurni.params.comparison_selection')}>
                        <WiredRadioGroup name="teamScoreComparison" options={COMPARISON_OPTIONS.map((id) => ({ id, label: LocalizeText(`wiredfurni.params.comparison.${id}`) }))} value={comparison} onChange={setComparison} />
                    </WiredSection>
                    <WiredSliderSection min={MIN_SCORE} max={MAX_SCORE} step={1} titleKey="wiredfurni.params.setscore2" value={score} onChange={setScore} />
                </>
            )}
            {!scoped && (
                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.user_amount', 'Amount:')}</Text>
                    <input
                        className="form-control form-control-sm"
                        inputMode="numeric"
                        type="text"
                        value={scoreInput}
                        onBlur={() => setScoreInput(clampScore(score, ceiling).toString())}
                        onChange={(event) => updateScoreInput(event.target.value)}
                    />
                </div>
            )}
        </WiredConditionBaseView>
    );
};
