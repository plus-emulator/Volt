/**
 * Client for Habbo's public Wired Variables Web API (`/api/public/rooms/{roomId}/variables...`, tag "Wired Variables" of
 * habbo.com /api/public/api-docs/). Keys travel only in the `X-Wired-Read-Key` / `X-Wired-Write-Key` headers; values are signed
 * 64-bit integers as decimal strings. After a 429 the client refuses further calls until `Retry-After` (or 10 s) has passed.
 */

export type WebApiVariableScope = 'user' | 'furni' | 'global';
export type WebApiUserTargetKind = 'users' | 'pets' | 'bots';
export type WebApiFurniTargetKind = 'furni' | 'furni-bc' | 'wall-items' | 'wall-items-bc';
export type WebApiTargetKind = WebApiUserTargetKind | WebApiFurniTargetKind;
export type WebApiHolderScope = Exclude<WebApiVariableScope, 'global'>;
export type WebApiOrderBy = 'value' | 'creation_time' | 'update_time';
export type WebApiOrderDir = 'asc' | 'desc';

/** A room variable as the explorer lists it: its name and scope (`GET /variables` gives names by scope). */
export interface WebApiVariable {
    name: string;
    scope: WebApiVariableScope;
}

/** WiredRoomVariables. */
export interface WebApiRoomVariables {
    users?: string[];
    furni?: string[];
    global?: string[];
}

/** WiredVariable: a variable without a value has only its times. */
export interface WebApiValue {
    value?: string;
    creation_time?: string;
    update_time?: string;
}

/** An item of WiredPagedVariables: the holder's id and its value. */
export interface WebApiPageItem extends WebApiValue {
    id: number;
}

export interface WebApiPage {
    items: WebApiPageItem[];
    page: number;
    size: number;
}

export interface WebApiProfileTarget {
    id: number;
    name?: string;
    unique_id?: string;
}

/** WiredVariablesProfile: one of user, pet, bot, furni, furni_bc, wall_item, wall_item_bc (none for global) and the variables. */
export interface WebApiProfile {
    user?: WebApiProfileTarget;
    pet?: WebApiProfileTarget;
    bot?: WebApiProfileTarget;
    furni?: WebApiProfileTarget;
    furni_bc?: WebApiProfileTarget;
    wall_item?: WebApiProfileTarget;
    wall_item_bc?: WebApiProfileTarget;
    variables: Record<string, WebApiValue>;
}

export interface WebApiBatchOperation {
    op_id?: string;
    method: 'GET' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    body?: { value: string };
}

export interface WebApiBatchResult {
    op_id?: string | null;
    status: number;
    body?: WebApiValue;
    error?: { code: string; message: string };
}

export interface WebApiRateLimit {
    limit: number | null;
    remaining: number | null;
    reset: number | null;
}

/** Error codes the API answers (`{"error": code}`), and the client's own for failures before an answer. */
export const WEB_API_ERRORS = {
    keyMissing: 'wired.variables.key_missing',
    keyInvalid: 'wired.variables.key_invalid',
    apiDisabled: 'wired.variables.api_disabled',
    invalidTarget: 'wired.variables.invalid_target',
    invalidValue: 'wired.variables.invalid_value',
    operationNotAllowed: 'wired.variables.operation_not_allowed',
    userNotParticipating: 'wired.variables.user_not_participating',
    bulkDeleteEmpty: 'wired.variables.bulk_delete_empty',
    bulkDeleteInvalidVariable: 'wired.variables.bulk_delete_invalid_variable',
    bulkDeleteNotEnabled: 'wired.variables.bulk_delete_not_enabled',
    batchEmpty: 'wired.variables.batch_empty',
    batchLimitExceeded: 'wired.variables.batch_limit_exceeded',
    entityNotFound: 'wired.variables.entity_not_found',
    notFound: 'wired.variables.not_found',
    tooManyRequests: 'wired.variables.too_many_requests',
    roomNotFound: 'room.not_found',
    /** habbo.com: a room id that names no room, or an entity id that is not a number. */
    missing: 'not-found',
    /** habbo.com: a value that is present but not a decimal string. */
    requestFailed: 'request-failed-non-200',
    noKey: 'no_key',
    timeout: 'timeout',
    network: 'network',
    invalidResponse: 'invalid_response',
    http: 'http_error'
} as const;

export class VariablesWebApiError extends Error {
    public readonly status: number;
    public readonly code: string;
    public readonly retryAfterSeconds: number | null;

    constructor(status: number, code: string, message: string, retryAfterSeconds: number | null = null) {
        super(message);
        this.name = 'VariablesWebApiError';
        this.status = status;
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

export interface VariablesWebApiClientOptions {
    baseUrl: string;
    roomId: number;
    readKey?: string;
    writeKey?: string;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
    now?: () => number;
}

export const DEFAULT_WEB_API_TIMEOUT_MS = 10_000;
/** Used when a 429 comes without a readable `Retry-After`. */
export const DEFAULT_RETRY_AFTER_SECONDS = 10;
/** `requests` of a batch holds 1 to 50 operations (WiredBatchRequest). */
export const MAX_WEB_API_BATCH = 50;

export const READ_KEY_HEADER = 'X-Wired-Read-Key';
export const WRITE_KEY_HEADER = 'X-Wired-Write-Key';

type KeyKind = 'read' | 'write' | 'both';

interface RequestOptions {
    key: KeyKind;
    body?: unknown;
    query?: Record<string, string | number | undefined>;
}

export const parseRetryAfter = (value: string | null, nowMs: number): number | null => {
    if (!value) return null;

    const trimmed = value.trim();

    if (/^\d+$/.test(trimmed)) return Number(trimmed);

    const date = Date.parse(trimmed);

    if (Number.isNaN(date)) return null;

    return Math.max(0, Math.ceil((date - nowMs) / 1000));
};

const readHeaderNumber = (headers: Headers, name: string): number | null => {
    const value = headers.get(name);

    if (value === null || value.trim() === '') return null;

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
};

const segment = (value: string | number): string => encodeURIComponent(String(value));

const readErrorCode = async (response: Response): Promise<string | null> => {
    try {
        const body = (await response.json()) as { error?: unknown };

        return typeof body?.error === 'string' ? body.error : null;
    } catch {
        return null;
    }
};

/** The profile's target, whichever kind it names. */
export const profileTarget = (profile: WebApiProfile | null | undefined): WebApiProfileTarget | null =>
    profile?.user ?? profile?.pet ?? profile?.bot ?? profile?.furni ?? profile?.furni_bc ?? profile?.wall_item ?? profile?.wall_item_bc ?? null;

/** `GET /variables` as a flat list. */
export const roomVariablesToList = (variables: WebApiRoomVariables | null | undefined): WebApiVariable[] => [
    ...(variables?.users ?? []).map((name) => ({ name, scope: 'user' as const })),
    ...(variables?.furni ?? []).map((name) => ({ name, scope: 'furni' as const })),
    ...(variables?.global ?? []).map((name) => ({ name, scope: 'global' as const }))
];

export const createVariablesWebApiClient = (options: VariablesWebApiClientOptions) => {
    const { baseUrl, roomId, readKey = '', writeKey = '', timeoutMs = DEFAULT_WEB_API_TIMEOUT_MS } = options;
    const fetchImpl = options.fetchImpl ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
    const now = options.now ?? (() => Date.now());
    const roomBase = `${baseUrl.replace(/\/+$/, '')}/api/public/rooms/${segment(roomId)}`;

    let blockedUntil = 0;
    let rateLimit: WebApiRateLimit = { limit: null, remaining: null, reset: null };

    const request = async <T>(method: string, path: string, requestOptions: RequestOptions): Promise<T> => {
        const current = now();

        if (blockedUntil > current) {
            const seconds = Math.ceil((blockedUntil - current) / 1000);

            throw new VariablesWebApiError(429, WEB_API_ERRORS.tooManyRequests, 'Too many requests', seconds);
        }

        const headers: Record<string, string> = { Accept: 'application/json' };

        if (requestOptions.key !== 'write' && readKey) headers[READ_KEY_HEADER] = readKey;
        if (requestOptions.key !== 'read' && writeKey) headers[WRITE_KEY_HEADER] = writeKey;

        if (!headers[READ_KEY_HEADER] && !headers[WRITE_KEY_HEADER]) {
            throw new VariablesWebApiError(0, WEB_API_ERRORS.noKey, requestOptions.key === 'write' ? 'A write key is needed' : 'A read key is needed');
        }

        const query = Object.entries(requestOptions.query ?? {})
            .filter(([, value]) => value !== undefined && value !== '')
            .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`)
            .join('&');
        const url = `${roomBase}${path}${query ? `?${query}` : ''}`;
        const hasBody = requestOptions.body !== undefined;

        if (hasBody) headers['Content-Type'] = 'application/json';

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let response: Response;

        try {
            response = await fetchImpl(url, {
                method,
                headers,
                body: hasBody ? JSON.stringify(requestOptions.body) : undefined,
                signal: controller.signal,
                credentials: 'omit',
                cache: 'no-store',
                referrerPolicy: 'no-referrer'
            });
        } catch (error) {
            if (controller.signal.aborted) throw new VariablesWebApiError(0, WEB_API_ERRORS.timeout, 'The request timed out');

            throw new VariablesWebApiError(0, WEB_API_ERRORS.network, error instanceof Error && error.message ? error.message : 'Network error');
        } finally {
            clearTimeout(timer);
        }

        rateLimit = {
            limit: readHeaderNumber(response.headers, 'X-RateLimit-Limit'),
            remaining: readHeaderNumber(response.headers, 'X-RateLimit-Remaining'),
            reset: readHeaderNumber(response.headers, 'X-RateLimit-Reset')
        };

        if (!response.ok) {
            const code = await readErrorCode(response);
            let retryAfter: number | null = null;

            if (response.status === 429) {
                retryAfter = parseRetryAfter(response.headers.get('Retry-After'), now()) ?? DEFAULT_RETRY_AFTER_SECONDS;
                blockedUntil = now() + retryAfter * 1000;
            }

            throw new VariablesWebApiError(response.status, code ?? WEB_API_ERRORS.http, code ?? `HTTP ${response.status}`, retryAfter);
        }

        if (response.status === 204) return undefined as T;

        try {
            return (await response.json()) as T;
        } catch {
            throw new VariablesWebApiError(response.status, WEB_API_ERRORS.invalidResponse, 'The server sent an unreadable response');
        }
    };

    const entryPath = (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number) =>
        `/variables/${segment(scope)}/${segment(name)}/${segment(targetKind)}/${segment(entityId)}`;

    return {
        get rateLimit(): WebApiRateLimit {
            return rateLimit;
        },
        get blockedForSeconds(): number {
            return Math.max(0, Math.ceil((blockedUntil - now()) / 1000));
        },
        hasReadAccess: !!readKey,
        hasWriteAccess: !!writeKey,

        listVariables: () => request<WebApiRoomVariables>('GET', '/variables', { key: 'read' }).then(roomVariablesToList),

        getEntry: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number) =>
            request<WebApiValue>('GET', entryPath(scope, name, targetKind, entityId), { key: 'read' }),

        putEntry: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number, value: string) =>
            request<WebApiValue>('PUT', entryPath(scope, name, targetKind, entityId), { key: 'write', body: { value } }),

        patchEntry: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number, value: string) =>
            request<WebApiValue>('PATCH', entryPath(scope, name, targetKind, entityId), { key: 'write', body: { value } }),

        deleteEntry: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number) =>
            request<void>('DELETE', entryPath(scope, name, targetKind, entityId), { key: 'write' }),

        listEntries: (
            scope: WebApiHolderScope,
            name: string,
            targetKind: WebApiTargetKind,
            page: number,
            size: number,
            orderBy?: WebApiOrderBy,
            orderDir?: WebApiOrderDir
        ) =>
            request<WebApiPage>('GET', `/variables/${segment(scope)}/${segment(name)}/${segment(targetKind)}`, {
                key: 'read',
                query: { order_by: orderBy, order_dir: orderDir, page, size }
            }),

        countEntries: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind) =>
            request<{ count: number }>('GET', `/variables/${segment(scope)}/${segment(name)}/${segment(targetKind)}/count`, { key: 'read' }).then(
                (body) => body?.count ?? 0
            ),

        bulkDelete: (names: string[]) => request<void>('POST', '/variables/bulk-delete', { key: 'write', body: { variables: names } }),

        batch: (scope: WebApiHolderScope, name: string, requests: WebApiBatchOperation[]) =>
            request<{ results: WebApiBatchResult[] }>('POST', `/variables/${segment(scope)}/${segment(name)}/batch`, {
                key: 'both',
                body: { requests }
            }).then((body) => body?.results ?? []),

        getGlobal: (name: string) => request<WebApiValue>('GET', `/variables/global/${segment(name)}`, { key: 'read' }),

        patchGlobal: (name: string, value: string) => request<WebApiValue>('PATCH', `/variables/global/${segment(name)}`, { key: 'write', body: { value } }),

        getUserProfileByName: (username: string) => request<WebApiProfile>('GET', '/variables_profile/user/users', { key: 'read', query: { name: username } }),

        getProfile: (scope: WebApiHolderScope, targetKind: WebApiTargetKind, entityId: number) =>
            request<WebApiProfile>('GET', `/variables_profile/${segment(scope)}/${segment(targetKind)}/${segment(entityId)}`, { key: 'read' }),

        patchProfile: (scope: WebApiHolderScope, targetKind: WebApiTargetKind, entityId: number, variables: Record<string, string | null>) =>
            request<WebApiProfile>('PATCH', `/variables_profile/${segment(scope)}/${segment(targetKind)}/${segment(entityId)}`, {
                key: 'write',
                body: { variables }
            }),

        deleteUserProfile: (targetKind: WebApiUserTargetKind, entityId: number) =>
            request<void>('DELETE', `/variables_profile/user/${segment(targetKind)}/${segment(entityId)}`, { key: 'write' }),

        getGlobalProfile: () => request<WebApiProfile>('GET', '/variables_profile/global', { key: 'read' }),

        patchGlobalProfile: (variables: Record<string, string>) =>
            request<WebApiProfile>('PATCH', '/variables_profile/global', { key: 'write', body: { variables } })
    };
};

export type VariablesWebApiClient = ReturnType<typeof createVariablesWebApiClient>;
