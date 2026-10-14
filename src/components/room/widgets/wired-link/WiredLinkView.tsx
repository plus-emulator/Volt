// AIR package25 wired_link_view_xml (620×467, frame3), WiredLinkView and WiredLinkNetworkTableObject.
import { IWiredLinkNetwork } from '@volt/renderer';
import { FC, useMemo, useState } from 'react';
import { localizeWithFallback } from '../../../../api';
import { canConnectWiredLink, sortWiredLinkNetworks, WIRED_LINK_MESSAGE_FALLBACKS } from '../../../../api/wired/WiredLink';
import { VoltCardHeaderView, VoltCardView } from '../../../../common';
import { NativeText } from '../../../../common/native-text/NativeText';
import { clearWiredLinkConnection, createWiredLinkNetwork, requestWiredLinkConnections, saveWiredLink, setWiredLinkReceiveLocal } from '../../../../hooks/rooms/widgets/useWiredLinkActions';
import { useWiredLinkStore } from '../../../../hooks/rooms/widgets/useWiredLinkState';
import { WiredLinkAction, WiredLinkBorder, WiredLinkTable, WiredLinkText } from './WiredLinkNative';
import '../../../../css/room/WiredLinkNative.css';

/** Connect, Clear and Receive save immediately; there is no separate draft-selection form in AIR. */
export const WiredLinkView: FC<{}> = () => {
    const networks = useWiredLinkStore((state) => state.networks);
    const selectedNetworkId = useWiredLinkStore((state) => state.selectedNetworkId);
    const receiveLocal = useWiredLinkStore((state) => state.receiveLocal);
    const status = useWiredLinkStore((state) => state.status);
    const createCount = useWiredLinkStore((state) => state.createCount);
    const closeWiredLink = useWiredLinkStore((state) => state.closeWiredLink);
    const [nameDraft, setNameDraft] = useState({ seq: -1, text: '' });
    const nameInput = nameDraft.seq === createCount ? nameDraft.text : '';
    const sortedNetworks = useMemo(() => sortWiredLinkNetworks(networks), [networks]);
    const selectedName = networks.find((network) => network.id === selectedNetworkId)?.name;
    const selectionLine = selectedName === undefined
        ? localizeWithFallback('wiredlink.selected.none', 'Selected network: None')
        : localizeWithFallback('wiredlink.selected', `Selected network: ${selectedName}`, ['name'], [selectedName]);
    const title = localizeWithFallback('wiredlink.title', 'WIRED Link');
    const columns = [
        { title: localizeWithFallback('wiredlink.column.name', 'Network name'), fraction: .44, left: true },
        { title: localizeWithFallback('wiredlink.column.count', 'Connections'), fraction: .22 },
        { title: localizeWithFallback('wiredlink.column.status', 'Status'), fraction: .21 },
        { title: '', fraction: .13 }
    ];
    const cell = (network: IWiredLinkNetwork, column: number, background: number) => {
        const current = network.id === selectedNetworkId;
        if (column === 0) return <WiredLinkText text={network.name} background={background} />;
        if (column === 1) return <WiredLinkText text={String(network.connectionCount)} background={background} />;
        if (column === 3) return <WiredLinkAction text={localizeWithFallback('wiredlink.manage', 'Manage')} background={background} onClick={() => requestWiredLinkConnections(network.id)} />;
        if (!current && !network.linkedInCurrentRoom) return <WiredLinkAction text={localizeWithFallback('wiredlink.status.connect', 'Connect')} background={background}
            disabled={!canConnectWiredLink(networks, network.id, selectedNetworkId)} onClick={() => saveWiredLink(network.id, receiveLocal)} />;
        return <WiredLinkText text={current ? localizeWithFallback('wiredlink.status.connected', 'Connected') : localizeWithFallback('wiredlink.status.linked_in_room', 'Linked in room')}
            color={current ? 0x287346 : 0x555555} background={background} />;
    };
    return (
        <VoltCardView frameStyle={3} nativeShadow resizeAxis="vertical" className="volt-wired-link-air volt-wired-link-air--owner" role="dialog" aria-label={title}>
            <VoltCardHeaderView headerText="" onCloseClick={closeWiredLink}><NativeText text={title} textStyle="u_frame_title" background={0x367897} overrides={{ color: 0xffffff }} /></VoltCardHeaderView>
            <div className="volt-wired-link-air__client">
                <WiredLinkBorder kind="input" color={0xdce8ec} className="volt-wired-link-air__summary">
                    <span className="volt-wired-link-air__selected"><WiredLinkText text={selectionLine} bold size={13} color={0x285568} background={0xdce8ec} /></span>
                    <WiredLinkAction text={localizeWithFallback('wiredlink.clear', 'Clear connection')} className="volt-wired-link-air__clear" color={0x365f70} background={0xdce8ec} onClick={clearWiredLinkConnection} />
                </WiredLinkBorder>
                <div className="volt-wired-link-air__networks">
                    <WiredLinkText text={localizeWithFallback('wiredlink.networks.title', 'My networks:')} size={14} bold />
                    <WiredLinkTable columns={columns} rows={sortedNetworks} rowKey={(network) => network.id} cell={cell} />
                </div>
                <WiredLinkBorder kind="shadow" className="volt-wired-link-air__create">
                    <span className="volt-wired-link-air__new-label"><WiredLinkText text={localizeWithFallback('wiredlink.new_name', 'New network:')} bold background={0xffffff} /></span>
                    <WiredLinkBorder kind="input" className="volt-wired-link-air__new-input"><input aria-label={localizeWithFallback('wiredlink.new_name', 'New network:')} maxLength={255} value={nameInput} onChange={(event) => setNameDraft({ seq: createCount, text: event.target.value })} /></WiredLinkBorder>
                    <button className="volt-wired-link-air__create-button fnd-button fnd-button-thick" type="button" onClick={() => createWiredLinkNetwork(nameInput)}><NativeText text={localizeWithFallback('wiredlink.create', 'Create network')} textStyle="button_shiny_regular" background={0xffffff} /></button>
                </WiredLinkBorder>
                <WiredLinkBorder kind="colorless" color={0xdeded7} className="volt-wired-link-air__receive">
                    <label><input type="checkbox" checked={receiveLocal} onChange={(event) => setWiredLinkReceiveLocal(event.target.checked)} /><WiredLinkText text={localizeWithFallback('wiredlink.receive', 'Receive messages sent by this room')} background={0xdeded7} /></label>
                </WiredLinkBorder>
                {status && <div role="status" className="volt-wired-link-air__status"><WiredLinkText text={localizeWithFallback(status.key, WIRED_LINK_MESSAGE_FALLBACKS[status.key] ?? status.key)} color={status.error ? 0xad3434 : 0x555555} /></div>}
            </div>
        </VoltCardView>
    );
};
