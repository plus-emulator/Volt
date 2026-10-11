import type { AchievementData } from '@volt/renderer';
import { describe, expect, it } from 'vitest';
import {
    buildAchievementCategories,
    getAchievementCategoriesMaxProgress,
    getAchievementCategoriesProgress,
    getAchievementCategoryByCode,
    getAchievementCategoryGridSlots,
    getAchievementCategoryUnseenCount,
    getAchievementListLayout,
    getNewAchievementCodes,
    isAchievementVisibleInCategory,
    removeUnseenAchievementsOfCategory,
    replaceAchievementInCategories,
    updateAchievementCategories
} from './AchievementCategories';
import { AchievementCategory } from './AchievementCategory';

interface Fixture {
    achievementId: number;
    code: string;
    badgeId: string;
    category: string;
    state: number;
    level: number;
    finalLevel: boolean;
    levelCount: number;
}

const achievement = (achievementId: number, category: string, overrides: Partial<Fixture> = {}): AchievementData => {
    const code = overrides.code ?? `Code${achievementId}`;

    return {
        achievementId,
        code,
        badgeId: `ACH_${code}1`,
        category,
        state: 1,
        level: 1,
        finalLevel: false,
        levelCount: 5,
        ...overrides
    } as unknown as AchievementData;
};

const codes = (categories: { code: string }[]) => categories.map((category) => category.code);
const ids = (category: { achievements: AchievementData[] }) => category.achievements.map((entry) => entry.achievementId);

describe('buildAchievementCategories', () => {
    it('orders categories by first appearance, then misc, archive and wired_games', () => {
        const categories = buildAchievementCategories(
            [achievement(1, 'identity'), achievement(2, 'misc'), achievement(3, 'explore'), achievement(4, 'identity'), achievement(5, 'social')],
            ['']
        );

        expect(codes(categories)).toEqual(['identity', 'explore', 'social', 'misc', 'archive', 'wired_games']);
        expect(ids(getAchievementCategoryByCode(categories, 'identity'))).toEqual([1, 4]);
    });

    it('always lists archive and wired_games, even empty', () => {
        const categories = buildAchievementCategories([achievement(1, 'games')], []);

        expect(codes(categories)).toEqual(['games', 'archive', 'wired_games']);
        expect(getAchievementCategoryByCode(categories, 'archive').achievements).toEqual([]);
    });

    it('skips achievements without a category', () => {
        const categories = buildAchievementCategories([achievement(1, ''), achievement(2, 'pets')], []);

        expect(codes(categories)).toEqual(['pets', 'archive', 'wired_games']);
    });

    it('moves archived achievements (state 2) to the archive without creating their category', () => {
        const categories = buildAchievementCategories(
            [achievement(1, 'social', { state: 2 }), achievement(2, 'pets'), achievement(3, 'pets', { state: 2 })],
            []
        );

        expect(codes(categories)).toEqual(['pets', 'archive', 'wired_games']);
        expect(ids(getAchievementCategoryByCode(categories, 'archive'))).toEqual([1, 3]);
        expect(ids(getAchievementCategoryByCode(categories, 'pets'))).toEqual([2]);
    });

    it('drops wired-controlled achievements (state 4) outside wired_games', () => {
        const categories = buildAchievementCategories(
            [achievement(1, 'games', { state: 4 }), achievement(2, 'wired_games', { state: 4, code: 'WF_Points' }), achievement(3, 'games')],
            []
        );

        expect(ids(getAchievementCategoryByCode(categories, 'games'))).toEqual([3]);
        expect(ids(getAchievementCategoryByCode(categories, 'wired_games'))).toEqual([2]);
    });

    it('keeps disabled and off-season achievements (states 0 and 3) in their category', () => {
        const categories = buildAchievementCategories([achievement(1, 'games', { state: 0 }), achievement(2, 'games', { state: 3 })], []);

        expect(ids(getAchievementCategoryByCode(categories, 'games'))).toEqual([1, 2]);
    });

    it('appends a "new" category last with every listed code, archived ones included', () => {
        const categories = buildAchievementCategories(
            [
                achievement(1, 'identity', { code: 'HabbiconUsed' }),
                achievement(2, 'misc'),
                achievement(3, 'social', { code: 'TraderPass', state: 2 }),
                achievement(4, 'games', { code: 'Other', state: 4 })
            ],
            getNewAchievementCodes('RewardTracksCompleted,HabbiconUsed,TraderPass,Other')
        );

        expect(codes(categories)).toEqual(['identity', 'misc', 'archive', 'wired_games', 'new']);
        expect(ids(getAchievementCategoryByCode(categories, 'new'))).toEqual([1, 3]);
    });

    it('creates no "new" category when no code matches', () => {
        expect(codes(buildAchievementCategories([achievement(1, 'identity')], getNewAchievementCodes('')))).toEqual(['identity', 'archive', 'wired_games']);
    });
});

describe('updateAchievementCategories', () => {
    const build = () =>
        buildAchievementCategories(
            [achievement(1, 'identity', { code: 'HabbiconUsed' }), achievement(2, 'identity'), achievement(3, 'social', { state: 2 })],
            ['HabbiconUsed']
        );

    it('replaces the entry in its category and in "new"', () => {
        const categories = build();
        const updated = achievement(1, 'identity', { code: 'HabbiconUsed', level: 3 });
        const next = updateAchievementCategories(categories, updated);

        expect(getAchievementCategoryByCode(next, 'identity').achievements[0]).toBe(updated);
        expect(getAchievementCategoryByCode(next, 'new').achievements[0]).toBe(updated);
        expect(getAchievementCategoryByCode(next, 'identity').achievements[1]).toBe(getAchievementCategoryByCode(categories, 'identity').achievements[1]);
        expect(getAchievementCategoryByCode(categories, 'identity').achievements[0].level).toBe(1);
    });

    it('does not add an achievement the first list did not carry', () => {
        const categories = build();

        expect(updateAchievementCategories(categories, achievement(99, 'identity'))).toBe(categories);
        expect(updateAchievementCategories(categories, achievement(98, 'pets'))).toBe(categories);
    });

    it('does not refresh an archived entry, whose category code is not "archive"', () => {
        const categories = build();
        const next = updateAchievementCategories(categories, achievement(3, 'social', { state: 2, level: 4 }));

        expect(next).toBe(categories);
        expect(getAchievementCategoryByCode(next, 'archive').achievements[0].level).toBe(1);
    });

    it('ignores an update without a category', () => {
        const categories = build();

        expect(updateAchievementCategories(categories, achievement(1, ''))).toBe(categories);
    });
});

describe('replaceAchievementInCategories', () => {
    it('swaps the same object wherever it is listed, the archive included', () => {
        const archived = achievement(3, 'social', { state: 2, code: 'TraderPass' });
        const categories = buildAchievementCategories([achievement(1, 'identity'), archived], ['TraderPass']);
        const completed = achievement(3, 'social', { state: 2, code: 'TraderPass', level: 9 });
        const next = replaceAchievementInCategories(categories, archived, completed);

        expect(getAchievementCategoryByCode(next, 'archive').achievements[0]).toBe(completed);
        expect(getAchievementCategoryByCode(next, 'new').achievements[0]).toBe(completed);
        expect(getAchievementCategoryByCode(next, 'identity')).toBe(getAchievementCategoryByCode(categories, 'identity'));
    });
});

describe('getAchievementCategoryGridSlots', () => {
    const categoriesOf = (...list: string[]) => list.map((code) => new AchievementCategory(code));
    const kinds = (categories: AchievementCategory[]) =>
        getAchievementCategoryGridSlots(categories).map((slot) => (slot.kind === 'category' ? slot.category.code : slot.kind));

    it('lays out the nine official categories plus the archive without padding', () => {
        const categories = categoriesOf(
            'identity',
            'explore',
            'social',
            'pets',
            'games',
            'room_builder',
            'crackables',
            'crafting',
            'collectibles',
            'archive',
            'wired_games'
        );

        expect(kinds(categories)).toEqual([
            'identity',
            'explore',
            'social',
            'pets',
            'games',
            'room_builder',
            'crackables',
            'crafting',
            'collectibles',
            'archive'
        ]);
    });

    it('pads the first three rows with empty tiles after the hidden categories', () => {
        expect(kinds(categoriesOf('identity', 'social', 'archive', 'wired_games', 'new'))).toEqual([
            'identity',
            'social',
            'archive',
            'hole',
            'hole',
            'empty',
            'empty',
            'empty',
            'empty'
        ]);
    });

    it('drops trailing holes so a hidden category never adds a row', () => {
        expect(kinds(categoriesOf('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'archive', 'wired_games', 'new'))).toEqual([
            'a',
            'b',
            'c',
            'd',
            'e',
            'f',
            'g',
            'h',
            'archive'
        ]);
        expect(kinds(categoriesOf('a', 'b', 'c', 'd', 'e', 'f', 'g', 'archive', 'wired_games'))).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'archive']);
    });

    it('shows nine empty tiles before the list exists', () => {
        expect(kinds([])).toEqual(Array(9).fill('empty'));
    });
});

describe('category totals', () => {
    it('sums every category, so "new" achievements count twice like the official footer', () => {
        const categories = buildAchievementCategories(
            [
                achievement(1, 'identity', { code: 'HabbiconUsed', level: 3, levelCount: 5 }),
                achievement(2, 'identity', { level: 5, finalLevel: true, levelCount: 5 }),
                achievement(3, 'wired_games', { level: 2, levelCount: 4 })
            ],
            ['HabbiconUsed']
        );

        // identity: (3 - 1) + 5 of 10, wired_games: 1 of 4, new: 2 of 5
        expect(getAchievementCategoriesProgress(categories)).toBe(10);
        expect(getAchievementCategoriesMaxProgress(categories)).toBe(19);
    });
});

describe('isAchievementVisibleInCategory', () => {
    it('lists every achievement outside wired_games', () => {
        expect(isAchievementVisibleInCategory('games', achievement(1, 'games', { code: 'GamePlayed' }), [])).toBe(true);
    });

    it('lists only the WF_ achievements the room enables in wired_games', () => {
        expect(isAchievementVisibleInCategory('wired_games', achievement(1, 'wired_games', { code: 'WF_Points' }), ['Points'])).toBe(true);
        expect(isAchievementVisibleInCategory('wired_games', achievement(2, 'wired_games', { code: 'WF_Points' }), ['Laps'])).toBe(false);
        expect(isAchievementVisibleInCategory('wired_games', achievement(3, 'wired_games', { code: 'Points' }), ['Points'])).toBe(false);
    });
});

describe('getAchievementListLayout', () => {
    it('uses six columns padded to two rows up to 24 achievements', () => {
        expect(getAchievementListLayout(3, 3)).toEqual({ columns: 6, isScrollable: false, slotCount: 12 });
        expect(getAchievementListLayout(13, 13)).toEqual({ columns: 6, isScrollable: false, slotCount: 13 });
        expect(getAchievementListLayout(24, 24)).toEqual({ columns: 6, isScrollable: false, slotCount: 24 });
    });

    it('switches to five columns and the scrollbar above 24 achievements in the category', () => {
        expect(getAchievementListLayout(25, 25)).toEqual({ columns: 5, isScrollable: true, slotCount: 25 });
        expect(getAchievementListLayout(30, 2)).toEqual({ columns: 5, isScrollable: true, slotCount: 10 });
    });
});

describe('unseen achievements', () => {
    const unseen = new Map<number, AchievementData>([
        [1, achievement(1, 'social')],
        [2, achievement(2, 'social', { state: 2 })],
        [3, achievement(3, 'pets')]
    ]);

    it('counts unseen updates by the achievement category code, archived ones included', () => {
        expect(getAchievementCategoryUnseenCount(unseen, 'social')).toBe(2);
        expect(getAchievementCategoryUnseenCount(unseen, 'archive')).toBe(0);
        expect(getAchievementCategoryUnseenCount(unseen, 'pets')).toBe(1);
    });

    it('clears only the left category on Back', () => {
        expect([...removeUnseenAchievementsOfCategory(unseen, 'social').keys()]).toEqual([3]);
        expect(removeUnseenAchievementsOfCategory(unseen, 'games')).toBe(unseen);
    });
});
