import {
    CreateLinkEvent,
    GetSessionDataManager,
    RewardTrackData,
    RewardTrackPrizeData,
    RewardTrackTaskData
} from '@volt/renderer';
import { CSSProperties, FC, useCallback, useEffect, useMemo, useState } from 'react';
import { FaCog } from 'react-icons/fa';
import {
    filterRewardTrackTasks,
    getPremiumBoostPercent,
    getRewardTrackPrizeState,
    getRewardTrackPrizeTooltip,
    getRewardTrackTaskHintLink,
    getRewardTrackTaskText,
    getRewardTrackText,
    IsPhoneLayout,
    IsTouchLayout,
    layoutRewardTrackPrizes,
    localizeWithFallback,
    NotificationAlertType,
    REWARD_TRACK_THEMES,
    RewardTrackTaskFilter,
    resolveRewardTrackTheme,
    useVoltLayout
} from '../../api';
import { Permission } from '../../api/permissions';
import availableIcon from '../../assets/images/reward-track/air/available-icon.png';
import checkIcon from '../../assets/images/reward-track/air/checkmark.png';
import creditBigIcon from '../../assets/images/reward-track/air/credit-big.png';
import diamondBigIcon from '../../assets/images/reward-track/air/diamond-big.png';
import frankAndPiccolo from '../../assets/images/reward-track/air/frank-and-piccolo.png';
import frankTips from '../../assets/images/reward-track/air/frank-tips.png';
import freeTrackIcon from '../../assets/images/reward-track/air/free-track.png';
import iconsBack from '../../assets/images/reward-track/air/icons-back.png';
import iconsForward from '../../assets/images/reward-track/air/icons-forward.png';
import lockedReward from '../../assets/images/reward-track/air/locked-reward.png';
import notAvailableIcon from '../../assets/images/reward-track/air/not-available-icon.png';
import pointLarge from '../../assets/images/reward-track/air/point-large.png';
import pointSmall from '../../assets/images/reward-track/air/point-small.png';
import premiumTrackIcon from '../../assets/images/reward-track/air/premium-track.png';
import prizesBackground from '../../assets/images/reward-track/air/prizes-background.png';
import prizesStars from '../../assets/images/reward-track/air/prizes-background-stars.png';
import rewardGift from '../../assets/images/reward-track/air/reward-gift.png';
import rewardGiftPremium from '../../assets/images/reward-track/air/reward-gift-premium.png';
import taskListIcon from '../../assets/images/reward-track/air/task-list.png';
import { DraggableWindowPosition, LayoutAvatarImageView } from '../../common';
import { NativeText } from '../../common/native-text/NativeText';
import { nativeTextStyles } from '../../common/native-text/NativeTextStyles';
import { useTextWindowWidths } from '../../common/native-text/useTextWindowWidths';
import { useHasPermission, useNotification, useRewardTracks } from '../../hooks';
import { VoltCard } from '../../layout';
import { useAirFieldWidth } from '../achievements/AchievementText';
import { ProductIconView } from './ProductIconView';
import { RewardTrackAdminView } from './RewardTrackAdminView';
import { RewardTrackScrollList } from './RewardTrackScrollList';

const FILTERS: RewardTrackTaskFilter[] = ['all', 'in_progress', 'completed'];
const MAIN_BAR_WIDTH = 602;
const TASK_BAR_WIDTH = 200;
const LEVEL_BAR_WIDTH = 260;
const taskIconModules = import.meta.glob('../../assets/images/reward-track/air/task-*.png', { eager: true, import: 'default' }) as Record<string, string>;

/** Native pixel size of reward_track_tasks_<action>. The row shows this size; the detail doubles it. */
const TASK_ICON_SIZE: Record<string, { w: number; h: number }> = {
    buy_from_catalogue: { w: 44, h: 52 },
    change_figure: { w: 53, h: 51 },
    change_motto: { w: 53, h: 47 },
    chat_with_someone: { w: 48, h: 48 },
    create_room: { w: 53, h: 40 },
    dance: { w: 49, h: 46 },
    enter_other_users_room: { w: 37, h: 25 },
    find_hand_item: { w: 46, h: 50 },
    follow_friend: { w: 44, h: 45 },
    friend_furni_locked: { w: 48, h: 48 },
    give_respect: { w: 34, h: 37 },
    move_item: { w: 43, h: 45 },
    pet_eat: { w: 42, h: 49 },
    pet_level: { w: 46, h: 45 },
    pet_respect: { w: 46, h: 45 },
    place_item: { w: 24, h: 50 },
    publish_picture: { w: 52, h: 50 },
    replenish_respect: { w: 42, h: 45 },
    request_friend: { w: 49, h: 48 },
    rotate_item: { w: 43, h: 46 },
    send_messenger_invite: { w: 52, h: 33 },
    send_messenger_message: { w: 39, h: 50 },
    set_relationship_status: { w: 40, h: 50 },
    switch_item_state: { w: 43, h: 45 },
    swim: { w: 52, h: 42 },
    teleport: { w: 52, h: 51 },
    use_habbicon: { w: 26, h: 50 },
    wave: { w: 51, h: 49 },
    wear_badge: { w: 40, h: 49 }
};

const taskIcon = (actionType: string): { src: string; w: number; h: number } | null => {
    const key = (actionType || '').toLowerCase();
    const size = TASK_ICON_SIZE[key];
    const src = taskIconModules[`../../assets/images/reward-track/air/task-${key.replace(/_/g, '-')}.png`];

    return size && src ? { src, ...size } : null;
};

const rewardText = (key: string, fallback: string, tokens?: Record<string, string | number>): string => {
    const resolved = tokens ? localizeWithFallback(key, fallback, Object.keys(tokens), Object.values(tokens).map(String)) : localizeWithFallback(key, fallback);

    if (!tokens) return resolved;

    return Object.entries(tokens).reduce((current, [name, value]) => current.split(`%${name}%`).join(String(value)), resolved);
};

const trackFallback = (trackId: string, suffix: 'name' | 'desc' | 'info'): string => {
    if (trackId !== 'introduction') return suffix === 'name' ? trackId : '';

    if (suffix === 'name') return 'Introduction Track';

    if (suffix === 'desc') return 'Learn all about Habbo!';

    return 'Complete tasks to earn points and unlock rewards';
};

/** RewardTrackTaskProgressBarView: the fill is round(width * ratio) wide and turns green once complete. */
const TaskProgressBar: FC<{ ratio: number; width: number }> = ({ ratio, width }) => {
    const fill = Math.round(width * Math.max(0, Math.min(1, ratio)));

    return (
        <span className="volt-reward-track-mini-bar">
            {fill > 0 && (
                <span className="volt-reward-track-mini-bar-fill" data-complete={ratio >= 1} style={{ width: fill }}>
                    <span className="volt-reward-track-mini-bar-gloss" />
                </span>
            )}
        </span>
    );
};

/** task_image / task_info_img use pivot_point center: int((box - size) / 2) inside the 52x50 or 104x100 slot. */
const TaskGlyph: FC<{ actionType: string; boxWidth: number; boxHeight: number; zoom?: number }> = ({ actionType, boxWidth, boxHeight, zoom = 1 }) => {
    const icon = taskIcon(actionType);

    if (!icon) return null;

    const width = icon.w * zoom;
    const height = icon.h * zoom;

    return (
        <img
            src={icon.src}
            alt=""
            width={width}
            height={height}
            draggable={false}
            className={zoom > 1 ? 'is-scaled' : undefined}
            style={{ left: Math.trunc((boxWidth - width) / 2), top: Math.trunc((boxHeight - height) / 2) }}
        />
    );
};

const AMOUNT_TEXT_OVERRIDES = { size: 11, bold: true };
const AMOUNT_TEXT_POSITION: CSSProperties = { position: 'absolute', left: 4, top: -1 };

// quantity_container (18,37 20x14) takes on every width change of its auto sized text (x 4, 10 wide in the layout)
// and grows from its centre; AIR's int() halving keeps an odd extra pixel on the right.
const RewardTrackPrizeAmount: FC<{ amount: number; background: number }> = ({ amount, background }) => {
    const text = String(amount);
    const fieldWidth = useTextWindowWidths([{ text, textStyle: 'il_small', overrides: AMOUNT_TEXT_OVERRIDES }])?.[0];

    if (fieldWidth === undefined) return null;

    const growth = fieldWidth - 10;

    return (
        <span className="volt-reward-track-prize-amount" style={{ left: 18 + Math.trunc(-growth / 2), width: 20 + growth }}>
            <NativeText
                transparent
                nativeResolution
                className="volt-reward-track-prize-amount-text"
                style={AMOUNT_TEXT_POSITION}
                background={background}
                text={text}
                textStyle="il_small"
                overrides={AMOUNT_TEXT_OVERRIDES}
            />
        </span>
    );
};

const RewardTrackPrizeView: FC<{
    track: RewardTrackData;
    prize: RewardTrackPrizeData;
    left: number;
    onClaim: (prize: RewardTrackPrizeData) => void;
    onPremium: () => void;
}> = ({ track, prize, left, onClaim, onPremium }) => {
    const state = getRewardTrackPrizeState(prize, track);
    const dimmed = !prize.hasEnoughPoints(track);

    const onClick = () => {
        if (prize.claimed || dimmed) return;

        if (prize.isPremiumLocked(track)) {
            onPremium();

            return;
        }

        if (prize.isClaimable(track)) onClaim(prize);
    };

    return (
        <div
            className="volt-reward-track-prize"
            data-tier={prize.premium ? 'premium' : 'free'}
            data-state={state}
            data-dimmed={dimmed}
            style={{ left }}
            title={getRewardTrackPrizeTooltip(state)}
        >
            <span className="volt-reward-track-prize-stem" />
            <button type="button" className="volt-reward-track-prize-hit" disabled={dimmed} onClick={onClick}>
                <span className="volt-reward-track-prize-shadow" />
                <span className="volt-reward-track-prize-plate">
                    <span className="volt-reward-track-prize-product" data-shifted={prize.rewardAmount > 1}>
                        <ProductIconView productTypeId={prize.productItemTypeId} itemTypeId={prize.rewardTypeId} extraParams={prize.extraParams} />
                    </span>
                    {prize.rewardAmount > 1 && <RewardTrackPrizeAmount amount={prize.rewardAmount} background={prize.premium ? 0xf1def7 : 0xf9efe0} />}
                </span>
            </button>
            {state === 'premium_locked' && (
                <img src={lockedReward} alt="" width={18} height={22} draggable={false} className="volt-reward-track-prize-lock" />
            )}
            {state === 'claimed' && <img src={checkIcon} alt="" width={17} height={15} draggable={false} className="volt-reward-track-prize-check" />}
        </div>
    );
};

// task_hint_button (471,16,109 wide): the official shiny button is as wide as its label field plus 15 and keeps the right edge of its layout rect.
const HINT_BUTTON_RIGHT = 580;
const HINT_LABEL_SIZE = nativeTextStyles.button_shiny_regular.size;

const RewardTrackHintButton: FC<{ label: string; onClick: () => void }> = ({ label, onClick }) =>
{
    const fieldWidth = useAirFieldWidth(label, HINT_LABEL_SIZE, false, 'button_shiny_regular');
    const width = fieldWidth === undefined ? 109 : fieldWidth + 15;

    return (
        <button type="button" className="volt-reward-track-btn" style={{ left: HINT_BUTTON_RIGHT - width, width }} onClick={onClick}>
            {label}
        </button>
    );
};

// the official list collapses every hidden benefit row (24px + 5px gap) and the window shrinks with it
const countHiddenPremiumBenefits = (track: RewardTrackData): number =>
    5 - [track.taskPointsBoost > 1, track.hasPremiumPrizes, track.instantPoints > 0, track.hasPremiumTasks, track.hasPremiumLevels].filter(Boolean).length;

const RewardTrackPremiumConfirmView: FC<{ track: RewardTrackData; pending: boolean; onConfirm: () => void; onCancel: () => void }> = ({
    track,
    pending,
    onConfirm,
    onCancel
}) => (
    <VoltCard
        className={`volt-reward-track-premium resize-none${pending ? ' is-pending' : ''}`}
        uniqueKey="reward-track-premium"
        windowPosition={DraggableWindowPosition.CENTER}
        data-hidden-benefits={countHiddenPremiumBenefits(track)}
    >
        <VoltCard.Header headerText={rewardText('reward_track.premium.confirm.title', 'Unlock Premium Track')} onCloseClick={() => !pending && onCancel()} />
        <VoltCard.Content className="volt-reward-track-premium-content">
            <div className="volt-reward-track-premium-body">
                <div className="volt-reward-track-premium-panel">
                    <div className="volt-reward-track-premium-frame">
                        <img src={premiumTrackIcon} alt="" width={58} height={45} draggable={false} />
                    </div>
                    <div className="volt-reward-track-premium-panel-name">{rewardText('reward_track.rewards.premium', 'Premium')}</div>
                    <div className="volt-reward-track-premium-panel-info">{rewardText('reward_track.rewards.premium.info', 'Extra rewards')}</div>
                </div>
                <div className="volt-reward-track-premium-benefits">
                    <div className="volt-reward-track-premium-gap" />
                    <p className="volt-reward-track-premium-desc">
                        {rewardText('reward_track.premium.confirm.desc', 'Get PREMIUM rewards and faster progress on this track!')}
                    </p>
                    <div className="volt-reward-track-premium-gap" />
                    {track.taskPointsBoost > 1 && (
                        <div className="volt-reward-track-premium-benefit">
                            <img src={checkIcon} alt="" width={17} height={15} draggable={false} />
                            <span>
                                {rewardText('reward_track.premium.confirm.benefit.boost', '%percent%% faster progression', {
                                    percent: getPremiumBoostPercent(track.taskPointsBoost)
                                })}
                            </span>
                        </div>
                    )}
                    {track.hasPremiumPrizes && (
                        <div className="volt-reward-track-premium-benefit">
                            <img src={checkIcon} alt="" width={17} height={15} draggable={false} />
                            <span>{rewardText('reward_track.premium.confirm.benefit.rewards', 'More premium rewards!')}</span>
                        </div>
                    )}
                    {track.instantPoints > 0 && (
                        <div className="volt-reward-track-premium-benefit">
                            <img src={checkIcon} alt="" width={17} height={15} draggable={false} />
                            <span>
                                {rewardText('reward_track.premium.confirm.benefit.instant_points', 'Instantly gain %points% points', {
                                    points: track.instantPoints
                                })}
                            </span>
                        </div>
                    )}
                    {track.hasPremiumTasks && (
                        <div className="volt-reward-track-premium-benefit">
                            <img src={checkIcon} alt="" width={17} height={15} draggable={false} />
                            <span>{rewardText('reward_track.premium.confirm.benefit.tasks', 'Exclusive premium tasks')}</span>
                        </div>
                    )}
                    {track.hasPremiumLevels && (
                        <div className="volt-reward-track-premium-benefit">
                            <img src={checkIcon} alt="" width={17} height={15} draggable={false} />
                            <span>{rewardText('reward_track.premium.confirm.benefit.levels', 'Exclusive premium levels')}</span>
                        </div>
                    )}
                </div>
                <div className="volt-reward-track-premium-cost">
                    <span>{rewardText('catalog.purchase.confirmation.dialog.cost', 'Cost')}</span>
                    <span className="volt-reward-track-premium-price">
                        {track.costCredits > 0 && (
                            <>
                                <span>{track.costCredits}</span>
                                <img src={creditBigIcon} alt="" width={22} height={22} draggable={false} />
                            </>
                        )}
                        {track.costCredits > 0 && track.costDiamonds > 0 && <span>+</span>}
                        {track.costDiamonds > 0 && (
                            <>
                                <span>{track.costDiamonds}</span>
                                <span className="volt-reward-track-premium-diamond">
                                    <img src={diamondBigIcon} alt="" width={19} height={19} draggable={false} />
                                </span>
                            </>
                        )}
                    </span>
                </div>
            </div>
            <div className="volt-reward-track-premium-buttons">
                <button type="button" className="volt-reward-track-btn" disabled={pending} onClick={onCancel}>
                    {rewardText('reward_track.premium.confirm.cancel', 'Cancel')}
                </button>
                <button type="button" className="volt-reward-track-btn volt-reward-track-btn-premium" disabled={pending} onClick={onConfirm}>
                    {rewardText('reward_track.premium.confirm.buy', 'Unlock')}
                </button>
            </div>
        </VoltCard.Content>
    </VoltCard>
);

/**
 * Official reward track window (main_xml 1103x722). `reward_track/open/<id>` opens one track.
 * The frame caption stays "Reward Track"; the track name is the profile title.
 */
interface RewardTrackWindowProps {
    trackId: string;
    onClose: () => void;
    onSelectTrack: (id: string) => void;
}

/** Fluid progress bar for touch layouts, reusing the AIR task progress sprites. */
const TouchTaskProgressBar: FC<{ ratio: number }> = ({ ratio }) => {
    const percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);

    return (
        <span className="volt-rt-touch-mini-bar">
            {percent > 0 && (
                <span className="volt-rt-touch-mini-bar-fill" data-complete={ratio >= 1} style={{ width: `${percent}%` }}>
                    <span className="volt-reward-track-mini-bar-gloss" />
                </span>
            )}
        </span>
    );
};

interface TouchPrizeTileProps {
    track: RewardTrackData;
    prize: RewardTrackPrizeData;
    onClaim: (prize: RewardTrackPrizeData) => void;
    onPremium: () => void;
}

const TouchRewardTrackPrizeTile: FC<TouchPrizeTileProps> = ({ track, prize, onClaim, onPremium }) => {
    const state = getRewardTrackPrizeState(prize, track);
    const dimmed = !prize.hasEnoughPoints(track);

    const onClick = () => {
        if (prize.claimed || dimmed) return;

        if (prize.isPremiumLocked(track)) {
            onPremium();

            return;
        }

        if (prize.isClaimable(track)) onClaim(prize);
    };

    return (
        <button
            type="button"
            className="volt-rt-touch-prize"
            data-tier={prize.premium ? 'premium' : 'free'}
            data-state={state}
            data-dimmed={dimmed}
            disabled={dimmed}
            title={getRewardTrackPrizeTooltip(state)}
            onClick={onClick}
        >
            <span className="volt-rt-touch-prize-plate">
                <span className="volt-rt-touch-prize-product" data-shifted={prize.rewardAmount > 1}>
                    <ProductIconView productTypeId={prize.productItemTypeId} itemTypeId={prize.rewardTypeId} extraParams={prize.extraParams} />
                </span>
                {prize.rewardAmount > 1 && <span className="volt-rt-touch-prize-amount">{prize.rewardAmount}</span>}
            </span>
            {state === 'premium_locked' && (
                <img src={lockedReward} alt="" width={18} height={22} draggable={false} className="volt-rt-touch-prize-lock" />
            )}
            {state === 'claimed' && <img src={checkIcon} alt="" width={17} height={15} draggable={false} className="volt-rt-touch-prize-check" />}
            {state === 'claimable' && <span className="volt-rt-touch-prize-ready">{rewardText('dailytasks.claim', 'Claim')}</span>}
        </button>
    );
};

interface TouchRewardTrackBodyProps {
    track: RewardTrackData;
    isPhone: boolean;
    isEditor: boolean;
    filter: RewardTrackTaskFilter;
    filteredTasks: RewardTrackTaskData[];
    selectedTask: RewardTrackTaskData;
    filterText: (value: RewardTrackTaskFilter) => string;
    onFilter: (value: RewardTrackTaskFilter) => void;
    onSelectTask: (taskId: string) => void;
    onClaim: (prize: RewardTrackPrizeData) => void;
    onPremium: () => void;
    onOpenAdmin: () => void;
    section: 'rewards' | 'tasks';
    onSectionChange: (next: 'rewards' | 'tasks') => void;
    detailOpen: boolean;
    onDetailOpenChange: (open: boolean) => void;
}

const TouchRewardTrackBody: FC<TouchRewardTrackBodyProps> = ({
    track,
    isPhone,
    isEditor,
    filter,
    filteredTasks,
    selectedTask,
    filterText,
    onFilter,
    onSelectTask,
    onClaim,
    onPremium,
    onOpenAdmin,
    section,
    onSectionChange,
    detailOpen,
    onDetailOpenChange
}) => {
    const milestones = useMemo(() => {
        const byPoints = new Map<number, { points: number; free: RewardTrackPrizeData[]; premium: RewardTrackPrizeData[] }>();

        for (const prize of track.prizes) {
            let group = byPoints.get(prize.requiredPoints);

            if (!group) {
                group = { points: prize.requiredPoints, free: [], premium: [] };
                byPoints.set(prize.requiredPoints, group);
            }

            (prize.premium ? group.premium : group.free).push(prize);
        }

        return Array.from(byPoints.values()).sort((a, b) => a.points - b.points);
    }, [track.prizes]);

    const maxPoints = milestones.length ? Math.max(1, milestones[milestones.length - 1].points) : Math.max(1, track.points);
    const overallPercent = Math.round(Math.max(0, Math.min(1, track.points / maxPoints)) * 100);
    const claimablePrizes = useMemo(() => track.prizes.filter((prize) => prize.isClaimable(track)), [track]);
    const hintLink = selectedTask ? getRewardTrackTaskHintLink(selectedTask.id) : null;
    const showRewards = !isPhone || section === 'rewards';
    const showTasks = !isPhone || section === 'tasks';
    const showTaskList = !isPhone || !detailOpen || !selectedTask;
    const showTaskDetail = (!isPhone || detailOpen) && filteredTasks.length > 0 && !!selectedTask;

    const segmentFillPercent = (index: number): number => {
        const current = milestones[index].points;
        const previous = index > 0 ? milestones[index - 1].points : 0;

        if (track.points >= current) return 100;
        if (track.points <= previous || current <= previous) return 0;

        return Math.round(((track.points - previous) / (current - previous)) * 100);
    };

    return (
        <div className="volt-rt-touch" data-phone={isPhone}>
            <div className="volt-rt-touch-header">
                <div className="volt-rt-touch-profile-row">
                    <div className="volt-rt-touch-avatar">
                        <LayoutAvatarImageView figure={GetSessionDataManager().figure} direction={2} />
                    </div>
                    <div className="volt-rt-touch-info">
                        <div className="volt-rt-touch-title">{getRewardTrackText(track.id, 'name', trackFallback(track.id, 'name'))}</div>
                        <div className="volt-rt-touch-desc">{getRewardTrackText(track.id, 'desc', trackFallback(track.id, 'desc'))}</div>
                    </div>
                    <div className="volt-rt-touch-stats">
                        <div className="volt-rt-touch-points-pill">
                            <img src={pointLarge} alt="" width={27} height={18} draggable={false} />
                            <span>{track.points}</span>
                        </div>
                        <div className="volt-rt-touch-collected-pill">
                            <img src={checkIcon} alt="" width={17} height={15} draggable={false} />
                            <span>
                                {track.claimedPrizeCount} / {track.totalPrizeCount}
                            </span>
                        </div>
                    </div>
                    {isEditor && (
                        <button
                            type="button"
                            className="volt-rt-touch-admin-btn"
                            title={rewardText('reward_track.admin.open', 'Edit the reward tracks')}
                            data-testid="reward-track-admin-toggle"
                            onClick={onOpenAdmin}
                        >
                            <FaCog />
                        </button>
                    )}
                </div>
                <div className="volt-rt-touch-progress-row">
                    <div className="volt-rt-touch-main-bar" role="progressbar" aria-valuenow={track.points} aria-valuemin={0} aria-valuemax={maxPoints}>
                        {overallPercent > 0 && (
                            <div className="volt-rt-touch-main-bar-fill" style={{ width: `${overallPercent}%` }}>
                                <div className="volt-reward-track-main-bar-gloss" />
                            </div>
                        )}
                    </div>
                    <span className="volt-rt-touch-progress-label">
                        {track.points} / {maxPoints}
                    </span>
                </div>
            </div>

            {isPhone && (
                <div className="volt-rt-touch-tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={section === 'rewards'}
                        className="volt-rt-touch-tab"
                        data-active={section === 'rewards'}
                        onClick={() => onSectionChange('rewards')}
                    >
                        <span>{rewardText('reward_track.rewards.free', 'Rewards')}</span>
                        {claimablePrizes.length > 0 && <span className="volt-rt-touch-tab-badge">{claimablePrizes.length}</span>}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={section === 'tasks'}
                        className="volt-rt-touch-tab"
                        data-active={section === 'tasks'}
                        onClick={() => onSectionChange('tasks')}
                    >
                        <span>
                            {rewardText('reward_track.tasks', 'Track Tasks')} ({track.completedTaskCount}/{track.totalTaskCount})
                        </span>
                    </button>
                </div>
            )}

            <div className="volt-rt-touch-scroll">
                {showRewards && (
                    <div className="volt-rt-touch-rewards-section">
                        <div className="volt-rt-touch-strip-panel">
                            <div className="volt-rt-touch-strip-sky" />
                            <div className="volt-rt-touch-strip" data-premium={track.hasPremiumConfig}>
                                <div className="volt-rt-touch-tier-col">
                                    <div className="volt-rt-touch-tier-head" data-tier="free">
                                        <img src={freeTrackIcon} alt="" width={49} height={48} draggable={false} />
                                        <span>{rewardText('reward_track.rewards.free', 'Free Track')}</span>
                                    </div>
                                    <div className="volt-rt-touch-tier-spacer" />
                                    {track.hasPremiumConfig && (
                                        <div className="volt-rt-touch-tier-head" data-tier="premium">
                                            <img src={premiumTrackIcon} alt="" width={58} height={45} draggable={false} />
                                            <span>{rewardText('reward_track.rewards.premium', 'Premium')}</span>
                                        </div>
                                    )}
                                </div>
                                {milestones.map((milestone, index) => {
                                    const reached = track.points >= milestone.points;
                                    const fill = segmentFillPercent(index);

                                    return (
                                        <div key={milestone.points} className="volt-rt-touch-milestone" data-reached={reached}>
                                            <div className="volt-rt-touch-milestone-slot" data-tier="free">
                                                {milestone.free.map((prize) => (
                                                    <TouchRewardTrackPrizeTile
                                                        key={prize.id}
                                                        track={track}
                                                        prize={prize}
                                                        onClaim={onClaim}
                                                        onPremium={onPremium}
                                                    />
                                                ))}
                                            </div>
                                            <div className="volt-rt-touch-milestone-axis">
                                                <div className="volt-rt-touch-axis-bar">
                                                    {fill > 0 && <span className="volt-rt-touch-axis-fill" style={{ width: `${fill}%` }} />}
                                                </div>
                                                <img
                                                    src={reached ? availableIcon : notAvailableIcon}
                                                    alt=""
                                                    width={20}
                                                    height={20}
                                                    draggable={false}
                                                    className="volt-rt-touch-axis-icon"
                                                />
                                                <span className="volt-rt-touch-axis-points">{milestone.points}</span>
                                            </div>
                                            {track.hasPremiumConfig && (
                                                <div className="volt-rt-touch-milestone-slot" data-tier="premium">
                                                    {milestone.premium.map((prize) => (
                                                        <TouchRewardTrackPrizeTile
                                                            key={prize.id}
                                                            track={track}
                                                            prize={prize}
                                                            onClaim={onClaim}
                                                            onPremium={onPremium}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="volt-rt-touch-rewards-footer">
                            {claimablePrizes.length > 0 && (
                                <button
                                    type="button"
                                    className="volt-rt-touch-action-btn is-claim"
                                    onClick={() => onClaim(claimablePrizes[0])}
                                >
                                    {claimablePrizes.length > 1
                                        ? `${rewardText('dailytasks.claim', 'Claim')} (${claimablePrizes.length})`
                                        : rewardText('dailytasks.claim', 'Claim')}
                                </button>
                            )}
                            {track.hasPremiumConfig && !track.premium ? (
                                <div className="volt-rt-touch-tip" data-upgrade="true">
                                    <img src={rewardGiftPremium} alt="" width={41} height={36} draggable={false} />
                                    <p>{rewardText('reward_track.tasks.tip_upgrade', 'Upgrade now for premium rewards and faster progression!')}</p>
                                    <button type="button" className="volt-reward-track-btn volt-reward-track-btn-premium volt-rt-touch-premium-btn" onClick={onPremium}>
                                        {rewardText('reward_track.tasks.tip_upgrade.button', 'Get Premium')}
                                    </button>
                                </div>
                            ) : (
                                <div className="volt-rt-touch-tip">
                                    <img src={rewardGift} alt="" width={41} height={36} draggable={false} />
                                    <p>{rewardText('reward_track.tasks.tip', 'Complete tasks to earn points and unlock rewards')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {showTasks && (
                    <div className="volt-rt-touch-tasks-section">
                        {showTaskList && (
                            <div className="volt-rt-touch-tasks-pane">
                                <div className="volt-rt-touch-tasks-head">
                                    <img src={taskListIcon} alt="" width={19} height={25} draggable={false} />
                                    <div className="volt-rt-touch-tasks-head-text">
                                        <div className="volt-rt-touch-tasks-title">{rewardText('reward_track.tasks', 'Track Tasks')}</div>
                                        <div className="volt-rt-touch-tasks-sub">
                                            {rewardText('reward_track.tasks.progress', '%progress% / %total% completed', {
                                                progress: track.completedTaskCount,
                                                total: track.totalTaskCount
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div className="volt-rt-touch-filters">
                                    {FILTERS.map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            className="volt-rt-touch-filter"
                                            data-active={filter === value}
                                            onClick={() => onFilter(value)}
                                        >
                                            {filterText(value)}
                                        </button>
                                    ))}
                                </div>
                                <div className="volt-rt-touch-task-list">
                                    {filteredTasks.map((task) => {
                                        const level = task.activeLevel;
                                        const ratio = task.progressRatioFor(level);

                                        return (
                                            <button
                                                key={task.id}
                                                type="button"
                                                className="volt-rt-touch-task"
                                                data-selected={selectedTask?.id === task.id}
                                                onClick={() => {
                                                    onSelectTask(task.id);
                                                    if (isPhone) onDetailOpenChange(true);
                                                }}
                                            >
                                                <span className="volt-rt-touch-task-glyph">
                                                    <TaskGlyph actionType={task.actionType} boxWidth={52} boxHeight={50} />
                                                </span>
                                                <span className="volt-rt-touch-task-body">
                                                    <span className="volt-rt-touch-task-name">
                                                        {getRewardTrackTaskText(track.id, task.id, 'name', task.id)}
                                                    </span>
                                                    <span className="volt-rt-touch-task-desc">
                                                        {getRewardTrackTaskText(track.id, task.id, 'desc', '')}
                                                    </span>
                                                    <span className="volt-rt-touch-task-prog">
                                                        <TouchTaskProgressBar ratio={ratio} />
                                                        <span className="volt-rt-touch-task-count">
                                                            {task.progressCount} / {level ? level.requiredCount : 0}
                                                        </span>
                                                    </span>
                                                </span>
                                                <span className="volt-rt-touch-task-reward">
                                                    <span>{level ? level.pointsReward : 0}</span>
                                                    <img src={pointSmall} alt="" width={19} height={14} draggable={false} />
                                                </span>
                                                {isPhone && <span className="volt-rt-touch-task-chevron" aria-hidden="true">›</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {showTaskDetail && selectedTask && (
                            <div className="volt-rt-touch-detail-pane">
                                {isPhone && (
                                    <button type="button" className="volt-rt-touch-back-btn" onClick={() => onDetailOpenChange(false)}>
                                        ‹ {rewardText('reward_track.tasks', 'Track Tasks')}
                                    </button>
                                )}
                                <div className="volt-rt-touch-detail-head">
                                    <div className="volt-rt-touch-detail-glyph">
                                        <TaskGlyph actionType={selectedTask.actionType} boxWidth={56} boxHeight={56} />
                                    </div>
                                    <div className="volt-rt-touch-detail-meta">
                                        <div className="volt-rt-touch-detail-name">
                                            {getRewardTrackTaskText(track.id, selectedTask.id, 'name', selectedTask.id)}
                                        </div>
                                        <div className="volt-rt-touch-detail-desc">
                                            {getRewardTrackTaskText(track.id, selectedTask.id, 'desc', '')}
                                        </div>
                                    </div>
                                </div>
                                <div className="volt-rt-touch-levels-head">{rewardText('reward_track.levels.title', 'Levels')}</div>
                                <div className="volt-rt-touch-levels">
                                    {selectedTask.levels.map((level, index) => {
                                        const ratio = selectedTask.progressRatioFor(level);

                                        return (
                                            <div key={index} className="volt-rt-touch-level" data-active={index === selectedTask.activeLevelIndex}>
                                                <div className="volt-rt-touch-level-top">
                                                    <span className="volt-rt-touch-level-name">
                                                        {rewardText('reward_track.levels.level', 'Level %level%', { level: index + 1 })}
                                                    </span>
                                                    <span className="volt-rt-touch-level-count">
                                                        {selectedTask.progressCount} / {level.requiredCount}
                                                    </span>
                                                    <span className="volt-rt-touch-level-end">
                                                        {ratio >= 1 && <img src={checkIcon} alt="" width={17} height={15} draggable={false} />}
                                                        <span className="volt-rt-touch-level-reward">
                                                            <span>{level.pointsReward}</span>
                                                            <img src={pointSmall} alt="" width={19} height={14} draggable={false} />
                                                        </span>
                                                    </span>
                                                </div>
                                                <TouchTaskProgressBar ratio={ratio} />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="volt-rt-touch-hint">
                                    <img className="volt-rt-touch-hint-frank" src={frankTips} alt="" width={52} height={88} draggable={false} />
                                    <div className="volt-rt-touch-hint-body">
                                        <div className="volt-rt-touch-hint-label">{rewardText('reward_track.levels.tip', 'Tip!')}</div>
                                        <div className="volt-rt-touch-hint-text">
                                            {getRewardTrackTaskText(track.id, selectedTask.id, 'hint.desc', '')}
                                        </div>
                                        {hintLink && (
                                            <button
                                                type="button"
                                                className="volt-rt-touch-action-btn"
                                                onClick={() => CreateLinkEvent(hintLink.link)}
                                            >
                                                {getRewardTrackTaskText(track.id, selectedTask.id, 'hint.button_text', hintLink.fallbackText)}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export const RewardTrackWindow: FC<RewardTrackWindowProps> = ({ trackId, onClose, onSelectTrack }) => {
    const voltLayout = useVoltLayout();
    const isTouch = IsTouchLayout(voltLayout);
    const isPhone = IsPhoneLayout(voltLayout);
    const [filter, setFilter] = useState<RewardTrackTaskFilter>('all');
    const [selectedTaskId, setSelectedTaskId] = useState<string>(null);
    const [premiumConfirm, setPremiumConfirm] = useState(false);
    const [page, setPage] = useState(0);
    const [pageKey, setPageKey] = useState('');
    const [touchSection, setTouchSection] = useState<'rewards' | 'tasks'>('rewards');
    const [touchDetailOpen, setTouchDetailOpen] = useState(false);
    const isEditor = useHasPermission(Permission.RewardTrackManage);
    const [editMode, setEditMode] = useState(false);
    const { tracks = [], reloadCount = 0, pendingPurchase = null, claimPrize = null, purchasePremium = null } = useRewardTracks();
    const { simpleAlert = null } = useNotification();
    const track = useMemo(() => tracks.find((existing) => existing.id === trackId) ?? null, [tracks, trackId]);
    const layout = useMemo(() => layoutRewardTrackPrizes(track?.prizes ?? []), [track]);
    const nextPageKey = track ? `${track.id}:${layout.pageCount}` : '';

    if (nextPageKey !== pageKey) {
        setPageKey(nextPageKey);

        if (track) setPage(layout.pageForPoints(track.points));
    }

    const open = useCallback(
        (id: string) => {
            setEditMode(false);
            setFilter('all');
            setSelectedTaskId(null);
            onSelectTrack(id);
        },
        [onSelectTrack]
    );

    useEffect(() => {
        setEditMode(false);
        setFilter('all');
        setSelectedTaskId(null);
        setTouchDetailOpen(false);
    }, [trackId]);

    useEffect(() => {
        if (trackId && !track && tracks.length && !tracks.some((existing) => existing.id === trackId)) onSelectTrack(tracks[0].id);
    }, [trackId, track, tracks, onSelectTrack]);

    useEffect(() => {
        if (reloadCount > 0 && trackId && simpleAlert) {
            simpleAlert(
                rewardText('reward_track.reload.desc', 'The reward track was updated and has been reloaded.'),
                NotificationAlertType.DEFAULT,
                null,
                null,
                rewardText('reward_track.reload.title', 'Reward track updated')
            );
        }
        // the alert belongs to the reload, not to the open track
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadCount]);

    useEffect(() => {
        if (pendingPurchase === null) setPremiumConfirm(false);
    }, [pendingPurchase]);

    const theme = resolveRewardTrackTheme(track?.theme ?? 'blue');
    const themeKey = track && REWARD_TRACK_THEMES[track.theme] ? track.theme : 'blue';
    const safePage = Math.max(0, Math.min(layout.pageCount - 1, page));
    const themeStyle = {
        '--rt-dark': theme.dark,
        '--rt-medium': theme.medium,
        '--rt-light': theme.light,
        '--rt-active': theme.active,
        '--rt-prizes-bg': `url("${prizesBackground}")`
    } as CSSProperties;

    const pagePrizes = useMemo(() => {
        const free: RewardTrackPrizeData[][] = Array.from({ length: layout.pageCount }, () => []);
        const premium: RewardTrackPrizeData[][] = Array.from({ length: layout.pageCount }, () => []);
        const points: number[][] = Array.from({ length: layout.pageCount }, () => []);
        const seen = Array.from({ length: layout.pageCount }, () => new Set<number>());

        for (const prize of track?.prizes ?? []) {
            const index = layout.pageForPoints(prize.requiredPoints);

            (prize.premium ? premium : free)[index].push(prize);

            if (!seen[index].has(prize.requiredPoints)) {
                seen[index].add(prize.requiredPoints);
                points[index].push(prize.requiredPoints);
            }
        }

        return { free, premium, points };
    }, [layout, track]);

    const filteredTasks = useMemo(() => filterRewardTrackTasks(track?.tasks ?? [], filter), [track, filter]);
    const selectedTask: RewardTrackTaskData = filteredTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? null;
    const hintLink = selectedTask ? getRewardTrackTaskHintLink(selectedTask.id) : null;

    if (!trackId) return null;

    // the official list re-selects its first task when the selected one drops out of the new filter, and keeps it afterwards
    const onFilter = (value: RewardTrackTaskFilter) =>
    {
        const next = filterRewardTrackTasks(track?.tasks ?? [], value);

        if (!next.some((task) => task.id === selectedTask?.id)) setSelectedTaskId(next[0]?.id ?? null);

        setTouchDetailOpen(false);
        setFilter(value);
    };
    const onClaim = (prize: RewardTrackPrizeData) => track && claimPrize && claimPrize(track.id, prize.id);
    const onPremium = () => track && track.hasPremiumConfig && !track.premium && setPremiumConfirm(true);
    const progressX = track ? layout.xForPoints(track.points, safePage) : 0;
    // the official loading bar truncates the x position (Math.trunc(x) / width) before scaling it back to the bar width
    const progressFill = Math.max(0, Math.min(MAIN_BAR_WIDTH, Math.trunc(progressX)));
    const progressShape = progressFill >= MAIN_BAR_WIDTH - 4 ? MAIN_BAR_WIDTH : progressFill + 4;
    let unclaimedBefore = 0;
    let unclaimedAfter = 0;

    for (const prize of track?.prizes ?? []) {
        if (!prize.isClaimable(track)) continue;

        const prizePage = layout.pageForPoints(prize.requiredPoints);

        if (prizePage < safePage) unclaimedBefore += 1;
        else if (prizePage > safePage) unclaimedAfter += 1;
    }

    const filterText = (value: RewardTrackTaskFilter) => {
        switch (value) {
            case 'in_progress':
                return rewardText('reward_track.tasks.tab.in_progress', 'In Progress');
            case 'completed':
                return rewardText('reward_track.tasks.tab.completed', 'Completed');
            default:
                return rewardText('reward_track.tasks.tab.all_tasks', 'All Tasks');
        }
    };

    const prizeLeft = (points: number) => Math.round(layout.xForPoints(points, safePage) - 40);

    return (
        <>
            <VoltCard
                className="volt-reward-track resize-none"
                uniqueKey="reward-track"
                windowPosition={DraggableWindowPosition.CENTER}
                style={themeStyle}
                data-theme={themeKey}
            >
                <VoltCard.Header headerText={rewardText('reward_track.title', 'Reward Track')} onCloseClick={onClose} />
                <VoltCard.Content className="volt-reward-track-content">
                    {editMode && isEditor && (
                        <div className="volt-reward-track-admin-host">
                            <RewardTrackAdminView
                                onClose={() => setEditMode(false)}
                                onPreview={(id) => {
                                    setEditMode(false);
                                    open(id);
                                }}
                            />
                        </div>
                    )}
                    {!editMode && !track && (
                        <div className="volt-reward-track-loading">{rewardText('reward_track.loading', 'Loading the reward track...')}</div>
                    )}
                    {!editMode && track && isTouch && (
                        <TouchRewardTrackBody
                            track={track}
                            isPhone={isPhone}
                            isEditor={isEditor}
                            filter={filter}
                            filteredTasks={filteredTasks}
                            selectedTask={selectedTask}
                            filterText={filterText}
                            onFilter={onFilter}
                            onSelectTask={setSelectedTaskId}
                            onClaim={onClaim}
                            onPremium={onPremium}
                            onOpenAdmin={() => setEditMode(true)}
                            section={touchSection}
                            onSectionChange={setTouchSection}
                            detailOpen={touchDetailOpen}
                            onDetailOpenChange={setTouchDetailOpen}
                        />
                    )}
                    {!editMode && track && !isTouch && (
                        <div className="volt-reward-track-stage">
                            {/* reward_track_item / button dynamic styles: hover is RGB x1.1 + 15 */}
                            <svg className="volt-reward-track-filters-svg" aria-hidden="true" focusable="false">
                                <filter id="volt-reward-track-hover" colorInterpolationFilters="sRGB">
                                    <feComponentTransfer>
                                        <feFuncR type="linear" slope="1.1" intercept="0.0588" />
                                        <feFuncG type="linear" slope="1.1" intercept="0.0588" />
                                        <feFuncB type="linear" slope="1.1" intercept="0.0588" />
                                    </feComponentTransfer>
                                </filter>
                            </svg>
                            <div className="volt-reward-track-header">
                                <div className="volt-reward-track-rewards">
                                    <div className="volt-reward-track-bg" />
                                    <div className="volt-reward-track-sky" />
                                    <img className="volt-reward-track-stars" src={prizesStars} alt="" width={843} height={226} draggable={false} />
                                    <div className="volt-reward-track-main-bar">
                                        <div className="volt-reward-track-main-bar-progress" style={{ width: progressFill }}>
                                            <div className="volt-reward-track-main-bar-fill" style={{ width: progressShape }} />
                                            <div className="volt-reward-track-main-bar-gloss" />
                                        </div>
                                    </div>
                                    <div className="volt-reward-track-points-band-clip">
                                        <div className="volt-reward-track-points-band" />
                                    </div>
                                    <div className="volt-reward-track-band" data-tier="free">
                                        <span className="volt-reward-track-band-bg" />
                                        <span className="volt-reward-track-band-info" />
                                        <span className="volt-reward-track-band-split" />
                                        <img src={freeTrackIcon} alt="" width={49} height={48} draggable={false} />
                                        <span className="volt-reward-track-band-title">{rewardText('reward_track.rewards.free', 'Free Track')}</span>
                                    </div>
                                    {track.hasPremiumConfig && (
                                        <div className="volt-reward-track-band" data-tier="premium">
                                            <span className="volt-reward-track-band-bg" />
                                            <span className="volt-reward-track-band-info" />
                                            <span className="volt-reward-track-band-split" />
                                            <img src={premiumTrackIcon} alt="" width={58} height={45} draggable={false} />
                                            <span className="volt-reward-track-band-title">{rewardText('reward_track.rewards.premium', 'Premium')}</span>
                                            <small>{rewardText('reward_track.rewards.premium.info', 'Extra rewards')}</small>
                                        </div>
                                    )}
                                    {pagePrizes.points[safePage].map((points) => (
                                        <div key={points} className="volt-reward-track-indicator" style={{ left: 196 + prizeLeft(points) }}>
                                            <img
                                                src={track.points >= points ? availableIcon : notAvailableIcon}
                                                alt=""
                                                width={20}
                                                height={20}
                                                draggable={false}
                                            />
                                            <i className="volt-reward-track-indicator-dot" />
                                            <i className="volt-reward-track-indicator-stem" />
                                            <i className="volt-reward-track-indicator-connector" />
                                            <span>{points}</span>
                                        </div>
                                    ))}
                                    <div className="volt-reward-track-prize-layer">
                                        {pagePrizes.free[safePage].map((prize) => (
                                            <RewardTrackPrizeView
                                                key={prize.id}
                                                track={track}
                                                prize={prize}
                                                left={prizeLeft(prize.requiredPoints)}
                                                onClaim={onClaim}
                                                onPremium={onPremium}
                                            />
                                        ))}
                                        {pagePrizes.premium[safePage].map((prize) => (
                                            <RewardTrackPrizeView
                                                key={prize.id}
                                                track={track}
                                                prize={prize}
                                                left={prizeLeft(prize.requiredPoints)}
                                                onClaim={onClaim}
                                                onPremium={onPremium}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        className="volt-reward-track-page"
                                        data-side="prev"
                                        disabled={safePage <= 0}
                                        onClick={() => setPage((current) => Math.max(0, current - 1))}
                                        aria-label="Previous"
                                    >
                                        <img src={iconsBack} alt="" width={33} height={34} draggable={false} />
                                    </button>
                                    <button
                                        type="button"
                                        className="volt-reward-track-page"
                                        data-side="next"
                                        disabled={safePage >= layout.pageCount - 1}
                                        onClick={() => setPage((current) => Math.min(layout.pageCount - 1, current + 1))}
                                        aria-label="Next"
                                    >
                                        <img src={iconsForward} alt="" width={33} height={34} draggable={false} />
                                    </button>
                                    {unclaimedBefore > 0 && (
                                        <span className="volt-reward-track-unclaimed" data-side="prev">
                                            {unclaimedBefore}
                                        </span>
                                    )}
                                    {unclaimedAfter > 0 && (
                                        <span className="volt-reward-track-unclaimed" data-side="next">
                                            {unclaimedAfter}
                                        </span>
                                    )}
                                </div>
                                <div className="volt-reward-track-cutout">
                                    <div className="volt-reward-track-profile">
                                        <div className="volt-reward-track-avatar">
                                            <LayoutAvatarImageView figure={GetSessionDataManager().figure} direction={2} />
                                        </div>
                                        <div className="volt-reward-track-info">
                                            <div className="volt-reward-track-title">
                                                {getRewardTrackText(track.id, 'name', trackFallback(track.id, 'name'))}
                                            </div>
                                            <div className="volt-reward-track-desc">
                                                {getRewardTrackText(track.id, 'desc', trackFallback(track.id, 'desc'))}
                                            </div>
                                            <div className="volt-reward-track-instructions">
                                                {getRewardTrackText(track.id, 'info', trackFallback(track.id, 'info'))}
                                            </div>
                                        </div>
                                        <div className="volt-reward-track-points">
                                            <div className="volt-reward-track-points-value">
                                                <img src={pointLarge} alt="" width={27} height={18} draggable={false} />
                                                <span>{track.points}</span>
                                            </div>
                                            <div className="volt-reward-track-points-label">
                                                {rewardText('reward_track.profile.points_collected', 'Points collected')}
                                            </div>
                                        </div>
                                        <div className="volt-reward-track-splitter" />
                                        <div className="volt-reward-track-collected">
                                            <img src={checkIcon} alt="" width={17} height={15} draggable={false} />
                                            <span>
                                                {rewardText('reward_track.profile.rewards_collected', '%progress% / %total% rewards collected', {
                                                    progress: track.claimedPrizeCount,
                                                    total: track.totalPrizeCount
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="volt-reward-track-bulge" />
                                {isEditor && (
                                    <button
                                        type="button"
                                        className="volt-reward-track-admin-toggle"
                                        title={rewardText('reward_track.admin.open', 'Edit the reward tracks')}
                                        data-testid="reward-track-admin-toggle"
                                        onClick={() => setEditMode(true)}
                                    >
                                        <FaCog />
                                    </button>
                                )}
                            </div>
                            <div className="volt-reward-track-body">
                                <div className="volt-reward-track-tasks">
                                    <img className="volt-reward-track-tasks-icon" src={taskListIcon} alt="" width={19} height={25} draggable={false} />
                                    <div className="volt-reward-track-tasks-title">{rewardText('reward_track.tasks', 'Track Tasks')}</div>
                                    <div className="volt-reward-track-tasks-progress">
                                        {rewardText('reward_track.tasks.progress', '%progress% / %total% completed', {
                                            progress: track.completedTaskCount,
                                            total: track.totalTaskCount
                                        })}
                                    </div>
                                    <div className="volt-reward-track-filters">
                                        {FILTERS.map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                className="volt-reward-track-filter"
                                                data-active={filter === value}
                                                onClick={() => onFilter(value)}
                                            >
                                                {filterText(value)}
                                            </button>
                                        ))}
                                    </div>
                                    <RewardTrackScrollList key={`${track.id}:${filter}`} className="volt-reward-track-task-list" contentClassName="volt-reward-track-task-list-content" height={259}>
                                        {filteredTasks.map((task) => {
                                            const level = task.activeLevel;
                                            const ratio = task.progressRatioFor(level);

                                            return (
                                                <button
                                                    key={task.id}
                                                    type="button"
                                                    className="volt-reward-track-task"
                                                    data-selected={selectedTask?.id === task.id}
                                                    onClick={() => setSelectedTaskId(task.id)}
                                                >
                                                    <span className="volt-reward-track-task-glyph">
                                                        <TaskGlyph actionType={task.actionType} boxWidth={52} boxHeight={50} />
                                                    </span>
                                                    <span className="volt-reward-track-task-name">
                                                        {getRewardTrackTaskText(track.id, task.id, 'name', task.id)}
                                                    </span>
                                                    <span className="volt-reward-track-task-desc">
                                                        {getRewardTrackTaskText(track.id, task.id, 'desc', '')}
                                                    </span>
                                                    <TaskProgressBar ratio={ratio} width={TASK_BAR_WIDTH} />
                                                    <span className="volt-reward-track-task-count">
                                                        {task.progressCount} / {level ? level.requiredCount : 0}
                                                    </span>
                                                    <span className="volt-reward-track-task-reward">
                                                        <span>{level ? level.pointsReward : 0}</span>
                                                        <img src={pointSmall} alt="" width={19} height={14} draggable={false} />
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </RewardTrackScrollList>
                                    {(!track.hasPremiumConfig || track.premium) && (
                                        <div className="volt-reward-track-tip">
                                            <img className="volt-reward-track-tip-gift" src={rewardGift} alt="" width={41} height={36} draggable={false} />
                                            <p>{rewardText('reward_track.tasks.tip', 'Complete tasks to earn points and unlock rewards')}</p>
                                            <img
                                                className="volt-reward-track-tip-frank"
                                                src={frankAndPiccolo}
                                                alt=""
                                                width={88}
                                                height={39}
                                                draggable={false}
                                            />
                                        </div>
                                    )}
                                    {track.hasPremiumConfig && !track.premium && (
                                        <div className="volt-reward-track-tip" data-upgrade="true">
                                            <img
                                                className="volt-reward-track-tip-gift"
                                                src={rewardGiftPremium}
                                                alt=""
                                                width={41}
                                                height={36}
                                                draggable={false}
                                            />
                                            <p>{rewardText('reward_track.tasks.tip_upgrade', 'Upgrade now for premium rewards and faster progression!')}</p>
                                            <button type="button" className="volt-reward-track-btn volt-reward-track-btn-premium" onClick={onPremium}>
                                                {rewardText('reward_track.tasks.tip_upgrade.button', 'Get Premium')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {filteredTasks.length > 0 && selectedTask && (
                                    <div className="volt-reward-track-task-info">
                                        <div className="volt-reward-track-detail-glyph">
                                            <TaskGlyph actionType={selectedTask.actionType} boxWidth={104} boxHeight={100} zoom={2} />
                                        </div>
                                        <div className="volt-reward-track-detail-name">
                                            {getRewardTrackTaskText(track.id, selectedTask.id, 'name', selectedTask.id)}
                                        </div>
                                        <div className="volt-reward-track-detail-desc">{getRewardTrackTaskText(track.id, selectedTask.id, 'desc', '')}</div>
                                        <div className="volt-reward-track-levels-rule" />
                                        <div className="volt-reward-track-levels-title">{rewardText('reward_track.levels.title', 'Levels')}</div>
                                        <div className="volt-reward-track-levels">
                                            {selectedTask.levels.map((level, index) => {
                                                const ratio = selectedTask.progressRatioFor(level);

                                                return (
                                                    <div
                                                        key={index}
                                                        className="volt-reward-track-level"
                                                        data-active={index === selectedTask.activeLevelIndex}
                                                    >
                                                        <span className="volt-reward-track-level-name">
                                                            {rewardText('reward_track.levels.level', 'Level %level%', { level: index + 1 })}
                                                        </span>
                                                        <TaskProgressBar ratio={ratio} width={LEVEL_BAR_WIDTH} />
                                                        <span className="volt-reward-track-level-count">
                                                            {selectedTask.progressCount} / {level.requiredCount}
                                                        </span>
                                                        <span className="volt-reward-track-level-end">
                                                            {ratio >= 1 && (
                                                                <img
                                                                    className="volt-reward-track-level-check"
                                                                    src={checkIcon}
                                                                    alt=""
                                                                    width={17}
                                                                    height={15}
                                                                    draggable={false}
                                                                />
                                                            )}
                                                            <span className="volt-reward-track-level-reward">
                                                                <span>{level.pointsReward}</span>
                                                                <img src={pointSmall} alt="" width={19} height={14} draggable={false} />
                                                            </span>
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="volt-reward-track-hint">
                                            <img className="volt-reward-track-hint-frank" src={frankTips} alt="" width={52} height={88} draggable={false} />
                                            <div className="volt-reward-track-hint-label">{rewardText('reward_track.levels.tip', 'Tip!')}</div>
                                            <div className="volt-reward-track-hint-text">
                                                {getRewardTrackTaskText(track.id, selectedTask.id, 'hint.desc', '')}
                                            </div>
                                            {hintLink && (
                                                <RewardTrackHintButton
                                                    label={getRewardTrackTaskText(track.id, selectedTask.id, 'hint.button_text', hintLink.fallbackText)}
                                                    onClick={() => CreateLinkEvent(hintLink.link)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </VoltCard.Content>
            </VoltCard>
            {premiumConfirm && track && (
                <RewardTrackPremiumConfirmView
                    track={track}
                    pending={pendingPurchase === track.id}
                    onConfirm={() => purchasePremium && purchasePremium(track.id)}
                    onCancel={() => setPremiumConfirm(false)}
                />
            )}
        </>
    );
};
