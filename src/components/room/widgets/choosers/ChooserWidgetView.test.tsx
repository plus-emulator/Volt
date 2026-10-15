import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomObjectItem } from '../../../../api/room/widgets/RoomObjectItem';

const mocks = vi.hoisted(() => ({ select: vi.fn(), close: vi.fn(), show: vi.fn(), clear: vi.fn(), send: vi.fn(), guard: vi.fn((_ids, _category, action) => action()) }));
vi.mock('../../../../api', () => ({
    chooserSelectionVisualizer: { show: mocks.show, clearAll: mocks.clear },
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    SendMessageComposer: mocks.send
}));
vi.mock('../../../../api/utils/localizeWithFallback', () => ({ localizeWithFallback: (_key: string, fallback: string) => fallback }));
vi.mock('../../../../hooks', () => ({ useFurniPickupGuard: () => ({ confirmIfWebApiBox: mocks.guard }) }));
vi.mock('@volt/renderer', () => ({ RoomObjectCategory: { FLOOR: 10 }, FurniturePickupAllComposer: class { constructor(...publicIds: number[]) { Object.assign(this, { ids: publicIds }); } } }));
vi.mock('../../../../common', () => ({
    VoltCardView: ({ children, className, ...props }: any) => <div role="dialog" aria-label={props['aria-label']} className={className}>{children}</div>,
    VoltCardHeaderView: ({ headerText, onCloseClick }: any) => <header>{headerText}<button onClick={onCloseClick}>Close</button></header>,
    Button: (props: any) => <button {...props} />
}));
vi.mock('../../../../common/dropmenu/HabboDropMenuView', () => ({ HabboDropMenuView: ({ label, options, value, onSelect }: any) => <select aria-label={label} value={value} onChange={event => onSelect(Number(event.target.value))}>{options.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> }));
// jsdom has no viewport layout; exercise the real rows with a deterministic visible range.
vi.mock('@tanstack/react-virtual', () => ({ useVirtualizer: ({ count, getItemKey }: any) => ({ getTotalSize: () => count * 20, getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ index, key: getItemKey(index), start: index * 20 })) }) }));
import { ChooserWidgetView } from './ChooserWidgetView';

const users = [new RoomObjectItem(0, 100, 'dennis', 0, '-', 'Habbo'), new RoomObjectItem(1, 100, 'Rover', 0, '-', 'Pet'), new RoomObjectItem(2, 100, 'Robo', 0, '-', 'Bot')];
const furni = [new RoomObjectItem(7, 10, 'Chair', 1, 'Alice'), new RoomObjectItem(7, 20, 'Poster', 2, 'all')];
const renderChooser = (props = {}) => render(<ChooserWidgetView title="Chooser" type="users" items={users} selectItem={mocks.select} onClose={mocks.close} {...props} />);
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe('AIR chooser', () => {
    it('shows names and localized types without appending room indices to names', () => {
        renderChooser();
        expect(screen.getAllByRole('columnheader').map(node => node.textContent)).toEqual(['Name', 'Type']);
        expect(screen.getByRole('button', { name: 'dennis' })).toBeInTheDocument();
        expect(screen.queryByText('dennis - 0')).not.toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('3 users found');
    });
    it('combines search and type filters, clears search, and shows an empty state', () => {
        renderChooser();
        fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'RO' } });
        expect(screen.getByRole('status')).toHaveTextContent('2 users found');
        fireEvent.change(screen.getByRole('combobox', { name: 'Type' }), { target: { value: 3 } });
        expect(screen.getByRole('status')).toHaveTextContent('1 users found');
        expect(screen.getByRole('button', { name: 'Robo' })).toBeInTheDocument();
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'missing' } });
        expect(screen.getByText('Nothing to display')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
        expect(screen.getByRole('button', { name: 'Robo' })).toBeInTheDocument();
    });
    it('selects room index zero and clears highlights on close', () => {
        renderChooser();
        fireEvent.click(screen.getByRole('button', { name: 'dennis' }));
        expect(mocks.select).toHaveBeenCalledWith(users[0]);
        expect(mocks.show).toHaveBeenCalledWith(0, 100);
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(mocks.clear).toHaveBeenCalledTimes(2);
        expect(mocks.close).toHaveBeenCalledOnce();
    });
    it('starts with all furniture owners and can filter a real owner named all', () => {
        renderChooser({ type: 'furni', items: furni });
        expect(screen.getAllByRole('columnheader').map(node => node.textContent)).toEqual(['Name', 'Owner', 'Id']);
        expect(screen.getByRole('status')).toHaveTextContent('2 items found');
        const option = within(screen.getByRole('combobox', { name: 'Owner' })).getByRole('option', { name: /^all$/ }) as HTMLOptionElement;
        fireEvent.change(screen.getByRole('combobox', { name: 'Owner' }), { target: { value: option.value } });
        expect(screen.getByRole('button', { name: 'Poster' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Chair' })).not.toBeInTheDocument();
    });
    it('keeps floor and wall selections distinct when their ids match', () => {
        renderChooser({ type: 'furni', items: furni, pickallFurni: true });
        fireEvent.click(screen.getByRole('button', { name: 'Pick up multiple' }));
        fireEvent.click(screen.getByRole('button', { name: 'Poster' }));
        expect(screen.getByRole('button', { name: 'Poster' }).closest('[role="row"]')).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('button', { name: 'Chair' }).closest('[role="row"]')).toHaveAttribute('aria-selected', 'false');
        fireEvent.click(screen.getByRole('button', { name: 'Pick up selected' }));
        expect(mocks.guard).toHaveBeenCalledWith([7], 10, expect.any(Function));
        expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ ids: [7] }));
    });
    it('limits bulk pickup to 100 and ignores objects removed before pickup', () => {
        const items = Array.from({ length: 105 }, (_, id) => new RoomObjectItem(id, 10, `Chair ${id}`, 1, 'Alice'));
        const view = renderChooser({ type: 'furni', items, pickallFurni: true });
        fireEvent.click(screen.getByRole('button', { name: 'Pick up multiple' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
        expect(mocks.show).toHaveBeenCalledTimes(100);
        view.rerender(<ChooserWidgetView title="Chooser" type="furni" items={[]} selectItem={mocks.select} onClose={mocks.close} pickallFurni />);
        expect(screen.getByRole('button', { name: 'Pick up selected' })).toBeDisabled();
    });
});
