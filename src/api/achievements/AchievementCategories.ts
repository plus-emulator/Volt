import type { AchievementData } from '@volt/renderer';
import { AchievementCategory } from './AchievementCategory';
import { IAchievementCategory } from './IAchievementCategory';

// The official achievements window (WIN63-202609161723 com.sulake.habbo.quest.AchievementCategories /
// AchievementCategory / AchievementController). The client has no fixed category list: it is built once per
// session from the first Achievements (1487) packet and later only patched by AchievementProgressed (1049).

/** Achievement states (AchievementCategories.as: ACHIEVEMENT_ARCHIVED, ACHIEVEMENT_CONTROL_BY_WIRED). */
export const ACHIEVEMENT_STATE_ARCHIVED = 2;
export const ACHIEVEMENT_STATE_CONTROL_BY_WIRED = 4;

export const ACHIEVEMENT_CATEGORY_ARCHIVE = 'archive';
export const ACHIEVEMENT_CATEGORY_NEW = 'new';
export const ACHIEVEMENT_CATEGORY_WIRED_GAMES = 'wired_games';
export const ACHIEVEMENT_CATEGORY_MISC = 'misc';

/** AchievementController.CATEGORIES_COLUMN_COUNT / CATEGORY_ROWS_MAX. */
export const ACHIEVEMENT_CATEGORY_COLUMNS = 3;
export const ACHIEVEMENT_CATEGORY_ROWS = 3;

/** AchievementController.ACHIEVEMENT_COLUMNS / ACHIEVEMENT_ROWS_MIN; one column less once the list scrolls. */
export const ACHIEVEMENT_LIST_COLUMNS = 6;
export const ACHIEVEMENT_LIST_SCROLL_COLUMNS = 5;
export const ACHIEVEMENT_LIST_ROWS_MIN = 2;
export const ACHIEVEMENT_LIST_SCROLL_THRESHOLD = 24;

/** getNewAchievementCodes: the `achievements.new` external variable split on commas, empty entries included. */
export const getNewAchievementCodes = (value: string): string[] => (value ?? '').split(',');

/**
 * The AchievementCategories constructor: categories in order of first appearance, then misc, archive and
 * wired_games (both always present, even when empty) and finally "new" when any achievement code is listed in
 * `achievements.new`. Achievements without a category are dropped, wired-controlled ones are only kept in
 * wired_games, and archived ones go to the archive whatever their category.
 */
export const buildAchievementCategories = (achievements: readonly AchievementData[], newCodes: readonly string[]): AchievementCategory[] => {
    const byCode = new Map<string, AchievementCategory>();
    const ordered: AchievementCategory[] = [];
    const archive = new AchievementCategory(ACHIEVEMENT_CATEGORY_ARCHIVE);
    const wiredGames = new AchievementCategory(ACHIEVEMENT_CATEGORY_WIRED_GAMES);
    const newAchievements: AchievementData[] = [];
    let misc: AchievementCategory = null;

    byCode.set(archive.code, archive);
    byCode.set(wiredGames.code, wiredGames);

    for (const achievement of achievements ?? []) {
        if (!achievement || achievement.category === '' || achievement.category == null) continue;
        if (achievement.state === ACHIEVEMENT_STATE_CONTROL_BY_WIRED && achievement.category !== ACHIEVEMENT_CATEGORY_WIRED_GAMES) continue;

        let category = achievement.state === ACHIEVEMENT_STATE_ARCHIVED ? archive : byCode.get(achievement.category);

        if (!category) {
            category = new AchievementCategory(achievement.category);
            byCode.set(achievement.category, category);

            if (achievement.category !== ACHIEVEMENT_CATEGORY_MISC) ordered.push(category);
            else misc = category;
        }

        category.achievements.push(achievement);

        if (newCodes.includes(achievement.code)) newAchievements.push(achievement);
    }

    if (misc) ordered.push(misc);

    ordered.push(archive, wiredGames);

    if (newAchievements.length) {
        const category = new AchievementCategory(ACHIEVEMENT_CATEGORY_NEW);

        category.achievements = newAchievements;
        ordered.push(category);
    }

    return ordered;
};

const replaceInCategory = (category: AchievementCategory, matches: (entry: AchievementData) => boolean, achievement: AchievementData): AchievementCategory => {
    if (!category.achievements.some(matches)) return category;

    const next = new AchievementCategory(category.code);

    next.achievements = category.achievements.map((entry) => (matches(entry) ? achievement : entry));

    return next;
};

/**
 * AchievementCategories.update: the entry with the same id is replaced in the category named by the achievement's
 * own category code and in "new". An achievement the first list did not carry is not added, and one shown in the
 * archive is not refreshed there (its category code is not "archive").
 */
export const updateAchievementCategories = (categories: AchievementCategory[], achievement: AchievementData): AchievementCategory[] => {
    if (!categories || !achievement || !achievement.category) return categories;

    let changed = false;
    const next = categories.map((category) => {
        if (category.code !== achievement.category && category.code !== ACHIEVEMENT_CATEGORY_NEW) return category;

        const updated = replaceInCategory(category, (entry) => entry.achievementId === achievement.achievementId, achievement);

        if (updated !== category) changed = true;

        return updated;
    });

    return changed ? next : categories;
};

/** Swaps one achievement object for another wherever it is listed: the immutable form of mutating it in place. */
export const replaceAchievementInCategories = (
    categories: AchievementCategory[],
    previous: AchievementData,
    achievement: AchievementData
): AchievementCategory[] => {
    if (!categories || !previous || previous === achievement) return categories;

    let changed = false;
    const next = categories.map((category) => {
        const updated = replaceInCategory(category, (entry) => entry === previous, achievement);

        if (updated !== category) changed = true;

        return updated;
    });

    return changed ? next : categories;
};

export const getAchievementCategoryByCode = <T extends IAchievementCategory>(categories: readonly T[], code: string): T => {
    if (!categories || code == null) return null;

    return categories.find((category) => category.code === code) ?? null;
};

/** AchievementCategory.visibleInList: "new" and wired_games never get a tile. */
export const isAchievementCategoryVisibleInList = (category: IAchievementCategory): boolean =>
    category.code !== ACHIEVEMENT_CATEGORY_NEW && category.code !== ACHIEVEMENT_CATEGORY_WIRED_GAMES;

export type AchievementCategoryGridSlot =
    | { kind: 'category'; category: IAchievementCategory }
    /** An empty tile padding the grid to three rows. */
    | { kind: 'empty' }
    /** The cell of a hidden category: AIR places tiles by list index and creates none there. */
    | { kind: 'hole' };

/**
 * AchievementController.refreshCategoryList / refreshCategoryEntry: each category sits at its own list index in a
 * three-column grid, hidden categories leave their cell empty, and indexes past the list get an empty tile while
 * they are in the first three rows. Trailing holes are dropped: AIR sizes the grid to its lowest visible tile.
 */
export const getAchievementCategoryGridSlots = (categories: readonly IAchievementCategory[]): AchievementCategoryGridSlot[] => {
    const slots: AchievementCategoryGridSlot[] = [];
    const list = categories ?? [];

    for (let index = 0; ; index++) {
        if (index < list.length) {
            slots.push(isAchievementCategoryVisibleInList(list[index]) ? { kind: 'category', category: list[index] } : { kind: 'hole' });
            continue;
        }

        if (Math.floor(index / ACHIEVEMENT_CATEGORY_COLUMNS) >= ACHIEVEMENT_CATEGORY_ROWS) break;

        slots.push({ kind: 'empty' });
    }

    while (slots.length && slots[slots.length - 1].kind === 'hole') slots.pop();

    return slots;
};

/** AchievementCategories.getProgress / getMaxProgress: the sum over every category, the hidden ones included. */
export const getAchievementCategoriesProgress = (categories: readonly AchievementCategory[]): number =>
    (categories ?? []).reduce((total, category) => total + category.getProgress(), 0);

export const getAchievementCategoriesMaxProgress = (categories: readonly AchievementCategory[]): number =>
    (categories ?? []).reduce((total, category) => total + category.getMaxProgress(), 0);

/** AchievementController.achievementIsVisible: wired_games only lists the WF_ achievements enabled in the room. */
export const isAchievementVisibleInCategory = (
    categoryCode: string,
    achievement: Pick<AchievementData, 'code'>,
    wiredAchievementsInRoom: readonly string[]
): boolean => {
    if (categoryCode !== ACHIEVEMENT_CATEGORY_WIRED_GAMES) return true;

    const code = achievement.code ?? '';

    if (!code.startsWith('WF_')) return false;

    return wiredAchievementsInRoom.includes(code.substring(3));
};

export interface AchievementListLayout {
    columns: number;
    isScrollable: boolean;
    /** Tiles drawn: every visible achievement, padded with empty tiles to two rows. */
    slotCount: number;
}

/**
 * AchievementController.refreshAchievementList: six columns, or five plus the scrollbar when the category holds
 * more than 24 achievements; empty tiles pad the list to two rows.
 */
export const getAchievementListLayout = (categoryAchievementCount: number, visibleAchievementCount: number): AchievementListLayout => {
    const isScrollable = categoryAchievementCount > ACHIEVEMENT_LIST_SCROLL_THRESHOLD;
    const columns = isScrollable ? ACHIEVEMENT_LIST_SCROLL_COLUMNS : ACHIEVEMENT_LIST_COLUMNS;

    return { columns, isScrollable, slotCount: Math.max(visibleAchievementCount, columns * ACHIEVEMENT_LIST_ROWS_MIN) };
};

/** AchievementController.getCategoryUnseenCount: unseen updates counted by the achievement's own category code. */
export const getAchievementCategoryUnseenCount = (unseen: ReadonlyMap<number, Pick<AchievementData, 'category'>>, categoryCode: string): number => {
    let count = 0;

    for (const achievement of unseen.values()) if (achievement.category === categoryCode) count++;

    return count;
};

/** AchievementController.onBack: leaving a category marks its unseen updates as seen. */
export const removeUnseenAchievementsOfCategory = (
    unseen: ReadonlyMap<number, AchievementData>,
    categoryCode: string
): ReadonlyMap<number, AchievementData> => {
    if (![...unseen.values()].some((achievement) => achievement.category === categoryCode)) return unseen;

    return new Map([...unseen].filter(([, achievement]) => achievement.category !== categoryCode));
};
