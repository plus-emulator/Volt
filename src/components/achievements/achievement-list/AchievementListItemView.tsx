import { AchievementData } from '@volt/renderer';
import { CSSProperties, FC } from 'react';
import { AchievementUtilities } from '../../../api';
import { useAchievements } from '../../../hooks';
import { AchievementBadgeView } from '../AchievementBadgeView';

interface AchievementListItemViewProps {
    achievement: AchievementData | null;
}

export const AchievementListItemView: FC<AchievementListItemViewProps> = (props) => {
    const { achievement = null } = props;
    const { selectedAchievement = null, selectAchievement = null, unseenAchievements = null } = useAchievements();

    if (!achievement) {
        return (
            <div
                className="air-achievement-tile air-achievement-tile--empty"
                style={
                    {
                        '--air-achievement-tile-background': `url(${AchievementUtilities.getAchievementImageUrl('achievement_inactive')})`
                    } as CSSProperties
                }
                aria-hidden="true"
            />
        );
    }

    // AchievementController.refreshAchievementEntry: the selection is the shown achievement object, and an achievement
    // updated while not shown keeps the 0xc4ff7f tint until it is seen.
    const isSelected = selectedAchievement === achievement;
    const isUnseen = !!unseenAchievements?.has(achievement.achievementId);

    return (
        <button
            type="button"
            className={`air-achievement-tile${isSelected ? ' is-selected' : ''}${isUnseen ? ' is-unseen' : ''}`}
            style={
                {
                    '--air-achievement-tile-background': `url(${AchievementUtilities.getAchievementImageUrl(
                        isSelected ? 'achievement_active' : 'achievement_inactive'
                    )})`
                } as CSSProperties
            }
            onClick={() => selectAchievement(achievement)}
        >
            <AchievementBadgeView achievement={achievement} className="air-achievement-tile-badge" />
        </button>
    );
};
