import { IWiredVariableDiffEntry } from '@volt/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWiredCatalog } from '../wired/useWiredCatalog';

// AIR WiredVariablesSynchronizer serves catalogue requests within 800 ms from its cache.
const CATALOG_REFRESH_MS = 800;

interface CatalogState {
    roomId: number;
    rows: ReadonlyMap<string, IWiredVariableDiffEntry>;
    ready: boolean;
}

/**
 * The room's variable catalogue as the server sent it, while `enabled`. `ready` turns true once the first full answer arrived.
 * `refresh` asks the server again, at most once per 800 ms.
 */
export const useWiredCatalogRows = (roomId: number, enabled: boolean, canInspect: boolean) => {
    const { provider, bind } = useWiredCatalog();
    const [state, setState] = useState<CatalogState | null>(null);
    const lastRefresh = useRef(0);
    const active = enabled && canInspect && roomId > 0;

    useEffect(() => {
        if (!active) return;
        bind(canInspect);
        lastRefresh.current = Date.now();
        return provider.subscribe((next) => setState({ roomId, rows: next.rows, ready: next.available }));
    }, [active, roomId, canInspect, provider, bind]);

    const refresh = useCallback(() => {
        const now = Date.now();
        if (now - lastRefresh.current < CATALOG_REFRESH_MS) return;
        lastRefresh.current = now;
        provider.refresh();
    }, [provider]);

    const current = active && state?.roomId === roomId ? state : null;

    return { catalog: current?.rows ?? null, ready: !!current?.ready, refresh };
};
