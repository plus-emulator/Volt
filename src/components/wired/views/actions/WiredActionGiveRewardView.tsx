import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import { WiredTextInput } from '../WiredTextInput';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

/** The prizes the server awards: badges and furniture by base item id. */
type RewardType = 'badge' | 'furni';

interface RewardEntry {
    rewardType: RewardType;
    rewardValue: string;
    probability: number | null;
}

const DEFAULT_PROBABILITY = 100;
const MAX_REWARDS = 20;
const MAX_BADGE_CODE_LENGTH = 35;
/** class_4199 (validateReward): product and badge codes hold up to 100 characters and no ',' or ';'. */
const MAX_PRODUCT_CODE_LENGTH = 100;
const MAX_LIMIT = 1000;

const clampInt = (value: number, min: number, max: number) => (Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : min);

const createReward = (): RewardEntry => ({ rewardType: 'furni', rewardValue: '', probability: null });

/**
 * The code of one prize as the server reads it: a badge code, or for furni the furniture name (what the official editor takes)
 * or "furni#<base item id>" (a plain number is read as an id); null when the server would refuse it.
 */
const rewardCodeOf = (reward: RewardEntry): string | null => {
    const value = reward.rewardValue.trim();

    if (reward.rewardType === 'badge') return value.length > 0 && value.length <= MAX_BADGE_CODE_LENGTH && !/[,;\s]/.test(value) ? value : null;

    if (/^\d+$/.test(value)) return Number(value) > 0 ? `furni#${value}` : null;

    if (/^furni#\d+$/.test(value)) return Number(value.slice('furni#'.length)) > 0 ? value : null;

    return value.length > 0 && value.length <= MAX_PRODUCT_CODE_LENGTH && !/[,;#\s]/.test(value) ? value : null;
};

/** Reads one "type,code,chance" entry of the text; entries the server never writes are dropped. */
const parseRewardEntry = (rawType: string, rawCode: string, rawChance: string): RewardEntry | null => {
    const chance = Number(rawChance);
    const probability = clampInt(Number.isFinite(chance) ? chance : DEFAULT_PROBABILITY, 0, 100);

    if (rawType === '0') return { rewardType: 'badge', rewardValue: rawCode, probability };

    if (rawType === '1') return { rewardType: 'furni', rewardValue: rawCode.startsWith('furni#') ? rawCode.slice('furni#'.length) : rawCode, probability };

    return null;
};

export const WiredActionGiveRewardView: FC<{}> = (props) => {
    const [limitEnabled, setLimitEnabled] = useState(false);
    const [rewardTime, setRewardTime] = useState(0);
    const [uniqueRewards, setUniqueRewards] = useState(false);
    const [rewardsLimit, setRewardsLimit] = useState(1);
    const [limitationInterval, setLimitationInterval] = useState(1);
    const [rewards, setRewards] = useState<RewardEntry[]>([]);
    const { trigger = null, setIntParams = null, setStringParam = null, setUserSources = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => trigger?.userSources?.[0] ?? 0);

    const filledRewards = rewards.filter((reward) => reward.rewardValue.trim().length > 0);
    const invalidRewards = filledRewards.some((reward) => rewardCodeOf(reward) === null);
    const tooManyRewards = filledRewards.length > MAX_REWARDS;
    // class_4199 validate(): without unique mode every prize needs a chance of 1 to 100 and the chances may not add up to more than 100.
    const badChances = !uniqueRewards && filledRewards.some((reward) => reward.probability === null || reward.probability < 1 || reward.probability > 100);
    const chanceTotal = filledRewards.reduce((total, reward) => total + (reward.probability ?? 0), 0);
    const chancesTooHigh = !uniqueRewards && chanceTotal > 100;

    const addReward = () => setRewards((prevValue) => prevValue.length < MAX_REWARDS ? [...prevValue, createReward()] : prevValue);

    const updateReward = (index: number, updater: (reward: RewardEntry) => RewardEntry) => {
        setRewards((prevValue) => prevValue.map((reward, rewardIndex) => (rewardIndex === index ? updater(reward) : reward)));
    };

    const validate = () => !invalidRewards && !tooManyRewards && !badChances && !chancesTooHigh;

    // Always saved, so an empty list clears the text and the counted fields instead of keeping the last save.
    const save = () => {
        const entries = filledRewards.map((reward) => `${reward.rewardType === 'badge' ? '0' : '1'},${rewardCodeOf(reward)},${uniqueRewards ? DEFAULT_PROBABILITY : clampInt(reward.probability ?? 0, 0, 100)}`);

        setStringParam(entries.join(';'));
        // owned: [interval unit (0 once), unique, limit (0 none), interval count (1..1000)]; the receiving user is the U tail.
        setIntParams([rewardTime, uniqueRewards ? 1 : 0, limitEnabled ? clampInt(rewardsLimit, 1, MAX_LIMIT) : 0, clampInt(limitationInterval, 1, MAX_LIMIT)]);
        setUserSources([userSource]);
    };

    useEffect(() => {
        if (!trigger) return;

        const readRewards: RewardEntry[] = [];

        for (const rawReward of (trigger.stringData ?? '').split(';')) {
            const parts = rawReward.split(',');

            if (parts.length !== 3) continue;

            const reward = parseRewardEntry(parts[0], parts[1], parts[2]);

            if (reward) readRewards.push(reward);
        }

        while (readRewards.length < 5) readRewards.push(createReward());

        const limit = trigger.intData.length > 2 ? trigger.intData[2] : 0;

        setRewards(readRewards);
        setRewardTime(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUniqueRewards(trigger.intData.length > 1 ? trigger.intData[1] === 1 : false);
        setLimitEnabled(limit > 0);
        setRewardsLimit(limit > 0 ? limit : 1);
        setLimitationInterval(trigger.intData.length > 3 ? trigger.intData[3] : 1);
        setUserSource(trigger.userSources?.length > 0 ? trigger.userSources[0] : 0);
    }, [trigger]);

    // AIR25 class_4199 + RewardListPreset/RewardRowPreset: four sections and a compact three-column list.
    return (
        <WiredActionBaseView nativeLayout hasSpecialInput requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate}
            footer={<WiredSourcesSelector showUsers userSource={userSource} onChangeUsers={setUserSource} />}>
            <WiredSection title="Reward limit">
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <WiredCheckboxOption last checked={limitEnabled} label={LocalizeText('wiredfurni.params.prizelimit', ['amount'], [''])} onChange={setLimitEnabled} />
                    <WiredNumberInput ariaLabel="Reward limit" width={60} min={1} max={MAX_LIMIT} value={rewardsLimit} disabled={!limitEnabled} onChange={setRewardsLimit} />
                </div>
                {!limitEnabled && <WiredText wrap color={0xcc0000} text="Reward limit not set. Make sure rewards are badges or non-tradeable items." />}
            </WiredSection>
            <WiredSection title="How often can a user be rewarded">
                <WiredRadioGroup name="reward-interval" columns={2} value={rewardTime} onChange={setRewardTime}
                    options={['Once', '1 / n Days', '1 / n Hours', '1 / n Mins'].map((label, id) => ({ id, label }))} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <WiredText text="n =" />
                    <WiredTextInput width={60} maxLength={4} value={String(limitationInterval)} disabled={rewardTime === 0} onChange={value => { if (/^\d*$/.test(value)) setLimitationInterval(value === '' ? 0 : Number(value)); }} />
                </label>
            </WiredSection>
            <WiredSection title="Unique Rewards">
                <WiredCheckboxOption last label="Unique Rewards?" checked={uniqueRewards} onChange={setUniqueRewards} />
                <div style={{ marginTop: 3, marginLeft: 25, opacity: uniqueRewards ? undefined : 0.5 }}>
                    <WiredText wrap text="If checked each reward will be given once to each user. Probabilities are not in use." />
                </div>
            </WiredSection>
            <WiredSection title="Rewards" headerOptionsRight={<button type="button" onClick={addReward} style={{ border: 0, padding: 0, background: 'transparent', cursor: 'pointer' }}><WiredText underline text="Add reward" /></button>}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <WiredText text="Badge?" />
                    <span style={{ flex: 1, textAlign: 'center', minWidth: 0 }}><WiredText text="Product/Badge code" /></span>
                    <span style={{ opacity: uniqueRewards ? 0.5 : undefined }}><WiredText text="Probability" /></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {rewards.map((reward, index) => <div key={index} data-reward-row style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <label className="volt-wired__option volt-wired__option--checkbox is-last" style={{ flexShrink: 0, width: 19 }}>
                            <input aria-label={`Badge ${index + 1}`} type="checkbox" checked={reward.rewardType === 'badge'} onChange={event => updateReward(index, current => ({ ...current, rewardType: event.target.checked ? 'badge' : 'furni' }))} />
                        </label>
                        <label style={{ minWidth: 0, flex: 1 }} title="Product code or badge code">
                            <span className="sr-only">{`Product/Badge code ${index + 1}`}</span>
                            <WiredTextInput maxLength={100} value={reward.rewardValue} onChange={value => updateReward(index, current => ({ ...current, rewardValue: value }))} />
                        </label>
                        <label style={{ flexShrink: 0 }} title="Chance to get this reward. Value should be a number between 1 and 100">
                            <span className="sr-only">{`Probability ${index + 1}`}</span>
                            <WiredTextInput width={50} maxLength={3} disabled={uniqueRewards} value={reward.probability === null ? '' : String(reward.probability)} onChange={value => { if (/^\d*$/.test(value)) updateReward(index, current => ({ ...current, probability: value === '' ? null : Number(value) })); }} />
                        </label>
                    </div>)}
                </div>
            </WiredSection>
            {invalidRewards && <WiredText wrap text="A badge needs a code of up to 35 characters without spaces or commas; furni needs a furniture name or a base item id." />}
            {badChances && <WiredText wrap text="Make sure all probabilities are numbers between 1 and 100." />}
            {chancesTooHigh && <WiredText wrap text={`The sum of probabilities cannot exceed 100. You now have ${chanceTotal}.`} />}
            {tooManyRewards && <WiredText wrap text={`A box holds at most ${MAX_REWARDS} rewards.`} />}
        </WiredActionBaseView>
    );
};
