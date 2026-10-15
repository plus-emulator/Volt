import { AchievementData, GetLocalizationManager } from '@volt/renderer';
import { GetConfigurationValue, GetOptionalConfigurationValue } from '../volt';
import { getQuestingImageUrl } from '../quests/QuestUtilities';
import { LocalizeText } from '../utils/LocalizeText';
import { IAchievementCategory } from './IAchievementCategory';

const achievementImages = import.meta.glob('../../assets/images/achievements/*.png', { eager: true, import: 'default' });

export class AchievementUtilities {
    public static getAchievementCategoryName(category: IAchievementCategory): string {
        return LocalizeText(`quests.${category.code}.name`);
    }

    /** AchievementController.getAchievedBadgeId: the badge of the level already reached, the current one only for single-level or final-level achievements. */
    public static getAchievementBadgeCode(achievement: AchievementData): string {
        if (!achievement) return null;

        if (achievement.levelCount === 1 || achievement.finalLevel) return achievement.badgeId;

        return GetLocalizationManager().getPreviousLevelBadgeId(achievement.badgeId);
    }

    /** The details name field: HabboLocalizationManager.getBadgeName, empty when the badge has no text (no key fallback). */
    public static getAchievementBadgeName(badgeCode: string): string {
        if (!badgeCode) return '';

        return GetLocalizationManager().getBadgeName(badgeCode) || '';
    }

    /** The details description field: HabboLocalizationManager.getBadgeDesc, empty when the badge has no text. */
    public static getAchievementBadgeDescription(badgeCode: string): string {
        if (!badgeCode) return '';

        return GetLocalizationManager().getBadgeDesc(badgeCode) || '';
    }

    /** refreshBadgeImage / refreshBadgeImageLarge: greyscale until the first level is achieved. */
    public static isAchievementBadgeGreyscale(achievement: AchievementData): boolean {
        return !AchievementUtilities.getAchievementHasStarted(achievement);
    }

    /** HabboQuestEngine.refreshReward(!finalLevel, …): hidden at the final level, for a negative type or an amount below 1. */
    public static shouldShowAchievementReward(achievement: AchievementData): boolean {
        if (!achievement || achievement.finalLevel) return false;

        return achievement.levelRewardPointType >= 0 && achievement.levelRewardPoints >= 1;
    }

    /** refreshAchievementDetails: the level progress bar is hidden for display method 1 and at the final level. */
    public static shouldShowAchievementProgress(achievement: AchievementData): boolean {
        if (!achievement) return false;

        return achievement.displayMethod !== 1 && !achievement.finalLevel;
    }

    /** ProgressBar.getProgressWidth: the fill width for an amount relative to the bar's maximum. */
    public static getProgressBarWidth(barWidth: number, amount: number, maxAmount: number): number {
        if (!(maxAmount > 0)) return 0;

        return Math.max(0, Math.round((barWidth * amount) / maxAmount));
    }

    /**
     * ProgressBar.updateView caption parameters: the bar fills relative to the start of the level while the text shows
     * absolute scores (amount + scoreAtStartOfLevel of maxAmount + scoreAtStartOfLevel), or floor(100 * amount / max).
     */
    public static getProgressBarCaption(
        amount: number,
        maxAmount: number,
        scoreAtStartOfLevel: number = 0,
        percent: boolean = false
    ): { progress: string; limit: string } {
        if (percent) return { progress: String(Math.floor((amount / maxAmount) * 100)), limit: String(maxAmount) };

        return { progress: String(amount + scoreAtStartOfLevel), limit: String(maxAmount + scoreAtStartOfLevel) };
    }

    public static getAchievementImageUrl(imageName: string): string {
        const bundledImage = achievementImages[`../../assets/images/achievements/${imageName}.png`];
        if (bundledImage) return bundledImage;

        return getQuestingImageUrl(imageName);
    }

    public static hasBundledCategoryImage(category: IAchievementCategory): boolean {
        return !!achievementImages[`../../assets/images/achievements/ach_category_${category.code}.png`];
    }

    public static getAchievementCategoryImageUrl(category: IAchievementCategory, icon: boolean = false): string {
        const imageName = `${icon ? 'achicon_' : 'ach_category_'}${category.code}`;

        return AchievementUtilities.getAchievementImageUrl(imageName);
    }

    public static getAchievementCategoryMaxProgress(category: IAchievementCategory): number {
        if (!category) return 0;

        let progress = 0;

        for (const achievement of category.achievements) {
            progress += achievement.levelCount;
        }

        return progress;
    }

    public static getAchievementCategoryProgress(category: IAchievementCategory): number {
        if (!category) return 0;

        let progress = 0;

        for (const achievement of category.achievements) progress += achievement.finalLevel ? achievement.level : achievement.level - 1;

        return progress;
    }

    public static getAchievementHasStarted(achievement: AchievementData): boolean {
        if (!achievement) return false;

        if (achievement.finalLevel || achievement.level - 1 > 0) return true;

        return false;
    }

    public static getAchievementIsIgnored(achievement: AchievementData): boolean {
        if (!achievement) return false;

        const ignored = GetConfigurationValue<string[]>('achievements.unseen.ignored', []);
        const skipped = GetOptionalConfigurationValue<string>('toolbar.unseen_notification.skipped_badge_ids', '').split(',').filter(Boolean);

        return ignored.includes(achievement.badgeId.replace(/[0-9]/g, '')) || skipped.some((code) => achievement.badgeId.includes(code));
    }

    public static getAchievementLevel(achievement: AchievementData): number {
        if (!achievement) return 0;

        if (achievement.finalLevel) return achievement.level;

        return achievement.level - 1;
    }
}
