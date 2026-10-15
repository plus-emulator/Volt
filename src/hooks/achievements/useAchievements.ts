import {
    AchievementData,
    AchievementEvent,
    AchievementsEvent,
    AchievementsScoreEvent,
    AuthenticatedEvent,
    RequestAchievementsMessageComposer,
    RoomSessionEvent,
    WiredEnvironmentEvent
} from '@volt/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    AchievementCategory,
    AchievementUtilities,
    buildAchievementCategories,
    GetOptionalConfigurationValue,
    getAchievementCategoriesMaxProgress,
    getAchievementCategoriesProgress,
    getAchievementCategoryByCode,
    getNewAchievementCodes,
    isAchievementVisibleInCategory,
    removeUnseenAchievementsOfCategory,
    replaceAchievementInCategories,
    SendMessageComposer,
    updateAchievementCategories
} from '../../api';
import { useMessageEvent, useVoltEvent } from '../events';

/** AchievementController.var_1540: a level-up of the shown achievement first fills its bar, then switches after 2s. */
const PENDING_LEVEL_DELAY = 2000;

const NO_UNSEEN: ReadonlyMap<number, AchievementData> = new Map();

const withMaxProgress = (achievement: AchievementData): AchievementData => {
    const completed = Object.assign(Object.create(Object.getPrototypeOf(achievement)), achievement) as AchievementData;

    completed.setMaxProgress();

    return completed;
};

// The official AchievementController (WIN63-202609161723 com.sulake.habbo.quest.AchievementController):
// - the list is requested only when the window is first shown (or by ensureAchievementsInitialized) and the
//   categories are built once per session from that first Achievements (1487) packet; later 1487s are ignored;
// - AchievementProgressed (1049) patches the categories (AchievementCategories.update), is ignored before the list
//   exists, and records the achievement as unseen unless it is the one shown in the details;
// - unseen updates are cleared per category on Back and all together when the window closes.
const useAchievementsState = () => {
    const [categories, setCategories] = useState<AchievementCategory[]>(null);
    const [unseenAchievements, setUnseenAchievements] = useState<ReadonlyMap<number, AchievementData>>(NO_UNSEEN);
    const [isVisible, setIsVisible] = useState(false);
    const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>(null);
    const [selectedAchievement, setSelectedAchievement] = useState<AchievementData>(null);
    const [achievementScore, setAchievementScore] = useState(0);
    const [enabledWiredAchievements, setEnabledWiredAchievements] = useState<string[]>([]);
    // Handlers can run back to back before a render, so they read the latest categories and selection from refs.
    const categoriesRef = useRef<AchievementCategory[]>(null);
    const selectedAchievementRef = useRef<AchievementData>(null);
    /** var_3712: the window was asked to show before the list arrived. */
    const showOnLoad = useRef(false);
    /** _pendingCategorySelect: a category link that arrived before the list. */
    const pendingCategoryCode = useRef<string>(null);
    /** var_2598 + var_1540: the next level of the shown achievement, applied when the timer fires. */
    const pendingLevel = useRef<{ achievement: AchievementData; timeout: ReturnType<typeof setTimeout> }>(null);

    const commitCategories = (next: AchievementCategory[]) => {
        categoriesRef.current = next;
        setCategories(next);
    };

    const commitSelectedAchievement = (next: AchievementData) => {
        selectedAchievementRef.current = next;
        setSelectedAchievement(next);
    };

    const clearPendingLevel = () => {
        if (pendingLevel.current) clearTimeout(pendingLevel.current.timeout);
        pendingLevel.current = null;
    };

    const requestAchievements = () => SendMessageComposer(new RequestAchievementsMessageComposer());

    /** pickCategory: the category opens on its first achievement. */
    const pickCategory = (category: AchievementCategory) => {
        setSelectedCategoryCode(category.code);
        commitSelectedAchievement(category.achievements[0] ?? null);
    };

    /** selectCategoryInternalLink: pick the category now, or once the list has arrived. */
    const selectCategoryInternalLink = (code: string) => {
        const category = getAchievementCategoryByCode(categoriesRef.current, code);

        if (category) pickCategory(category);
        else pendingCategoryCode.current = code;
    };

    /** AchievementController.show: request the list the first time, otherwise show the window as it was left. */
    const show = (categoryCode?: string) => {
        if (!categoriesRef.current) {
            requestAchievements();
            showOnLoad.current = true;
        } else {
            setIsVisible(true);
        }

        if (categoryCode !== undefined && categoryCode !== null) selectCategoryInternalLink(categoryCode);
    };

    /** AchievementController.ensureAchievementsInitialized (used by the camera for its achievement level). */
    const ensureAchievementsInitialized = useCallback(() => {
        if (!categoriesRef.current) SendMessageComposer(new RequestAchievementsMessageComposer());
    }, []);

    const close = () => {
        setUnseenAchievements(NO_UNSEEN);
        setIsVisible(false);
    };

    /** onBack: the category's unseen updates become seen and the window returns to the category grid. */
    const goBack = () => {
        if (selectedCategoryCode !== null) setUnseenAchievements((previous) => removeUnseenAchievementsOfCategory(previous, selectedCategoryCode));

        setSelectedCategoryCode(null);
        commitSelectedAchievement(null);
    };

    const selectCategory = (code: string) => {
        if (code === null || code === undefined) {
            goBack();
            return;
        }

        const category = getAchievementCategoryByCode(categoriesRef.current, code);

        if (category) pickCategory(category);
    };

    const selectAchievement = (achievement: AchievementData) => commitSelectedAchievement(achievement);

    const resetSession = () => {
        clearPendingLevel();
        categoriesRef.current = null;
        selectedAchievementRef.current = null;
        showOnLoad.current = false;
        pendingCategoryCode.current = null;
        setCategories(null);
        setUnseenAchievements(NO_UNSEEN);
        setAchievementScore(0);
        setEnabledWiredAchievements([]);
        setIsVisible(false);
        setSelectedCategoryCode(null);
        setSelectedAchievement(null);
    };

    useMessageEvent<AchievementsEvent>(AchievementsEvent, (event) => {
        const parser = event.getParser();

        if (!categoriesRef.current) {
            commitCategories(
                buildAchievementCategories(parser.achievements ?? [], getNewAchievementCodes(GetOptionalConfigurationValue<string>('achievements.new', '')))
            );
        }

        if (!showOnLoad.current) return;

        showOnLoad.current = false;
        setIsVisible(true);

        const category = getAchievementCategoryByCode(categoriesRef.current, pendingCategoryCode.current ?? parser.defaultCategory);

        if (category) {
            pickCategory(category);
            pendingCategoryCode.current = null;
        }
    });

    useMessageEvent<AchievementEvent>(AchievementEvent, (event) => {
        const achievement = event.getParser().achievement;

        if (!achievement || !categoriesRef.current) return;

        const selected = selectedAchievementRef.current;
        const isSelected = !!selected && selected.achievementId === achievement.achievementId;

        if (!isSelected)
            setUnseenAchievements((previous) =>
                previous.has(achievement.achievementId) ? previous : new Map(previous).set(achievement.achievementId, achievement)
            );

        if (isSelected && achievement.level > selected.level) {
            // The shown level is completed first; the timer is not restarted by further level-ups (Timer.start is a no-op
            // while running), it applies the latest one.
            if (selected.currentPoints !== selected.scoreLimit) {
                const completed = withMaxProgress(selected);

                commitCategories(replaceAchievementInCategories(categoriesRef.current, selected, completed));
                commitSelectedAchievement(completed);
            }

            if (pendingLevel.current) {
                pendingLevel.current.achievement = achievement;
                return;
            }

            pendingLevel.current = {
                achievement,
                timeout: setTimeout(() => {
                    const next = pendingLevel.current?.achievement;

                    pendingLevel.current = null;

                    if (!next) return;

                    commitCategories(updateAchievementCategories(categoriesRef.current, next));

                    if (selectedAchievementRef.current?.achievementId === next.achievementId) commitSelectedAchievement(next);
                }, PENDING_LEVEL_DELAY)
            };
            return;
        }

        commitCategories(updateAchievementCategories(categoriesRef.current, achievement));

        if (isSelected) commitSelectedAchievement(achievement);
    });

    useMessageEvent<AchievementsScoreEvent>(AchievementsScoreEvent, (event) => setAchievementScore(event.getParser().score));

    useMessageEvent<AuthenticatedEvent>(AuthenticatedEvent, () => resetSession());

    useMessageEvent<WiredEnvironmentEvent>(WiredEnvironmentEvent, (event) => setEnabledWiredAchievements(event.getParser().enabledAchievements));

    // onRoomExit closes the window.
    useVoltEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, () => {
        setEnabledWiredAchievements([]);
        close();
    });

    useEffect(
        () => () => {
            if (pendingLevel.current) clearTimeout(pendingLevel.current.timeout);
        },
        []
    );

    const achievementCategories = categories ?? [];
    const selectedCategory = getAchievementCategoryByCode(achievementCategories, selectedCategoryCode);
    const visibleAchievements =
        selectedCategory?.achievements.filter((achievement) => isAchievementVisibleInCategory(selectedCategory.code, achievement, enabledWiredAchievements)) ??
        [];
    const getTotalUnseen = [...unseenAchievements.values()].filter((achievement) => !AchievementUtilities.getAchievementIsIgnored(achievement)).length;
    const getProgress = getAchievementCategoriesProgress(achievementCategories);
    const getMaxProgress = getAchievementCategoriesMaxProgress(achievementCategories);

    return {
        achievementCategories,
        selectedCategoryCode: selectedCategory ? selectedCategoryCode : null,
        setSelectedCategoryCode: selectCategory,
        selectedAchievement: selectedCategory ? selectedAchievement : null,
        selectAchievement,
        unseenAchievements,
        achievementScore,
        getTotalUnseen,
        getProgress,
        getMaxProgress,
        scaledProgressPercent: getMaxProgress ? Math.floor((getProgress / getMaxProgress) * 100) : 0,
        selectedCategory,
        visibleAchievements,
        hasWiredAchievements: enabledWiredAchievements.length > 0,
        enabledWiredAchievements,
        isLoaded: categories !== null,
        isVisible,
        show,
        close,
        goBack,
        ensureAchievementsInitialized
    };
};

export const useAchievements = () => useSharedHook(useAchievementsState);

registerSharedHook(useAchievementsState);
