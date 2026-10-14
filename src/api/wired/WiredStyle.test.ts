import { describe, expect, it } from 'vitest';
import { wiredStyleWidth, wiredWidthMultiplier } from './WiredStyle';

describe('native controller width modifiers used by WiredBaseView', () => {
    // AIR25 ActionTypeCodes / AddonCodes, and their controllers' widthModifier getters.
    it.each([
        ['action', 1, 1.06], ['action', 55, 1.2], ['action', 64, 1.4],
        ['extra', 20, 1.2], ['extra', 21, 1.3], ['extra', 1005, 1.35], ['extra', 2002, 1.4],
        ...[1200, 1201, 1202, 1203, 1204, 1205].map(code => ['extra', code, 1.45]),
        ['condition', 43, 1.4], ['trigger', 28, 1.5], ['trigger', 30, 1.4]
    ] as [string, number, number][])('applies %s code %i modifier %f', (type, code, modifier) => {
        expect(wiredWidthMultiplier(type, code)).toBe(modifier);
        expect(Math.trunc(wiredStyleWidth('illumina') * wiredWidthMultiplier(type, code))).toBe(Math.trunc(240 * modifier));
    });
    it.each([['action', 21], ['extra', 55], ['selector', 20], ['condition', 21], ['variable', 1]] as [string, number][])('does not cross family namespaces for %s code %i', (type, code) => {
        expect(wiredWidthMultiplier(type, code)).toBe(1);
    });
    it.each([106, 113, 128, 130, 131, 132, 133, 134, 135, 136])('does not treat legacy code %i as an active native subtype', code => {
        expect(wiredWidthMultiplier('action', code)).toBe(1);
        expect(wiredWidthMultiplier('extra', code)).toBe(1);
    });
});
