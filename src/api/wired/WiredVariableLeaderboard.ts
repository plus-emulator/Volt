/*
 * The variable leaderboard addon (code 1005, wf_xtra_var_leaderboard), as VariableLeaderboardConfigCodec, VariableLeaderboardAddon,
 * VariableLeaderboardDisplayNameFormatter, VariableLeaderboardRowView and VariableLeaderboardPagingState encode and show it, build
 * WIN63-202610131318-860371703: codec L65 decodeParams, L182 encode, L246 validate, L350 decodeUnpublished; addon L247 validate;
 * formatter L11 suggest; row view L61 formatValue, L236 formatColumn, L257 formatTime; paging L58 desiredChunkIndices.
 * Dossier entry 1005 (B/reviews/new-wireds-dossier-r88.json).
 */
import type { IVariableLeaderboardDescriptor, IVariableLeaderboardRow } from '@volt/renderer';

/** The stored layout: 19 ints, 12 variable ids ('0' is the null id), 17 TAB-joined strings. */
export const VARIABLE_LEADERBOARD_INT_PARAM_COUNT = 19;
export const VARIABLE_LEADERBOARD_VARIABLE_ID_COUNT = 12;
export const VARIABLE_LEADERBOARD_STRING_FIELD_COUNT = 17;

export const VARIABLE_LEADERBOARD_MAX_COLUMNS = 4;
export const VARIABLE_LEADERBOARD_MAX_OVERRIDES = 10;
export const VARIABLE_LEADERBOARD_MAX_CHOICES = 10;
export const VARIABLE_LEADERBOARD_MAX_OVERRIDE_LENGTH = 22;
export const VARIABLE_LEADERBOARD_TITLE_MAX_LENGTH = 50;
export const VARIABLE_LEADERBOARD_DESCRIPTION_MAX_LENGTH = 80;
export const VARIABLE_LEADERBOARD_LABEL_MIN_LENGTH = 2;
export const VARIABLE_LEADERBOARD_LABEL_MAX_LENGTH = 12;
export const VARIABLE_LEADERBOARD_OFFSET_MIN = -32;
export const VARIABLE_LEADERBOARD_OFFSET_MAX = 32;
export const VARIABLE_LEADERBOARD_INT32_MIN = -2147483648;
export const VARIABLE_LEADERBOARD_INT32_MAX = 2147483647;

const INT_PARAM_STORAGE_LIMIT = 400;
const VARIABLE_ID_STORAGE_LIMIT = 240;
const STRING_PARAM_STORAGE_LIMIT = 1000;

/** class_2737.const_12: the page size per page-size option. */
export const VARIABLE_LEADERBOARD_PAGE_SIZES = [10, 15, 20];

/** PagingState const_625: the server sends rows in chunks of this many. */
export const VARIABLE_LEADERBOARD_CHUNK_SIZE = 50;

/** Column types: -1 unused slot, 0 username, 1 value, 2 last update, 3 creation time, 4 level, 5 text connection. */
export const VARIABLE_LEADERBOARD_COLUMN = {
    UNUSED: -1,
    USERNAME: 0,
    VALUE: 1,
    LAST_UPDATE: 2,
    CREATION: 3,
    LEVEL: 4,
    TEXT_CONNECTION: 5
} as const;

/** Column types offered after the username column, in dropdown order. */
export const VARIABLE_LEADERBOARD_EXTRA_COLUMN_TYPES = [1, 5, 2, 3, 4];

/** Sort modes: 0 highest value, 1 lowest value, 2 oldest creation, 3 latest creation, 4 oldest update, 5 latest update. */
export const VARIABLE_LEADERBOARD_SORT_MODES = [0, 1, 2, 3, 4, 5];

/** Widths: 0 small (70px), 1 medium (90px), 2 large (120px), 3 XL (170px). */
export const VARIABLE_LEADERBOARD_WIDTH_PIXELS = [70, 90, 120, 170];

/** class_4216: availability types of a persisted variable (WiredVariable.isPersisted). */
const PERSISTED_AVAILABILITY_TYPES = [10, 11, 20];

/** class_4254.USER. */
export const VARIABLE_LEADERBOARD_USER_TARGET = 1;

export const VARIABLE_LEADERBOARD_OPERAND = { LITERAL: 0, GLOBAL: 1 } as const;

export interface IVariableLeaderboardConfigColumn {
    type: number;
    label: string;
    width: number;
}

export interface IVariableLeaderboardConfigLocation {
    tileX: number;
    tileY: number;
    offsetX: number;
    altitude: number;
}

/** One stacked variable and the name shown for it (VariableLeaderboardConfig.displayOverrides). */
export interface IVariableLeaderboardOverride {
    variableId: string;
    name: string;
}

export interface IVariableLeaderboardConfig {
    title: string;
    description: string;
    columns: IVariableLeaderboardConfigColumn[];
    sortMode: number;
    pageSizeOption: number;
    filterEnabled: boolean;
    comparisonEnabled: boolean;
    operandKind: number;
    filterVariableId: string;
    globalOperandVariableId: string;
    literal: string;
    overrides: IVariableLeaderboardOverride[];
    location: IVariableLeaderboardConfigLocation;
}

export interface IVariableLeaderboardEncoded {
    intParams: number[];
    variableIds: string[];
    stringParam: string;
}

/** Context entry type 8 (VariableLeaderboardContext, package_127): what the editor and the stack offer. */
export interface IVariableLeaderboardEditorContext {
    overlayInstanceId: number;
    physicalTileX: number;
    physicalTileY: number;
    totalCandidateCount: number;
    choices: Array<{ variableId: string; technicalName: string; persistent: boolean; hasValue: boolean; applicableLevelUpCount: number }>;
}

export type VariableLeaderboardConfigError =
    | 'title_required'
    | 'column_name_length'
    | 'filter_required'
    | 'global_operand_required'
    | 'invalid_configuration'
    | 'missing_context';

export const isVariableLeaderboardNullId = (id: string | null | undefined): boolean => !id || id === '0' || id === 'n';

export const canonicalVariableLeaderboardId = (id: string | null | undefined): string => (isVariableLeaderboardNullId(id) ? '0' : id);

const isPopulatedId = (id: string | null | undefined): boolean => !!id && !isVariableLeaderboardNullId(id);

/** A canonical signed 64-bit decimal: no leading zeros, no "-0", within Long.MIN..Long.MAX. */
export const isCanonicalVariableLeaderboardLiteral = (literal: string | null | undefined): boolean => {
    if (!literal) return false;

    const negative = literal.charAt(0) === '-';
    const digits = negative ? literal.slice(1) : literal;

    if (!/^(0|[1-9][0-9]*)$/.test(digits) || (negative && digits === '0')) return false;

    const limit = negative ? '9223372036854775808' : '9223372036854775807';

    if (digits.length !== limit.length) return digits.length < limit.length;

    return digits <= limit;
};

const isPersistedAvailability = (availability: number): boolean => PERSISTED_AVAILABILITY_TYPES.includes(availability);

/** VariableLeaderboardAddon.isEligibleFilterVariable: a user variable that is persisted and needs no execution context. */
export const isVariableLeaderboardFilterEligible = (variable: {
    variableTarget: number;
    availabilityType: number;
    requiresExecutionContext: boolean;
}): boolean =>
    variable.variableTarget === VARIABLE_LEADERBOARD_USER_TARGET && isPersistedAvailability(variable.availabilityType) && !variable.requiresExecutionContext;

/** The config an unpublished box starts from (decodeUnpublished): empty texts, username and value columns, no filter. */
export const createUnpublishedVariableLeaderboardConfig = (): IVariableLeaderboardConfig => ({
    title: '',
    description: '',
    columns: [
        { type: VARIABLE_LEADERBOARD_COLUMN.USERNAME, label: 'Username', width: 3 },
        { type: VARIABLE_LEADERBOARD_COLUMN.VALUE, label: 'Value', width: 0 }
    ],
    sortMode: 0,
    pageSizeOption: 0,
    filterEnabled: false,
    comparisonEnabled: false,
    operandKind: VARIABLE_LEADERBOARD_OPERAND.LITERAL,
    filterVariableId: '0',
    globalOperandVariableId: '0',
    literal: '',
    overrides: [],
    location: { tileX: 0, tileY: 0, offsetX: 0, altitude: 0 }
});

/** Column width defaults per type (class_3745.defaultWidth): username 3, last update and creation 1, text connection 2, others 0. */
export const defaultVariableLeaderboardWidth = (type: number): number => {
    switch (type) {
        case VARIABLE_LEADERBOARD_COLUMN.USERNAME:
            return 3;
        case VARIABLE_LEADERBOARD_COLUMN.LAST_UPDATE:
        case VARIABLE_LEADERBOARD_COLUMN.CREATION:
            return 1;
        case VARIABLE_LEADERBOARD_COLUMN.TEXT_CONNECTION:
            return 2;
        default:
            return 0;
    }
};

export const isValidVariableLeaderboardWidth = (width: number): boolean => width === 0 || width === 1 || width === 2 || width === 3;

export const variableLeaderboardColumnPixelWidth = (width: number): number => VARIABLE_LEADERBOARD_WIDTH_PIXELS[width] ?? VARIABLE_LEADERBOARD_WIDTH_PIXELS[0];

/** The default label of a column type (VariableLeaderboardColumnsPreset.defaultColumnLabel). */
export const defaultVariableLeaderboardColumnLabel = (type: number): string => {
    switch (type) {
        case VARIABLE_LEADERBOARD_COLUMN.USERNAME:
            return 'Username';
        case VARIABLE_LEADERBOARD_COLUMN.VALUE:
            return 'Value';
        case VARIABLE_LEADERBOARD_COLUMN.LAST_UPDATE:
            return 'Last update';
        case VARIABLE_LEADERBOARD_COLUMN.CREATION:
            return 'Creation';
        case VARIABLE_LEADERBOARD_COLUMN.LEVEL:
            return 'Level';
        case VARIABLE_LEADERBOARD_COLUMN.TEXT_CONNECTION:
            return 'Text';
        default:
            return 'Column';
    }
};

const utf8Length = (text: string): number => new TextEncoder().encode(text).length;

const decodeStrings = (stringParam: string): string[] => {
    const fields = stringParam.split('\t');

    return Array.from({ length: VARIABLE_LEADERBOARD_STRING_FIELD_COUNT }, (_, index) => (index < fields.length ? fields[index] : ''));
};

const isValidColumnType = (type: number): boolean => Number.isInteger(type) && type >= -1 && type <= 5;

/** The codec's own rules (validate L246-330 and validateConditionalFields L355-392), without the editor-only checks. */
export const isVariableLeaderboardConfigValid = (config: IVariableLeaderboardConfig): boolean => {
    if (!config || config.title.length < 1 || config.title.length > VARIABLE_LEADERBOARD_TITLE_MAX_LENGTH) return false;
    if (config.description.length > VARIABLE_LEADERBOARD_DESCRIPTION_MAX_LENGTH) return false;
    if (!VARIABLE_LEADERBOARD_SORT_MODES.includes(config.sortMode)) return false;
    if (config.pageSizeOption < 0 || config.pageSizeOption >= VARIABLE_LEADERBOARD_PAGE_SIZES.length) return false;
    if (config.operandKind !== 0 && config.operandKind !== 1) return false;

    const { columns } = config;

    if (columns.length < 1 || columns.length > VARIABLE_LEADERBOARD_MAX_COLUMNS || columns[0].type !== VARIABLE_LEADERBOARD_COLUMN.USERNAME) return false;

    const types = new Set<number>();

    for (const column of columns) {
        if (!isValidColumnType(column.type) || column.type === VARIABLE_LEADERBOARD_COLUMN.UNUSED || types.has(column.type)) return false;
        if (column.label.length < VARIABLE_LEADERBOARD_LABEL_MIN_LENGTH || column.label.length > VARIABLE_LEADERBOARD_LABEL_MAX_LENGTH) return false;
        if (!isValidVariableLeaderboardWidth(column.width)) return false;

        types.add(column.type);
    }

    if (!isValidConditionalFields(config)) return false;

    if (config.overrides.length > VARIABLE_LEADERBOARD_MAX_OVERRIDES) return false;

    const overrideIds = new Set<string>();

    for (const override of config.overrides) {
        if (isVariableLeaderboardNullId(override.variableId) || overrideIds.has(override.variableId)) return false;
        if (override.name.length < 1 || override.name.length > VARIABLE_LEADERBOARD_MAX_OVERRIDE_LENGTH) return false;

        overrideIds.add(override.variableId);
    }

    if (!config.location) return false;

    return config.location.offsetX >= VARIABLE_LEADERBOARD_OFFSET_MIN && config.location.offsetX <= VARIABLE_LEADERBOARD_OFFSET_MAX;
};

const isValidConditionalFields = (config: IVariableLeaderboardConfig): boolean => {
    if (!config.filterEnabled) {
        return (
            isVariableLeaderboardNullId(config.filterVariableId) &&
            isVariableLeaderboardNullId(config.globalOperandVariableId) &&
            !config.comparisonEnabled &&
            config.operandKind === 0 &&
            config.literal.length === 0
        );
    }

    if (!isPopulatedId(config.filterVariableId)) return false;

    if (!config.comparisonEnabled)
        return isVariableLeaderboardNullId(config.globalOperandVariableId) && config.operandKind === 0 && config.literal.length === 0;

    if (config.operandKind === 0) return isVariableLeaderboardNullId(config.globalOperandVariableId) && isCanonicalVariableLeaderboardLiteral(config.literal);

    if (config.operandKind === 1) return isPopulatedId(config.globalOperandVariableId) && config.literal.length === 0;

    return false;
};

/**
 * Reads the stored layout (decodeParams L65). Returns null where the codec throws ArgumentError, so the editor can block the save.
 * An empty string parameter is the unpublished box.
 */
export const decodeVariableLeaderboardConfig = (intParams: number[], variableIds: string[], stringParam: string): IVariableLeaderboardConfig | null => {
    if (!intParams || !variableIds || stringParam == null) return null;
    if (!intParams.every((value) => Number.isInteger(value)) || !variableIds.every((id) => typeof id === 'string' && id.length > 0)) return null;
    if (intParams.join('|').length > INT_PARAM_STORAGE_LIMIT || variableIds.join('|').length > VARIABLE_ID_STORAGE_LIMIT) return null;
    if (utf8Length(stringParam) > STRING_PARAM_STORAGE_LIMIT) return null;

    if (stringParam.length === 0) return createUnpublishedVariableLeaderboardConfig();

    if (intParams.length < 14 || variableIds.length < VARIABLE_LEADERBOARD_VARIABLE_ID_COUNT) return null;

    const sortMode = intParams[0];
    const columnCount = intParams[1];

    if (!VARIABLE_LEADERBOARD_SORT_MODES.includes(sortMode) || columnCount < 1 || columnCount > VARIABLE_LEADERBOARD_MAX_COLUMNS) return null;

    const strings = decodeStrings(stringParam);
    const columns: IVariableLeaderboardConfigColumn[] = [];

    for (let index = 0; index < columnCount; index++) {
        const type = intParams[2 + index];

        if (!isValidColumnType(type) || type === VARIABLE_LEADERBOARD_COLUMN.UNUSED) return null;

        const storedWidth = 14 + index < intParams.length ? intParams[14 + index] : defaultVariableLeaderboardWidth(type);

        columns.push({
            type,
            label: strings[2 + index],
            width: isValidVariableLeaderboardWidth(storedWidth) ? storedWidth : defaultVariableLeaderboardWidth(type)
        });
    }

    const filterEnabled = decodeBoolean(intParams[6]);

    if (filterEnabled === null) return null;

    const comparisonFlag = filterEnabled ? decodeBoolean(intParams[7]) : false;

    if (comparisonFlag === null) return null;

    const comparisonEnabled = filterEnabled && comparisonFlag;
    const operandKind = comparisonEnabled ? intParams[8] : 0;

    if (comparisonEnabled && operandKind !== 0 && operandKind !== 1) return null;

    const overrideCount = intParams[9];

    if (overrideCount < 0 || overrideCount > VARIABLE_LEADERBOARD_MAX_OVERRIDES) return null;

    const filterVariableId = filterEnabled ? canonicalVariableLeaderboardId(variableIds[0]) : '0';

    if (filterEnabled && isVariableLeaderboardNullId(filterVariableId)) return null;

    let globalOperandVariableId = '0';
    let literal = '';

    if (comparisonEnabled) {
        if (operandKind === 0) {
            literal = strings[6];

            if (!isCanonicalVariableLeaderboardLiteral(literal)) return null;
        } else {
            globalOperandVariableId = canonicalVariableLeaderboardId(variableIds[1]);

            if (isVariableLeaderboardNullId(globalOperandVariableId)) return null;
        }
    }

    const overrides: IVariableLeaderboardOverride[] = [];
    const seen = new Set<string>();

    for (let index = 0; index < overrideCount; index++) {
        const variableId = variableIds[2 + index];
        const name = strings[7 + index];

        if (isVariableLeaderboardNullId(variableId) || name.length === 0 || seen.has(variableId)) return null;

        seen.add(variableId);
        overrides.push({ variableId, name });
    }

    const config: IVariableLeaderboardConfig = {
        title: strings[0],
        description: strings[1],
        columns,
        sortMode,
        pageSizeOption: intParams[18] ?? 0,
        filterEnabled,
        comparisonEnabled,
        operandKind,
        filterVariableId,
        globalOperandVariableId,
        literal,
        overrides,
        location: { tileX: intParams[10], tileY: intParams[11], offsetX: intParams[12], altitude: intParams[13] }
    };

    return isVariableLeaderboardConfigValid(config) ? config : null;
};

const decodeBoolean = (value: number): boolean | null => {
    if (value === 0) return false;
    if (value === 1) return true;

    return null;
};

/** Writes the stored layout (encode L182). Returns null when the config is not valid or does not fit the storage limits. */
export const encodeVariableLeaderboardConfig = (config: IVariableLeaderboardConfig): IVariableLeaderboardEncoded | null => {
    if (!isVariableLeaderboardConfigValid(config)) return null;

    const { columns, overrides } = config;
    const intParams: number[] = [config.sortMode, columns.length];

    for (let index = 0; index < VARIABLE_LEADERBOARD_MAX_COLUMNS; index++)
        intParams.push(index < columns.length ? columns[index].type : VARIABLE_LEADERBOARD_COLUMN.UNUSED);

    intParams.push(config.filterEnabled ? 1 : 0, config.comparisonEnabled ? 1 : 0, config.operandKind, overrides.length);
    intParams.push(config.location.tileX, config.location.tileY, config.location.offsetX, config.location.altitude);

    for (let index = 0; index < VARIABLE_LEADERBOARD_MAX_COLUMNS; index++) intParams.push(index < columns.length ? columns[index].width : 0);

    intParams.push(config.pageSizeOption);

    const variableIds = [canonicalVariableLeaderboardId(config.filterVariableId), canonicalVariableLeaderboardId(config.globalOperandVariableId)];

    for (const override of overrides) variableIds.push(override.variableId);

    while (variableIds.length < VARIABLE_LEADERBOARD_VARIABLE_ID_COUNT) variableIds.push('0');

    const fields: string[] = [config.title, config.description];

    for (let index = 0; index < VARIABLE_LEADERBOARD_MAX_COLUMNS; index++) fields.push(index < columns.length ? columns[index].label : '');

    fields.push(config.literal);

    for (let index = 0; index < VARIABLE_LEADERBOARD_MAX_OVERRIDES; index++) fields.push(index < overrides.length ? overrides[index].name : '');

    const stringParam = fields.join('\t');

    if (intParams.join('|').length > INT_PARAM_STORAGE_LIMIT || variableIds.join('|').length > VARIABLE_ID_STORAGE_LIMIT) return null;
    if (utf8Length(stringParam) > STRING_PARAM_STORAGE_LIMIT) return null;

    return { intParams, variableIds, stringParam };
};

/**
 * The editor's save check (VariableLeaderboardAddon.validate L247): the first failing rule, in the editor's order.
 * The context is the trigger's type 8 entry; without it the box cannot be saved.
 */
export const getVariableLeaderboardConfigError = (
    config: IVariableLeaderboardConfig | null,
    hasContext: boolean,
    invalid = false
): VariableLeaderboardConfigError | null => {
    if (invalid || !config) return 'invalid_configuration';
    if (!hasContext) return 'missing_context';
    if (config.title.length < 1) return 'title_required';
    if (config.columns.some((column) => column.label.length < VARIABLE_LEADERBOARD_LABEL_MIN_LENGTH)) return 'column_name_length';
    if (config.filterEnabled && isVariableLeaderboardNullId(config.filterVariableId)) return 'filter_required';
    if (config.comparisonEnabled && config.operandKind === VARIABLE_LEADERBOARD_OPERAND.GLOBAL && isVariableLeaderboardNullId(config.globalOperandVariableId))
        return 'global_operand_required';
    if (!encodeVariableLeaderboardConfig(config)) return 'invalid_configuration';

    return null;
};

/** The "too many choices" warning reads the candidate count from the context (VariableLeaderboardAddon.updateCapabilities). */
export const hasTooManyVariableLeaderboardChoices = (context: Pick<IVariableLeaderboardEditorContext, 'totalCandidateCount'> | null): boolean =>
    !!context && context.totalCandidateCount > VARIABLE_LEADERBOARD_MAX_CHOICES;

/** The warning shown when no persisted user variable is on the stack (VariableLeaderboardAddon.updateCapabilities). */
export const hasNoPersistentVariableLeaderboardChoice = (context: Pick<IVariableLeaderboardEditorContext, 'choices'> | null): boolean =>
    !!context && !context.choices.some((choice) => choice.persistent);

/** VariableLeaderboardAddon.updateCapabilities: value columns and value sorts need a persistent choice that has a value. */
export const hasValueVariableLeaderboardChoice = (context: Pick<IVariableLeaderboardEditorContext, 'choices'> | null): boolean =>
    !!context && context.choices.some((choice) => choice.persistent && choice.hasValue);

/** The value sorts (0 and 1) are offered only with a value choice, or when the saved sort already is one of them. */
export const getVariableLeaderboardSortOptions = (hasValueChoice: boolean, currentSortMode: number): number[] =>
    VARIABLE_LEADERBOARD_SORT_MODES.filter((mode) => mode > 1 || hasValueChoice || currentSortMode === mode);

/** Column types a non-username slot may take: unused by the other slots, in the preset's order. */
export const getVariableLeaderboardColumnTypeOptions = (columns: IVariableLeaderboardConfigColumn[], slot: number, hasValueChoice: boolean): number[] => {
    if (slot === 0) return [VARIABLE_LEADERBOARD_COLUMN.USERNAME];

    const used = new Set(columns.filter((_, index) => index !== slot).map((column) => column.type));
    const current = columns[slot]?.type;

    return VARIABLE_LEADERBOARD_EXTRA_COLUMN_TYPES.filter(
        (type) => (type !== VARIABLE_LEADERBOARD_COLUMN.VALUE || hasValueChoice || current === type) && !used.has(type)
    );
};

/** The first unused extra column type, the way a new column row starts (defaultColumnFor). */
export const getDefaultVariableLeaderboardColumn = (columns: IVariableLeaderboardConfigColumn[]): IVariableLeaderboardConfigColumn => {
    const used = new Set(columns.map((column) => column.type));
    const type = VARIABLE_LEADERBOARD_EXTRA_COLUMN_TYPES.find((candidate) => !used.has(candidate)) ?? VARIABLE_LEADERBOARD_COLUMN.LAST_UPDATE;

    return { type, label: defaultVariableLeaderboardColumnLabel(type), width: defaultVariableLeaderboardWidth(type) };
};

/** VariableLeaderboardDisplayNameFormatter.suggest: separators become spaces, each word is lowercased then capitalised. */
export const suggestVariableLeaderboardDisplayName = (technicalName: string | null | undefined): string => {
    if (!technicalName) return 'Variable';

    const words = technicalName
        .replace(/[_-]+/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 0)
        .map((word) => {
            const lower = word.toLowerCase();

            return lower.charAt(0).toUpperCase() + lower.slice(1);
        });

    return words.length === 0 ? 'Variable' : words.join(' ');
};

/** The name a stacked variable shows: the saved override, else the suggestion. */
export const getVariableLeaderboardDisplayName = (overrides: IVariableLeaderboardOverride[], variableId: string, technicalName: string): string =>
    overrides.find((override) => override.variableId === variableId)?.name || suggestVariableLeaderboardDisplayName(technicalName);

/** The same as the value shown in the row (VariableLeaderboardRowView.formatValue): digits get thousands separators. */
export const formatVariableLeaderboardValue = (raw: string | null | undefined): string => {
    if (!raw) return '';

    const sign = raw.charAt(0) === '-' || raw.charAt(0) === '+' ? raw.charAt(0) : '';
    const digits = sign ? raw.slice(1) : raw;

    if (digits.length === 0 || !/^[0-9]+$/.test(digits)) return raw;

    const head = digits.length % 3 || 3;
    let grouped = digits.slice(0, head);

    for (let index = head; index < digits.length; index += 3) grouped += `,${digits.slice(index, index + 3)}`;

    return `${sign}${grouped}`;
};

export interface IVariableLeaderboardTimeLabels {
    /** wiredfurni.variable_leaderboard.minutes_ago with %minutes%. */
    minutesAgo: (minutes: number) => string;
    /** wiredfurni.params.time.month.N for N 1 to 12. */
    month: (month: number) => string;
}

const padTwo = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

/**
 * A last-update or creation cell (VariableLeaderboardRowView.formatTime): under an hour as minutes ago, the clock time on the same day,
 * else the month and day, with the year when it differs from now. Times are epoch milliseconds; zero is no time.
 */
export const formatVariableLeaderboardTime = (time: number, now: number, labels: IVariableLeaderboardTimeLabels): string => {
    if (!(time > 0)) return '-';

    const elapsed = now - time;

    if (elapsed >= 0 && elapsed < 3600000) return labels.minutesAgo(Math.max(1, Math.floor(elapsed / 60000)));

    const date = new Date(time);
    const today = new Date(now);

    if (date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()) {
        return `${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`;
    }

    const month = labels.month(date.getMonth() + 1).replace(/\.$/, '');
    const day = `${month} ${date.getDate()}`;

    return date.getFullYear() === today.getFullYear() ? day : `${day}, ${date.getFullYear()}`;
};

/** The cell text of one extra column of a row (VariableLeaderboardRowView.formatColumn). */
export const formatVariableLeaderboardCell = (row: IVariableLeaderboardRow, type: number, now: number, labels: IVariableLeaderboardTimeLabels): string => {
    switch (type) {
        case VARIABLE_LEADERBOARD_COLUMN.VALUE: {
            const value = formatVariableLeaderboardValue(row.rawValue);

            return value.length === 0 ? '-' : value;
        }
        case VARIABLE_LEADERBOARD_COLUMN.LAST_UPDATE:
            return formatVariableLeaderboardTime(row.lastUpdateTime, now, labels);
        case VARIABLE_LEADERBOARD_COLUMN.CREATION:
            return formatVariableLeaderboardTime(row.creationTime, now, labels);
        case VARIABLE_LEADERBOARD_COLUMN.LEVEL:
            return row.levelAvailable ? formatVariableLeaderboardValue(row.level) : '-';
        case VARIABLE_LEADERBOARD_COLUMN.TEXT_CONNECTION:
            return row.textConnectionAvailable ? row.textConnection : '-';
        default:
            return '';
    }
};

/** Whether a descriptor can be drawn (VariableLeaderboardController.isDescriptorStructurallyValid L157). */
export const isVariableLeaderboardDescriptorValid = (descriptor: IVariableLeaderboardDescriptor | null | undefined): boolean => {
    if (!descriptor || !descriptor.columns || descriptor.columns.length < 1 || descriptor.columns.length > VARIABLE_LEADERBOARD_MAX_COLUMNS) return false;
    if (descriptor.columns[0].type !== VARIABLE_LEADERBOARD_COLUMN.USERNAME) return false;
    if (descriptor.pageSizeOption < 0 || descriptor.pageSizeOption >= VARIABLE_LEADERBOARD_PAGE_SIZES.length) return false;
    if (!descriptor.columns.every((column) => isValidVariableLeaderboardWidth(column.width))) return false;

    const choices = descriptor.choices ?? [];

    if (choices.length > VARIABLE_LEADERBOARD_MAX_CHOICES) return false;

    const ids = new Set<string>();

    for (const choice of choices) {
        if (!choice.variableId || ids.has(choice.variableId)) return false;

        ids.add(choice.variableId);
    }

    return choices.length === 0 ? descriptor.defaultVariableId === '0' : ids.has(descriptor.defaultVariableId);
};

/** Keeps the previous selection while it is still offered, else the default (VariableLeaderboardController.resolveSelection L141). */
export const resolveVariableLeaderboardSelection = (descriptor: IVariableLeaderboardDescriptor, previousVariableId: string | null): string | null => {
    if (!descriptor.choices || descriptor.choices.length === 0) return null;
    if (previousVariableId && descriptor.choices.some((choice) => choice.variableId === previousVariableId)) return previousVariableId;

    return descriptor.defaultVariableId;
};

/**
 * Paging over the server rows (VariableLeaderboardPagingState). `total` is null until the first chunk states the exact count.
 * `direction` is the last move: 1 forward, -1 back, 0 none.
 */
export interface IVariableLeaderboardPageState {
    page: number;
    pageSize: number;
    direction: -1 | 0 | 1;
    total: number | null;
}

export const createVariableLeaderboardPageState = (pageSizeOption: number): IVariableLeaderboardPageState => ({
    page: 0,
    pageSize: VARIABLE_LEADERBOARD_PAGE_SIZES[pageSizeOption] ?? VARIABLE_LEADERBOARD_PAGE_SIZES[0],
    direction: 0,
    total: null
});

export const variableLeaderboardPageCount = (state: IVariableLeaderboardPageState): number =>
    state.total !== null && state.total > 0 ? Math.ceil(state.total / state.pageSize) : 1;

export const variableLeaderboardChunkCount = (state: IVariableLeaderboardPageState): number =>
    state.total !== null && state.total > 0 ? Math.ceil(state.total / VARIABLE_LEADERBOARD_CHUNK_SIZE) : 1;

export const variableLeaderboardFirstRowIndex = (state: IVariableLeaderboardPageState): number => state.page * state.pageSize;

export const variableLeaderboardCurrentChunkIndex = (state: IVariableLeaderboardPageState): number =>
    Math.floor(variableLeaderboardFirstRowIndex(state) / VARIABLE_LEADERBOARD_CHUNK_SIZE);

export const variableLeaderboardLastChunkIndex = (state: IVariableLeaderboardPageState): number => {
    const first = variableLeaderboardFirstRowIndex(state);
    const end = Math.min(first + state.pageSize, state.total ?? 0);

    return Math.floor(Math.max(first, end - 1) / VARIABLE_LEADERBOARD_CHUNK_SIZE);
};

/** VariableLeaderboardPagingState.moveTo: null when the page is out of range, unknown or already shown. */
export const moveVariableLeaderboardPage = (state: IVariableLeaderboardPageState, page: number): IVariableLeaderboardPageState | null => {
    if (state.total === null || page < 0 || page >= variableLeaderboardPageCount(state) || page === state.page) return null;

    return { ...state, page, direction: page > state.page ? 1 : -1 };
};

/** VariableLeaderboardPagingState.applyExactTotal: a shorter list pulls the page back to its last page. */
export const applyVariableLeaderboardTotal = (state: IVariableLeaderboardPageState, total: number): IVariableLeaderboardPageState => {
    const next = { ...state, total: Math.max(0, total) };
    const last = variableLeaderboardPageCount(next) - 1;

    if (next.page <= last) return next;

    return { ...next, page: last, direction: -1 };
};

/** VariableLeaderboardPagingState.setPageSize: a new size starts again at the first page. */
export const setVariableLeaderboardPageSize = (state: IVariableLeaderboardPageState, pageSizeOption: number): IVariableLeaderboardPageState => ({
    ...state,
    pageSize: VARIABLE_LEADERBOARD_PAGE_SIZES[pageSizeOption] ?? state.pageSize,
    page: 0,
    direction: 0
});

/**
 * The chunks the overlay should hold (VariableLeaderboardPagingState.desiredChunkIndices L68): the chunk of the first row, the chunk
 * of the last row when the page straddles, and one neighbour to prefetch in the direction of travel (or one already held beside it).
 * The result is sorted except for the straddling case, which keeps the server's order of first then last.
 */
export const desiredVariableLeaderboardChunkIndices = (state: IVariableLeaderboardPageState, subscribedChunkIndices: number[]): number[] => {
    const current = variableLeaderboardCurrentChunkIndex(state);
    const last = variableLeaderboardLastChunkIndex(state);
    const result = [current];

    if (last !== current) {
        result.push(last);

        return result;
    }

    if (state.total === null) return result;

    const first = variableLeaderboardFirstRowIndex(state);
    const chunkCount = variableLeaderboardChunkCount(state);
    let prefetch = -1;

    if (state.direction > 0 && first + 3 * state.pageSize > (current + 1) * VARIABLE_LEADERBOARD_CHUNK_SIZE && current < chunkCount - 1) {
        prefetch = current + 1;
    } else if (state.direction < 0 && first - 2 * state.pageSize < current * VARIABLE_LEADERBOARD_CHUNK_SIZE && current > 0) {
        prefetch = current - 1;
    }

    if (prefetch < 0) {
        for (const index of subscribedChunkIndices) {
            if (index !== current && Math.abs(index - current) === 1 && index >= 0 && index < chunkCount) {
                prefetch = index;
                break;
            }
        }
    }

    if (prefetch >= 0) {
        result.push(prefetch);
        result.sort((left, right) => left - right);
    }

    return result;
};

/** The rows of the shown page, or null while any of them has not arrived. Chunks are keyed by chunk index. */
export const collectVariableLeaderboardPageRows = (
    state: IVariableLeaderboardPageState,
    chunks: ReadonlyMap<number, IVariableLeaderboardRow[]>
): IVariableLeaderboardRow[] | null => {
    if (state.total === null) return null;

    const first = variableLeaderboardFirstRowIndex(state);
    const end = Math.min(first + state.pageSize, state.total);
    const rows: IVariableLeaderboardRow[] = [];

    for (let index = first; index < end; index++) {
        const chunk = chunks.get(Math.floor(index / VARIABLE_LEADERBOARD_CHUNK_SIZE));
        const row = chunk?.[index % VARIABLE_LEADERBOARD_CHUNK_SIZE];

        if (!row) return null;

        rows.push(row);
    }

    return rows;
};
