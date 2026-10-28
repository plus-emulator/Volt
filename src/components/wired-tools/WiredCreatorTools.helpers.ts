import { MONITOR_COLOR_GREEN, MONITOR_COLOR_ORANGE, MONITOR_COLOR_RED, MONITOR_STAT_CAPTIONS } from './WiredCreatorTools.constants';
import type { IWiredErrorLogEntry, IWiredVariableData, IWiredVariableDiffEntry } from '@volt/renderer';
import { FriendlyTime, localizeWithFallback } from '../../api';
import type { InspectionGiveDefinition, InspectionVariable, MonitorLog, MonitorRoomStats, MonitorStat, VariablesElementType, VariableTextValue } from './WiredCreatorTools.types';

const HOTEL_TIME_FORMATTERS: Map<string, Intl.DateTimeFormat> = new Map();

export const getHotelTimeFormatter = (timeZone: string): Intl.DateTimeFormat => {
    const formatterTimeZone = timeZone || 'UTC';
    const existingFormatter = HOTEL_TIME_FORMATTERS.get(formatterTimeZone);

    if (existingFormatter) return existingFormatter;

    let formatter: Intl.DateTimeFormat = null;

    try {
        formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: formatterTimeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        });
    } catch {
        formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'UTC',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        });
    }

    HOTEL_TIME_FORMATTERS.set(formatterTimeZone, formatter);

    return formatter;
};

export const formatVariableTimestamp = (timestamp: number): string => {
    if (!timestamp || timestamp <= 0) return '/';

    return new Date(timestamp * 1000).toLocaleString('en-GB');
};

/** WiredMenuMonitorTab.colorize: share of the cap below t1 is green, below t2 orange, else (including 0/0) red. */
export const colorizeMonitorStat = (amount: number, cap: number, t1: number, t2: number): string =>
{
    const ratio = amount / cap;

    if (ratio < t1) return MONITOR_COLOR_GREEN;
    if (ratio < t2) return MONITOR_COLOR_ORANGE;

    return MONITOR_COLOR_RED;
};

/**
 * WiredMenuMonitorTab.updateRoomStatsUI rows from WiredRoomStatsData. Usage turns orange at 30% and red at 70% of its cap, furni at 60% and 85%,
 * permanent variables at 50% and 80%. Without an answer the rows keep their caption only.
 */
export const monitorRoomStatRows = (stats: MonitorRoomStats | null): MonitorStat[] =>
{
    const row = (caption: number, amount: number, cap: number, t1: number, t2: number, alarm: boolean): MonitorStat => ({
        label: MONITOR_STAT_CAPTIONS[caption],
        value: `${amount}/${cap}`,
        color: colorizeMonitorStat(amount, cap, t1, t2),
        alarm
    });

    if (!stats) return MONITOR_STAT_CAPTIONS.map((label) => ({ label, value: '' }));

    return [
        {
            label: MONITOR_STAT_CAPTIONS[0],
            value: `${stats.executionCost.toFixed(0)}/${stats.executionCostCap.toFixed(0)}`,
            color: colorizeMonitorStat(Math.trunc(stats.executionCost), Math.trunc(stats.executionCostCap), 0.3, 0.7),
            alarm: true
        },
        {
            label: MONITOR_STAT_CAPTIONS[1],
            value: stats.isHeavy ? localizeWithFallback('wiredmenu.bool.yes', 'Yes') : localizeWithFallback('wiredmenu.bool.no', 'No'),
            color: stats.isHeavy ? MONITOR_COLOR_ORANGE : MONITOR_COLOR_GREEN,
            alarm: true
        },
        row(2, stats.floorItemCount, stats.floorItemCap, 0.6, 0.85, true),
        row(3, stats.wallItemCount, stats.wallItemCap, 0.6, 0.85, true),
        row(4, stats.permanentFurniVariables, stats.maxPermanentFurniVariables, 0.5, 0.8, false),
        row(5, stats.permanentUserVariables, stats.maxPermanentUserVariables, 0.5, 0.8, false),
        row(6, stats.permanentGlobalVariables, stats.maxPermanentGlobalVariables, 0.5, 0.8, false)
    ];
};

const padTwo = (value: number): string => (value < 10 ? `0${value}` : String(value));

/** ErrorDataTableObject.timestampString: the local time of the last occurrence, cut to whole seconds. */
const formatMonitorErrorTimestamp = (msSinceLastOccurrence: number, nowMs: number): string =>
{
    const time = nowMs - msSinceLastOccurrence;
    const date = new Date(time - (time % 1000));

    return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())} ${padTwo(date.getHours())}:${padTwo(date.getMinutes())}:${padTwo(date.getSeconds())}`;
};

/** ErrorDataTableObject cells: every row the server sends, in its order. A negative age means the error never happened. */
export const buildMonitorLogs = (errors: IWiredErrorLogEntry[], nowMs: number): MonitorLog[] =>
    errors.map((error) => ({
        errorId: error.errorId,
        type: error.errorName,
        category: error.category,
        amount: String(error.throwCount),
        latest: error.msSinceLastOccurrence < 0 ? '/' : FriendlyTime.format(error.msSinceLastOccurrence / 1000, '.ago', 3),
        latestTooltip: error.msSinceLastOccurrence < 0 ? undefined : formatMonitorErrorTimestamp(error.msSinceLastOccurrence, nowMs)
    }));

// AIR WIN63-202610151745-318700621 class_4039: variableType 0 is created by a user, 1 is a built-in (internal) variable, 3 a smart (~) one.
export const VARIABLE_TYPE_CUSTOM = 0;
export const VARIABLE_TYPE_INTERNAL = 1;
const VARIABLE_TYPE_SMART = 3;
const INT_MAX = 2147483647;
const INT_MIN = -2147483648;

/** AIR Util.variableCompare: custom variables by name first, then built-ins by numeric id, highest first. */
const compareVariables = (left: IWiredVariableData, right: IWiredVariableData): number => {
    const leftInternal = left.variableType === VARIABLE_TYPE_INTERNAL;
    const rightInternal = right.variableType === VARIABLE_TYPE_INTERNAL;

    if (leftInternal !== rightInternal) return leftInternal ? 1 : -1;
    if (!leftInternal) return left.variableName.localeCompare(right.variableName);

    return Number(right.variableId) - Number(left.variableId) || 0;
};

/** AIR Util.getPackedVariableText: a value that packs several numbers, shown on its own. */
const getPackedVariableText = (variable: IWiredVariableData, value: number): string | null => {
    if (variable.textConnector === null) return null;

    if (variable.variableType === VARIABLE_TYPE_INTERNAL && value >= 0) {
        if (variable.variableName === '@position' && value <= 0xffff) return `x: ${value >> 8}, y: ${value & 0xff}`;
        if (variable.variableName === '@occupation' && value <= 0xffffff) return `x: ${value >> 16}, y: ${(value >> 8) & 0xff}, r: ${value & 0xff}`;
    } else if (variable.variableType === VARIABLE_TYPE_SMART && value >= 0 && value <= 0xffffff) {
        if (variable.variableName === '~recolorable_furni.color.rgb') return `#${value.toString(16).toUpperCase().padStart(6, '0')}`;
        if (variable.variableName === '~recolorable_furni.color.hsl') return `hsl(${value >> 16},${(value >> 8) & 0xff},${value & 0xff})`;
    }

    return null;
};

/** AIR Util.getConnectedText: the text connector entry for the value, else the connector's fallback. */
const getConnectedText = (variable: IWiredVariableData, value: number): string | null => {
    if (variable.textConnector === null) return null;

    const entry = variable.textConnector.find((connector) => connector.key === value);

    return entry ? entry.value : variable.textConnectorFallback;
};

/**
 * The Inspection table rows, as AIR WiredMenuInspectionTab.updateTableUI and VariableValueTableObject build them: every server value
 * whose definition the catalogue knows and that is not invisible, sorted like AIR.
 */
export const buildInspectionRows = (
    values: ReadonlyMap<string, number>,
    catalog: ReadonlyMap<string, IWiredVariableDiffEntry>,
    canModify: boolean
): InspectionVariable[] => {
    const variables: IWiredVariableData[] = [];

    for (const variableId of values.keys()) {
        const variable = catalog.get(variableId)?.variable;

        if (variable && !variable.isInvisible) variables.push(variable);
    }

    return variables.sort(compareVariables).map((variable) => {
        const rawValue = values.get(variable.variableId) ?? 0;
        const row: InspectionVariable = {
            key: variable.variableId,
            name: variable.variableName,
            value: '',
            rawValue,
            target: variable.variableTarget,
            editable: false,
            removable: variable.canCreateAndDelete
        };

        if (!variable.hasValue) return row;

        if (rawValue === INT_MAX || rawValue === INT_MIN) {
            return {
                ...row,
                value: localizeWithFallback('wiredmenu.inspection.flash_restriction.text', 'Hidden'),
                valueClassName: 'volt-wired-menu__text--hidden',
                valueTitle: localizeWithFallback('wiredmenu.inspection.flash_restriction.desc', '')
            };
        }

        const editable = canModify && variable.canWriteValue;
        const packed = getPackedVariableText(variable, rawValue);

        if (packed !== null) {
            return {
                ...row,
                value: packed,
                editable,
                valueClassName: 'volt-wired-menu__text--packed',
                valueTitle: `${packed}\n${localizeWithFallback('wiredmenu.inspection.packed_variable.desc', '')}`
            };
        }

        const text = getConnectedText(variable, rawValue);

        return { ...row, value: text === null ? String(rawValue) : `${rawValue} (${text})`, editable };
    });
};

/**
 * "Give variable" choices, as AIR NewVariablePicker lists them: the catalogue's named, visible definitions for the holder's target.
 * A definition the holder already has, or that cannot be created, stays listed but unavailable.
 */
export const buildInspectionGiveDefinitions = (
    target: number,
    values: ReadonlyMap<string, number>,
    catalog: ReadonlyMap<string, IWiredVariableDiffEntry>
): InspectionGiveDefinition[] => {
    const variables = [...catalog.values()]
        .map((entry) => entry.variable)
        .filter((variable) => variable.variableTarget === target && !!variable.variableName && !variable.isInvisible)
        .sort(compareVariables);

    return variables.map((variable) => ({
        variableId: variable.variableId,
        name: variable.variableName,
        target: variable.variableTarget,
        hasValue: variable.hasValue,
        available: variable.canCreateAndDelete && !values.has(variable.variableId)
    }));
};

/** AIR Util.getIntFromString(text, INT_MIN, true): a 32-bit integer, also as 0x hex or 0b binary; anything else is null. */
export const parseInspectionInt = (text: string): number | null => {
    const match = /^([+-]?)(0x[0-9a-f]+|0b[01]+|\d+)$/i.exec(text.trim());

    if (!match) return null;

    const digits = match[2].toLowerCase();
    const magnitude = digits.startsWith('0x') ? parseInt(digits.slice(2), 16) : digits.startsWith('0b') ? parseInt(digits.slice(2), 2) : parseInt(digits, 10);
    const value = match[1] === '-' ? -magnitude : magnitude;

    return value > INT_MIN && value <= INT_MAX ? value : null;
};

/** The catalogue `variableTarget` each variable type button of the Variables tab lists. */
export const VARIABLE_TARGET_OF_TYPE: Record<VariablesElementType, number> = { furni: 0, user: 1, global: -10, context: -20 };

/** AIR WIN63-202610121709-785561319 WiredMenuOverviewTab.updateVariableListUI: the catalogue's visible variables of one target, sorted like AIR. */
export const buildVariablePickerRows = (catalog: ReadonlyMap<string, IWiredVariableDiffEntry> | null, type: VariablesElementType): IWiredVariableData[] => {
    if (!catalog) return [];

    const target = VARIABLE_TARGET_OF_TYPE[type];

    return [...catalog.values()]
        .map((entry) => entry.variable)
        .filter((variable) => !variable.isInvisible && variable.variableTarget === target)
        .sort(compareVariables);
};

/** AIR WIN63-202610121709-785561319 WiredVariable.isPersisted: permanent, shared or reference availability. */
export const isPersistedVariable = (variable: IWiredVariableData): boolean => [10, 11, 20].includes(variable.availabilityType);

/**
 * The definition box item id of a variable created in this room. The server names those "user:12", "furni:12", "room:12" or
 * "ctx:12"; built-in, smart and shared variables have no box and give null.
 */
export const customVariableItemId = (variable: IWiredVariableData): number | null => {
    const match = /^(?:user|furni|room|ctx):(\d+)$/.exec(variable.variableId);
    const itemId = match ? Number(match[1]) : 0;

    return itemId > 0 ? itemId : null;
};

const VARIABLE_TARGET_LABELS: Record<number, [string, string]> = {
    0: ['wiredfurni.params.sourcetype.furni', 'Furni'],
    1: ['wiredfurni.params.sourcetype.users', 'User'],
    [-10]: ['wiredfurni.params.sourcetype.global', 'Global'],
    [-20]: ['wiredfurni.params.sourcetype.context', 'Context']
};

/** AIR WIN63-202610121709-785561319 WiredMenuOverviewTab.updatePropertiesTableUI rows, with the PropertyTableObject texts. */
export const buildVariableProperties = (variable: IWiredVariableData | null): { key: string; value: string }[] => {
    if (!variable) return [];

    const yesNo = (value: boolean) => (value ? localizeWithFallback('wiredmenu.bool.yes', 'Yes') : localizeWithFallback('wiredmenu.bool.no', 'No'));
    const target = VARIABLE_TARGET_LABELS[variable.variableTarget];
    const rows: [string, string, string][] = [
        ['name', 'Name', variable.variableName],
        ['type', 'Type', localizeWithFallback(`wiredfurni.params.variables.idtype.${variable.variableType}`, String(variable.variableType))],
        ['target', 'Target', target ? localizeWithFallback(target[0], target[1]) : ''],
        [
            'availability',
            'Availability',
            localizeWithFallback(`wiredfurni.params.variables.availability.${variable.availabilityType}`, localizeWithFallback('wiredfurni.params.variables.availability.misc', '/'))
        ],
        ['has_value', 'Has value', yesNo(variable.hasValue)],
        ['can_write_to', 'Can write to', yesNo(variable.canWriteValue)],
        ['can_create_delete', 'Can create/delete', yesNo(variable.canCreateAndDelete)],
        ['can_intercept', 'Can intercept', yesNo(variable.canInterceptChanges)],
        ['is_always_available', 'Is always available', yesNo(variable.alwaysAvailable)],
        ['can_read_creation_time', 'Has creation time', yesNo(variable.canReadCreationTime)],
        ['can_read_last_update_time', 'Has update time', yesNo(variable.canReadLastUpdateTime)],
        ['is_text_connected', 'Is text connected', yesNo(variable.textConnector !== null)]
    ];

    return rows.map(([key, fallback, value]) => ({ key: localizeWithFallback(`wiredmenu.variable_overview.properties.${key}`, fallback), value }));
};

// AIR WIN63-202610121709-785561319 WiredMenuOverviewTab.MAX_TEXT_CONNECTIONS: a longer connector lists only its fallback.
const MAX_TEXT_CONNECTIONS = 400;

/** AIR WIN63-202610121709-785561319 WiredMenuOverviewTab.updateTextTableUI: the text connector by numeric key, then the fallback as "_". */
export const buildVariableTextValues = (variable: IWiredVariableData | null): VariableTextValue[] => {
    if (!variable || variable.textConnector === null) return [];

    const rows: VariableTextValue[] =
        variable.textConnector.length <= MAX_TEXT_CONNECTIONS
            ? [...variable.textConnector].sort((left, right) => left.key - right.key).map((entry) => ({ value: String(entry.key), text: entry.value }))
            : [];

    if (variable.hasTextConnectorFallback && variable.textConnectorFallback !== null) rows.push({ value: '_', text: variable.textConnectorFallback });

    return rows;
};
