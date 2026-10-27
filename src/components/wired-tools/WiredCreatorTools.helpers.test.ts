import { describe, expect, it } from 'vitest';
import { formatVariableTimestamp } from './WiredCreatorTools.helpers';

describe('WiredCreatorTools helpers', () => {
    describe('formatVariableTimestamp', () => {
        it('returns "/" for zero, negative, or falsy values', () => {
            expect(formatVariableTimestamp(0)).toBe('/');
            expect(formatVariableTimestamp(-1)).toBe('/');
            expect(formatVariableTimestamp(null)).toBe('/');
        });

        it('formats a positive epoch-seconds value as a locale string', () => {
            const out = formatVariableTimestamp(1_700_000_000);
            expect(out).not.toBe('/');
            expect(out.length).toBeGreaterThan(0);
        });
    });
});
