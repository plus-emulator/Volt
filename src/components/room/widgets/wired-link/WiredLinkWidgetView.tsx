// WIRED Link dialogs for the furni owner (AIR WIN63-202610131318: WiredLinkController.as L84-372 open/configuration/result handlers; WiredLinkView.as L19; WiredLinkConnectionsView.as L18).
import { FC } from 'react';
import { useWiredLinkEvents, useWiredLinkStore } from '../../../../hooks/rooms/widgets/useWiredLinkState';
import { WiredLinkConnectionsView } from './WiredLinkConnectionsView';
import { WiredLinkView } from './WiredLinkView';

/** Mounts the link packets so the dialog can open from the server's request, then shows the network list and the connections list. */
export const WiredLinkWidgetView: FC<{}> = () => {
    useWiredLinkEvents();

    const isOpen = useWiredLinkStore((state) => state.isOpen);
    const hasConnections = useWiredLinkStore((state) => state.connections !== null);

    return (
        <>
            {isOpen && <WiredLinkView />}
            {isOpen && hasConnections && <WiredLinkConnectionsView />}
        </>
    );
};
