import { WIRED_VARIABLE_ABSENT } from './WiredNativeVariables';

/**
 * AIR LinkDataframeCodec.as (decode L31, normalizeKey L64, keyError L69, placeholderError L83, isTarget L100,
 * utf8Length L111, storageError L118) and the LinkDataframeSendPreset / LinkDataframeReceivePreset grammar
 * (intParams L121 / L91, stringParam L131 / L101, readVariableIds L154 / L124), build WIN63-202610131318-860371703.
 * Used by SendLinkDataframe (action 64) and ReceiveLinkDataframe (trigger 30). Pure helpers, no UI.
 */

export const LINK_DATAFRAME_MAX_ROWS = 12;
export const LINK_DATAFRAME_MAX_TEXT_BYTES = 3000;
export const LINK_DATAFRAME_MAX_MESSAGE_BYTES = 200;
export const LINK_DATAFRAME_KEY_MAX_LENGTH = 40;
/** [count] + 12 x [mode, literal, target]. */
export const LINK_DATAFRAME_SEND_INT_COUNT = 1 + LINK_DATAFRAME_MAX_ROWS * 3;
/** [count] + 12 x [kind]. */
export const LINK_DATAFRAME_RECEIVE_INT_COUNT = 1 + LINK_DATAFRAME_MAX_ROWS;

/** Send row modes (LinkDataframeCodec NUMBER_LITERAL, NUMBER_VARIABLE, VARIABLE_TEXT, CUSTOM_MESSAGE). */
export const LINK_SOURCE_NUMBER = 0;
export const LINK_SOURCE_VARIABLE_VALUE = 1;
export const LINK_SOURCE_VARIABLE_TEXT = 2;
export const LINK_SOURCE_MESSAGE = 3;

/** Receive row kinds (LinkDataframeCodec const_655 = text placeholder, VARIABLE_DESTINATION = context variable). */
export const LINK_DESTINATION_PLACEHOLDER = 0;
export const LINK_DESTINATION_VARIABLE = 1;

/** Row variable targets: the native variable target codes (furni 0, user 1, room -10, context -20). */
const LINK_TARGETS = [0, 1, -10, -20];

export const isLinkDataframeTarget = (target: number): boolean => LINK_TARGETS.includes(target);

export interface ILinkDataframeSendRow {
    key: string;
    text: string;
    mode: number;
    literal: number;
    target: number;
    /** The stored variable slot: the chosen variable id, or WIRED_VARIABLE_ABSENT. */
    variableId: string;
}

export interface ILinkDataframeReceiveRow {
    key: string;
    text: string;
    kind: number;
    /** The stored variable slot: the chosen variable id, or WIRED_VARIABLE_ABSENT. */
    variableId: string;
}

export interface ILinkDataframeSendState {
    count: number;
    rows: ILinkDataframeSendRow[];
}

export interface ILinkDataframeReceiveState {
    count: number;
    rows: ILinkDataframeReceiveRow[];
}

export const linkDataframeUtf8Length = (text: string): number => new TextEncoder().encode(text).length;

export const normalizeLinkDataframeKey = (key: string): string =>
    key
        .replace(/_/g, ' ')
        .replace(/^[\u0000- ]+|[\u0000- ]+$/g, '')
        .replace(/ /g, '_')
        .toLowerCase();

/** The localization key of the key's error, or null when the key is valid. */
export const linkDataframeKeyError = (key: string): string | null => {
    const normalized = normalizeLinkDataframeKey(key);

    if (normalized.length === 0 || normalized.length > LINK_DATAFRAME_KEY_MAX_LENGTH) return 'wiredfurni.error.link.key_length';
    if (!/^\w+$/.test(normalized)) return 'wiredfurni.error.variables.name_syntax';

    return null;
};

/** The localization key of a received-message placeholder's error, or null when it is valid. */
export const linkDataframePlaceholderError = (name: string): string | null => {
    if (name.length === 0 || name.length > LINK_DATAFRAME_KEY_MAX_LENGTH) return 'wiredfurni.error.placeholder.name_length';
    if (!/^\w+$/.test(name)) return 'wiredfurni.error.placeholder.name_syntax';
    if (name.toLowerCase() === 'trigger_text') return 'wiredfurni.error.placeholder.reserved';

    return null;
};

/** The localization key of a whole frame that is too large to store, or null. */
export const linkDataframeStorageError = (stringParam: string, intParams: number[], variableIds: string[]): string | null => {
    if (linkDataframeUtf8Length(stringParam) > LINK_DATAFRAME_MAX_TEXT_BYTES) return 'wiredfurni.error.link.configuration_too_large';
    if (intParams.join('|').length > 400 || variableIds.join('|').length > 240) return 'wiredfurni.error.link.configuration_too_large';

    return null;
};

/** LinkDataframeCodec.decode: the first `count` rows as [key, text] pairs, or null when the string is not a valid frame. */
export const decodeLinkDataframeRows = (stringParam: string, count: number): Array<[string, string]> | null => {
    if (count < 0 || count > LINK_DATAFRAME_MAX_ROWS) return null;
    if (stringParam === '' && count === 0) return [];

    let parsed: unknown;

    try {
        parsed = JSON.parse(stringParam);
    } catch {
        return null;
    }

    if (!Array.isArray(parsed) || parsed.length !== count) return null;

    for (const item of parsed) {
        if (!Array.isArray(item) || item.length !== 2 || typeof item[0] !== 'string' || typeof item[1] !== 'string') return null;
    }

    return parsed as Array<[string, string]>;
};

export const encodeLinkDataframeRows = (rows: Array<[string, string]>): string => JSON.stringify(rows);

/** Loads a send frame; null is the wiredfurni.error.link.invalid_dataframe case (AIR LinkDataframeSendPreset.initialize). */
export const readLinkDataframeSend = (intParams: number[], stringParam: string, variableIds: string[]): ILinkDataframeSendState | null => {
    if (intParams.length !== LINK_DATAFRAME_SEND_INT_COUNT || variableIds.length !== LINK_DATAFRAME_MAX_ROWS) return null;

    const count = intParams[0];
    const pairs = decodeLinkDataframeRows(stringParam, count);

    if (!pairs) return null;

    const rows: ILinkDataframeSendRow[] = [];

    for (let index = 0; index < LINK_DATAFRAME_MAX_ROWS; index++) {
        const [key = '', text = ''] = index < count ? pairs[index] : [];
        const base = 1 + index * 3;

        rows.push({
            key,
            text,
            mode: intParams[base],
            literal: intParams[base + 1],
            target: intParams[base + 2],
            variableId: variableIds[index] || WIRED_VARIABLE_ABSENT
        });
    }

    return { count, rows };
};

/** Saves a send frame's ints: [count] + 12 x [mode, literal, target]. */
export const writeLinkDataframeSendInts = (state: ILinkDataframeSendState): number[] => [
    state.count,
    ...state.rows.flatMap((row) => [row.mode, row.literal, row.target])
];

/** Saves a send frame's string: the first `count` rows as [key, text]; the text is only kept for message rows. */
export const writeLinkDataframeSendString = (state: ILinkDataframeSendState): string =>
    encodeLinkDataframeRows(
        state.rows.slice(0, state.count).map((row) => [normalizeLinkDataframeKey(row.key), row.mode === LINK_SOURCE_MESSAGE ? row.text : ''])
    );

/** Loads a receive frame; null is the wiredfurni.error.link.invalid_dataframe case (AIR LinkDataframeReceivePreset.initialize). */
export const readLinkDataframeReceive = (intParams: number[], stringParam: string, variableIds: string[]): ILinkDataframeReceiveState | null => {
    if (intParams.length !== LINK_DATAFRAME_RECEIVE_INT_COUNT || variableIds.length !== LINK_DATAFRAME_MAX_ROWS) return null;

    const count = intParams[0];
    const pairs = decodeLinkDataframeRows(stringParam, count);

    if (!pairs) return null;

    const rows: ILinkDataframeReceiveRow[] = [];

    for (let index = 0; index < LINK_DATAFRAME_MAX_ROWS; index++) {
        const [key = '', text = ''] = index < count ? pairs[index] : [];

        rows.push({
            key,
            text,
            kind: intParams[1 + index],
            variableId: variableIds[index] || WIRED_VARIABLE_ABSENT
        });
    }

    return { count, rows };
};

/** Saves a receive frame's ints: [count] + 12 x [kind]. */
export const writeLinkDataframeReceiveInts = (state: ILinkDataframeReceiveState): number[] => [state.count, ...state.rows.map((row) => row.kind)];

/** Saves a receive frame's string: the first `count` rows as [key, text]; the text is only kept for placeholder rows. */
export const writeLinkDataframeReceiveString = (state: ILinkDataframeReceiveState): string =>
    encodeLinkDataframeRows(
        state.rows
            .slice(0, state.count)
            .map((row) => [normalizeLinkDataframeKey(row.key), row.kind === LINK_DESTINATION_PLACEHOLDER ? row.text.toLowerCase() : ''])
    );
