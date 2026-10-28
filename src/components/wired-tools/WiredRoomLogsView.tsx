import { IWiredLogEntry, WiredLogPageEvent, WiredRoomLogsPageComposer } from '@volt/renderer';
import { useEffect, useRef, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../api';
import { DraggableWindowPosition, VoltCardHeaderView, VoltCardView } from '../../common';
import { HabboDropMenuView } from '../../common/dropmenu/HabboDropMenuView';
import { SubpixelText } from '../../common/native-text/SubpixelText';
import { WiredMenuLabel } from '../../common/native-text/WiredMenuLabel';
import { useMessageEvent } from '../../hooks';
import { useWiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
import { WiredMenuCheckbox, WiredMenuItem, WiredMenuTable, WiredMenuTableColumn, WiredMenuText, WiredMenuTitle } from './WiredMenuParts';
import { WiredMenuPagingFooter } from './WiredMenuPaging';
import { calculateLastPage, NO_PAGE } from './WiredPaging.helpers';

/** Rows per page, as the official log list shows them. */
export const WIRED_ROOM_LOGS_PAGE_SIZE = 50;
/** Above the server's own 250 ms limit on the page request. */
const REQUEST_PAGE_RATELIMIT = 300;
const REFRESH_TIME_MS = 2500;
const FILTER_MAX_CHARS = 400;
/** Habbo's log levels by the number the server sends, with the text colour of their rows (WiredRoomLogListTableObject). */
const LOG_LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
const LEVEL_COLORS = [0x0011ff, 0xb36800, 0xdb2800, 0x9b01c6];
/** The two log sources: the engine's own notes and the lines wired boxes wrote. */
const LOG_SOURCES = ['System', 'Wired'];
/** logs_overview: a 700x508 frame 3 window whose client starts 33 px down; it resizes in height between 380 and 700. */
const WINDOW_WIDTH = 700;
const INFO_LINE_HEIGHT = 15;

interface LogPage {
    totalEntries: number;
    currentPage: number;
    entries: IWiredLogEntry[];
    logLevelFilter: number;
    logSourceFilter: number;
    query: string;
}

export interface WiredRoomLogsViewProps {
    onClose: () => void;
}

const sourceLabel = (source: number): string => {
    const name = LOG_SOURCES[source];

    if (!name) return String(source);

    return localizeWithFallback(`wiredmenu.logs_overview.log_source.${source}`, name);
};

const levelLabel = (level: number): string => {
    const name = LOG_LEVELS[level];

    if (!name) return String(level);

    return localizeWithFallback(`wiredmenu.logs_overview.log_level.${level}`, name);
};

/**
 * The room's wired log: a text filter, the source and level menus, auto refresh every 2.5 s
 * and the log a page of 50 at a time, each line coloured by its level. Every request carries the
 * filters last chosen; changing a filter asks for page 1 with the new ones. A page answering other
 * filters (one already on its way when they changed) is dropped, so it can't put old rows or old
 * filters back. A page the user asked for scrolls to the top; an auto refresh leaves it alone.
 */
export const WiredRoomLogsView = ({ onClose }: WiredRoomLogsViewProps) => {
    const [page, setPage] = useState<LogPage | null>(null);
    const [source, setSource] = useState(-1);
    const [level, setLevel] = useState(-1);
    const [query, setQuery] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshEpoch, setRefreshEpoch] = useState(0);
    const [scrollKey, setScrollKey] = useState(0);
    const [selectedId, setSelectedId] = useState<number>(null);
    const [tableArea, setTableArea] = useState<HTMLDivElement>(null);
    const [tableHeight, setTableHeight] = useState(0);
    // The filters last chosen. The server answers with the trimmed query.
    const wantedFilters = useRef({ logSourceFilter: -1, logLevelFilter: -1, query: '' });
    const silentRequest = useRef(false);
    const pageRequestedSilently = useRef(false);
    // Page 1 for changed filters that the limiter has not let through yet, and its one retry timer.
    const filterPending = useRef(false);
    const filterRetry = useRef<number | null>(null);

    useMessageEvent<WiredLogPageEvent>(WiredLogPageEvent, (event) => {
        const parser = event.getParser();
        const wanted = wantedFilters.current;

        if (
            parser.logLevelFilter !== wanted.logLevelFilter ||
            parser.logSourceFilter !== wanted.logSourceFilter ||
            (parser.query ?? '') !== wanted.query.trim()
        )
            return;

        setPage({
            totalEntries: parser.totalEntries,
            currentPage: parser.currentPage,
            entries: [...parser.entries],
            logLevelFilter: parser.logLevelFilter,
            logSourceFilter: parser.logSourceFilter,
            query: parser.query ?? ''
        });

        if (pageRequestedSilently.current) return;

        setSource(parser.logSourceFilter);
        setLevel(parser.logLevelFilter);
        setQuery(parser.query ?? '');
        setScrollKey((key) => key + 1);
    });

    const currentPage = page?.currentPage ?? NO_PAGE;
    const lastPage = page ? calculateLastPage(page.totalEntries, WIRED_ROOM_LOGS_PAGE_SIZE) : NO_PAGE;

    const requests = useWiredPageRequests({
        currentPage,
        lastPage,
        pageKey: page,
        ratelimit: REQUEST_PAGE_RATELIMIT,
        samePageTimeout: false,
        onRequestPage: (requested) => {
            const filters = wantedFilters.current;

            pageRequestedSilently.current = silentRequest.current;
            SendMessageComposer(
                new WiredRoomLogsPageComposer(requested, WIRED_ROOM_LOGS_PAGE_SIZE, filters.logLevelFilter, filters.logSourceFilter, filters.query)
            );
        }
    });

    // The first page, with no filters.
    useEffect(() => {
        SendMessageComposer(new WiredRoomLogsPageComposer(1, WIRED_ROOM_LOGS_PAGE_SIZE, -1, -1, ''));
    }, []);

    // The timers outlive renders; they ask through the limiter of the latest one.
    const requestsRef = useRef(requests);

    useEffect(() => {
        requestsRef.current = requests;
    });

    useEffect(() => () => window.clearTimeout(filterRetry.current), []);

    // The middle container stretches with the window height; the table view fills it.
    useEffect(() => {
        if (!tableArea) return;

        const observer = new ResizeObserver(() => setTableHeight(tableArea.clientHeight));
        observer.observe(tableArea);

        return () => observer.disconnect();
    }, [tableArea]);

    // Held back by the limiter, it tries again once the limit has passed until it gets through.
    const requestFilteredFirstPage = () => {
        window.clearTimeout(filterRetry.current);
        filterPending.current = !requestsRef.current.requestPage(1);

        if (filterPending.current) filterRetry.current = window.setTimeout(requestFilteredFirstPage, REQUEST_PAGE_RATELIMIT);
    };

    const updateFilters = (changes: Partial<{ source: number; level: number; query: string }> = {}) => {
        wantedFilters.current = {
            logSourceFilter: changes.source ?? source,
            logLevelFilter: changes.level ?? level,
            query: changes.query ?? query
        };
        setRefreshEpoch((epoch) => epoch + 1);
        requestFilteredFirstPage();
    };

    useEffect(() => {
        if (!autoRefresh) return;

        const timer = setInterval(() => {
            if (filterPending.current) return;

            silentRequest.current = true;
            requestsRef.current.refresh();
            silentRequest.current = false;
        }, REFRESH_TIME_MS);

        return () => clearInterval(timer);
    }, [autoRefresh, refreshEpoch]);

    const columns: WiredMenuTableColumn[] = [
        { key: 'timestamp', title: localizeWithFallback('wiredmenu.logs_overview.col.timestamp', 'Timestamp'), factor: 0.2 },
        { key: 'source', title: localizeWithFallback('wiredmenu.logs_overview.col.source', 'Source'), factor: 0.08 },
        { key: 'level', title: localizeWithFallback('wiredmenu.logs_overview.col.level', 'Level'), factor: 0.08 },
        { key: 'message', title: localizeWithFallback('wiredmenu.logs_overview.col.message', 'Message'), factor: 0.64 }
    ];

    const infoLines = localizeWithFallback(
        'wiredmenu.logs_overview.info',
        'An overview of the most recent System and Wired logs.\\nOnly the most recent 200 logs are stored per type.'
    ).split(/\\n|\n/);

    return (
        <VoltCardView
            className="volt-wired-logs"
            frameStyle={3}
            resizeAxis="vertical"
            theme="primary-slim"
            uniqueKey="wired-room-logs"
            windowPosition={DraggableWindowPosition.CENTER}
        >
            <VoltCardHeaderView headerText="" onCloseClick={onClose}>
                <WiredMenuLabel
                    align="center"
                    className="volt-wired-menu__caption"
                    color={0xffffff}
                    text={localizeWithFallback('wiredmenu.logs_overview.title', 'Wired Logs')}
                    textStyle="u_frame_title"
                    width={WINDOW_WIDTH - 14}
                />
            </VoltCardHeaderView>
            <div className="volt-wired-logs__client">
                <WiredMenuItem className="volt-wired-logs__box" h={38} w={580} x={8} y={7}>
                    {infoLines.map((line, index) => (
                        <SubpixelText
                            key={index}
                            transparent
                            align="paragraph"
                            background={0xffffff}
                            style={{ position: 'absolute', left: 1, top: 3 + index * INFO_LINE_HEIGHT }}
                            text={line}
                            textStyle="u_regular"
                            width={578}
                        />
                    ))}
                </WiredMenuItem>
                <WiredMenuCheckbox checked={autoRefresh} h={16} label={null} w={15} x={596} y={18} onChange={setAutoRefresh} />
                <WiredMenuText h={29} w={90} x={614} y={18}>
                    {localizeWithFallback('wiredmenu.logs_overview.auto_refresh', 'Auto refresh')}
                </WiredMenuText>
                <WiredMenuTitle h={17} w={38} x={15} y={63}>
                    {localizeWithFallback('wiredmenu.logs_overview.filter', 'Filter:')}
                </WiredMenuTitle>
                <WiredMenuItem className="volt-wired-logs__box" h={25} w={269} x={60} y={60}>
                    <label className="volt-wired-logs__input">
                        <WiredMenuLabel style={{ position: 'absolute', left: 0, top: 0 }} text={query} />
                        <input
                            aria-label={localizeWithFallback('wiredmenu.logs_overview.filter', 'Filter:')}
                            maxLength={FILTER_MAX_CHARS}
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter') return;

                                event.preventDefault();
                                updateFilters();
                            }}
                        />
                    </label>
                </WiredMenuItem>
                <WiredMenuTitle h={17} w={68} x={349} y={63}>
                    {localizeWithFallback('wiredmenu.logs_overview.log_source', 'Log source:')}
                </WiredMenuTitle>
                <HabboDropMenuView
                    nativeCaption
                    label={localizeWithFallback('wiredmenu.logs_overview.log_source', 'Log source:')}
                    options={[
                        { value: -1, label: localizeWithFallback('wiredmenu.logs_overview.log_source.all', 'All') },
                        ...LOG_SOURCES.map((name, index) => ({ value: index, label: sourceLabel(index) }))
                    ]}
                    skinStyle={3}
                    style={{ position: 'absolute', left: 423, top: 60, width: 90, height: 25 }}
                    value={source}
                    onSelect={(next) => {
                        setSource(next);
                        updateFilters({ source: next });
                    }}
                />
                <WiredMenuTitle h={17} w={56} x={534} y={63}>
                    {localizeWithFallback('wiredmenu.logs_overview.log_level', 'Log level:')}
                </WiredMenuTitle>
                <HabboDropMenuView
                    nativeCaption
                    label={localizeWithFallback('wiredmenu.logs_overview.log_level', 'Log level:')}
                    options={[
                        { value: -1, label: localizeWithFallback('wiredmenu.logs_overview.log_level.all', 'All') },
                        ...LOG_LEVELS.map((name, index) => ({ value: index, label: levelLabel(index) }))
                    ]}
                    skinStyle={3}
                    style={{ position: 'absolute', left: 596, top: 60, width: 90, height: 25 }}
                    value={level}
                    onSelect={(next) => {
                        setLevel(next);
                        updateFilters({ level: next });
                    }}
                />
                <div ref={setTableArea} className="volt-wired-logs__middle">
                    {tableHeight > 0 && (
                        <WiredMenuTable
                            key={scrollKey}
                            columns={columns}
                            h={tableHeight}
                            rows={(page?.entries ?? []).map((entry) => ({
                                key: String(entry.id),
                                cells: { timestamp: entry.timestampStr, source: sourceLabel(entry.logSource), level: levelLabel(entry.logLevel), message: entry.logMessage },
                                cellTitles: { timestamp: entry.timestampStr, message: entry.logMessage },
                                color: LEVEL_COLORS[entry.logLevel] ?? 0,
                                selected: selectedId === entry.id,
                                onSelect: () => setSelectedId(entry.id)
                            }))}
                            w={672}
                            x={13}
                            y={0}
                        />
                    )}
                </div>
                <WiredMenuPagingFooter
                    center={{ x: 245, startText: 'X logs found. Showing page ', startWidth: 159, endText: 'of Y', endWidth: 26 }}
                    className="volt-wired-logs__paging"
                    currentPage={currentPage}
                    lastPage={lastPage}
                    requests={requests}
                    template={localizeWithFallback('wiredmenu.logs_overview.bottom_text', '%entries_count% logs found. Showing page %page% of %page_count%')}
                    totalEntries={page?.totalEntries ?? 0}
                    width={WINDOW_WIDTH}
                />
            </div>
        </VoltCardView>
    );
};
