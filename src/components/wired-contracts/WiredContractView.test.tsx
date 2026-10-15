import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ roomId: 14, canModify: true, handlers: new Map<unknown, (event: unknown) => void>(), send: vi.fn() }));
vi.mock('@volt/renderer', () => ({
    WiredContractOpenEvent: class Open {}, WiredContractContentsEvent: class Contents {}, WiredContractUpdateResultEvent: class Result {},
    GetWiredContractContentsComposer: class Get { constructor(public id: number) {} }, UpdateWiredContractComposer: class Save { constructor(public contents: unknown) {} }
}));
vi.mock('../../api', () => ({ LocalizeText: (key: string) => key, SendMessageComposer: state.send }));
vi.mock('../../hooks', () => ({ useRoom: () => ({ roomSession: { roomId: state.roomId } }), useMessageEvent: (type: unknown, handler: (event: unknown) => void) => state.handlers.set(type, handler) }));
vi.mock('../../hooks/wired-tools', () => ({ useWiredToolsState: () => ({ roomSettings: { roomId: state.roomId, canModify: state.canModify } }) }));
vi.mock('./WiredContractEditorView', () => ({ WiredContractEditorView: ({ contents, canWrite, saving, error, onSave, onClose }: { contents: { contractId: number }; canWrite: boolean; saving: boolean; error: string; onSave: (value: unknown) => void; onClose: () => void }) => <div><span>{`contract-${contents.contractId}`}</span><span>{error}</span><button disabled={!canWrite || saving} onClick={() => onSave(contents)}>Save</button><button onClick={onClose}>Close</button></div> }));
import { GetWiredContractContentsComposer, UpdateWiredContractComposer, WiredContractContentsEvent, WiredContractOpenEvent, WiredContractUpdateResultEvent } from '@volt/renderer';
import { WiredContractView } from './WiredContractView';
const emit = (type: unknown, parser: object) => act(() => state.handlers.get(type)!({ getParser: () => parser }));
const data = (contractId = 42) => ({ contractId, contractType: 0, definition: { youGiveRule: [{ nodes: [{ type: 0, amount: 1, itemType: null }] }], youGetRule: null }, paymentMode: 1, receiveText: 'Game', layoutType: 'generic', rewardCategory: 11, showDialog: false, rewardText: '' });
beforeEach(() => { state.roomId = 14; state.canModify = true; state.handlers.clear(); vi.clearAllMocks(); }); afterEach(cleanup);
describe('native contract event lifecycle', () => {
    it('fetches only after open and saves through native composer, closing only on its matching successful response', () => {
        render(<WiredContractView />); emit(WiredContractOpenEvent, { contractId: 42 });
        expect(state.send.mock.lastCall![0]).toBeInstanceOf(GetWiredContractContentsComposer); expect(state.send.mock.lastCall![0].id).toBe(42);
        emit(WiredContractContentsEvent, data()); fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(state.send.mock.lastCall![0]).toBeInstanceOf(UpdateWiredContractComposer); expect(state.send.mock.lastCall![0].contents).toEqual(data());
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
        emit(WiredContractUpdateResultEvent, { contractId: 99, isSuccess: true }); expect(screen.getByText('contract-42')).toBeInTheDocument();
        emit(WiredContractUpdateResultEvent, { contractId: 42, isSuccess: false, failCode: 3 }); expect(screen.getByText('wiredcontracts.error.3')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Save' })); emit(WiredContractUpdateResultEvent, { contractId: 42, isSuccess: true }); expect(screen.queryByText('contract-42')).toBeNull();
    });
    it('ignores stale contents and old save results after opening a different contract', () => {
        render(<WiredContractView />); emit(WiredContractOpenEvent, { contractId: 42 }); emit(WiredContractContentsEvent, data()); fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        emit(WiredContractOpenEvent, { contractId: 43 }); emit(WiredContractContentsEvent, data()); expect(screen.queryByText('contract-42')).toBeNull();
        emit(WiredContractContentsEvent, data(43)); emit(WiredContractUpdateResultEvent, { contractId: 42, isSuccess: true }); expect(screen.getByText('contract-43')).toBeInTheDocument();
    });
    it('keeps inspection read-only and drops room-bound contents on exit', () => {
        state.canModify = false; const view = render(<WiredContractView />); emit(WiredContractOpenEvent, { contractId: 42 }); emit(WiredContractContentsEvent, data()); expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
        state.roomId = -1; view.rerender(<WiredContractView />); expect(screen.queryByText('contract-42')).toBeNull();
        emit(WiredContractContentsEvent, data()); expect(screen.queryByText('contract-42')).toBeNull();
    });
});
