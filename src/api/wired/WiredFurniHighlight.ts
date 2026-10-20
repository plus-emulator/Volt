/**
 * Set-furni-highlight editor rules of the official wired editor (AIR build WIN63-202610131318-860371703,
 * roomevents/wired_setup/actiontypes/class_4214.as): HIGHLIGHT_COLORS L18, updateStrengthOptions L154-202,
 * updateColorAvailability L204, updateAnimationOptions L219, readIntParamsFromForm L112.
 * Dossier: B/reviews/new-wireds-dossier-r88.json, code 62.
 */

export const WIRED_HIGHLIGHT_TYPE_DARKEN = 2;
export const WIRED_HIGHLIGHT_TYPE_COLOR_TINT = 3;
export const WIRED_HIGHLIGHT_TYPE_BRIGHTEN = 4;

/** Brighten has only Off and On in the editor; On is shown as 76 and saved as 38 (half). */
export const WIRED_HIGHLIGHT_BRIGHTEN_ON = 76;
export const WIRED_HIGHLIGHT_NO_COLOR_DARKEN = 0;
export const WIRED_HIGHLIGHT_NO_COLOR_BRIGHTEN = 16777215;

export const WIRED_HIGHLIGHT_COLORS: readonly number[] = [
    16777215, 16772910, 16758528, 16747008, 16734774, 16724016, 16724855, 16733627, 15741144, 12076287, 7883007, 4611327, 2395391, 2146303, 2156016, 1628592,
    2149480, 5300272, 10546464, 16557530, 12291417
];

/** The ui-config key that lists the darken levels, comma separated. */
export const WIRED_HIGHLIGHT_DARKEN_LEVELS_KEY = 'wired.furni_highlight.darken_levels';

/** The darken levels when the key is missing. */
export const WIRED_HIGHLIGHT_DEFAULT_DARKEN_LEVELS: readonly number[] = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

/**
 * The darken levels of the ui-config value. A missing value (null) gives the default list; an empty value gives only Off.
 * Observed on AIR WIN63-202610201032-107964540: roomevents/wired_setup/actiontypes/class_4226.as darkenLevels.
 */
export const parseWiredHighlightDarkenLevels = (value: string | null | undefined): number[] =>
    value == null ? [...WIRED_HIGHLIGHT_DEFAULT_DARKEN_LEVELS] : value.split(',').map((level) => Number.parseInt(level, 10) || 0);

/** Darkening is offered only when a level above Off is configured (class_4226.as darkeningAvailable). */
export const isWiredHighlightDarkeningAvailable = (darkenLevels: readonly number[]): boolean => darkenLevels.some((level) => level > 0);

export type WiredHighlightStrengthOption = { value: number; kind: 'off' } | { value: number; kind: 'on' } | { value: number; kind: 'level'; level: number };

/** The palette a highlight type offers: colour tint skips the first swatch (white), darken and brighten have none. */
export const getWiredHighlightColors = (type: number): number[] =>
    type === WIRED_HIGHLIGHT_TYPE_COLOR_TINT ? WIRED_HIGHLIGHT_COLORS.slice(1) : [...WIRED_HIGHLIGHT_COLORS];

export const hasWiredHighlightColor = (type: number): boolean => type !== WIRED_HIGHLIGHT_TYPE_DARKEN && type !== WIRED_HIGHLIGHT_TYPE_BRIGHTEN;

export const getWiredHighlightStrengthOptions = (
    type: number,
    darkenLevels: readonly number[] = WIRED_HIGHLIGHT_DEFAULT_DARKEN_LEVELS
): WiredHighlightStrengthOption[] => {
    if (type === WIRED_HIGHLIGHT_TYPE_DARKEN) {
        // The label is the level's index in the list, as the official editor shows it.
        return darkenLevels.map((value, index) => (value === 0 ? { value, kind: 'off' } : { value, kind: 'level', level: index }));
    }
    if (type === WIRED_HIGHLIGHT_TYPE_BRIGHTEN) {
        return [
            { value: 0, kind: 'off' },
            { value: WIRED_HIGHLIGHT_BRIGHTEN_ON, kind: 'on' }
        ];
    }
    const step = type === WIRED_HIGHLIGHT_TYPE_COLOR_TINT ? 25 : 100;
    const options: WiredHighlightStrengthOption[] = [];

    for (let value = 0; value <= 100; value += step) {
        if (value === 0) options.push({ value, kind: 'off' });
        else if (step === 100) options.push({ value, kind: 'on' });
        else options.push({ value, kind: 'level', level: value / step });
    }

    return options;
};

/** The strength the editor shows for a value: brighten is On for any value above 0, the others the nearest option (first one on a tie). */
export const getWiredHighlightShownStrength = (type: number, value: number, darkenLevels?: readonly number[]): number => {
    if (type === WIRED_HIGHLIGHT_TYPE_BRIGHTEN) return value > 0 ? WIRED_HIGHLIGHT_BRIGHTEN_ON : 0;

    const options = getWiredHighlightStrengthOptions(type, darkenLevels);

    return options.reduce((best, option) => (Math.abs(option.value - value) < Math.abs(best - value) ? option.value : best), options[0].value);
};

/** The shown strength of a saved strength (brighten is saved halved, so it is doubled back first). */
export const getWiredHighlightStrengthFromParam = (type: number, stored: number, darkenLevels?: readonly number[]): number =>
    getWiredHighlightShownStrength(type, type === WIRED_HIGHLIGHT_TYPE_BRIGHTEN ? stored * 2 : stored, darkenLevels);

export const getWiredHighlightStoredStrength = (type: number, shown: number): number => (type === WIRED_HIGHLIGHT_TYPE_BRIGHTEN ? shown / 2 : shown);

export const getWiredHighlightStoredColor = (type: number, color: number): number => {
    if (type === WIRED_HIGHLIGHT_TYPE_DARKEN) return WIRED_HIGHLIGHT_NO_COLOR_DARKEN;
    if (type === WIRED_HIGHLIGHT_TYPE_BRIGHTEN) return WIRED_HIGHLIGHT_NO_COLOR_BRIGHTEN;

    return color;
};
