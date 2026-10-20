import { GetCommunication, IWiredVariableDiffEntry, WiredGetVariablesForObjectComposer, WiredSetObjectVariableValueComposer, WiredVariablesForObjectEvent } from '@volt/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GetRoomSession, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { useWiredCatalog } from '../wired/useWiredCatalog';

/** The inspected holder as the official messages name it: furni 0 (item id), user 1 (room index), room -10 (id 0). */
export interface WiredObjectHolder {
    type: 0 | 1 | -10;
    objectId: number;
}

/** AIR WiredSetObjectVariableValue operations (WiredMenuInspectionTab.as:190-265). */
export enum WiredObjectVariableOperation {
    WRITE = 0,
    CREATE = 1,
    DELETE = 2
}

// AIR WIN63-202610151745-318700621 WiredMenuInspectionTab.as:42 POLL_VARIABLES_MS.
const POLL_MS = 500;
// A request the server never answers (no rights, unknown object) is sent again after this long.
const UNANSWERED_MS = 4000;
// AIR WiredVariablesSynchronizer serves catalogue requests within 800 ms from its cache.
const CATALOG_REFRESH_MS = 800;

interface PendingRead {
    roomId: number;
    type: number;
    objectId: number;
    sentAt: number;
    answered: boolean;
}

interface Snapshot {
    key: string;
    values: ReadonlyMap<string, number>;
}

/**
 * The Inspection tab's server view of one holder: polls WiredGetVariablesForObject while active, keeps only answers for the current
 * room and holder, and reads the variable definitions from the room's shared variable catalogue.
 */
export const useWiredObjectVariables = (roomId: number, holder: WiredObjectHolder | null, active: boolean, canInspect: boolean) => {
    const { provider: catalogProvider, bind: bindCatalog } = useWiredCatalog();
    const [catalogState, setCatalogState] = useState<{ roomId: number; rows: ReadonlyMap<string, IWiredVariableDiffEntry> } | null>(null);
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const pending = useRef<PendingRead | null>(null);
    const lastCatalogRefresh = useRef(0);
    const enabled = active && canInspect && roomId > 0;
    const holderType = holder?.type ?? null;
    const holderObjectId = holder?.objectId ?? 0;
    const key = enabled && holderType !== null ? `${roomId}:${holderType}:${holderObjectId}` : null;
    const catalog = enabled && catalogState?.roomId === roomId ? catalogState.rows : null;

    useEffect(() => {
        if (!enabled) return;
        bindCatalog(canInspect);
        lastCatalogRefresh.current = Date.now();
        return catalogProvider.subscribe((state) => setCatalogState({ roomId, rows: state.rows }));
    }, [enabled, roomId, canInspect, catalogProvider, bindCatalog]);

    useEffect(() => {
        pending.current = null;
        if (key === null || holderType === null) return;

        const poll = () => {
            const current = pending.current;
            const now = Date.now();
            if (current && now - current.sentAt < (current.answered ? POLL_MS : UNANSWERED_MS)) return;
            pending.current = { roomId, type: holderType, objectId: holderObjectId, sentAt: now, answered: false };
            SendMessageComposer(new WiredGetVariablesForObjectComposer(holderType, holderObjectId));
        };

        poll();
        const interval = window.setInterval(poll, 100);

        return () => {
            window.clearInterval(interval);
            pending.current = null;
        };
    }, [key, roomId, holderType, holderObjectId]);

    useMessageEvent<WiredVariablesForObjectEvent>(WiredVariablesForObjectEvent, (event) => {
        const current = pending.current;
        const parser = event.getParser();

        if (!current || key === null || event.connection !== GetCommunication().connection || GetRoomSession()?.roomId !== current.roomId) return;
        if (parser.type !== current.type || (parser.type !== -10 && parser.objectId !== current.objectId)) return;

        current.answered = true;
        setSnapshot({ key, values: parser.values });

        // As AIR, the catalogue is only asked for again when the answer names a variable it does not know yet.
        const now = Date.now();
        const unknown = [...parser.values.keys()].some((variableId) => !catalog?.has(variableId));
        if (!unknown || now - lastCatalogRefresh.current < CATALOG_REFRESH_MS) return;
        lastCatalogRefresh.current = now;
        catalogProvider.refresh();
    });

    const write = useCallback(
        (target: number, variableId: string, value: number, operation: WiredObjectVariableOperation) => {
            if (key === null || holderType === null) return;
            SendMessageComposer(new WiredSetObjectVariableValueComposer(target, holderObjectId, variableId, value, operation));
            // Read the holder again on the next tick so the change shows at once.
            if (pending.current) pending.current.sentAt = 0;
        },
        [key, holderType, holderObjectId]
    );

    const refreshCatalog = useCallback(() => {
        lastCatalogRefresh.current = Date.now();
        catalogProvider.refresh();
    }, [catalogProvider]);

    return {
        values: snapshot && snapshot.key === key ? snapshot.values : null,
        catalog,
        write,
        refreshCatalog
    };
};
