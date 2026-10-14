import { describe, expect, it } from 'vitest';
import { buildWiredVariablePickerEntries, flattenWiredVariablePickerEntries } from './WiredVariablePickerData';

describe('Wired variable picker internal furniture variables', () => {
    it('offers server-published gravity as both a reference and destination', () => {
        const catalog = [{ variableId: 'builtin-gravity', name: '@gravity', availability: 0, hasValue: true, isReadOnly: false, canCreateAndDelete: false }];
        const references = flattenWiredVariablePickerEntries(buildWiredVariablePickerEntries('furni', 'change-reference', catalog));
        const destinations = flattenWiredVariablePickerEntries(buildWiredVariablePickerEntries('furni', 'change-destination', catalog));

        expect(references.find((entry) => entry.label === '@gravity')?.selectable).toBe(true);
        expect(destinations.find((entry) => entry.label === '@gravity')?.selectable).toBe(true);
    });
    it('does not fabricate built-in variables when the server has not published them', () => {
        expect(buildWiredVariablePickerEntries('furni', 'change-reference', [])).toEqual([]);
    });
});
