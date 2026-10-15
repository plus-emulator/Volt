import { FC } from 'react';
import { AchievementCategory, getAchievementListLayout } from '../../api';
import { useAchievements } from '../../hooks';
import { AchievementDetailsView } from './AchievementDetailsView';
import { AchievementListView } from './achievement-list';

interface AchievementCategoryViewProps {
    category: AchievementCategory;
}

export const AchievementCategoryView: FC<AchievementCategoryViewProps> = (props) => {
    const { category = null } = props;
    const { selectedAchievement = null, visibleAchievements = [] } = useAchievements();

    if (!category) return null;

    // The column count and scrollbar follow the whole category, the tiles only the achievements it shows.
    const layout = getAchievementListLayout(category.achievements.length, visibleAchievements.length);

    return (
        <div className="air-achievements-category-body">
            <AchievementListView achievements={visibleAchievements} layout={layout} />
            {!!selectedAchievement && <AchievementDetailsView achievement={selectedAchievement} />}
        </div>
    );
};
