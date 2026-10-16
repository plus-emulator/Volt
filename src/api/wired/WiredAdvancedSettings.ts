import type { ConditionDefinition, Triggerable } from '@volt/renderer';

/**
 * Merged selections ([furni index, user index]) that an inline value-or-variable section claims, per card kind and native code.
 * AIR draws a claimed merged source inside the normal body, so it never counts towards the advanced section
 * (UserDefinedRoomEventsCtrl.findInputSourceClaimOwner, WIN63-202610131318-860371703).
 */
const INLINE_MERGED_SELECTIONS: Record<string, Record<number, Array<[number, number]>>> = {
    // ChangeVariable/GiveVariable [1,1], chest rewards class_4173 [1,1], init transaction class_4180 [2,1], progress achievement
    // [0,1], place furni class_3972 [2,1], progress reward track [0,1], and the twelve dataframe rows of SendLinkDataframe [i+1,i]
    // (LinkDataframeSendRowPreset.as:56).
    action: {
        39: [[1, 1]], 41: [[1, 1]], 45: [[1, 1]], 46: [[1, 1]], 47: [[2, 1]], 51: [[0, 1]], 55: [[2, 1]], 58: [[0, 1]],
        64: Array.from({ length: 12 }, (_, index): [number, number] => [index + 1, index])
    },
    // VariableValue/VariableAge [1,1], ChestHasAmount [1,0], class_4163 [2,0].
    condition: { 42: [[1, 1]], 43: [[1, 1]], 45: [[1, 0]], 46: [[2, 0]] },
    // WithVariable [0,0].
    selector: { 17: [[0, 0]], 18: [[0, 0]] },
    // Selector/variable filters [0,0], custom contract [2,0] and [3,1], projectile [1,0] and [2,2], jump strength [0,0], leaderboard [0,0].
    extra: { 10: [[0, 0]], 11: [[0, 0]], 12: [[0, 0]], 13: [[0, 0]], 20: [[2, 0], [3, 1]], 21: [[1, 0], [2, 2]], 22: [[0, 0]], 1005: [[0, 0]] }
};

const differs = (values: number[], defaults: number[], skip: Set<number>) =>
    defaults.some((value, index) => !skip.has(index) && index < values.length && values[index] !== value);

/**
 * AIR UserDefinedRoomEventsCtrl.isUsingAdvancedSettings (L919-937): a source of the advanced section that differs from the
 * server default for its index, or a condition quantifier other than 0. The editor then opens with the section expanded (L703).
 */
export const isUsingAdvancedSettings = (trigger: Triggerable | null, wiredType: string): boolean =>
{
    if (!trigger?.advanced || !trigger.inputSources) return false;

    const inline = INLINE_MERGED_SELECTIONS[wiredType]?.[trigger.code] ?? [];
    const furniSkip = new Set(inline.map(([furni]) => furni));
    const userSkip = new Set(inline.map(([, user]) => user));

    if (differs(trigger.furniSources ?? [], trigger.inputSources.furniDefaults ?? [], furniSkip)) return true;
    if (differs(trigger.userSources ?? [], trigger.inputSources.userDefaults ?? [], userSkip)) return true;

    const condition = 'quantifierType' in trigger ? trigger as ConditionDefinition : null;

    return !!condition?.quantifierType && condition.quantifier !== 0;
};
