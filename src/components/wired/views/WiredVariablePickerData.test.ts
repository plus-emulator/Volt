import { describe, expect, it } from 'vitest';
import {
    buildWiredVariableNodes,
    buildWiredVariablePickerEntries,
    flattenWiredVariablePickerEntries,
    isWiredVariableNodeDisabled,
    IWiredVariableNode
} from './WiredVariablePickerData';

const variable = (variableId: string, name: string, hasValue = true) => ({ variableId, name, availability: 0, hasValue, isReadOnly: false, canCreateAndDelete: false });
const names = (node: IWiredVariableNode) => [...node.children.values()].map((child) => child.name);
const child = (node: IWiredVariableNode, ...path: string[]) => path.reduce((current, name) => current.children.get(name), node);

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

// AIR WIN63-202610131318-860371703: TabButtonConfigs.nodesFromVector and VariableNode.flatten/isDisabled.
describe('AIR variable picker tree', () => {
    const catalog = [
        variable('1', '@event.transaction_complete.deposit.furni_count'),
        variable('2', '@event.transaction_complete.deposit.credits'),
        variable('3', '@event.transaction_complete.withdraw.furni_count'),
        variable('4', '@event.variable_update.old_value'),
        variable('5', '@event.variable_update.new_value'),
        variable('6', 'score')
    ];
    const entries = buildWiredVariablePickerEntries('context', 'change-reference', catalog);

    it('keeps one entry per variable in catalog order', () => {
        expect(entries.map((entry) => entry.displayLabel)).toEqual(catalog.map((definition) => definition.name));
    });

    it('nests on every dot, to any depth, with segment names', () => {
        const root = buildWiredVariableNodes(entries);

        expect(names(root)).toEqual(['@event', 'score']);
        expect(names(child(root, '@event'))).toEqual(['transaction_complete', 'variable_update']);
        expect(names(child(root, '@event', 'transaction_complete'))).toEqual(['deposit', 'withdraw']);
        expect(names(child(root, '@event', 'transaction_complete', 'deposit'))).toEqual(['furni_count', 'credits']);
        expect(child(root, '@event', 'transaction_complete', 'deposit', 'furni_count').entry?.token).toBe(entries[0].token);
        expect(child(root, '@event').entry).toBeNull();
    });

    it('flattens single-child chains to a full-name leaf for the search and recent tabs', () => {
        const root = buildWiredVariableNodes([entries[2], entries[5]], true);

        expect(names(root)).toEqual(['@event.transaction_complete.withdraw.furni_count', 'score']);
        expect(child(root, '@event').entry?.token).toBe(entries[2].token);
        expect(child(root, '@event').children.size).toBe(0);
    });

    it('does not flatten a branch with several children', () => {
        const root = buildWiredVariableNodes(entries.slice(0, 2), true);

        expect(names(root)).toEqual(['@event']);
        expect(names(child(root, '@event', 'transaction_complete', 'deposit'))).toEqual(['furni_count', 'credits']);
    });

    it('reuses an existing branch node without giving it the later variable', () => {
        const root = buildWiredVariableNodes(buildWiredVariablePickerEntries('user', 'condition', [variable('a', 'team.score'), variable('b', 'team')]));

        expect(child(root, 'team').entry).toBeNull();
        expect(names(child(root, 'team'))).toEqual(['score']);
    });

    it('greys a branch only when nothing below it can be selected', () => {
        const references = buildWiredVariablePickerEntries('context', 'change-reference', [variable('x', 'a.b', false), variable('y', 'a.c', true), variable('z', 'd.e', false)]);
        const root = buildWiredVariableNodes(references);

        expect(isWiredVariableNodeDisabled(child(root, 'a'))).toBe(false);
        expect(isWiredVariableNodeDisabled(child(root, 'a', 'b'))).toBe(true);
        expect(isWiredVariableNodeDisabled(child(root, 'd'))).toBe(true);
    });
});
