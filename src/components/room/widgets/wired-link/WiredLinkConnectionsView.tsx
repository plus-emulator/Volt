// WIRED Link connections of one network (AIR WIN63-202610131318: WiredLinkConnectionsView.as L37-194; WiredLinkConnectionTableObject.as visit cell L60; rename L97, delete L126; visit via WiredLinkController.visitRoom L362).
import { FC, useState } from 'react';
import { localizeWithFallback } from '../../../../api';
import { WIRED_LINK_MESSAGE_FALLBACKS } from '../../../../api/wired/WiredLink';
import { Button, Column, DraggableWindow, DraggableWindowPosition, Flex, Text, VoltCardContentView, VoltCardHeaderView, VoltCardView } from '../../../../common';
import { deleteWiredLinkNetwork, renameWiredLinkNetwork, visitWiredLinkRoom } from '../../../../hooks/rooms/widgets/useWiredLinkActions';
import { useWiredLinkStore } from '../../../../hooks/rooms/widgets/useWiredLinkState';

const withName = (key: string, fallback: string, name: string) => localizeWithFallback(key, fallback.replace('%name%', name), ['name'], [name]);

/** Keyed by network id, so each network's name field starts from its current name. */
const WiredLinkConnectionsDialogView: FC<{ networkId: string }> = (props) => {
    const { networkId } = props;
    const networkName = useWiredLinkStore((state) => state.networks.find((network) => network.id === networkId)?.name ?? '');
    const connections = useWiredLinkStore((state) => state.connections);
    const renameCount = useWiredLinkStore((state) => state.renameCount);
    const closeConnections = useWiredLinkStore((state) => state.closeConnections);
    const [nameDraft, setNameDraft] = useState({ seq: -1, text: '' });
    const [confirmDelete, setConfirmDelete] = useState(false);
    // The field shows the network name again after a successful rename, until the user types.
    const nameInput = nameDraft.seq === renameCount ? nameDraft.text : networkName;

    const rows = connections?.connections ?? [];
    const loading = connections?.loading ?? false;
    const errorCode = connections?.errorCode ?? 0;

    return (
        <DraggableWindow handleSelector=".volt-card-header-shell" windowPosition={DraggableWindowPosition.NOTHING} initialPosition={{ x: 120, y: 80 }}>
            <VoltCardView theme="primary-slim" className="volt-wired-link-connections w-[min(520px,calc(100vw-16px))] max-h-[calc(100vh-16px)]">
                <VoltCardHeaderView headerText={withName('wiredlink.connections.title', 'Connected rooms: %name%', networkName)} onCloseClick={closeConnections} />
                <VoltCardContentView overflow="auto" justifyContent="start">
                    <Column gap={2}>
                        <Flex gap={1}>
                            <input className="form-control form-control-sm" type="text" value={nameInput} onChange={(event) => setNameDraft({ seq: renameCount, text: event.target.value })} />
                            <Button variant="primary" onClick={() => renameWiredLinkNetwork(networkId, nameInput)}>
                                {localizeWithFallback('wiredlink.rename', 'Rename')}
                            </Button>
                            <Button variant="primary" onClick={() => setConfirmDelete(true)}>
                                {localizeWithFallback('wiredlink.delete', 'Delete network')}
                            </Button>
                        </Flex>
                        {confirmDelete && (
                            <Column gap={1} className="volt-wired-link__confirm">
                                <Text bold>{localizeWithFallback('wiredlink.delete.title', 'Delete network?')}</Text>
                                <Text>{localizeWithFallback('wiredlink.delete.confirm', 'Deleting this network disconnects all of its Links in every room. This cannot be undone.')}</Text>
                                <Flex gap={1} justifyContent="end">
                                    <Button variant="primary" onClick={() => setConfirmDelete(false)}>
                                        {localizeWithFallback('generic.cancel', 'Cancel')}
                                    </Button>
                                    <Button variant="primary" onClick={() => deleteWiredLinkNetwork(networkId)}>
                                        {localizeWithFallback('generic.delete', 'Delete')}
                                    </Button>
                                </Flex>
                            </Column>
                        )}
                        <Text bold>{localizeWithFallback('wiredlink.details', 'Connected rooms')}</Text>
                        <Text>{localizeWithFallback('wiredlink.connections.hint', 'Includes saved connections in unloaded rooms. To disconnect a Link, pick it up or clear its connection in that room.')}</Text>
                        {loading && <Text>{localizeWithFallback('wiredlink.loading.connections', 'Loading connected rooms...')}</Text>}
                        {!loading && errorCode !== 0 && <Text className="volt-wired-link__error">{localizeWithFallback(`wiredlink.error.${errorCode}`, WIRED_LINK_MESSAGE_FALLBACKS[`wiredlink.error.${errorCode}`])}</Text>}
                        {!loading && rows.length === 0 && <Text>{localizeWithFallback('wiredlink.empty.connections', 'This network has no connected Links yet.')}</Text>}
                        {!loading && rows.length > 0 && (
                            <Flex gap={1} alignItems="center" className="volt-wired-link__row volt-wired-link__row--head">
                                <span className="volt-wired-link__room">{localizeWithFallback('wiredlink.column.room', 'Room name')}</span>
                                <span className="volt-wired-link__count">{localizeWithFallback('wiredlink.column.room_id', 'Room ID')}</span>
                                <span className="volt-wired-link__count">{localizeWithFallback('wiredlink.column.furni', 'Link ID')}</span>
                                <span className="volt-wired-link__count">{localizeWithFallback('wiredlink.column.receive_local', 'Self-receiving')}</span>
                                <span className="volt-wired-link__count" />
                            </Flex>
                        )}
                        {!loading &&
                            rows.map((connection) => (
                                <Flex key={`${connection.roomId}-${connection.furniId}`} gap={1} alignItems="center" className="volt-wired-link__row">
                                    <span className="volt-wired-link__room">
                                        {connection.roomName}
                                        {connection.isBuildersClub && <span className="volt-wired-link__bc">{localizeWithFallback('wiredlink.connection.bc', 'Builders Club')}</span>}
                                    </span>
                                    <span className="volt-wired-link__count">{connection.roomId}</span>
                                    <span className="volt-wired-link__count">{connection.furniId}</span>
                                    <span className="volt-wired-link__count">
                                        {connection.receiveLocal ? localizeWithFallback('wiredlink.receive_local.yes', 'Yes') : localizeWithFallback('wiredlink.receive_local.no', 'No')}
                                    </span>
                                    <Button variant="primary" onClick={() => visitWiredLinkRoom(connection.roomId)}>
                                        {localizeWithFallback('wiredlink.visit_room', 'Visit')}
                                    </Button>
                                </Flex>
                            ))}
                        <Flex justifyContent="end">
                            <Button variant="primary" onClick={closeConnections}>
                                {localizeWithFallback('wiredlink.back', 'Back to networks')}
                            </Button>
                        </Flex>
                    </Column>
                </VoltCardContentView>
            </VoltCardView>
        </DraggableWindow>
    );
};

/** The room list of the network chosen with Manage. Visible only while the connections request is open. */
export const WiredLinkConnectionsView: FC<{}> = () => {
    const networkId = useWiredLinkStore((state) => state.connections?.networkId ?? '');

    if (!networkId) return null;

    return <WiredLinkConnectionsDialogView key={networkId} networkId={networkId} />;
};
