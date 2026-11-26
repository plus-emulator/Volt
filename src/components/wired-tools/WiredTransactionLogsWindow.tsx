import { IWiredTransactionInfo, WIRED_TRANSACTION_LIST_CHEST, WiredTransactionGetChestLogsComposer, WiredTransactionGetRoomLogsComposer } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { GetUserProfile, IsTouchLayout, localizeWithFallback, SendMessageComposer, useVoltLayout } from '../../api';
import arrowLeft from '../../assets/images/wired/native/menu_page_arrow_left.png';
import arrowRight from '../../assets/images/wired/native/menu_page_arrow_right.png';
import { DraggableWindowPosition, VoltCardHeaderView, VoltCardView } from '../../common';
import { WiredMenuLabel } from '../../common/native-text/WiredMenuLabel';
import { useWiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
import { summarizeTransactionCounts } from './WiredChestTransactionCounts';
import { WiredMenuButton, WiredMenuTable, WiredMenuTableColumn, WiredMenuTableRow } from './WiredMenuParts';
import { WiredMenuPagingFooter } from './WiredMenuPaging';
import { useTextWindowWidths } from '../../common/native-text/useTextWindowWidths';
import { resizeCentred, startCentred } from './nativeTextWindow';
import { calculateLastPage, clampInputPage, NO_PAGE, parseInputPage, restrictPageInput } from './WiredPaging.helpers';
import { WIRED_TRANSACTION_LOGS_PAGE_SIZE } from './WiredTransactionLogs.constants';

export { WIRED_TRANSACTION_LOGS_PAGE_SIZE };
/** Two page requests are never closer than this, and the page in flight is not asked again for two seconds. */
const REQUEST_PAGE_RATELIMIT = 280;

export interface WiredTransactionLogsPage {
    listType: number;
    listId: number;
    totalLogs: number;
    page: number;
    logs: IWiredTransactionInfo[];
}

interface WiredTransactionLogsWindowProps {
    data: WiredTransactionLogsPage;
    onClose: () => void;
}

/**
 * transaction_overview: an 880 px wide frame whose client starts 33 px down. Its children fill 356 of the 358 px client, so the
 * table ends 62 px above the bottom; the header and the footer keep their height when the window grows.
 */
const WINDOW_WIDTH = 880;
const CLIENT_TOP = 33;
const MIN_CLIENT_HEIGHT = 391 - CLIENT_TOP;
const HEADER_HEIGHT = 62;
const BELOW_TABLE = 62;
/** The paging text list as the XML lays it out, with its design captions; it keeps its centre when its fields resize. */
const PAGING_TEXT = { x: 312, start: 'X transactions found. Showing page ', end: 'of Y' };
const ITEM_SPACING = 2;
const PAGE_INPUT_WIDTH = 21;

const typeLabel = (type: number): string => localizeWithFallback(`wired_transactions.type.${type}`, String(type));

const summarize = (furni: number, coins: number): string =>
    summarizeTransactionCounts(furni, coins, {
        onlyFurni: (amount) => localizeWithFallback('wiredchests.logs.only_furni', `${amount} furni`, ['amount'], [String(amount)]),
        onlyCoins: (amount) => localizeWithFallback('wiredchests.logs.only_coins', `${amount} credits`, ['amount'], [String(amount)]),
        both: (amount, amount2) =>
            localizeWithFallback('wiredchests.logs.furni_and_coins', `${amount} furni + ${amount2}c`, ['amount', 'amount2'], [String(amount), String(amount2)])
    });

/** An itemlist_horizontal of a bold key and its value, 2 px apart. */
const KeyValuePair: FC<{ x: number; y: number; name: string; value: string }> = ({ x, y, name, value }) => {
    const widths = useTextWindowWidths([{ text: name, textStyle: 'u_bold' }]);

    return (
        <div className="volt-wired-menu__item" style={{ left: x, top: y, visibility: widths ? undefined : 'hidden' }}>
            <WiredMenuLabel bold className="volt-wired-txlogs__field" text={name} />
            <WiredMenuLabel className="volt-wired-txlogs__field" style={{ left: (widths?.[0] ?? 0) + ITEM_SPACING }} text={value} />
        </div>
    );
};

interface PageButtonProps {
    x: number;
    icon: string;
    /** The icons' x in the button; each is 10 px down. */
    iconX: number[];
    disabled: boolean;
    title: string;
    onClick: () => void;
}

/** A 50x30 `container_button` (shiny thick skin) with triangle icons drawn black; a disabled section draws them at half opacity. */
const PageButton: FC<PageButtonProps> = ({ x, icon, iconX, disabled, title, onClick }) => (
    <button aria-label={title} className="volt-wired-txlogs__page-button" disabled={disabled} style={{ left: x }} type="button" onClick={onClick}>
        {iconX.map((left) => (
            <img key={left} alt="" draggable={false} src={icon} style={{ left: left - 5, top: 5 }} />
        ))}
    </button>
);

const COLUMNS: { key: string; title: string; factor: number }[] = [
    { key: 'type', title: 'Type', factor: 0.17 },
    { key: 'timestamp', title: 'Timestamp', factor: 0.15 },
    { key: 'username', title: 'Username', factor: 0.14 },
    { key: 'withdraws', title: 'Withdrawals', factor: 0.14 },
    { key: 'deposits', title: 'Deposits', factor: 0.14 },
    { key: 'chests', title: 'Chests', factor: 0.12 },
    { key: 'details', title: 'Details', factor: 0.14 }
];

/**
 * The detailed transaction list (`transaction_overview`): 25 rows a page, the list type and id over the table and the page
 * controls under it. A chest list asks its pages from the chest, a room list from the room.
 */
export const WiredTransactionLogsWindow: FC<WiredTransactionLogsWindowProps> = ({ data, onClose }) => {
    const isTouch = IsTouchLayout(useVoltLayout());
    const { listType, listId, totalLogs, page, logs } = data;
    const lastPage = calculateLastPage(totalLogs, WIRED_TRANSACTION_LOGS_PAGE_SIZE);
    const [pageInput, setPageInput] = useState(String(page));
    const [client, setClient] = useState<HTMLDivElement | null>(null);
    const [clientHeight, setClientHeight] = useState(MIN_CLIENT_HEIGHT);

    useEffect(() => setPageInput(String(page)), [page]);

    useEffect(() => {
        if (!client) return;
        const observer = new ResizeObserver(() => setClientHeight(Math.max(MIN_CLIENT_HEIGHT, client.offsetHeight)));
        observer.observe(client);
        return () => observer.disconnect();
    }, [client]);

    const requests = useWiredPageRequests({
        currentPage: page,
        lastPage,
        pageKey: data,
        ratelimit: REQUEST_PAGE_RATELIMIT,
        onRequestPage: (requested) =>
            SendMessageComposer(
                listType === WIRED_TRANSACTION_LIST_CHEST
                    ? new WiredTransactionGetChestLogsComposer(listId, WIRED_TRANSACTION_LOGS_PAGE_SIZE, requested)
                    : new WiredTransactionGetRoomLogsComposer(WIRED_TRANSACTION_LOGS_PAGE_SIZE, requested)
            )
    });

    const navigateToInputPage = () => {
        const typed = parseInputPage(pageInput);
        const clamped = clampInputPage(typed, lastPage);

        if (clamped !== typed) setPageInput(String(clamped));
        if (clamped !== page) requests.requestPage(clamped);
    };

    const [textStart, textEnd = ''] = localizeWithFallback('wiredchests.logs.bottom_text', '%transaction_count% transactions found. Showing page %page% of %page_count%').split('%page%');
    const pageTextStart = textStart.replace('%transaction_count%', String(totalLogs));
    const pageTextEnd = textEnd.replace('%page_count%', String(lastPage === NO_PAGE ? 1 : lastPage));
    const pagingWidths = useTextWindowWidths(
        [PAGING_TEXT.start, PAGING_TEXT.end, pageTextStart, pageTextEnd].map((text) => ({ text, textStyle: 'u_regular' as const }))
    );
    const [designStart = 0, designEnd = 0, startWidth = 0, endWidth = 0] = pagingWidths ?? [];
    const inputX = startWidth + ITEM_SPACING;
    const endX = inputX + PAGE_INPUT_WIDTH + ITEM_SPACING;
    const listWidth = (start: number, end: number) => start + ITEM_SPACING * 2 + PAGE_INPUT_WIDTH + end;
    // displayNewPage sets the start text first, then the end text.
    const pagingWindow = startCentred(PAGING_TEXT.x, listWidth(designStart, designEnd));
    resizeCentred(pagingWindow, listWidth(startWidth, designEnd));
    resizeCentred(pagingWindow, listWidth(startWidth, endWidth));
    const pagingX = pagingWindow.left;

    const isFirst = page <= 1;
    const isLast = page >= lastPage;
    const tableHeight = clientHeight - HEADER_HEIGHT - BELOW_TABLE;

    const columns: WiredMenuTableColumn[] = COLUMNS.map((column) => ({ ...column, title: localizeWithFallback(`wiredchests.logs.col.${column.key}`, column.title) }));

    const title = localizeWithFallback('wiredchests.logs.title', 'Transaction logs');
    const listTypeLabel = localizeWithFallback('wiredchests.logs.list_type', 'List type:');
    const listTypeValue = localizeWithFallback(`wiredchests.logs.type.${listType}`, listType === WIRED_TRANSACTION_LIST_CHEST ? 'Chest' : 'Room');
    const idLabel =
        listType === WIRED_TRANSACTION_LIST_CHEST
            ? localizeWithFallback('wiredchests.logs.chest_id', 'Chest id:')
            : localizeWithFallback('wiredchests.logs.room_id', 'Room id:');
    const txRows: WiredMenuTableRow[] = logs.map((row) => ({
        key: String(row.transactionId),
        cells: {
            type: typeLabel(row.transactionType),
            timestamp: row.readableTimestamp,
            username: row.userName,
            withdraws: summarize(row.withdrawFurniCount, row.withdrawCoinsCount),
            deposits: summarize(row.depositFurniCount, row.depositCoinsCount),
            chests: String(row.chestCount),
            details: null
        },
        links: { username: () => GetUserProfile(row.userId) }
    }));

    return (
        <VoltCardView
            className="volt-wired-txlogs"
            frameStyle={3}
            offsetLeft={138}
            offsetTop={86}
            resizeAxis="vertical"
            theme="primary-slim"
            uniqueKey="wired-transaction-logs"
            windowPosition={DraggableWindowPosition.TOP_LEFT}
        >
            <VoltCardHeaderView headerText={isTouch ? title : ''} onCloseClick={onClose}>
                {!isTouch && (
                    <WiredMenuLabel
                        align="center"
                        className="volt-wired-menu__caption"
                        color={0xffffff}
                        text={title}
                        textStyle="u_frame_title"
                        width={WINDOW_WIDTH - 14}
                    />
                )}
            </VoltCardHeaderView>
            {isTouch ? (
                <div className="volt-wired-txlogs__client volt-wt-window-client">
                    <div className="volt-wt-meta-bar">
                        <div className="volt-wt-meta-pairs">
                            <div>
                                <b>{listTypeLabel}</b> {listTypeValue}
                            </div>
                            <div>
                                <b>{idLabel}</b> {String(listId)}
                            </div>
                        </div>
                        <WiredMenuButton x={0} y={0} onClick={() => requests.refresh()}>
                            {localizeWithFallback('wiredchests.logs.refresh', 'Refresh')}
                        </WiredMenuButton>
                    </div>
                    <div className="volt-wt-table-area">
                        <WiredMenuTable columns={columns} rows={txRows} w={852} x={0} y={0} />
                    </div>
                    <WiredMenuPagingFooter
                        center={{ x: 312, startText: PAGING_TEXT.start, startWidth: 180, endText: PAGING_TEXT.end, endWidth: 26 }}
                        currentPage={page}
                        lastPage={lastPage}
                        requests={requests}
                        template={localizeWithFallback('wiredchests.logs.bottom_text', '%entries_count% transactions found. Showing page %page% of %page_count%').replace(
                            '%transaction_count%',
                            '%entries_count%'
                        )}
                        totalEntries={totalLogs}
                        width={WINDOW_WIDTH}
                    />
                </div>
            ) : (
                <div ref={setClient} className="volt-wired-txlogs__client">
                    <KeyValuePair name={listTypeLabel} value={listTypeValue} x={15} y={13} />
                    <KeyValuePair name={idLabel} value={String(listId)} x={15} y={35} />
                    <WiredMenuButton h={30} w={62} x={801} y={13} onClick={() => requests.refresh()}>
                        {localizeWithFallback('wiredchests.logs.refresh', 'Refresh')}
                    </WiredMenuButton>
                    <WiredMenuTable columns={columns} h={tableHeight} rows={txRows} w={852} x={14} y={HEADER_HEIGHT} />
                    <div className="volt-wired-txlogs__pagination">
                        <PageButton disabled={isFirst} icon={arrowLeft} iconX={[18, 27]} title="First page" x={17} onClick={() => requests.requestFirstPage()} />
                        <PageButton disabled={isFirst} icon={arrowLeft} iconX={[22]} title="Previous page" x={80} onClick={() => requests.requestPreviousPage()} />
                        <PageButton disabled={isLast} icon={arrowRight} iconX={[23]} title="Next page" x={753} onClick={() => requests.requestNextPage()} />
                        <PageButton disabled={isLast} icon={arrowRight} iconX={[18, 27]} title="Last page" x={813} onClick={() => requests.requestLastPage()} />
                        <div className="volt-wired-menu__item" style={{ left: pagingX, top: 4, visibility: pagingWidths ? undefined : 'hidden' }}>
                            <WiredMenuLabel className="volt-wired-txlogs__field volt-wired-txlogs__paging-text" text={pageTextStart} />
                            <div className="volt-wired-txlogs__page-input" style={{ left: inputX }}>
                                {pageInput !== '' && <WiredMenuLabel className="volt-wired-txlogs__field" text={pageInput} />}
                                <input
                                    aria-label="Page"
                                    inputMode="numeric"
                                    type="text"
                                    value={pageInput}
                                    onBlur={navigateToInputPage}
                                    onChange={(event) => setPageInput(restrictPageInput(event.target.value))}
                                    onKeyDown={(event) => {
                                        if (event.key !== 'Enter') return;

                                        event.preventDefault();
                                        navigateToInputPage();
                                    }}
                                />
                            </div>
                            <WiredMenuLabel className="volt-wired-txlogs__field volt-wired-txlogs__paging-text" style={{ left: endX }} text={pageTextEnd} />
                        </div>
                    </div>
                </div>
            )}
        </VoltCardView>
    );
};
