import type { IWiredVariableHolder } from '@volt/renderer';
import {
    profileTarget,
    VariablesWebApiError,
    WEB_API_ERRORS,
    WebApiFurniTargetKind,
    WebApiHolderScope,
    WebApiOrderBy,
    WebApiOrderDir,
    WebApiPageItem,
    WebApiProfile,
    WebApiTargetKind,
    WebApiUserTargetKind,
    WebApiVariable
} from './variablesWebApi';
import { normalizeWebApiBaseUrl, WebApiHotel } from './WiredWebApi';

/** Pure pieces of the Variables Explorer window. */

export interface ExplorerConnectInput {
    hotelUrl: string;
    roomId: string;
    readKey: string;
    writeKey: string;
}

export interface ExplorerConnection {
    hotelUrl: string;
    roomId: number;
    readKey: string;
    writeKey: string;
}

export type ExplorerConnectField = keyof ExplorerConnectInput;

const KEY_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;
const MAX_ROOM_ID = 2147483647;

export const sanitizeRoomIdInput = (value: string): string => (value ?? '').replace(/[^0-9]/g, '').slice(0, 10);

export const validateExplorerConnect = (
    input: ExplorerConnectInput,
    hotels: WebApiHotel[]
): { errors: Partial<Record<ExplorerConnectField, string>>; connection: ExplorerConnection | null } => {
    const errors: Partial<Record<ExplorerConnectField, string>> = {};
    const hotelUrl = normalizeWebApiBaseUrl(input.hotelUrl);
    const readKey = (input.readKey ?? '').trim();
    const writeKey = (input.writeKey ?? '').trim();
    const roomText = (input.roomId ?? '').trim();
    const roomId = /^[0-9]{1,10}$/.test(roomText) ? Number(roomText) : 0;

    if (!hotelUrl || !hotels.some((hotel) => hotel.url === hotelUrl)) errors.hotelUrl = 'Pick a hotel';
    if (roomId <= 0 || roomId > MAX_ROOM_ID) errors.roomId = 'Enter a room id';
    if (readKey && !KEY_PATTERN.test(readKey)) errors.readKey = 'This is not a valid key';
    if (writeKey && !KEY_PATTERN.test(writeKey)) errors.writeKey = 'This is not a valid key';
    // Reads take the read key only; the write key alone opens nothing to browse.
    if (!readKey) errors.readKey = 'Enter a read key';

    if (Object.keys(errors).length) return { errors, connection: null };

    return { errors, connection: { hotelUrl, roomId, readKey, writeKey } };
};

const REMEMBER_PREFIX = 'volt.variables_explorer.keys';

export const rememberedKeysStorageKey = (hotelUrl: string, roomId: number): string => `${REMEMBER_PREFIX}:${hotelUrl}:${roomId}`;

export const loadRememberedKeys = (
    hotelUrl: string,
    roomId: number,
    storage: Storage | null = safeLocalStorage()
): { readKey: string; writeKey: string } | null => {
    if (!storage || !hotelUrl || !roomId) return null;

    try {
        const raw = storage.getItem(rememberedKeysStorageKey(hotelUrl, roomId));

        if (!raw) return null;

        const parsed = JSON.parse(raw) as { readKey?: unknown; writeKey?: unknown };

        return {
            readKey: typeof parsed?.readKey === 'string' ? parsed.readKey : '',
            writeKey: typeof parsed?.writeKey === 'string' ? parsed.writeKey : ''
        };
    } catch {
        return null;
    }
};

export const saveRememberedKeys = (connection: ExplorerConnection, remember: boolean, storage: Storage | null = safeLocalStorage()): void => {
    if (!storage) return;

    const key = rememberedKeysStorageKey(connection.hotelUrl, connection.roomId);

    try {
        if (remember) storage.setItem(key, JSON.stringify({ readKey: connection.readKey, writeKey: connection.writeKey }));
        else storage.removeItem(key);
    } catch {}
};

function safeLocalStorage(): Storage | null {
    try {
        return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
        return null;
    }
}

export const USER_TARGET_KINDS: WebApiUserTargetKind[] = ['users', 'pets', 'bots'];
export const FURNI_TARGET_KINDS: WebApiFurniTargetKind[] = ['furni', 'wall-items', 'furni-bc', 'wall-items-bc'];

export const targetKindsOf = (scope: WebApiHolderScope): WebApiTargetKind[] => (scope === 'furni' ? FURNI_TARGET_KINDS : USER_TARGET_KINDS);

export const targetKindLabel = (kind: string): string => {
    switch (kind) {
        case 'users':
            return 'Habbo';
        case 'pets':
            return 'Pet';
        case 'bots':
            return 'Bot';
        case 'furni':
            return 'Floor furni';
        case 'wall-items':
            return 'Wall furni';
        case 'furni-bc':
            return 'Builders Club floor furni';
        case 'wall-items-bc':
            return 'Builders Club wall furni';
        default:
            return kind || 'Room';
    }
};

export const holderScopeOfKind = (kind: WebApiTargetKind): WebApiHolderScope => (FURNI_TARGET_KINDS.includes(kind as WebApiFurniTargetKind) ? 'furni' : 'user');

export interface ExplorerSortOption {
    id: string;
    label: string;
    orderBy: WebApiOrderBy;
    orderDir: WebApiOrderDir;
}

/** The list's `order_by` (value, creation_time, update_time) and `order_dir`. */
export const EXPLORER_SORT_OPTIONS: ExplorerSortOption[] = [
    { id: 'value_desc', label: 'Highest value', orderBy: 'value', orderDir: 'desc' },
    { id: 'value_asc', label: 'Lowest value', orderBy: 'value', orderDir: 'asc' },
    { id: 'created_asc', label: 'Oldest', orderBy: 'creation_time', orderDir: 'asc' },
    { id: 'created_desc', label: 'Newest', orderBy: 'creation_time', orderDir: 'desc' },
    { id: 'updated_desc', label: 'Last updated', orderBy: 'update_time', orderDir: 'desc' }
];

export const sortOptionById = (id: string): ExplorerSortOption => EXPLORER_SORT_OPTIONS.find((option) => option.id === id) ?? EXPLORER_SORT_OPTIONS[0];

/** Milliseconds of an API date-time (`2023-11-16T22:13:20Z`), 0 when there is none. */
export const parseApiTime = (time: string | null | undefined): number => {
    const parsed = time ? Date.parse(time) : NaN;

    return Number.isFinite(parsed) ? parsed : 0;
};

export const formatApiTime = (time: string | null | undefined): string => {
    const millis = parseApiTime(time);

    if (millis <= 0) return '';

    const date = new Date(millis);
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/** The server's holder kinds as the owners table knows them (`HOLDER_TYPE_USER` / `HOLDER_TYPE_FURNI`). */
export const webApiEntryToHolder = (entry: WebApiPageItem, scope: WebApiHolderScope, kind: WebApiTargetKind): IWiredVariableHolder => ({
    entityType: scope === 'furni' ? 2 : 1,
    entityId: entry.id,
    entityName: `${targetKindLabel(kind)} #${entry.id}`,
    storage: {
        value: entry.value === undefined ? 0 : Number(entry.value),
        creationTime: parseApiTime(entry.creation_time),
        creationTimeStr: formatApiTime(entry.creation_time),
        lastUpdateTime: parseApiTime(entry.update_time),
        lastUpdateTimeStr: formatApiTime(entry.update_time)
    }
});

export interface ExplorerProfileEntry {
    name: string;
    hasValue: boolean;
    /** The exact value, a signed 64-bit decimal string. */
    value: string | null;
    createdAt: number;
    updatedAt: number;
}

/** A profile's variables in name order. A variable without a value comes with its times only. */
export const profileToEntries = (profile: WebApiProfile | null): ExplorerProfileEntry[] => {
    if (!profile?.variables) return [];

    return Object.entries(profile.variables)
        .map(([name, stored]) => ({
            name,
            hasValue: typeof stored?.value === 'string',
            value: typeof stored?.value === 'string' ? stored.value : null,
            createdAt: parseApiTime(stored?.creation_time),
            updatedAt: parseApiTime(stored?.update_time)
        }))
        .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
};

/** Variables of the scope that the holder does not have yet. */
export const giveableVariables = (variables: WebApiVariable[], scope: WebApiHolderScope, entries: ExplorerProfileEntry[]): WebApiVariable[] =>
    variables
        .filter((variable) => variable.scope === scope && !entries.some((entry) => entry.name === variable.name))
        .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));

const INT64_MIN = -(BigInt(2) ** BigInt(63));
const INT64_MAX = BigInt(2) ** BigInt(63) - BigInt(1);

/** A signed 64-bit integer typed by the user, as the API's decimal string, or `null`. */
export const parseInt64 = (text: string): string | null => {
    const trimmed = (text ?? '').trim();

    if (!/^-?\d{1,19}$/.test(trimmed)) return null;

    const value = BigInt(trimmed);

    return value >= INT64_MIN && value <= INT64_MAX ? value.toString() : null;
};

/** `value + amount` as a decimal string, or `null` when it leaves the signed 64-bit range. */
export const addInt64 = (value: string, amount: string): string | null => {
    try {
        const sum = BigInt(value) + BigInt(amount);

        return sum >= INT64_MIN && sum <= INT64_MAX ? sum.toString() : null;
    } catch {
        return null;
    }
};

/** The id writes go to, from a profile (its user, pet, bot or furni). */
export const profileEntityId = (profile: WebApiProfile | null): number | null => {
    const id = profileTarget(profile)?.id;

    return typeof id === 'number' ? id : null;
};

const ERROR_MESSAGES: Record<string, string> = {
    [WEB_API_ERRORS.keyMissing]: 'This room has no key of that kind, or none was sent.',
    [WEB_API_ERRORS.keyInvalid]: 'The key was not accepted.',
    [WEB_API_ERRORS.apiDisabled]: 'The Variables Web API is disabled for this room.',
    [WEB_API_ERRORS.invalidTarget]: 'That holder or variable name is not valid.',
    [WEB_API_ERRORS.invalidValue]: 'Enter a whole number.',
    [WEB_API_ERRORS.requestFailed]: 'Enter a whole number.',
    [WEB_API_ERRORS.operationNotAllowed]: 'This variable cannot be changed.',
    [WEB_API_ERRORS.userNotParticipating]: 'That user is not in the room.',
    [WEB_API_ERRORS.bulkDeleteNotEnabled]: 'This write key may not bulk delete. Allow mass deletion in the Web API add-on first.',
    [WEB_API_ERRORS.bulkDeleteInvalidVariable]: 'That variable cannot be bulk deleted.',
    [WEB_API_ERRORS.entityNotFound]: 'No such holder.',
    [WEB_API_ERRORS.notFound]: 'Not found.',
    [WEB_API_ERRORS.roomNotFound]: 'The room is not loaded right now.',
    [WEB_API_ERRORS.missing]: 'There is no such room.',
    [WEB_API_ERRORS.timeout]: 'The hotel did not answer in time.',
    [WEB_API_ERRORS.network]: 'The hotel could not be reached.'
};

export const explorerErrorMessage = (error: unknown): string => {
    if (error instanceof VariablesWebApiError) {
        if (error.code === WEB_API_ERRORS.tooManyRequests) return `Too many requests. Try again in ${error.retryAfterSeconds ?? 10} s.`;
        if (error.code === WEB_API_ERRORS.noKey) return error.message;

        return ERROR_MESSAGES[error.code] ?? (error.message || 'Something went wrong.');
    }

    return error instanceof Error && error.message ? error.message : 'Something went wrong.';
};
