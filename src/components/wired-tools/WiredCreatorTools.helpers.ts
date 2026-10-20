import { MONITOR_COLOR_GREEN, MONITOR_COLOR_ORANGE, MONITOR_COLOR_RED } from './WiredCreatorTools.constants';
import type { IWiredVariableData, IWiredVariableDiffEntry } from '@volt/renderer';
import { localizeWithFallback } from '../../api';
import type { InspectionGiveDefinition, InspectionVariable, MonitorSnapshot, VariableTextValue } from './WiredCreatorTools.types';

const HOTEL_TIME_FORMATTERS: Map<string, Intl.DateTimeFormat> = new Map();

export const createEmptyMonitorSnapshot = (): MonitorSnapshot => ({
    usageCurrentWindow: 0,
    usageLimitPerWindow: 0,
    isHeavy: false,
    delayedEventsPending: 0,
    delayedEventsLimit: 0,
    averageExecutionMs: 0,
    peakExecutionMs: 0,
    recursionDepthCurrent: 0,
    recursionDepthLimit: 0,
    killedRemainingSeconds: 0,
    usageWindowMs: 0,
    overloadAverageThresholdMs: 0,
    overloadPeakThresholdMs: 0,
    heavyUsageThresholdPercent: 0,
    heavyConsecutiveWindowsThreshold: 0,
    overloadConsecutiveWindowsThreshold: 0,
    heavyDelayedThresholdPercent: 0,
    logs: [],
    history: []
});

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

export const formatMonitorLatestOccurrence = (latestOccurrenceSeconds: number, nowMs: number): string => {
    if (latestOccurrenceSeconds <= 0) return '/';

    const diffMs = Math.max(0, nowMs - latestOccurrenceSeconds * 1000);
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 5) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);

    return `${diffDays}d ago`;
};

export const formatMonitorHistoryOccurrence = (occurredAtSeconds: number): string => {
    if (occurredAtSeconds <= 0) return '/';

    return new Date(occurredAtSeconds * 1000).toLocaleString('en-GB');
};

export const formatVariableTimestamp = (timestamp: number): string => {
    if (!timestamp || timestamp <= 0) return '/';

    return new Date(timestamp * 1000).toLocaleString('en-GB');
};

export const formatMonitorSource = (sourceLabel: string, sourceId: number): string => {
    const normalizedLabel = (sourceLabel || '').trim();

    if (!normalizedLabel && !(sourceId > 0)) return 'Room monitor';
    if (sourceId > 0) return `${normalizedLabel || 'wired'} (#${sourceId})`;

    return normalizedLabel;
};

export const normalizeMonitorReason = (reason: string): string => {
    const normalizedReason = (reason || '').trim();

    return normalizedReason || 'No detailed reason was recorded for this entry.';
};

/** The server's text-connector table as the variables tab lists it; undefined when there is none. */
export const toVariableTextValues = (textConnector?: Array<{ key: number; value: string }>): VariableTextValue[] | undefined => {
    if (!textConnector?.length) return undefined;

    return textConnector.map((entry) => ({ value: String(entry.key), text: entry.value }));
};

/** WiredMenuMonitorTab.colorize: share of the cap below t1 is green, below t2 orange, else (including 0/0) red. */
export const colorizeMonitorStat = (amount: number, cap: number, t1: number, t2: number): string =>
{
    const ratio = amount / cap;

    if (ratio < t1) return MONITOR_COLOR_GREEN;
    if (ratio < t2) return MONITOR_COLOR_ORANGE;

    return MONITOR_COLOR_RED;
};

// AIR WIN63-202610151745-318700621 class_4039: variableType 1 is a built-in (internal) variable, 3 a smart (~) one.
const VARIABLE_TYPE_INTERNAL = 1;
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
