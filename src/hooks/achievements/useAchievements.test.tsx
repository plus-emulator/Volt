import { act, cleanup, renderHook } from '@testing-library/react';
import { AchievementEvent, AchievementsEvent, AuthenticatedEvent, GetConfiguration, RequestAchievementsMessageComposer } from '@volt/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockEventDispatcher } from '../../volt-renderer.mock';

const sent = vi.hoisted(() => [] as unknown[]);

vi.mock('../../api/volt/SendMessageComposer', () => ({
    SendMessageComposer: (composer: unknown) => sent.push(composer)
}));

vi.mock('@/state/useSharedHook', () => ({
    registerSharedHook: () => {},
    useSharedHook: (hook: () => unknown) => hook()
}));

import { useAchievements } from './useAchievements';

class FakeAchievement {
    public achievementId = 0;
    public badgeId = '';
    public code = '';
    public category = '';
    public state = 1;
    public level = 1;
    public levelCount = 5;
    public finalLevel = false;
    public currentPoints = 0;
    public scoreLimit = 10;

    constructor(fields: Partial<FakeAchievement>) {
        Object.assign(this, fields);
    }

    public setMaxProgress(): void {
        this.currentPoints = this.scoreLimit;
    }
}

const achievement = (achievementId: number, category: string, fields: Partial<FakeAchievement> = {}) =>
    new FakeAchievement({ achievementId, category, code: `Code${achievementId}`, badgeId: `ACH_Code${achievementId}1`, ...fields });

// The mock's message events take no arguments; the real ones are only typed with their callback.
const dispatch = (EventClass: unknown, parser: unknown) =>
    act(() => {
        const event = new (EventClass as new () => object)();

        (event as unknown as { getParser: () => unknown }).getParser = () => parser;
        mockEventDispatcher.dispatchEvent(event as unknown as { type: string });
    });

const sendList = (achievements: FakeAchievement[], defaultCategory = '') => dispatch(AchievementsEvent, { achievements, defaultCategory });
const sendProgress = (entry: FakeAchievement) => dispatch(AchievementEvent, { achievement: entry });
const requests = () => sent.filter((composer) => composer instanceof RequestAchievementsMessageComposer).length;

const LIST = () => [achievement(1, 'identity'), achievement(2, 'identity'), achievement(3, 'pets'), achievement(4, 'social', { state: 2 })];

describe('useAchievements', () => {
    beforeEach(() => {
        sent.length = 0;
        vi.mocked(GetConfiguration).mockReturnValue({
            getValue: (_key: string, value: unknown) => value,
            definitions: new Map()
        } as unknown as ReturnType<typeof GetConfiguration>);
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.mocked(GetConfiguration).mockReset();
    });

    it('requests the list only when the window is first shown', () => {
        const { result } = renderHook(() => useAchievements());

        expect(requests()).toBe(0);

        act(() => result.current.show());

        expect(requests()).toBe(1);
        expect(result.current.isVisible).toBe(false);

        sendList(LIST(), 'pets');

        expect(result.current.isVisible).toBe(true);
        expect(result.current.achievementCategories.map((category) => category.code)).toEqual(['identity', 'pets', 'archive', 'wired_games']);
        // The window opens on the default category and its first achievement.
        expect(result.current.selectedCategory?.code).toBe('pets');
        expect(result.current.selectedAchievement?.achievementId).toBe(3);

        act(() => result.current.close());
        act(() => result.current.show());

        expect(requests()).toBe(1);
        expect(result.current.isVisible).toBe(true);
        expect(result.current.selectedCategory?.code).toBe('pets');
    });

    it('builds the categories once per session and ignores later lists', () => {
        const { result } = renderHook(() => useAchievements());

        act(() => result.current.show());
        sendList(LIST());

        const categories = result.current.achievementCategories;

        sendList([achievement(9, 'games')]);

        expect(result.current.achievementCategories).toBe(categories);
    });

    it('prefers a category link that arrived before the list over the default category', () => {
        const { result } = renderHook(() => useAchievements());

        act(() => result.current.show('identity'));
        sendList(LIST(), 'pets');

        expect(result.current.selectedCategory?.code).toBe('identity');
        expect(result.current.selectedAchievement?.achievementId).toBe(1);
    });

    it('ignores progress before the list and patches only known achievements after it', () => {
        const { result } = renderHook(() => useAchievements());

        sendProgress(achievement(1, 'identity', { level: 2 }));
        act(() => result.current.ensureAchievementsInitialized());
        sendList(LIST());

        expect(result.current.isVisible).toBe(false);
        expect(result.current.unseenAchievements.size).toBe(0);

        sendProgress(achievement(2, 'identity', { level: 3 }));
        sendProgress(achievement(99, 'identity', { level: 2 }));

        const identity = result.current.achievementCategories.find((category) => category.code === 'identity');

        expect(identity.achievements.map((entry) => [entry.achievementId, entry.level])).toEqual([
            [1, 1],
            [2, 3]
        ]);
        expect([...result.current.unseenAchievements.keys()]).toEqual([2, 99]);
    });

    it('marks updates unseen unless shown, and clears them on Back and on close', () => {
        const { result } = renderHook(() => useAchievements());

        act(() => result.current.show('identity'));
        sendList(LIST());

        // Achievement 1 is shown in the details: its update is not unseen.
        sendProgress(achievement(1, 'identity', { currentPoints: 4 }));
        sendProgress(achievement(2, 'identity', { currentPoints: 4 }));
        sendProgress(achievement(3, 'pets', { currentPoints: 4 }));

        expect([...result.current.unseenAchievements.keys()]).toEqual([2, 3]);
        expect(result.current.selectedAchievement?.currentPoints).toBe(4);

        act(() => result.current.goBack());

        expect([...result.current.unseenAchievements.keys()]).toEqual([3]);
        expect(result.current.selectedCategory).toBeNull();

        act(() => result.current.close());

        expect(result.current.unseenAchievements.size).toBe(0);
    });

    it('fills the shown level first and switches to the next level after 2 seconds', () => {
        vi.useFakeTimers();

        const { result } = renderHook(() => useAchievements());

        act(() => result.current.show('identity'));
        sendList(LIST());
        sendProgress(achievement(1, 'identity', { level: 2, currentPoints: 0, scoreLimit: 20 }));

        expect(result.current.selectedAchievement?.level).toBe(1);
        expect(result.current.selectedAchievement?.currentPoints).toBe(10);

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(result.current.selectedAchievement?.level).toBe(2);
        expect(result.current.selectedCategory?.achievements[0].level).toBe(2);
    });

    it('starts a new session on authentication without requesting the list', () => {
        const { result } = renderHook(() => useAchievements());

        act(() => result.current.show());
        sendList(LIST());
        dispatch(AuthenticatedEvent, {});

        expect(result.current.isLoaded).toBe(false);
        expect(result.current.isVisible).toBe(false);
        expect(result.current.achievementCategories).toEqual([]);
        expect(requests()).toBe(1);
    });
});
