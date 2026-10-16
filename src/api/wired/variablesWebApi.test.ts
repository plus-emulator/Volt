import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVariablesWebApiClient, parseRetryAfter, profileTarget, VariablesWebApiError } from './variablesWebApi';

const READ_KEY = 'r'.repeat(43);
const WRITE_KEY = 'w'.repeat(43);

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const makeClient = (fetchImpl: typeof fetch, overrides: Partial<Parameters<typeof createVariablesWebApiClient>[0]> = {}) =>
    createVariablesWebApiClient({ baseUrl: 'https://hotel.example/', roomId: 77, readKey: READ_KEY, writeKey: WRITE_KEY, fetchImpl, ...overrides });

describe('createVariablesWebApiClient', () => {
    afterEach(() => vi.useRealTimers());

    it('reads with the read key in X-Wired-Read-Key and never in the url', async () => {
        const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
            jsonResponse(200, { users: ['score'], furni: ['lamp'], global: ['round'] })
        );

        const variables = await makeClient(fetchImpl as unknown as typeof fetch).listVariables();

        expect(variables).toEqual([
            { name: 'score', scope: 'user' },
            { name: 'lamp', scope: 'furni' },
            { name: 'round', scope: 'global' }
        ]);
        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe('https://hotel.example/api/public/rooms/77/variables');
        expect(String(url)).not.toContain(READ_KEY);
        expect(init.headers as Record<string, string>).toMatchObject({ 'X-Wired-Read-Key': READ_KEY });
        expect((init.headers as Record<string, string>)['X-Wired-Write-Key']).toBeUndefined();
        expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
        expect(init.credentials).toBe('omit');
    });

    it('writes with the write key and the value as a decimal string', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(200, { value: '9007199254740993', creation_time: '2023-11-16T22:13:20Z' }));
        const client = makeClient(fetchImpl as unknown as typeof fetch);

        await client.patchEntry('user', 'score', 'users', 5, '9007199254740993');

        const calls = fetchImpl.mock.calls as unknown as [string, RequestInit][];
        expect(calls[0][0]).toBe('https://hotel.example/api/public/rooms/77/variables/user/score/users/5');
        expect(calls[0][1].method).toBe('PATCH');
        expect(calls[0][1].body).toBe('{"value":"9007199254740993"}');
        expect(calls[0][1].headers as Record<string, string>).toMatchObject({ 'X-Wired-Write-Key': WRITE_KEY, 'Content-Type': 'application/json' });
        expect((calls[0][1].headers as Record<string, string>)['X-Wired-Read-Key']).toBeUndefined();
    });

    it('sends both keys with a batch', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(200, { results: [{ op_id: 'a', status: 204 }] }));

        const results = await makeClient(fetchImpl as unknown as typeof fetch).batch('user', 'score', [{ op_id: 'a', method: 'DELETE', path: 'users/4' }]);

        const [url, init] = (fetchImpl.mock.calls as unknown as [string, RequestInit][])[0];
        expect(url).toBe('https://hotel.example/api/public/rooms/77/variables/user/score/batch');
        expect(init.headers as Record<string, string>).toMatchObject({ 'X-Wired-Read-Key': READ_KEY, 'X-Wired-Write-Key': WRITE_KEY });
        expect(init.body).toBe('{"requests":[{"op_id":"a","method":"DELETE","path":"users/4"}]}');
        expect(results).toEqual([{ op_id: 'a', status: 204 }]);
    });

    it('refuses a call without the key it needs before calling the server', async () => {
        const fetchImpl = vi.fn();
        const client = makeClient(fetchImpl as unknown as typeof fetch, { writeKey: '' });

        await expect(client.deleteEntry('furni', 'lamp', 'furni', 9)).rejects.toMatchObject({ code: 'no_key' });
        await expect(makeClient(fetchImpl as unknown as typeof fetch, { readKey: '' }).getEntry('user', 'score', 'users', 1)).rejects.toMatchObject({
            code: 'no_key'
        });
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(client.hasWriteAccess).toBe(false);
    });

    it('takes the error code from the body as habbo.com sends it', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(403, { error: 'wired.variables.bulk_delete_not_enabled' }));

        const error = await makeClient(fetchImpl as unknown as typeof fetch)
            .bulkDelete(['score'])
            .catch((caught) => caught);

        expect(error).toBeInstanceOf(VariablesWebApiError);
        expect(error).toMatchObject({ status: 403, code: 'wired.variables.bulk_delete_not_enabled' });
        expect((fetchImpl.mock.calls as unknown as [string, RequestInit][])[0][1].body).toBe('{"variables":["score"]}');

        fetchImpl.mockImplementationOnce(async () => new Response('<pre>Cannot GET</pre>', { status: 404, headers: { 'Content-Type': 'text/html' } }));
        await expect(makeClient(fetchImpl as unknown as typeof fetch).listVariables()).rejects.toMatchObject({ status: 404, code: 'http_error' });
    });

    it('stops calling the server after a 429 until Retry-After has passed', async () => {
        let now = 1_000_000;
        const fetchImpl = vi.fn(async () => jsonResponse(429, { error: 'wired.variables.too_many_requests' }, { 'Retry-After': '7' }));
        const client = makeClient(fetchImpl as unknown as typeof fetch, { now: () => now });

        await expect(client.listVariables()).rejects.toMatchObject({ code: 'wired.variables.too_many_requests', retryAfterSeconds: 7 });
        await expect(client.listVariables()).rejects.toMatchObject({ code: 'wired.variables.too_many_requests', retryAfterSeconds: 7 });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(client.blockedForSeconds).toBe(7);

        now += 7_001;
        fetchImpl.mockImplementationOnce(async () => jsonResponse(200, {}));

        await expect(client.listVariables()).resolves.toEqual([]);
        expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('aborts a request that runs past the timeout', async () => {
        vi.useFakeTimers();

        const fetchImpl = vi.fn(
            (_input: RequestInfo | URL, init?: RequestInit) =>
                new Promise<Response>((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
        );
        const pending = makeClient(fetchImpl as unknown as typeof fetch, { timeoutMs: 500 })
            .listVariables()
            .catch((caught) => caught);

        await vi.advanceTimersByTimeAsync(500);

        expect(await pending).toMatchObject({ code: 'timeout' });
    });

    it('sends order_by, order_dir, page and size as query parameters', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(200, { items: [], page: 2, size: 50 }));

        await makeClient(fetchImpl as unknown as typeof fetch).listEntries('furni', 'lamp', 'wall-items', 2, 50, 'value', 'desc');

        expect((fetchImpl.mock.calls as unknown as [string][])[0][0]).toBe(
            'https://hotel.example/api/public/rooms/77/variables/furni/lamp/wall-items?order_by=value&order_dir=desc&page=2&size=50'
        );
    });

    it('reads the rate limit headers and treats 204 as success', async () => {
        const fetchImpl = vi.fn(
            async () => new Response(null, { status: 204, headers: { 'X-RateLimit-Limit': '60', 'X-RateLimit-Remaining': '59', 'X-RateLimit-Reset': '10' } })
        );
        const client = makeClient(fetchImpl as unknown as typeof fetch);

        await expect(client.deleteUserProfile('users', 3)).resolves.toBeUndefined();
        expect(client.rateLimit).toEqual({ limit: 60, remaining: 59, reset: 10 });
    });

    it('looks users up by name with an encoded query', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(200, { user: { id: 4, name: 'Bob & Co' }, variables: {} }));

        const profile = await makeClient(fetchImpl as unknown as typeof fetch).getUserProfileByName('Bob & Co');

        expect((fetchImpl.mock.calls as unknown as [string][])[0][0]).toBe(
            'https://hotel.example/api/public/rooms/77/variables_profile/user/users?name=Bob%20%26%20Co'
        );
        expect(profileTarget(profile)).toEqual({ id: 4, name: 'Bob & Co' });
    });
});

describe('parseRetryAfter', () => {
    it('reads seconds and http dates', () => {
        expect(parseRetryAfter('12', 0)).toBe(12);
        expect(parseRetryAfter(new Date(30_000).toUTCString(), 0)).toBe(30);
        expect(parseRetryAfter('soon', 0)).toBeNull();
        expect(parseRetryAfter(null, 0)).toBeNull();
    });
});
