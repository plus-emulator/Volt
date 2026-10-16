import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api', async () => ({
    ...(await vi.importActual('../../../api/wired/WiredNativeVariables')),
    LocalizeText: (key: string) => key,
    GetRoomSession: () => ({ roomId: 77 })
}));

import { WiredVariablePicker } from './WiredVariablePicker';
import { buildWiredVariablePickerEntries } from './WiredVariablePickerData';
import { clearWiredVariablePickerHistory, finalizeWiredVariablePickers } from './WiredVariablePickerHistory';

const variable = (variableId: string, name: string, variableType = 0, hasValue = true) => ({ variableId, name, variableType, availability: 0, hasValue, isReadOnly: false });
const entries = buildWiredVariablePickerEntries('context', 'change-reference', [
    variable('1', '@event.transaction_complete.deposit.furni_count', 1),
    variable('2', '@event.transaction_complete.deposit.credits', 1),
    variable('3', '@event.variable_update.old_value', 1),
    variable('4', 'my_score', 0),
    variable('5', 'flag', 0, false)
]);
const rowNames = () => screen.queryAllByRole('option').map((row) => row.textContent);
const hover = (name: string) => fireEvent.mouseEnter(screen.getAllByRole('option').find((row) => row.textContent === name));
const open = () => fireEvent.click(screen.getByRole('textbox'));
const tab = (key: string) => fireEvent.click(screen.getByTitle(`wiredfurni.variable_picker.tab.${key}`));

describe('AIR NewVariablePicker port', () => {
    beforeEach(() => clearWiredVariablePickerHistory());
    afterEach(cleanup);

    it('opens on the user-created tab without a selection and on the internal tab for an internal variable', () => {
        render(<WiredVariablePicker entries={entries} selectedToken="" onSelect={vi.fn()} />);

        open();
        expect(screen.getByTitle('wiredfurni.variable_picker.tab.user_created')).toHaveAttribute('aria-pressed', 'true');
        expect(rowNames()).toEqual(['my_score', 'flag']);
        cleanup();

        render(<WiredVariablePicker entries={entries} selectedToken={entries[2].token} onSelect={vi.fn()} />);
        open();
        expect(screen.getByTitle('wiredfurni.variable_picker.tab.internal')).toHaveAttribute('aria-pressed', 'true');
    });

    it('nests the tree to any depth and selects a leaf', () => {
        const onSelect = vi.fn();

        render(<WiredVariablePicker entries={entries} selectedToken="" onSelect={onSelect} />);
        open();
        tab('all');
        expect(rowNames()).toEqual(['@event', 'my_score', 'flag']);
        hover('@event');
        expect(rowNames()).toEqual(['@event', 'my_score', 'flag', 'transaction_complete', 'variable_update']);
        hover('transaction_complete');
        hover('deposit');
        expect(rowNames().slice(-2)).toEqual(['furni_count', 'credits']);
        // A branch without a variable is not selectable.
        fireEvent.click(screen.getAllByRole('option').find((row) => row.textContent === 'deposit'));
        expect(onSelect).not.toHaveBeenCalled();
        fireEvent.click(screen.getAllByRole('option').find((row) => row.textContent === 'credits'));
        expect(onSelect).toHaveBeenCalledWith(entries[1]);
        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('greys variables the filter rejects and does not select them', () => {
        const onSelect = vi.fn();

        render(<WiredVariablePicker entries={entries} selectedToken="" onSelect={onSelect} />);
        open();
        const flag = screen.getAllByRole('option').find((row) => row.textContent === 'flag');

        expect(flag).toHaveAttribute('title', 'wiredfurni.variable_picker.tooltip_disabled');
        fireEvent.click(flag);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('searches with every word and shows single matches by full name', () => {
        render(<WiredVariablePicker entries={entries} selectedToken="" onSelect={vi.fn()} />);
        open();
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'old event' } });
        expect(screen.getByTitle('wiredfurni.variable_picker.tab.search')).toHaveAttribute('aria-pressed', 'true');
        expect(rowNames()).toEqual(['@event.variable_update.old_value']);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'tra' } });
        expect(rowNames()).toEqual(['@event']);
    });

    it('takes the first search result on Enter and an exact name on Enter', () => {
        const onSelect = vi.fn();

        render(<WiredVariablePicker entries={entries} selectedToken="" onSelect={onSelect} />);
        open();
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'old' } });
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
        expect(onSelect).toHaveBeenLastCalledWith(entries[2]);
        open();
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'MY_SCORE' } });
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
        expect(onSelect).toHaveBeenLastCalledWith(entries[3]);
    });

    it('clears through the cancel button', () => {
        const onClear = vi.fn();

        render(<WiredVariablePicker entries={entries} selectedToken={entries[3].token} onSelect={vi.fn()} onClear={onClear} />);
        expect(screen.getByRole('textbox')).toHaveValue('my_score');
        open();
        fireEvent.click(screen.getByLabelText('cancel'));
        expect(onClear).toHaveBeenCalled();
        expect(screen.getByRole('textbox')).toHaveValue('');
    });

    it('records a selection in the recent tab only once the form is saved', () => {
        render(<WiredVariablePicker entries={entries} selectedToken={entries[3].token} onSelect={vi.fn()} />);
        open();
        tab('recent');
        expect(rowNames()).toEqual([]);
        finalizeWiredVariablePickers();
        tab('all');
        tab('recent');
        expect(rowNames()).toEqual(['my_score']);
    });
});
