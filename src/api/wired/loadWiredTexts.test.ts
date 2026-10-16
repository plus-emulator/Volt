import { afterEach, describe, expect, it, vi } from 'vitest';

const values = new Map<string, string>();

vi.mock('@volt/renderer', () => ({
    GetLocalizationManager: () => ({
        hasValue: (key: string) => values.has(key),
        setValue: (key: string, value: string) => values.set(key, value)
    }),
    VoltLogger: { warn: () => {} }
}));

import shipped from '../../../public/configuration/wired-texts.json';
import { loadWiredTexts } from './loadWiredTexts';

describe('loadWiredTexts', () =>
{
    afterEach(() =>
    {
        values.clear();
        vi.unstubAllGlobals();
    });

    it('fills missing keys and keeps the hotel\'s own texts', async () =>
    {
        values.set('wiredfurni.params.delay.seconds', 'Hotel delay');
        vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ 'wiredfurni.params.delay.seconds': 'Delay (seconds):', 'wiredfurni.params.delay.mode.precise': 'Precise (per 0.05s)' }) }));

        await loadWiredTexts();

        expect(values.get('wiredfurni.params.delay.seconds')).toBe('Hotel delay');
        expect(values.get('wiredfurni.params.delay.mode.precise')).toBe('Precise (per 0.05s)');
    });

    it('boots without the file', async () =>
    {
        vi.stubGlobal('fetch', async () => ({ ok: false, status: 404 }));

        await expect(loadWiredTexts()).resolves.toBeUndefined();
        expect(values.size).toBe(0);
    });

    it('ships the delay and reference value keys', () =>
    {
        const texts = shipped as Record<string, string>;

        expect(texts['wiredfurni.params.delay.seconds']).toBe('Delay (seconds):');
        expect(texts['wiredfurni.params.delay.mode.standard']).toBe('Standard (per 0.5s)');
        expect(texts['wiredfurni.params.delay.mode.precise']).toBe('Precise (per 0.05s)');
        expect(texts['wiredfurni.params.variables.reference_value.same_holder']).toBe('Use the same furni or user as the target variable');
    });
});
