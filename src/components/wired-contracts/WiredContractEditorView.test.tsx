import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { IFurnitureData, IWiredContractContents } from '@volt/renderer';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const store = vi.hoisted(() => ({ items: [{ id: 1, className: 'chair', name: 'Chair', type: 's', tradeable: true }, { id: 2, className: 'rare', name: 'No Trade', type: 's', tradeable: false }] }));
vi.mock('@volt/renderer', () => ({ FurnitureType: { FLOOR: 's', WALL: 'i' }, GetSessionDataManager: () => ({ getAllFurnitureData: () => store.items }) }));
vi.mock('../../api', () => ({ LocalizeText: (key: string) => key, localizeWithFallback: (_key: string, fallback: string) => fallback }));
vi.mock('../../common', () => ({ VoltCardView: ({ children, style }: PropsWithChildren<{ style?: object }>) => <div style={style}>{children}</div>, VoltCardContentView: ({ children }: PropsWithChildren) => <div>{children}</div>, VoltCardHeaderView: ({ headerText }: { headerText: string }) => <h1>{headerText}</h1>, LayoutFurniImageView: () => <span>Furni image</span> }));
vi.mock('../../common/native-text/NativeText', () => ({ NativeText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../../common/dropmenu/HabboDropMenuView', () => ({ HabboDropMenuView: ({ label, value, options, disabled, onSelect }: { label: string; value: string | number; options: { value: string | number; label: string }[]; disabled?: boolean; onSelect: (value: string | number) => void }) => <select aria-label={label} value={value} disabled={disabled} onChange={event => onSelect(typeof value === 'number' ? Number(event.target.value) : event.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> }));
import { ContractElementEditor, contractItemCandidates, WiredContractEditorView } from './WiredContractEditorView';
const payment = (): IWiredContractContents => ({ contractId: 42, contractType: 0, definition: { youGiveRule: [{ nodes: [{ type: 0, amount: 7, itemType: null }] }], youGetRule: null }, paymentMode: 1, receiveText: 'Play a game', layoutType: 'generic', rewardCategory: 11, showDialog: false, rewardText: '' });
afterEach(cleanup); beforeEach(() => vi.clearAllMocks());
const save = () => fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.ready' }));
describe('AIR native contract editors', () => {
    it('saves payment metadata, preserves disabled rules and starts layout collapsed', () => {
        const onSave = vi.fn(); render(<WiredContractEditorView contents={payment()} canWrite onSave={onSave} onClose={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'wiredcontracts.payment_contract.layout_type' })).toHaveAttribute('aria-expanded', 'false');
        fireEvent.change(screen.getByRole('textbox', { name: 'wiredcontracts.payment_contract.receive_text' }), { target: { value: 'New game' } });
        fireEvent.click(screen.getByRole('button', { name: 'wiredcontracts.payment_contract.layout_type' }));
        fireEvent.change(screen.getByRole('combobox', { name: 'wiredcontracts.payment_contract.layout_type' }), { target: { value: 'games' } });
        fireEvent.click(screen.getByRole('radio', { name: 'wiredcontracts.payment_contract.mode.0' }));
        expect(screen.getByRole('button', { name: 'Add element' }).matches(':disabled')).toBe(true); save();
        expect(onSave).toHaveBeenCalledWith({ ...payment(), paymentMode: 0, receiveText: 'New game', layoutType: 'games' });
    });
    it('uses 3 alternative / 5 node limits and drops empty alternatives when saving', () => {
        const initial = payment(); initial.definition.youGiveRule[0].nodes = Array.from({ length: 5 }, () => ({ type: 0, amount: 2, itemType: null }));
        const onSave = vi.fn(); render(<WiredContractEditorView contents={initial} canWrite onSave={onSave} onClose={vi.fn()} />);
        expect(screen.queryByRole('button', { name: 'Add element' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'wiredcontracts.payment_add_more' })); fireEvent.click(screen.getByRole('button', { name: 'wiredcontracts.payment_add_more' }));
        expect(screen.getByRole('button', { name: 'wiredcontracts.payment_add_more' })).toBeDisabled(); save();
        expect(onSave.mock.lastCall![0].definition.youGiveRule).toHaveLength(1);
    });
    it('preserves reward metadata and disables earnings only when no credit node remains', () => {
        const initial = { ...payment(), contractType: 2 as const, definition: { youGiveRule: null, youGetRule: { nodes: [{ type: 0 as const, amount: 9, itemType: null }] } }, rewardText: 'Good game', showDialog: true };
        const onSave = vi.fn(); render(<WiredContractEditorView contents={initial} canWrite onSave={onSave} onClose={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'wiredcontracts.reward_contract.earnings_category' })).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(screen.getByRole('button', { name: 'wiredcontracts.reward_contract.earnings_category' }));
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '13' } });
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Excellent' } }); save();
        expect(onSave.mock.lastCall![0]).toMatchObject({ rewardCategory: 13, rewardText: 'Excellent', showDialog: true });
        fireEvent.click(screen.getByRole('button', { name: 'Remove element', hidden: true }));
        expect(screen.getByRole('button', { name: 'wiredcontracts.reward_contract.earnings_category' }).matches(':disabled')).toBe(true);
    });
    it('disables writes for inspection-only and pending saves while retaining error and values', () => {
        const onSave = vi.fn(); const view = render(<WiredContractEditorView contents={payment()} canWrite={false} error="Save refused" onSave={onSave} onClose={vi.fn()} />);
        expect(screen.getByRole('textbox')).toBeDisabled(); expect(screen.getByRole('button', { name: 'wiredfurni.ready' })).toBeDisabled();
        expect(screen.getByRole('alert')).toHaveTextContent('Save refused'); save(); expect(onSave).not.toHaveBeenCalled();
        view.rerender(<WiredContractEditorView contents={payment()} canWrite saving onSave={onSave} onClose={vi.fn()} />); expect(screen.getByRole('button', { name: 'wiredfurni.ready' })).toBeDisabled();
    });
    it('shows both payment and reward rules for trade without unrelated option sections', () => {
        const initial = payment(); initial.contractType = 1; initial.definition.youGetRule = { nodes: [{ type: 0, amount: 12, itemType: null }] };
        const onSave = vi.fn(); render(<WiredContractEditorView contents={initial} canWrite onSave={onSave} onClose={vi.fn()} />);
        expect(screen.getAllByRole('button', { name: 'Edit element' })).toHaveLength(2); expect(screen.queryByRole('textbox')).toBeNull(); save(); expect(onSave).toHaveBeenCalledWith(initial);
    });
    it('validates coin and furniture quantities and the selected item tradeability in the element editor', () => {
        const onSave = vi.fn(); render(<ContractElementEditor initial={null} canWrite onSave={onSave} onClose={vi.fn()} />);
        expect(screen.getByRole('textbox', { name: 'wiredcontracts.element.itemtype.search' })).toBeDisabled();
        const amount = screen.getByRole('textbox', { name: 'wiredcontracts.element.amount' });
        fireEvent.change(amount, { target: { value: '100001' } }); expect(screen.getByRole('button', { name: 'wiredfurni.ready' })).toBeDisabled();
        fireEvent.change(amount, { target: { value: '100000' } }); save(); expect(onSave).toHaveBeenLastCalledWith({ type: 0, amount: 100000, itemType: null });
        fireEvent.click(screen.getByRole('radio', { name: 'wiredcontracts.element.type.1' }));
        fireEvent.change(amount, { target: { value: '501' } }); fireEvent.click(screen.getByRole('option', { name: /Chair/ })); expect(screen.getByRole('button', { name: 'wiredfurni.ready' })).toBeDisabled();
        fireEvent.change(amount, { target: { value: '500' } }); save(); expect(onSave.mock.lastCall![0]).toMatchObject({ type: 1, amount: 500, itemType: { typeId: 1, isWallItem: false } });
        fireEvent.click(screen.getByRole('option', { name: /No Trade/ })); expect(screen.getByRole('button', { name: 'wiredfurni.ready' })).toBeDisabled();
    });
    it('preserves wall/poster variants and virtualizes furniture results without dropping search candidates', () => {
        expect(contractItemCandidates([{ id: 99, className: 'legacy', name: 'Legacy metadata', type: 's' } as unknown as IFurnitureData])[0].tradeable).toBe(true);
        const posters = contractItemCandidates([{ id: 77, className: 'poster', name: 'Poster', type: 'i', tradeable: true } as unknown as IFurnitureData]);
        expect(posters.find(item => item.code === 'poster*2008')?.itemType).toEqual({ typeId: 77, isWallItem: true, legacyPosterId: '2008' });
        const prior = store.items; store.items = Array.from({ length: 2000 }, (_, id) => ({ id, className: `item${id}`, name: `Item ${id}`, type: 's', tradeable: true }));
        render(<ContractElementEditor initial={{ type: 1, amount: 1, itemType: null }} canWrite onSave={vi.fn()} onClose={vi.fn()} />);
        expect(screen.getAllByRole('option').length).toBeLessThan(20);
        fireEvent.change(screen.getByRole('textbox', { name: 'wiredcontracts.element.itemtype.search' }), { target: { value: 'item1999' } });
        expect(within(screen.getByRole('listbox')).getByRole('option')).toHaveTextContent('Item 1999'); store.items = prior;
    });
});
