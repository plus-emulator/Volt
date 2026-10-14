// WIRED Link network list (AIR WIN63-202610131318: WiredLinkView.as L38-260 and L260-291, WiredLinkNetworkTableObject.as L24-70; saves via WiredLinkController.save L253).
import { IWiredLinkNetwork } from '@volt/renderer';
import { FC, useMemo, useState } from 'react';
import { localizeWithFallback } from '../../../../api';
import { canConnectWiredLink, sortWiredLinkNetworks, WIRED_LINK_MESSAGE_FALLBACKS } from '../../../../api/wired/WiredLink';
import { Button, Column, DraggableWindow, Flex, Text, VoltCardContentView, VoltCardHeaderView, VoltCardView } from '../../../../common';
import { clearWiredLinkConnection, createWiredLinkNetwork, requestWiredLinkConnections, saveWiredLink, setWiredLinkReceiveLocal } from '../../../../hooks/rooms/widgets/useWiredLinkActions';
import { useWiredLinkStore } from '../../../../hooks/rooms/widgets/useWiredLinkState';

const NO_NETWORK = '0';

const withName = (key: string, fallback: string, name: string) => localizeWithFallback(key, fallback.replace('%name%', name), ['name'], [name]);

const WiredLinkNetworkRowView: FC<{ network: IWiredLinkNetwork; selectedNetworkId: string; draftNetworkId: string; canConnect: boolean; receiveLocal: boolean }> = (props) => {
    const { network, selectedNetworkId, draftNetworkId, canConnect, receiveLocal } = props;
    const isCurrent = network.id === selectedNetworkId;
    const isDraft = network.id === draftNetworkId;

    return (
        <Flex gap={1} alignItems="center" className={`volt-wired-link__row${isDraft ? ' volt-wired-link__row--draft' : ''}`}>
            <button
                type="button"
                className="volt-wired-link__name"
                disabled={!canConnect}
                onClick={() => canConnect && useWiredLinkStore.getState().setDraftNetwork(network.id)}
            >
                {network.name}
            </button>
            <span className="volt-wired-link__count">{network.connectionCount}</span>
            <span className="volt-wired-link__status">
                {isCurrent && <span className="volt-wired-link__status--connected">{localizeWithFallback('wiredlink.status.connected', 'Connected')}</span>}
                {!isCurrent && network.linkedInCurrentRoom && localizeWithFallback('wiredlink.status.linked_in_room', 'Linked in room')}
                {!isCurrent && !network.linkedInCurrentRoom && (
                    <Button variant="primary" onClick={() => saveWiredLink(network.id, receiveLocal)}>
                        {localizeWithFallback('wiredlink.status.connect', 'Connect')}
                    </Button>
                )}
            </span>
            <Button variant="primary" onClick={() => requestWiredLinkConnections(network.id)}>
                {localizeWithFallback('wiredlink.manage', 'Manage')}
            </Button>
        </Flex>
    );
};

const describeSelection = (selectedNetworkId: string, selectedName: string, draftNetworkId: string, draftName: string): string => {
    if (draftNetworkId === selectedNetworkId) {
        if (selectedNetworkId === NO_NETWORK) return localizeWithFallback('wiredlink.current.none', 'Current connection: Disconnected');

        return withName('wiredlink.current', 'Current connection: %name%', selectedName);
    }

    if (draftNetworkId === NO_NETWORK) return localizeWithFallback('wiredlink.draft.none', 'Connect on Save: Disconnected');

    return withName('wiredlink.draft', 'Connect on Save: %name%', draftName);
};

/** The owner's networks, create, select and save, and the receive-local flag. */
export const WiredLinkView: FC<{}> = () => {
    const networks = useWiredLinkStore((state) => state.networks);
    const selectedNetworkId = useWiredLinkStore((state) => state.selectedNetworkId);
    const draftNetworkId = useWiredLinkStore((state) => state.draftNetworkId);
    const receiveLocal = useWiredLinkStore((state) => state.receiveLocal);
    const status = useWiredLinkStore((state) => state.status);
    const createCount = useWiredLinkStore((state) => state.createCount);
    const closeWiredLink = useWiredLinkStore((state) => state.closeWiredLink);
    const [nameDraft, setNameDraft] = useState({ seq: -1, text: '' });
    const nameInput = nameDraft.seq === createCount ? nameDraft.text : '';

    const sortedNetworks = useMemo(() => sortWiredLinkNetworks(networks), [networks]);
    const selectedName = networks.find((network) => network.id === selectedNetworkId)?.name ?? '';
    const draftName = networks.find((network) => network.id === draftNetworkId)?.name ?? '';

    const selectionLine = describeSelection(selectedNetworkId, selectedName, draftNetworkId, draftName);

    return (
        <DraggableWindow handleSelector=".volt-card-header-shell">
            <VoltCardView theme="primary-slim" className="volt-wired-link w-[min(460px,calc(100vw-16px))] max-h-[calc(100vh-16px)]">
                <VoltCardHeaderView headerText={localizeWithFallback('wiredlink.title', 'WIRED Link')} onCloseClick={closeWiredLink} />
                <VoltCardContentView overflow="auto" justifyContent="start">
                    <Column gap={2}>
                        <Text>{localizeWithFallback('wiredlink.description', 'Connect your WIRED Links across rooms to exchange messages and dataframes. Only you can manage the networks used by your furniture.')}</Text>
                        <Text bold>{selectionLine}</Text>
                        {draftNetworkId !== selectedNetworkId && <Text>{localizeWithFallback('wiredlink.pending', 'Connection selected. Save to apply your changes.')}</Text>}
                        <Column gap={1}>
                            <Text bold>{localizeWithFallback('wiredlink.networks.title', 'My networks:')}</Text>
                            {sortedNetworks.length === 0 && <Text>{localizeWithFallback('wiredlink.empty', 'You have no networks yet. Create one below, choose its row, click Use selected network, then Save to connect this Link.')}</Text>}
                            {sortedNetworks.map((network) => (
                                <WiredLinkNetworkRowView
                                    key={network.id}
                                    network={network}
                                    selectedNetworkId={selectedNetworkId}
                                    draftNetworkId={draftNetworkId}
                                    canConnect={canConnectWiredLink(networks, network.id, selectedNetworkId)}
                                    receiveLocal={receiveLocal}
                                />
                            ))}
                        </Column>
                        <Column gap={1}>
                            <Text bold>{localizeWithFallback('wiredlink.new_name', 'New network:')}</Text>
                            <Flex gap={1}>
                                <input className="form-control form-control-sm" type="text" value={nameInput} onChange={(event) => setNameDraft({ seq: createCount, text: event.target.value })} />
                                <Button variant="primary" onClick={() => createWiredLinkNetwork(nameInput)}>
                                    {localizeWithFallback('wiredlink.create', 'Create network')}
                                </Button>
                            </Flex>
                        </Column>
                        <Flex gap={1} alignItems="center">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="wiredLinkReceiveLocal"
                                checked={receiveLocal}
                                onChange={(event) => setWiredLinkReceiveLocal(event.target.checked)}
                            />
                            <Column gap={1}>
                                <Text>{localizeWithFallback('wiredlink.receive', 'Receive messages sent by this room')}</Text>
                                <Text>{localizeWithFallback('wiredlink.receive.hint', 'Allow this Link to receive both messages and dataframes from its own room.')}</Text>
                            </Column>
                        </Flex>
                        {status && <Text className={status.error ? 'volt-wired-link__error' : undefined}>{localizeWithFallback(status.key, WIRED_LINK_MESSAGE_FALLBACKS[status.key] ?? status.key)}</Text>}
                        <Text>{localizeWithFallback('wiredlink.footer', 'Save applies this Link\'s connection and receive setting.')}</Text>
                        <Flex gap={1} justifyContent="end">
                            <Button variant="primary" onClick={() => clearWiredLinkConnection()}>
                                {localizeWithFallback('wiredlink.clear', 'Clear connection')}
                            </Button>
                            <Button variant="primary" onClick={() => saveWiredLink(draftNetworkId, receiveLocal)}>
                                {localizeWithFallback('wiredlink.save', 'Save')}
                            </Button>
                        </Flex>
                    </Column>
                </VoltCardContentView>
            </VoltCardView>
        </DraggableWindow>
    );
};
