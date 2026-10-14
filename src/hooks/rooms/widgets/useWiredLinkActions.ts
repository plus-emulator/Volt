// WIRED Link actions (AIR WIN63-202610131318: WiredLinkController.as L243-372; outgoing 385 save selection, 2192 create, 2794 rename, 2731 delete, 2300 connections; CreateLinkEvent navigator/goto from visitRoom L362).
import { WiredLinkCreateNetworkComposer, WiredLinkDeleteNetworkComposer, WiredLinkGetConnectionsComposer, WiredLinkOperationResultParser, WiredLinkRenameNetworkComposer, WiredLinkSaveSelectionComposer } from '@volt/renderer';
import { CreateLinkEvent, IsOwnerOfFloorFurniture, SendMessageComposer } from '../../../api';
import { canConnectWiredLink, isValidWiredLinkName } from '../../../api/wired/WiredLink';
import { useWiredLinkStore } from './useWiredLinkState';

const RESULT_INVALID_NAME = 3;
const RESULT_CANNOT_CONNECT = 5;
const NO_NETWORK = '0';

const getState = () => useWiredLinkStore.getState();

/** WiredLinkController.as canEdit L243: only the owner may change the Link; otherwise the dialog closes. */
const canEdit = (): boolean => {
    const state = getState();

    if (!state.isOpen) return false;
    if (IsOwnerOfFloorFurniture(state.furniId)) return true;

    state.closeWiredLink();

    return false;
};

const findNetwork = (networkId: string) => getState().networks.find((network) => network.id === networkId) ?? null;

const validName = (name: string, operation: number): boolean => {
    if (isValidWiredLinkName(name)) return true;

    getState().failOperation(RESULT_INVALID_NAME, operation);

    return false;
};

export const createWiredLinkNetwork = (name: string) => {
    if (!validName(name, WiredLinkOperationResultParser.OPERATION_CREATE) || !canEdit()) return;

    SendMessageComposer(new WiredLinkCreateNetworkComposer(getState().furniId, name));
};

export const renameWiredLinkNetwork = (networkId: string, name: string) => {
    if (!findNetwork(networkId) || !validName(name, WiredLinkOperationResultParser.OPERATION_RENAME) || !canEdit()) return;

    SendMessageComposer(new WiredLinkRenameNetworkComposer(getState().furniId, networkId, name));
};

export const deleteWiredLinkNetwork = (networkId: string) => {
    if (!findNetwork(networkId) || !canEdit()) return;

    SendMessageComposer(new WiredLinkDeleteNetworkComposer(getState().furniId, networkId));
};

export const requestWiredLinkConnections = (networkId: string) => {
    if (!findNetwork(networkId) || !canEdit()) return;

    getState().openConnections(networkId);
    SendMessageComposer(new WiredLinkGetConnectionsComposer(getState().furniId, networkId));
};

/** Applies the network and the receive flag to this Link, the same as the Save button. */
export const saveWiredLink = (networkId: string, receiveLocal: boolean) => {
    if (!canEdit()) return;

    const state = getState();

    if (!canConnectWiredLink(state.networks, networkId, state.selectedNetworkId)) {
        state.failOperation(RESULT_CANNOT_CONNECT, WiredLinkOperationResultParser.OPERATION_SAVE);

        return;
    }

    state.setDraftNetwork(networkId);
    state.setReceiveLocal(receiveLocal);
    SendMessageComposer(new WiredLinkSaveSelectionComposer(state.furniId, networkId, receiveLocal));
};

/** The receive checkbox saves at once, as the AIR dialog does. */
export const setWiredLinkReceiveLocal = (receiveLocal: boolean) => {
    const { draftNetworkId, furniId } = getState();

    saveWiredLink(draftNetworkId, receiveLocal);

    if (receiveLocal && draftNetworkId === NO_NETWORK && furniId) getState().setStatus({ key: 'wiredlink.receive.local.info', error: false });
};

export const clearWiredLinkConnection = () => saveWiredLink(NO_NETWORK, getState().receiveLocal);

export const visitWiredLinkRoom = (roomId: number) => CreateLinkEvent(`navigator/goto/${roomId}`);
