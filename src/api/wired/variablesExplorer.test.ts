import { describe, expect, it } from 'vitest';
import {
    explorerErrorMessage,
    giveableVariables,
    loadRememberedKeys,
    addInt64,
    parseInt64,
    profileEntityId,
    profileToEntries,
    rememberedKeysStorageKey,
    sanitizeRoomIdInput,
    saveRememberedKeys,
    validateExplorerConnect,
    webApiEntryToHolder
} from './variablesExplorer';
import { VariablesWebApiError, WebApiVariable } from './variablesWebApi';

const HOTELS = [{ name: 'Main', url: 'https://main.example' }];
const KEY = 'A1_b-'.repeat(8) + 'xyz';

const memoryStorage = (): Storage => {
    const map = new Map<string, string>();

    return {
        get length() {
            return map.size;
        },
        clear: () => map.clear(),
        getItem: (key) => map.get(key) ?? null,
        key: (index) => [...map.keys()][index] ?? null,
        removeItem: (key) => void map.delete(key),
        setItem: (key, value) => void map.set(key, value)
    };
};

describe('validateExplorerConnect', () => {
    it('accepts a hotel, a room id and one key', () => {
        const result = validateExplorerConnect({ hotelUrl: 'https://main.example/', roomId: ' 42 ', readKey: KEY, writeKey: '' }, HOTELS);

        expect(result.errors).toEqual({});
        expect(result.connection).toEqual({ hotelUrl: 'https://main.example', roomId: 42, readKey: KEY, writeKey: '' });
    });

    it('needs a known hotel, a positive room id and at least one key', () => {
        const result = validateExplorerConnect({ hotelUrl: 'https://elsewhere.example', roomId: '0', readKey: '', writeKey: '' }, HOTELS);

        expect(result.connection).toBeNull();
        expect(Object.keys(result.errors).sort()).toEqual(['hotelUrl', 'readKey', 'roomId']);
    });

    it('rejects keys that cannot be api keys', () => {
        const result = validateExplorerConnect(
            { hotelUrl: 'https://main.example', roomId: '5', readKey: 'short', writeKey: 'has spaces in it and more text here' },
            HOTELS
        );

        expect(result.errors.readKey).toBeTruthy();
        expect(result.errors.writeKey).toBeTruthy();
    });

    it('keeps only digits in the room id field', () => {
        expect(sanitizeRoomIdInput('12a3-4')).toBe('1234');
    });
});

describe('remembered keys', () => {
    const connection = { hotelUrl: 'https://main.example', roomId: 9, readKey: KEY, writeKey: '' };

    it('stores keys per hotel and room only when asked', () => {
        const storage = memoryStorage();

        saveRememberedKeys(connection, false, storage);
        expect(storage.length).toBe(0);

        saveRememberedKeys(connection, true, storage);
        expect(loadRememberedKeys('https://main.example', 9, storage)).toEqual({ readKey: KEY, writeKey: '' });
        expect(loadRememberedKeys('https://main.example', 10, storage)).toBeNull();

        saveRememberedKeys(connection, false, storage);
        expect(storage.getItem(rememberedKeysStorageKey('https://main.example', 9))).toBeNull();
    });

    it('survives a storage that throws or holds garbage', () => {
        const throwing = {
            ...memoryStorage(),
            getItem: () => {
                throw new Error('denied');
            },
            setItem: () => {
                throw new Error('denied');
            }
        } as Storage;
        const garbage = memoryStorage();
        garbage.setItem(rememberedKeysStorageKey('https://main.example', 9), '{not json');

        expect(() => saveRememberedKeys(connection, true, throwing)).not.toThrow();
        expect(loadRememberedKeys('https://main.example', 9, throwing)).toBeNull();
        expect(loadRememberedKeys('https://main.example', 9, garbage)).toBeNull();
    });
});

describe('explorer data helpers', () => {
    const variables: WebApiVariable[] = [
        { name: 'score', scope: 'user' },
        { name: 'vip', scope: 'user' },
        { name: 'level', scope: 'user' },
        { name: 'lamp', scope: 'furni' }
    ];

    it('lists a profile by name; a variable without a value has only its times', () => {
        const entries = profileToEntries({
            variables: {
                vip: { creation_time: '2023-11-16T22:13:20Z', update_time: '2023-11-16T22:13:20Z' },
                score: { value: '9007199254740993', creation_time: '2023-11-17T08:00:00Z', update_time: '2023-11-17T09:30:00Z' }
            }
        });

        expect(entries).toEqual([
            {
                name: 'score',
                hasValue: true,
                value: '9007199254740993',
                createdAt: Date.parse('2023-11-17T08:00:00Z'),
                updatedAt: Date.parse('2023-11-17T09:30:00Z')
            },
            { name: 'vip', hasValue: false, value: null, createdAt: Date.parse('2023-11-16T22:13:20Z'), updatedAt: Date.parse('2023-11-16T22:13:20Z') }
        ]);
        expect(profileToEntries(null)).toEqual([]);
    });

    it('offers only variables of the scope the holder does not have', () => {
        const entries = profileToEntries({ variables: { score: { value: '1' } } });

        expect(giveableVariables(variables, 'user', entries).map((variable) => variable.name)).toEqual(['level', 'vip']);
    });

    it('turns a listed value into a holder row', () => {
        const holder = webApiEntryToHolder(
            { id: 7, value: '3', creation_time: '2023-11-16T22:13:20Z', update_time: '2023-11-17T09:30:00Z' },
            'furni',
            'wall-items'
        );

        expect(holder).toMatchObject({
            entityType: 2,
            entityId: 7,
            entityName: 'Wall furni #7',
            storage: { value: 3, creationTime: Date.parse('2023-11-16T22:13:20Z'), lastUpdateTime: Date.parse('2023-11-17T09:30:00Z') }
        });
        expect(holder.storage.creationTimeStr).not.toBe('');
    });

    it('parses and adds signed 64-bit integers as decimal strings', () => {
        expect(parseInt64('-15')).toBe('-15');
        expect(parseInt64(' 9223372036854775807 ')).toBe('9223372036854775807');
        expect(parseInt64('9223372036854775808')).toBeNull();
        expect(parseInt64('1.5')).toBeNull();
        expect(parseInt64('')).toBeNull();
        expect(addInt64('9007199254740993', '2')).toBe('9007199254740995');
        expect(addInt64('9223372036854775807', '1')).toBeNull();
    });

    it('names the profile target whatever its kind', () => {
        expect(profileEntityId({ wall_item: { id: 91 }, variables: {} })).toBe(91);
        expect(profileEntityId({ variables: {} })).toBeNull();
    });

    it('explains the official error codes', () => {
        expect(explorerErrorMessage(new VariablesWebApiError(429, 'wired.variables.too_many_requests', 'x', 12))).toBe('Too many requests. Try again in 12 s.');
        expect(explorerErrorMessage(new VariablesWebApiError(403, 'wired.variables.key_invalid', 'x'))).toBe('The key was not accepted.');
        expect(explorerErrorMessage(new VariablesWebApiError(404, 'not-found', 'x'))).toBe('There is no such room.');
        expect(explorerErrorMessage(new VariablesWebApiError(403, 'wired.variables.bulk_delete_not_enabled', 'x'))).toContain('Allow mass deletion');
    });
});
