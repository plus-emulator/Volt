import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
    trigger: { id: 1, spriteId: 1, intData: [10, 1], stringData: 'score', selectedItems: [], delayInPulses: 0 },
    roomSettings: { canModify: true }, furniIds: [], secondaryFurniIds: [], activeWiredStyle: 'illumina',
    setIntParams: vi.fn(), setStringParam: vi.fn(), setActionDelay: vi.fn(), setFurniIds: vi.fn(), setAllowsFurni: vi.fn(), setTrigger: vi.fn(),
    saveWired: vi.fn(), saveWiredAndKeepOpen: vi.fn(), copyWiredToClipboard: vi.fn(), showConfirm: vi.fn()
}));
vi.mock('@volt/renderer', () => ({ CreateLinkEvent: vi.fn(), GetRoomEngine: () => ({ areaSelectionManager: { clearHighlight: vi.fn(), deactivate: vi.fn() } }), GetSessionDataManager: () => ({ getFloorItemData: () => ({ name: 'Wired: User variable', className: 'wf_var_user' }) }) }));
vi.mock('../../../../api', async () => ({
    ...(await vi.importActual('../../../../api/wired/WiredVariableName')),
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }, LocalizeText: (key: string) => key, localizeWithFallback: (key: string) => key,
    isWiredVolterStyle: () => false, resolveWiredStyle: () => 'illumina', wiredStyleClassName: () => '', wiredStyleWidth: () => 240, wiredWidthMultiplier: () => 1,
    WiredSelectionVisualizer: { clearAllSelectionShaders: vi.fn(), clearSelectionShaderFromFurni: vi.fn(), applySelectionShaderToFurni: vi.fn() }
}));
vi.mock('../../../../hooks', () => ({ useWired: () => state, useWiredTools: () => ({ roomSettings: state.roomSettings, activeWiredStyle: state.activeWiredStyle }), useNotificationActions: () => ({ showConfirm: state.showConfirm }) }));
vi.mock('../../../../common', () => ({ VoltCardView: ({ children }: PropsWithChildren) => <div data-testid="editor">{children}</div>, VoltCardContentView: ({ children }: PropsWithChildren) => <div>{children}</div>, Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', async () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span>, WiredSurfaceContext: (await import('react')).createContext(0), WIRED_ADVANCED_SURFACE_COLOR: 0 }));
vi.mock('../WiredFurniSelectorView', () => ({ WiredFurniSelectorSection: () => null, WiredFurniSelectorView: () => null }));
vi.mock('../WiredBannerCanvas', () => ({ WiredBannerCanvas: () => null }));
vi.mock('../WiredVolterFrameView', () => ({ WiredVolterFrameView: () => null, WiredVolterBorderView: ({ children }: PropsWithChildren) => <>{children}</> }));
vi.mock('../WiredShellHeaderView', () => ({
    WiredShellButton: ({ children, shellStyle, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { shellStyle: string }>) => <button {...props}>{children}</button>,
    WiredShellHeaderView: ({ menuItems }: any) => <>{['save', 'copy'].map(id => <button key={id} onClick={menuItems.find((item: any) => item?.id === id).onClick}>{`Menu ${id}`}</button>)}</>
}));
import { WiredExtraUserVariableView } from './WiredExtraUserVariableView';
import { WiredExtraFurniVariableView } from './WiredExtraFurniVariableView';
const chooseTemporary = () => fireEvent.click(screen.getByRole('radio', { name: 'wiredfurni.params.variables.availability.0' }));
const ready = () => fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.ready' }));
describe('Native user availability save confirmation', () => {
    beforeEach(() => { vi.clearAllMocks(); state.trigger = { id: 1, spriteId: 1, intData: [10, 1], stringData: 'score', selectedItems: [], delayInPulses: 0 }; state.roomSettings.canModify = true; });
    afterEach(cleanup);
    it.each([10, 11])('cancel preserves the editor and confirmed availability %i→0 sends exactly one save', initial => {
        state.trigger.intData = [initial, 1]; render(<WiredExtraUserVariableView />); vi.clearAllMocks();
        chooseTemporary(); ready(); ready();
        expect(state.showConfirm).toHaveBeenCalledTimes(1); expect(state.showConfirm.mock.lastCall![0]).toBe('wiredfurni.variables.availability_change.body'); expect(state.showConfirm.mock.lastCall![5]).toBe('wiredfurni.variables.availability_change.title');
        expect(state.setIntParams).not.toHaveBeenCalled(); expect(state.saveWired).not.toHaveBeenCalled();
        const cancelledConfirm = state.showConfirm.mock.lastCall![1];
        act(() => state.showConfirm.mock.lastCall![2]());
        expect(screen.getByTestId('editor')).toBeTruthy(); expect(screen.getByRole('radio', { name: 'wiredfurni.params.variables.availability.0' })).toHaveProperty('checked', true);
        act(() => cancelledConfirm()); expect(state.saveWired).not.toHaveBeenCalled();
        ready(); const confirm = state.showConfirm.mock.lastCall![1]; act(() => { confirm(); confirm(); });
        expect(state.setIntParams).toHaveBeenCalledTimes(1); expect(state.setIntParams).toHaveBeenLastCalledWith([0, 1]); expect(state.saveWired).toHaveBeenCalledTimes(1); expect(state.setTrigger).not.toHaveBeenCalled();
    });
    it('preserves Save-and-keep-open and does not ask on Copy', () => {
        render(<WiredExtraUserVariableView />); chooseTemporary(); vi.clearAllMocks();
        fireEvent.click(screen.getByRole('button', { name: 'Menu copy' })); expect(state.copyWiredToClipboard).toHaveBeenCalledTimes(1); expect(state.showConfirm).not.toHaveBeenCalled(); expect(state.saveWired).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Menu save' })); act(() => state.showConfirm.mock.lastCall![1]());
        expect(state.saveWiredAndKeepOpen).toHaveBeenCalledTimes(1); expect(state.saveWired).not.toHaveBeenCalled();
    });
    it('keeps unchanged and persistent→shared saves immediate and leaves furniture definitions unchanged', () => {
        render(<WiredExtraUserVariableView />); vi.clearAllMocks(); ready(); expect(state.saveWired).toHaveBeenCalledTimes(1); expect(state.showConfirm).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('radio', { name: 'wiredfurni.params.variables.availability.11' })); ready(); expect(state.showConfirm).not.toHaveBeenCalled();
        cleanup(); state.trigger.intData = [1, 10]; render(<WiredExtraFurniVariableView />); vi.clearAllMocks(); ready(); expect(state.showConfirm).not.toHaveBeenCalled(); expect(state.saveWired).toHaveBeenCalledTimes(1);
    });
    it('ignores a confirmation after closing or changing the editor and rechecks edit rights', () => {
        const { rerender } = render(<WiredExtraUserVariableView />); chooseTemporary(); ready(); const closed = state.showConfirm.mock.lastCall![1];
        fireEvent.click(screen.getByRole('button', { name: 'cancel' })); act(() => closed()); expect(state.saveWired).not.toHaveBeenCalled();
        ready(); const stale = state.showConfirm.mock.lastCall![1]; state.trigger = { ...state.trigger, id: 2, intData: [11, 1] }; rerender(<WiredExtraUserVariableView />); act(() => stale()); expect(state.saveWired).not.toHaveBeenCalled();
        chooseTemporary(); ready(); const revoked = state.showConfirm.mock.lastCall![1]; state.roomSettings.canModify = false; rerender(<WiredExtraUserVariableView />); act(() => revoked()); expect(state.saveWired).not.toHaveBeenCalled();
    });
});
