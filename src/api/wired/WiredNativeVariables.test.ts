import { describe, expect, it } from 'vitest';
import { isWiredNullVariableId, tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT } from './WiredNativeVariables';

describe('null variable ids (AIR VariableLeaderboardConfigCodec.isNullVariableId)', () => {
    it('reads "0", "n" and an empty slot as no variable', () => {
        for (const id of ['0', 'n', '', undefined, null]) expect(isWiredNullVariableId(id)).toBe(true);
        expect(tokenOfVariableSlot('0')).toBe('');
        expect(tokenOfVariableSlot(WIRED_VARIABLE_ABSENT)).toBe('');
    });

    it('keeps every other id, and saves an empty selection as the absent id', () => {
        for (const id of ['00', '10', '-1', '692586843']) expect(isWiredNullVariableId(id)).toBe(false);
        expect(variableSlotOf(tokenOfVariableSlot('10'))).toBe('10');
        expect(variableSlotOf(tokenOfVariableSlot('0'))).toBe(WIRED_VARIABLE_ABSENT);
    });
});
