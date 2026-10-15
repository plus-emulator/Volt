import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
    state: {
        networks: [{ id: '10', name: 'First network', connectionCount: 2, linkedInCurrentRoom: false }, { id: '11', name: 'Other network', connectionCount: 1, linkedInCurrentRoom: false }],
        selectedNetworkId: '10', receiveLocal: false, status: null, createCount: 0, renameCount: 0,
        closeWiredLink: vi.fn(), closeConnections: vi.fn(),
        connections: { networkId: '10', loading: false, errorCode: 0, connections: [{ roomId: 14, furniId: 99, roomName: 'Game room', receiveLocal: true }] }
    },
    actions: { clearWiredLinkConnection: vi.fn(), createWiredLinkNetwork: vi.fn(), requestWiredLinkConnections: vi.fn(), saveWiredLink: vi.fn(), setWiredLinkReceiveLocal: vi.fn(), deleteWiredLinkNetwork: vi.fn(), renameWiredLinkNetwork: vi.fn(), visitWiredLinkRoom: vi.fn() },
    showConfirm: vi.fn()
}));
vi.mock('../../../../api', () => ({ localizeWithFallback: (_key: string, fallback: string) => fallback }));
vi.mock('../../../../hooks/rooms/widgets/useWiredLinkState', () => ({ useWiredLinkStore: (selector: (state: any) => unknown) => selector(fixtures.state) }));
vi.mock('../../../../hooks/rooms/widgets/useWiredLinkActions', () => fixtures.actions);
vi.mock('../../../../hooks', () => ({ useNotification: () => ({ showConfirm: fixtures.showConfirm }) }));
vi.mock('../../../../common', () => ({
    VoltCardView: ({ children, className, 'aria-label': label }: PropsWithChildren<{ className: string; 'aria-label': string }>) => <section role="dialog" aria-label={label} className={className}>{children}</section>,
    VoltCardHeaderView: ({ children }: PropsWithChildren) => <header>{children}</header>
}));
vi.mock('../../../../common/native-text/NativeText', () => ({ NativeText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: () => null }));

import { WiredLinkView } from './WiredLinkView';
import { WiredLinkConnectionsView } from './WiredLinkConnectionsView';

describe('AIR Wired Link windows', () => {
    afterEach(() => { cleanup(); vi.clearAllMocks(); });

    it('keeps immediate connect, clear, receive and create actions in the native owner layout', () => {
        render(<WiredLinkView />);
        expect(screen.getAllByRole('columnheader').length).toBe(4);
        expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
        expect(fixtures.actions.saveWiredLink).toHaveBeenCalledWith('11', false);
        fireEvent.click(screen.getByRole('button', { name: 'Clear connection' }));
        expect(fixtures.actions.clearWiredLinkConnection).toHaveBeenCalledOnce();
        fireEvent.click(screen.getByRole('checkbox'));
        expect(fixtures.actions.setWiredLinkReceiveLocal).toHaveBeenCalledWith(true);
        fireEvent.change(screen.getByRole('textbox', { name: 'New network:' }), { target: { value: 'New game' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create network' }));
        expect(fixtures.actions.createWiredLinkNetwork).toHaveBeenCalledWith('New game');
        fireEvent.click(screen.getAllByRole('button', { name: 'Manage' })[0]);
        expect(fixtures.actions.requestWiredLinkConnections).toHaveBeenCalledWith('10');
    });

    it('renames on Enter, visits the room and requires confirmation before deleting', () => {
        render(<WiredLinkConnectionsView />);
        expect(screen.getAllByRole('columnheader').length).toBe(5);
        const input = screen.getByRole('textbox', { name: 'Network name' }) as HTMLInputElement;
        expect(input.maxLength).toBe(255);
        fireEvent.change(input, { target: { value: 'Renamed' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(fixtures.actions.renameWiredLinkNetwork).toHaveBeenCalledWith('10', 'Renamed');
        fireEvent.click(screen.getByRole('button', { name: 'Visit' }));
        expect(fixtures.actions.visitWiredLinkRoom).toHaveBeenCalledWith(14);
        fireEvent.click(screen.getByRole('button', { name: 'Delete network' }));
        expect(fixtures.actions.deleteWiredLinkNetwork).not.toHaveBeenCalled();
        fixtures.showConfirm.mock.lastCall![1]();
        expect(fixtures.actions.deleteWiredLinkNetwork).toHaveBeenCalledWith('10');
    });
});
