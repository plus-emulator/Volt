/*
 * The variable leaderboards drawn over the room (VariableLeaderboardController L36 and VariableLeaderboardView, roomevents/variable_leaderboard,
 * build WIN63-202610131318-860371703): one board per published overlay, anchored to its tile by VariableLeaderboardLocationProjector
 * (tile centre, offsetX in pixels, altitude up), with the page footer ('Page %page% / %pages%'), the variable selector when several
 * variables are stacked, and the loading and empty states. Dossier entry 1005.
 */
import { GetRoomEngine, IVariableLeaderboardDescriptor, Vector3d } from '@volt/renderer';
import { FC, PropsWithChildren, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { AddAnimationTickerCallback, localizeWithFallback } from '../../../../api';
import {
    collectVariableLeaderboardPageRows,
    IVariableLeaderboardTimeLabels,
    variableLeaderboardColumnPixelWidth,
    variableLeaderboardPageCount
} from '../../../../api/wired/WiredVariableLeaderboard';
import { useRoom } from '../../../../hooks';
import { IVariableLeaderboardOverlayState, useVariableLeaderboards } from '../../../../hooks/rooms/useVariableLeaderboards';
import { VariableLeaderboardRowView } from './VariableLeaderboardRowView';

/** The relative times in the rows are refreshed on this clock (Controller RELATIVE_TIME_REFRESH_INTERVAL_MS). */
const RELATIVE_TIME_REFRESH_MS = 30000;

const MONTH_NAMES = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];

const createTimeLabels = (): IVariableLeaderboardTimeLabels => ({
    minutesAgo: (minutes) => localizeWithFallback('wiredfurni.variable_leaderboard.minutes_ago', '%minutes%m ago').replace('%minutes%', `${minutes}`),
    month: (month) => localizeWithFallback(`wiredfurni.params.time.month.${month}`, MONTH_NAMES[month - 1] ?? '')
});

const useNow = (intervalMs: number): number => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), intervalMs);

        return () => window.clearInterval(timer);
    }, [intervalMs]);

    return now;
};

interface VariableLeaderboardAnchorViewProps {
    roomId: number;
    location: IVariableLeaderboardDescriptor['location'];
}

/** Places the board at the tile centre, like VariableLeaderboardLocationProjector.project: offsetX sideways, altitude upwards, scaled with the room zoom. */
const VariableLeaderboardAnchorView: FC<PropsWithChildren<VariableLeaderboardAnchorViewProps>> = ({ roomId, location, children }) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const { tileX, tileY, offsetX, altitude } = location;

    useEffect(() => {
        const updatePosition = () => {
            const element = elementRef.current;

            if (!element) return;

            const geometry = GetRoomEngine().getRoomInstanceGeometry(roomId, 1);
            const point = geometry?.getScreenPoint(new Vector3d(tileX + 0.5, tileY + 0.5, 0));

            if (!geometry || !point) {
                element.style.visibility = 'hidden';
                return;
            }

            const scale = geometry.scale / 64;

            element.style.visibility = 'visible';
            element.style.left = `${Math.round(point.x + offsetX * scale)}px`;
            element.style.top = `${Math.round(point.y - altitude * scale)}px`;
        };

        updatePosition();

        return AddAnimationTickerCallback(updatePosition);
    }, [roomId, tileX, tileY, offsetX, altitude]);

    return (
        <div ref={elementRef} className="volt-variable-leaderboard-anchor" style={{ visibility: 'hidden' }}>
            {children}
        </div>
    );
};

interface VariableLeaderboardBoardViewProps {
    overlay: IVariableLeaderboardOverlayState;
    now: number;
    onPage: (page: number) => void;
    onSelect: (variableId: string) => void;
}

const VariableLeaderboardBoardView: FC<VariableLeaderboardBoardViewProps> = ({ overlay, now, onPage, onSelect }) => {
    const { descriptor, selectedVariableId, page, chunks } = overlay;
    const labels = createTimeLabels();
    const rows = useMemo(() => collectVariableLeaderboardPageRows(page, chunks), [page, chunks]);
    const pageCount = variableLeaderboardPageCount(page);
    const pagerEnabled = page.total !== null;
    const hasEntries = page.total !== 0 && selectedVariableId !== null;
    const { columns, choices } = descriptor;

    let body: ReactNode;

    if (!hasEntries) {
        body = <div className="volt-variable-leaderboard__state">{localizeWithFallback('wiredfurni.variable_leaderboard.no_entries', 'No entries')}</div>;
    } else if (rows === null) {
        body = <div className="volt-variable-leaderboard__state">{localizeWithFallback('wiredfurni.variable_leaderboard.loading', 'Loading...')}</div>;
    } else {
        body = rows.map((row) => <VariableLeaderboardRowView key={`${row.rank}-${row.userId}`} row={row} columns={columns} now={now} labels={labels} />);
    }

    return (
        <div className="volt-variable-leaderboard" data-testid="variable-leaderboard">
            <div className="volt-variable-leaderboard__title">{descriptor.title}</div>
            {descriptor.description && <div className="volt-variable-leaderboard__description">{descriptor.description}</div>}
            {choices.length > 1 && (
                <select className="volt-variable-leaderboard__select" value={selectedVariableId ?? ''} onChange={(event) => onSelect(event.target.value)}>
                    {choices.map((choice) => (
                        <option key={choice.variableId} value={choice.variableId}>
                            {choice.displayName}
                        </option>
                    ))}
                </select>
            )}
            <div className="volt-variable-leaderboard__header">
                <div className="volt-variable-leaderboard__rank" />
                <div className="volt-variable-leaderboard__face" />
                {columns.map((column, index) => (
                    <div key={index} className="volt-variable-leaderboard__cell" style={{ width: variableLeaderboardColumnPixelWidth(column.width) }}>
                        {column.label}
                    </div>
                ))}
            </div>
            <div className="volt-variable-leaderboard__body">{body}</div>
            <div className="volt-variable-leaderboard__footer">
                <button
                    type="button"
                    className="volt-variable-leaderboard__pager"
                    aria-label="Previous page"
                    disabled={!pagerEnabled || page.page <= 0}
                    onClick={() => onPage(page.page - 1)}
                >
                    {'‹'}
                </button>
                <span className="volt-variable-leaderboard__page">
                    {localizeWithFallback('wiredfurni.variable_leaderboard.page', 'Page %page% / %pages%')
                        .replace('%page%', `${page.page + 1}`)
                        .replace('%pages%', `${pageCount}`)}
                </span>
                <button
                    type="button"
                    className="volt-variable-leaderboard__pager"
                    aria-label="Next page"
                    disabled={!pagerEnabled || page.page >= pageCount - 1}
                    onClick={() => onPage(page.page + 1)}
                >
                    {'›'}
                </button>
            </div>
        </div>
    );
};

/**
 * The room's variable leaderboards. The state comes from useVariableLeaderboards, which is mounted here once with the room widgets; the
 * boards are dropped with the room.
 */
export const VariableLeaderboardOverlayView: FC<{}> = () => {
    const { roomSession = null } = useRoom();
    const { overlays, showPage, selectVariable } = useVariableLeaderboards();
    const now = useNow(RELATIVE_TIME_REFRESH_MS);

    if (!roomSession || overlays.length === 0) return null;

    return (
        <div className="volt-variable-leaderboard-layer" data-testid="variable-leaderboard-layer">
            {overlays.map((overlay) => (
                <VariableLeaderboardAnchorView key={overlay.descriptor.overlayInstanceId} roomId={roomSession.roomId} location={overlay.descriptor.location}>
                    <VariableLeaderboardBoardView
                        overlay={overlay}
                        now={now}
                        onPage={(page) => showPage(overlay.descriptor.overlayInstanceId, page)}
                        onSelect={(variableId) => selectVariable(overlay.descriptor.overlayInstanceId, variableId)}
                    />
                </VariableLeaderboardAnchorView>
            ))}
        </div>
    );
};
