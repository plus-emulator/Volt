// WIRED Link dialog state (AIR WIN63-202610131318: WiredLinkController.as L130-260 and L322-372, WiredLinkView.as L53-260, WiredLinkConnectionsView.as L37-150; packets 1715 open, 3405 configuration, 3961 operation result, 3962 connections, 999 invalidated).
import {
    IWiredLinkConnection,
    IWiredLinkNetwork,
    RoomEngineEvent,
    RoomSessionEvent,
    WiredLinkConfigurationEvent,
    WiredLinkConnectionsEvent,
    WiredLinkNetworkInvalidatedEvent,
    WiredLinkOpenEvent,
    WiredLinkOperationResultEvent,
    WiredLinkOperationResultParser,
    WiredLinkRequestConfigComposer
} from '@volt/renderer';
import { GetRoomSession, IsOwnerOfFloorFurniture, SendMessageComposer } from '../../../api';
import { createVoltStore } from '../../../state/createVoltStore';
import { useMessageEvent, useVoltEvent } from '../../events';

export interface IWiredLinkStatus {
    key: string;
    error: boolean;
}

export interface IWiredLinkConnectionsState {
    networkId: string;
    loading: boolean;
    errorCode: number;
    connections: IWiredLinkConnection[];
}

export interface IWiredLinkResult {
    operation: number;
    resultCode: number;
}

export interface IWiredLinkConfiguration {
    roomId: number;
    furniId: number;
    selectedNetworkId: string;
    receiveLocal: boolean;
    networks: IWiredLinkNetwork[];
}

export type WiredLinkState = {
    isOpen: boolean;
    roomId: number;
    furniId: number;
    networks: IWiredLinkNetwork[];
    /** The network the furni is connected to (saved). */
    selectedNetworkId: string;
    /** The network picked in the dialog, applied by Save. */
    draftNetworkId: string;
    receiveLocal: boolean;
    savedReceiveLocal: boolean;
    status: IWiredLinkStatus | null;
    lastResult: IWiredLinkResult | null;
    /** Successful creates and renames, so a view can clear its name field once per success. */
    createCount: number;
    renameCount: number;
    connections: IWiredLinkConnectionsState | null;
};

export type WiredLinkActions = {
    applyConfiguration(configuration: IWiredLinkConfiguration): void;
    applyOperationResult(result: Pick<WiredLinkOperationResultParser, 'operation' | 'hasConfiguration' | 'selectedNetworkId' | 'receiveLocal' | 'removedNetworkId' | 'networks'>): void;
    failOperation(resultCode: number, operation: number): void;
    applyInvalidated(networkId: string): void;
    applyConnections(networkId: string, connections: IWiredLinkConnection[]): void;
    openConnections(networkId: string): void;
    closeConnections(): void;
    closeWiredLink(): void;
    setDraftNetwork(networkId: string): void;
    setReceiveLocal(receiveLocal: boolean): void;
    setStatus(status: IWiredLinkStatus | null): void;
};

const INITIAL_WIRED_LINK_STATE: WiredLinkState = {
    isOpen: false,
    roomId: 0,
    furniId: 0,
    networks: [],
    selectedNetworkId: '0',
    draftNetworkId: '0',
    receiveLocal: false,
    savedReceiveLocal: false,
    status: null,
    lastResult: null,
    createCount: 0,
    renameCount: 0,
    connections: null
};

/** WiredLinkController.as matchesTarget L140: the result belongs to the dialog that is open. */
export const isWiredLinkTarget = (state: WiredLinkState, roomId: number, furniId: number): boolean =>
    state.isOpen && state.roomId === roomId && state.furniId === furniId;

export const useWiredLinkStore = createVoltStore<WiredLinkState & WiredLinkActions>()((set) => ({
    ...INITIAL_WIRED_LINK_STATE,

    applyConfiguration: (configuration) =>
        set({
            ...INITIAL_WIRED_LINK_STATE,
            isOpen: true,
            roomId: configuration.roomId,
            furniId: configuration.furniId,
            networks: configuration.networks,
            selectedNetworkId: configuration.selectedNetworkId,
            draftNetworkId: configuration.selectedNetworkId,
            receiveLocal: configuration.receiveLocal,
            savedReceiveLocal: configuration.receiveLocal
        }),

    applyOperationResult: (result) =>
        set((state) => {
            const networks = state.networks.filter((network) => network.id !== result.removedNetworkId);

            for (const network of result.networks) {
                const index = networks.findIndex((entry) => entry.id === network.id);

                if (index < 0) networks.push(network);
                else networks[index] = network;
            }

            const savedReceiveLocal = result.hasConfiguration ? result.receiveLocal : state.savedReceiveLocal;
            const isSuccessMessage = result.operation >= 1 && result.operation <= 4;

            return {
                networks,
                selectedNetworkId: result.hasConfiguration ? result.selectedNetworkId : state.selectedNetworkId,
                draftNetworkId: state.draftNetworkId === result.removedNetworkId ? '0' : state.draftNetworkId,
                receiveLocal: result.hasConfiguration ? result.receiveLocal : state.receiveLocal,
                savedReceiveLocal,
                status: isSuccessMessage ? { key: `wiredlink.success.${result.operation}`, error: false } : state.status,
                connections: state.connections?.networkId === result.removedNetworkId ? null : state.connections,
                lastResult: { operation: result.operation, resultCode: 0 },
                createCount: state.createCount + (result.operation === 2 ? 1 : 0),
                renameCount: state.renameCount + (result.operation === 3 ? 1 : 0)
            };
        }),

    failOperation: (resultCode, operation) =>
        set((state) => {
            const connections = state.connections;
            const onConnections = !!connections && ((operation === 3 && connections.networkId !== '0') || operation === 4 || operation === 5);

            return {
                receiveLocal: operation === 1 ? state.savedReceiveLocal : state.receiveLocal,
                status: onConnections ? state.status : { key: `wiredlink.error.${resultCode}`, error: true },
                connections: connections && onConnections ? { ...connections, errorCode: resultCode } : connections,
                lastResult: { operation, resultCode }
            };
        }),

    applyInvalidated: (networkId) =>
        set((state) => ({
            networks: state.networks.filter((network) => network.id !== networkId),
            selectedNetworkId: state.selectedNetworkId === networkId ? '0' : state.selectedNetworkId,
            draftNetworkId: state.draftNetworkId === networkId ? '0' : state.draftNetworkId,
            connections: state.connections?.networkId === networkId ? null : state.connections,
            status: { key: 'wiredlink.deleted', error: false }
        })),

    applyConnections: (networkId, connections) =>
        set((state) =>
            state.connections?.networkId === networkId && state.connections.loading
                ? { connections: { networkId, loading: false, errorCode: 0, connections } }
                : state
        ),

    openConnections: (networkId) => set({ connections: { networkId, loading: true, errorCode: 0, connections: [] } }),

    closeConnections: () => set({ connections: null }),

    closeWiredLink: () => set({ ...INITIAL_WIRED_LINK_STATE }),

    setDraftNetwork: (networkId) => set({ draftNetworkId: networkId }),

    setReceiveLocal: (receiveLocal) => set({ receiveLocal }),

    setStatus: (status) => set({ status }),
}));

const isOwnedInCurrentRoom = (roomId: number, furniId: number): boolean => GetRoomSession()?.roomId === roomId && IsOwnerOfFloorFurniture(furniId);

/** Feeds the WIRED Link store from the five link packets and closes the dialog with the room. */
export const useWiredLinkEvents = () => {
    useMessageEvent<WiredLinkOpenEvent>(WiredLinkOpenEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !IsOwnerOfFloorFurniture(parser.furniId)) return;

        SendMessageComposer(new WiredLinkRequestConfigComposer(parser.furniId));
    });

    useMessageEvent<WiredLinkConfigurationEvent>(WiredLinkConfigurationEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !isOwnedInCurrentRoom(parser.roomId, parser.furniId)) return;

        useWiredLinkStore.getState().applyConfiguration({
            roomId: parser.roomId,
            furniId: parser.furniId,
            selectedNetworkId: parser.selectedNetworkId,
            receiveLocal: parser.receiveLocal,
            networks: [...parser.networks]
        });
    });

    useMessageEvent<WiredLinkOperationResultEvent>(WiredLinkOperationResultEvent, (event) => {
        const parser = event.getParser();
        const state = useWiredLinkStore.getState();

        if (!parser || !isWiredLinkTarget(state, parser.roomId, parser.furniId)) return;

        if (parser.resultCode !== 0) state.failOperation(parser.resultCode, parser.operation);
        else state.applyOperationResult(parser);
    });

    useMessageEvent<WiredLinkConnectionsEvent>(WiredLinkConnectionsEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !isWiredLinkTarget(useWiredLinkStore.getState(), parser.roomId, parser.furniId)) return;

        useWiredLinkStore.getState().applyConnections(parser.networkId, parser.connections);
    });

    useMessageEvent<WiredLinkNetworkInvalidatedEvent>(WiredLinkNetworkInvalidatedEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !isWiredLinkTarget(useWiredLinkStore.getState(), parser.roomId, parser.furniId)) return;

        useWiredLinkStore.getState().applyInvalidated(parser.deletedNetworkId);
    });

    useVoltEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, () => useWiredLinkStore.getState().closeWiredLink());
    useVoltEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, () => useWiredLinkStore.getState().closeWiredLink());
};
