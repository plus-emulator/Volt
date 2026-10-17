import {
    BadgeReceivedEvent,
    BadgesEvent,
    GetSessionDataManager,
    type IBadgeDetail,
    RequestBadgesComposer,
    SetActivatedBadgesComposer,
    UserCurrentBadgesEvent
} from '@volt/renderer';
import { useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { GetConfigurationValue, SendMessageComposer, UnseenItemCategory } from '../../api';
import { useMessageEvent } from '../events';
import { useSharedVisibility } from '../useSharedVisibility';
import { useInventoryUnseenTracker } from './useInventoryUnseenTracker';

const useInventoryBadgesState = () => {
    const [needsUpdate, setNeedsUpdate] = useState(true);
    const [badgeCodes, setBadgeCodes] = useState<string[]>([]);
    const [badgeIds, setBadgeIds] = useState<Map<string, number>>(new Map<string, number>());
    const [activeBadgeCodes, setActiveBadgeCodes] = useState<(string | null)[]>([]);
    const [selectedBadgeCode, setSelectedBadgeCode] = useState<string>(null);
    const { isVisible = false, activate = null, deactivate = null } = useSharedVisibility();
    const { isUnseen = null, resetCategory = null } = useInventoryUnseenTracker();
    const badgeFragments = useRef<(IBadgeDetail[] | null)[] | null>(null);

    const maxBadgeCount = GetConfigurationValue<number>('user.badges.max.slots', 5);
    const isWearingBadge = (badgeCode: string) => activeBadgeCodes.some((code) => code === badgeCode);
    const canWearBadges = () => activeBadgeCodes.filter(Boolean).length < maxBadgeCount;

    const toFixedSlots = (arr: (string | null)[]): (string | null)[] => {
        const seen = new Set<string>();
        return Array.from({ length: maxBadgeCount }, (_, i) => {
            const code = arr[i] || null;
            if (!code || seen.has(code)) return null;
            seen.add(code);
            return code;
        });
    };

    const sendActiveBadges = (badges: (string | null)[]) => {
        const composer = new SetActivatedBadgesComposer();
        for (let i = 0; i < maxBadgeCount; i++) composer.addActivatedBadge(badges[i] ?? '');
        SendMessageComposer(composer);
    };

    const toggleBadge = (badgeCode: string) => {
        setActiveBadgeCodes((prevValue) => {
            const slots = toFixedSlots(prevValue);
            const index = slots.indexOf(badgeCode);

            if (index === -1) {
                const emptySlot = slots.indexOf(null);
                if (emptySlot === -1) return prevValue;

                slots[emptySlot] = badgeCode;
            } else {
                slots[index] = null;
            }

            sendActiveBadges(slots);
            return slots;
        });
    };

    const getBadgeId = (badgeCode: string) => {
        const index = badgeCodes.indexOf(badgeCode);

        if (index === -1) return 0;

        return badgeIds.get(badgeCode) ?? 0;
    };

    // The badge list can arrive in fragments; it is applied once every fragment is in.
    useMessageEvent<BadgesEvent>(BadgesEvent, (event) => {
        const parser = event.getParser();
        const totalFragments = Math.max(1, parser.totalFragments);
        let badges = parser.getBadgeDetails();

        if (totalFragments > 1) {
            if (!badgeFragments.current || badgeFragments.current.length !== totalFragments) badgeFragments.current = Array(totalFragments).fill(null);

            badgeFragments.current[parser.fragmentNo] = badges;

            if (badgeFragments.current.some((fragment) => !fragment)) return;

            badges = badgeFragments.current.flat();
        }

        badgeFragments.current = null;

        setBadgeIds(new Map(badges.map((badge) => [badge.badgeCode, badge.badgeId])));
        setBadgeCodes(badges.map((badge) => badge.badgeCode));
    });

    // Worn badges come from the user's own UserCurrentBadges, not from the badge list.
    useMessageEvent<UserCurrentBadgesEvent>(UserCurrentBadgesEvent, (event) => {
        const parser = event.getParser();

        if (parser.userId !== GetSessionDataManager().userId) return;

        const slots: (string | null)[] = Array(maxBadgeCount).fill(null);

        for (const badge of parser.badgeDetails) {
            const index = badge.slotId - 1;

            if (index >= 0 && index < maxBadgeCount) slots[index] = badge.badgeCode;
        }

        setActiveBadgeCodes(toFixedSlots(slots));
    });

    useMessageEvent<BadgeReceivedEvent>(BadgeReceivedEvent, (event) => {
        const parser = event.getParser();
        const unseen = isUnseen(UnseenItemCategory.BADGE, parser.badgeId);

        setBadgeCodes((prevValue) => {
            const newValue = [...prevValue];

            if (unseen) newValue.unshift(parser.badgeCode);
            else newValue.push(parser.badgeCode);

            return newValue;
        });

        setBadgeIds((prevValue) => {
            const newValue = new Map(prevValue);

            newValue.set(parser.badgeCode, parser.badgeId);

            return newValue;
        });
    });

    useEffect(() => {
        setSelectedBadgeCode((prevValue) => {
            let newValue = prevValue;

            if (newValue && badgeCodes.indexOf(newValue) === -1) newValue = null;

            if (!newValue) newValue = badgeCodes[0] ?? null;

            return newValue;
        });
    }, [badgeCodes]);

    useEffect(() => {
        if (!isVisible) return;

        return () => {
            resetCategory(UnseenItemCategory.BADGE);
        };
    }, [isVisible, resetCategory]);

    useEffect(() => {
        if (!isVisible || !needsUpdate) return;

        SendMessageComposer(new RequestBadgesComposer());

        setNeedsUpdate(false);
    }, [isVisible, needsUpdate]);

    const setBadgeAtSlot = (badgeCode: string, slotIndex: number) => {
        setActiveBadgeCodes((prevValue) => {
            const slots = toFixedSlots(prevValue);

            // Remove badge if already in another slot
            const existingIndex = slots.indexOf(badgeCode);
            if (existingIndex >= 0) slots[existingIndex] = null;

            // Place badge at target slot
            slots[slotIndex] = badgeCode;

            sendActiveBadges(slots);
            return slots;
        });
    };

    const removeBadge = (badgeCode: string) => {
        setActiveBadgeCodes((prevValue) => {
            const slots = toFixedSlots(prevValue);
            const index = slots.indexOf(badgeCode);
            if (index === -1) return prevValue;

            slots[index] = null;

            sendActiveBadges(slots);
            return slots;
        });
    };

    const reorderBadges = (fromIndex: number, toIndex: number) => {
        setActiveBadgeCodes((prevValue) => {
            if (fromIndex === toIndex) return prevValue;

            const slots = toFixedSlots(prevValue);
            const temp = slots[fromIndex];
            slots[fromIndex] = slots[toIndex];
            slots[toIndex] = temp;

            sendActiveBadges(slots);
            return slots;
        });
    };

    const swapBadges = (fromIndex: number, toIndex: number) => {
        setActiveBadgeCodes((prevValue) => {
            if (fromIndex === toIndex) return prevValue;

            const slots = toFixedSlots(prevValue);
            const temp = slots[fromIndex];
            slots[fromIndex] = slots[toIndex];
            slots[toIndex] = temp;

            sendActiveBadges(slots);
            return slots;
        });
    };

    const requestBadges = () => {
        SendMessageComposer(new RequestBadgesComposer());
    };

    return {
        badgeCodes,
        activeBadgeCodes,
        selectedBadgeCode,
        setSelectedBadgeCode,
        isWearingBadge,
        canWearBadges,
        toggleBadge,
        getBadgeId,
        setBadgeAtSlot,
        removeBadge,
        reorderBadges,
        swapBadges,
        requestBadges,
        activate,
        deactivate
    };
};

export const useInventoryBadges = () => useSharedHook(useInventoryBadgesState);

registerSharedHook(useInventoryBadgesState);
