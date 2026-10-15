import { type AchievementData, GetLocalizationManager } from '@volt/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AchievementUtilities } from './AchievementUtilities';

const achievement = (overrides: Partial<Record<keyof AchievementData, unknown>> = {}): AchievementData =>
    ({
        achievementId: 1,
        badgeId: 'ACH_RoomEntry3',
        level: 3,
        levelCount: 10,
        finalLevel: false,
        levelRewardPoints: 30,
        levelRewardPointType: 0,
        displayMethod: 0,
        ...overrides
    }) as unknown as AchievementData;

const localization = {
    getPreviousLevelBadgeId: (badgeId: string) => badgeId.replace(/\d+$/, (level) => String(Math.max(1, Number(level) - 1))),
    getBadgeName: (badgeId: string) => (badgeId === 'ACH_RoomEntry2' ? 'Room Raider II' : ''),
    getBadgeDesc: (badgeId: string) => (badgeId === 'ACH_RoomEntry2' ? 'Visit 20 rooms' : '')
};

describe('AchievementUtilities', () => {
    beforeEach(() => {
        vi.mocked(GetLocalizationManager).mockReturnValue(localization as unknown as ReturnType<typeof GetLocalizationManager>);
    });

    afterEach(() => {
        vi.mocked(GetLocalizationManager).mockReset();
    });

    describe('getAchievementBadgeCode', () => {
        it('shows the badge of the level already reached', () => {
            expect(AchievementUtilities.getAchievementBadgeCode(achievement())).toBe('ACH_RoomEntry2');
        });

        it('shows the current badge at the final level or for a single-level achievement', () => {
            expect(AchievementUtilities.getAchievementBadgeCode(achievement({ finalLevel: true }))).toBe('ACH_RoomEntry3');
            expect(AchievementUtilities.getAchievementBadgeCode(achievement({ levelCount: 1, badgeId: 'ACH_Tutorial1', level: 1 }))).toBe('ACH_Tutorial1');
        });

        it('keeps level 1 when nothing is reached yet', () => {
            expect(AchievementUtilities.getAchievementBadgeCode(achievement({ badgeId: 'ACH_RoomEntry1', level: 1 }))).toBe('ACH_RoomEntry1');
        });
    });

    describe('isAchievementBadgeGreyscale', () => {
        it('greys the badge until level 1 is achieved', () => {
            expect(AchievementUtilities.isAchievementBadgeGreyscale(achievement({ level: 1 }))).toBe(true);
            expect(AchievementUtilities.isAchievementBadgeGreyscale(achievement({ level: 2 }))).toBe(false);
            expect(AchievementUtilities.isAchievementBadgeGreyscale(achievement({ level: 1, finalLevel: true }))).toBe(false);
        });
    });

    describe('shouldShowAchievementReward', () => {
        it('shows a reward of at least 1 below the final level', () => {
            expect(AchievementUtilities.shouldShowAchievementReward(achievement())).toBe(true);
            expect(AchievementUtilities.shouldShowAchievementReward(achievement({ levelRewardPoints: 1, levelRewardPointType: 5 }))).toBe(true);
        });

        it('hides it at the final level, for an amount below 1 or a negative type', () => {
            expect(AchievementUtilities.shouldShowAchievementReward(achievement({ finalLevel: true }))).toBe(false);
            expect(AchievementUtilities.shouldShowAchievementReward(achievement({ levelRewardPoints: 0 }))).toBe(false);
            expect(AchievementUtilities.shouldShowAchievementReward(achievement({ levelRewardPointType: -1 }))).toBe(false);
        });
    });

    describe('shouldShowAchievementProgress', () => {
        it('hides the level bar for display method 1 and at the final level', () => {
            expect(AchievementUtilities.shouldShowAchievementProgress(achievement())).toBe(true);
            expect(AchievementUtilities.shouldShowAchievementProgress(achievement({ displayMethod: 2 }))).toBe(true);
            expect(AchievementUtilities.shouldShowAchievementProgress(achievement({ displayMethod: 1 }))).toBe(false);
            expect(AchievementUtilities.shouldShowAchievementProgress(achievement({ finalLevel: true }))).toBe(false);
        });
    });

    describe('progress bar', () => {
        it('fills relative to the start of the level', () => {
            // scoreAtStartOfLevel 20, scoreLimit 60, current 35: 15 of 40 on the 180px bar
            expect(AchievementUtilities.getProgressBarWidth(180, 15, 40)).toBe(68);
            expect(AchievementUtilities.getProgressBarWidth(180, 40, 40)).toBe(180);
            expect(AchievementUtilities.getProgressBarWidth(180, -5, 40)).toBe(0);
            expect(AchievementUtilities.getProgressBarWidth(246, 0, 0)).toBe(0);
        });

        it('shows absolute values in its caption', () => {
            expect(AchievementUtilities.getProgressBarCaption(15, 40, 20)).toEqual({ progress: '35', limit: '60' });
            expect(AchievementUtilities.getProgressBarCaption(84, 1660)).toEqual({ progress: '84', limit: '1660' });
        });

        it('shows a floored percentage in percent mode', () => {
            expect(AchievementUtilities.getProgressBarCaption(2, 3, 0, true).progress).toBe('66');
        });
    });

    describe('badge texts', () => {
        it('reads the badge name and description', () => {
            expect(AchievementUtilities.getAchievementBadgeName('ACH_RoomEntry2')).toBe('Room Raider II');
            expect(AchievementUtilities.getAchievementBadgeDescription('ACH_RoomEntry2')).toBe('Visit 20 rooms');
        });

        it('stays empty for a badge without localization instead of showing the key', () => {
            expect(AchievementUtilities.getAchievementBadgeName('ACH_Unknown1')).toBe('');
            expect(AchievementUtilities.getAchievementBadgeDescription('ACH_Unknown1')).toBe('');
        });
    });
});
