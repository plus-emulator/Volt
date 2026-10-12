import { CSSProperties, FC } from 'react';
import { AchievementUtilities, IAchievementCategory } from '../../../api';
import { AchievementText } from '../AchievementText';

interface AchievementCategoryListItemViewProps {
    category: IAchievementCategory;
    /** AchievementController.getCategoryUnseenCount for this category. */
    unseenCount?: number;
    setSelectedCategoryCode: (code: string) => void;
}

export const AchievementsCategoryListItemView: FC<AchievementCategoryListItemViewProps> = (props) => {
    const { category = null, unseenCount = 0, setSelectedCategoryCode = null } = props;

    if (!category) {
        return (
            <div
                className="air-achievements-category-tile air-achievements-category-tile--empty"
                style={{
                    backgroundImage: `url(${AchievementUtilities.getAchievementImageUrl('achievement_category_bkg_empty_3')})`
                }}
                aria-hidden="true"
            />
        );
    }

    const progress = AchievementUtilities.getAchievementCategoryProgress(category);
    const maxProgress = AchievementUtilities.getAchievementCategoryMaxProgress(category);
    const getCategoryImage = AchievementUtilities.getAchievementCategoryImageUrl(category);
    const style = {
        '--air-achievement-category-background': `url(${AchievementUtilities.getAchievementImageUrl('achievement_background_active_1')})`,
        '--air-achievement-category-background-hover': `url(${AchievementUtilities.getAchievementImageUrl('achievement_background_active_2')})`
    } as CSSProperties;

    return (
        <button
            type="button"
            className={`air-achievements-category-tile${!AchievementUtilities.hasBundledCategoryImage(category) ? ' is-legacy-category' : ''}`}
            style={style}
            onClick={() => setSelectedCategoryCode(category.code)}
        >
            <span className="air-achievements-category-bg" aria-hidden="true" />
            <span className="air-achievements-category-content">
                <AchievementText text={AchievementUtilities.getAchievementCategoryName(category)} bold height={17} x={0} y={7} width={115} align="center" />
                <img
                    className="air-achievements-category-art"
                    src={getCategoryImage}
                    alt=""
                    draggable={false}
                    onError={(event) => (event.currentTarget.style.visibility = 'hidden')}
                />
                <AchievementText text={`${progress}/${maxProgress}`} bold color={0xffffff} height={14} x={0} y={70} width={115} align="center" />
            </span>
            {unseenCount > 0 && (
                <span className="air-achievements-unseen-count">
                    <AchievementText color={0xffffff} style={{ position: 'relative' }} text={String(unseenCount)} textStyle="u_bold" x={0} y={0} />
                </span>
            )}
        </button>
    );
};
