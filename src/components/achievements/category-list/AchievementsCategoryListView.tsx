import { AchievementData } from '@volt/renderer';
import { FC } from 'react';
import { getAchievementCategoryGridSlots, getAchievementCategoryUnseenCount, IAchievementCategory } from '../../../api';
import { AchievementsCategoryListItemView } from './AchievementsCategoryListItemView';

interface AchievementsCategoryListViewProps {
    categories: IAchievementCategory[];
    unseenAchievements: ReadonlyMap<number, AchievementData>;
    setSelectedCategoryCode: (code: string) => void;
}

export const AchievementsCategoryListView: FC<AchievementsCategoryListViewProps> = (props) => {
    const { categories = [], unseenAchievements, setSelectedCategoryCode = null } = props;

    return (
        <div className="air-achievements-categories">
            {getAchievementCategoryGridSlots(categories).map((slot, index) => {
                if (slot.kind === 'hole') return <div key={`hole-${index}`} className="air-achievements-category-hole" aria-hidden="true" />;

                const category = slot.kind === 'category' ? slot.category : null;

                return (
                    <AchievementsCategoryListItemView
                        key={category?.code ?? `empty-${index}`}
                        category={category}
                        unseenCount={category && unseenAchievements ? getAchievementCategoryUnseenCount(unseenAchievements, category.code) : 0}
                        setSelectedCategoryCode={setSelectedCategoryCode}
                    />
                );
            })}
        </div>
    );
};
