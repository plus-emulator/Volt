// AIR package25 wired_link_connections_view_xml (660×328, frame3) and WiredLinkConnectionsView.
import { IWiredLinkConnection } from '@volt/renderer';
import { FC, useState } from 'react';
import { localizeWithFallback } from '../../../../api';
import { WIRED_LINK_MESSAGE_FALLBACKS } from '../../../../api/wired/WiredLink';
import { VoltCardHeaderView, VoltCardView } from '../../../../common';
import { NativeText } from '../../../../common/native-text/NativeText';
import { useNotification } from '../../../../hooks';
import { deleteWiredLinkNetwork, renameWiredLinkNetwork, visitWiredLinkRoom } from '../../../../hooks/rooms/widgets/useWiredLinkActions';
import { useWiredLinkStore } from '../../../../hooks/rooms/widgets/useWiredLinkState';
import { WiredLinkAction, WiredLinkBorder, WiredLinkTable, WiredLinkText } from './WiredLinkNative';
import '../../../../css/room/WiredLinkNative.css';

/** Keyed by network id so an opened network always starts with its current name. */
const WiredLinkConnectionsDialogView: FC<{ networkId: string }> = ({ networkId }) => {
    const networkName = useWiredLinkStore((state) => state.networks.find((network) => network.id === networkId)?.name ?? '');
    const connections = useWiredLinkStore((state) => state.connections);
    const renameCount = useWiredLinkStore((state) => state.renameCount);
    const closeConnections = useWiredLinkStore((state) => state.closeConnections);
    const { showConfirm } = useNotification();
    const [nameDraft, setNameDraft] = useState({ seq: -1, text: '' });
    const nameInput = nameDraft.seq === renameCount ? nameDraft.text : networkName;
    const rows = connections?.connections ?? [];
    const loading = connections?.loading ?? false;
    const errorCode = connections?.errorCode ?? 0;
    const title = localizeWithFallback('wiredlink.connections.title', `Connected rooms: ${networkName}`, ['name'], [networkName]);
    const columns = [
        { title: localizeWithFallback('wiredlink.column.room', 'Room name'), fraction: .28, left: true },
        { title: localizeWithFallback('wiredlink.column.room_id', 'Room ID'), fraction: .20 },
        { title: localizeWithFallback('wiredlink.column.furni', 'Link ID'), fraction: .20 },
        { title: localizeWithFallback('wiredlink.column.receive_local', 'Self-receiving'), fraction: .20 },
        { title: '', fraction: .12 }
    ];
    const cell = (connection: IWiredLinkConnection, column: number, background: number) => {
        if (column === 4) return <WiredLinkAction text={localizeWithFallback('wiredlink.visit_room', 'Visit')} background={background} onClick={() => visitWiredLinkRoom(connection.roomId)} />;
        const values = [connection.roomName, String(connection.roomId), String(connection.furniId), connection.receiveLocal ? localizeWithFallback('wiredlink.receive_local.yes', 'Yes') : localizeWithFallback('wiredlink.receive_local.no', 'No')];
        return <span title={column === 0 ? connection.roomName : undefined}><WiredLinkText text={values[column]} background={background} /></span>;
    };
    const status = loading ? localizeWithFallback('wiredlink.loading.connections', 'Loading connected rooms...')
        : errorCode !== 0 ? localizeWithFallback(`wiredlink.error.${errorCode}`, WIRED_LINK_MESSAGE_FALLBACKS[`wiredlink.error.${errorCode}`])
        : '';
    const requestDelete = () => showConfirm(
        localizeWithFallback('wiredlink.delete.confirm', 'Deleting this network disconnects all of its Links in every room. This cannot be undone.'),
        () => deleteWiredLinkNetwork(networkId), () => {},
        localizeWithFallback('generic.delete', 'Delete'), localizeWithFallback('generic.cancel', 'Cancel'),
        localizeWithFallback('wiredlink.delete.title', 'Delete network?')
    );
    return (
        <VoltCardView frameStyle={3} nativeShadow resizeAxis="vertical" className="volt-wired-link-air volt-wired-link-air--connections" role="dialog" aria-label={title}>
            <VoltCardHeaderView headerText="" onCloseClick={closeConnections}><NativeText text={title} textStyle="u_frame_title" background={0x367897} overrides={{ color: 0xffffff }} /></VoltCardHeaderView>
            <div className="volt-wired-link-air__client">
                <WiredLinkTable columns={columns} rows={loading ? [] : rows} rowKey={(connection) => `${connection.roomId}-${connection.furniId}`} cell={cell} />
                <div className="volt-wired-link-air__rename">
                    <WiredLinkText text={localizeWithFallback('wiredlink.column.name', 'Network name')} />
                    <WiredLinkBorder kind="input" className="volt-wired-link-air__rename-input"><input aria-label={localizeWithFallback('wiredlink.column.name', 'Network name')} maxLength={255} value={nameInput} onChange={(event) => setNameDraft({ seq: renameCount, text: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') renameWiredLinkNetwork(networkId, nameInput); }} /></WiredLinkBorder>
                    <button className="fnd-button fnd-button-thick" type="button" onClick={() => renameWiredLinkNetwork(networkId, nameInput)}><NativeText text={localizeWithFallback('wiredlink.rename', 'Rename')} textStyle="button_shiny_regular" background={0xffffff} /></button>
                    <WiredLinkAction text={localizeWithFallback('wiredlink.delete', 'Delete network')} className="volt-wired-link-air__delete" color={0x934343} onClick={requestDelete} />
                </div>
                <div role="status" className="volt-wired-link-air__status"><WiredLinkText text={status} color={errorCode ? 0xad3434 : 0x555555} /></div>
            </div>
        </VoltCardView>
    );
};

export const WiredLinkConnectionsView: FC<{}> = () => {
    const networkId = useWiredLinkStore((state) => state.connections?.networkId ?? '');
    if (!networkId) return null;
    return <WiredLinkConnectionsDialogView key={networkId} networkId={networkId} />;
};
