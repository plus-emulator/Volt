import {
    IVariableLeaderboardDescriptor,
    IVariableLeaderboardRow,
    RoomEngineEvent,
    RoomEntryInfoMessageEvent,
    RoomSessionEvent,
    VariableLeaderboardChunkEvent,
    VariableLeaderboardSnapshotEvent,
    VariableLeaderboardSubscribeComposer
} from '@volt/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SendMessageComposer } from '../../api';
import {
    applyVariableLeaderboardTotal,
    createVariableLeaderboardPageState,
    desiredVariableLeaderboardChunkIndices,
    IVariableLeaderboardPageState,
    isVariableLeaderboardDescriptorValid,
    moveVariableLeaderboardPage,
    resolveVariableLeaderboardSelection
} from '../../api/wired/WiredVariableLeaderboard';
import { useMessageEvent, useVoltEvent } from '../events';

/** VariableLeaderboardController: at most four published leaderboards per room. */
const MAX_OVERLAYS = 4;

export interface IVariableLeaderboardOverlayState {
    descriptor: IVariableLeaderboardDescriptor;
    /** null when the descriptor offers no variable. */
    selectedVariableId: string | null;
    page: IVariableLeaderboardPageState;
    /** The rows of the chunks the overlay holds for the selected variable, keyed by chunk index. */
    chunks: ReadonlyMap<number, IVariableLeaderboardRow[]>;
}

interface ISentSubscription {
    revision: number;
    variableId: string;
    chunkIndices: number[];
}

const sameIndices = (left: number[], right: number[]): boolean => left.length === right.length && left.every((value, index) => value === right[index]);

const createOverlayState = (descriptor: IVariableLeaderboardDescriptor, selectedVariableId: string | null): IVariableLeaderboardOverlayState => ({
    descriptor,
    selectedVariableId,
    page: createVariableLeaderboardPageState(descriptor.pageSizeOption),
    chunks: new Map()
});

/**
 * Keeps the room's variable leaderboards in step with the server: the room-open request, the descriptor snapshot, the subscribed chunks
 * and the page and variable the viewer picked. Mounted once with the room widgets; the state is dropped when the room ends.
 */
export const useVariableLeaderboards = () => {
    const [overlays, setOverlays] = useState<IVariableLeaderboardOverlayState[]>([]);
    const sentRef = useRef(new Map<number, ISentSubscription>());

    const clear = useCallback(() => {
        sentRef.current.clear();
        setOverlays([]);
    }, []);

    // Sends the chunk set whenever it differs from the last one sent for the overlay (reconcileSubscription L427).
    useEffect(() => {
        const sent = sentRef.current;
        const liveIds = new Set(overlays.map((overlay) => overlay.descriptor.overlayInstanceId));

        for (const overlayId of [...sent.keys()]) if (!liveIds.has(overlayId)) sent.delete(overlayId);

        for (const overlay of overlays) {
            const { overlayInstanceId, queryRevision } = overlay.descriptor;
            const variableId = overlay.selectedVariableId;

            if (variableId === null) continue;

            const previous = sent.get(overlayInstanceId);
            const held = previous && previous.revision === queryRevision && previous.variableId === variableId ? previous.chunkIndices : [];
            const desired = desiredVariableLeaderboardChunkIndices(overlay.page, held);

            if (previous && previous.revision === queryRevision && previous.variableId === variableId && sameIndices(desired, held)) continue;

            sent.set(overlayInstanceId, { revision: queryRevision, variableId, chunkIndices: desired });
            SendMessageComposer(new VariableLeaderboardSubscribeComposer(overlayInstanceId, queryRevision, variableId, desired));
        }
    }, [overlays]);

    // Room open (onRoomEntryInfo L214): the only request allowed to carry no chunk indices.
    useMessageEvent<RoomEntryInfoMessageEvent>(RoomEntryInfoMessageEvent, () => {
        clear();
        SendMessageComposer(new VariableLeaderboardSubscribeComposer(0, 0, '0', []));
    });

    // onSnapshot L233 and applyDescriptor L267: a newer revision resets the overlay, an older one is ignored, absent overlays go.
    useMessageEvent<VariableLeaderboardSnapshotEvent>(VariableLeaderboardSnapshotEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setOverlays((previous) => {
            const next: IVariableLeaderboardOverlayState[] = [];

            for (const descriptor of parser.descriptors) {
                if (!isVariableLeaderboardDescriptorValid(descriptor)) continue;

                const existing = previous.find((overlay) => overlay.descriptor.overlayInstanceId === descriptor.overlayInstanceId);

                if (existing && descriptor.queryRevision < existing.descriptor.queryRevision) {
                    next.push(existing);
                    continue;
                }

                if (!existing && next.length >= MAX_OVERLAYS) continue;

                const selectedVariableId = resolveVariableLeaderboardSelection(descriptor, existing?.selectedVariableId ?? null);

                if (
                    !existing ||
                    existing.descriptor.queryRevision !== descriptor.queryRevision ||
                    existing.descriptor.pageSizeOption !== descriptor.pageSizeOption ||
                    existing.selectedVariableId !== selectedVariableId
                ) {
                    next.push(createOverlayState(descriptor, selectedVariableId));
                    continue;
                }

                next.push({ ...existing, descriptor });
            }

            return next;
        });
    });

    // onChunkUpdate L346: accepted only for a held chunk of the current revision and variable.
    useMessageEvent<VariableLeaderboardChunkEvent>(VariableLeaderboardChunkEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const sent = sentRef.current.get(parser.overlayInstanceId);

        if (!sent || sent.revision !== parser.queryRevision || sent.variableId !== parser.selectedVariableId || !sent.chunkIndices.includes(parser.chunkIndex))
            return;

        setOverlays((previous) =>
            previous.map((overlay) => {
                if (overlay.descriptor.overlayInstanceId !== parser.overlayInstanceId) return overlay;
                if (overlay.descriptor.queryRevision !== parser.queryRevision || overlay.selectedVariableId !== parser.selectedVariableId) return overlay;

                const chunks = new Map<number, IVariableLeaderboardRow[]>();

                for (const index of sent.chunkIndices) {
                    const rows = index === parser.chunkIndex ? parser.rows : overlay.chunks.get(index);

                    if (rows) chunks.set(index, rows);
                }

                return { ...overlay, chunks, page: applyVariableLeaderboardTotal(overlay.page, parser.totalCount) };
            })
        );
    });

    // Previous and next page (showPreviousPage / showNextPage L390). The subscription follows in the effect above.
    const showPage = useCallback((overlayInstanceId: number, page: number) => {
        setOverlays((previous) =>
            previous.map((overlay) => {
                if (overlay.descriptor.overlayInstanceId !== overlayInstanceId) return overlay;

                const moved = moveVariableLeaderboardPage(overlay.page, page);

                return moved ? { ...overlay, page: moved } : overlay;
            })
        );
    }, []);

    // selectVariable L377: a new variable starts again on the first page with nothing held.
    const selectVariable = useCallback((overlayInstanceId: number, variableId: string) => {
        setOverlays((previous) =>
            previous.map((overlay) => {
                if (overlay.descriptor.overlayInstanceId !== overlayInstanceId || overlay.selectedVariableId === variableId) return overlay;
                if (!overlay.descriptor.choices.some((choice) => choice.variableId === variableId)) return overlay;

                return createOverlayState(overlay.descriptor, variableId);
            })
        );
    }, []);

    useVoltEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, () => clear());
    useVoltEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, () => clear());

    return { overlays, showPage, selectVariable };
};
