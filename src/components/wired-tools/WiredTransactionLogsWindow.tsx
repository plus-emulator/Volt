import { IWiredTransactionInfo, WIRED_TRANSACTION_LIST_CHEST, WiredTransactionGetChestLogsComposer, WiredTransactionGetRoomLogsComposer } from '@volt/renderer';
import { FC } from 'react';
import { GetUserProfile, localizeWithFallback, SendMessageComposer } from '../../api';
import { Button, DraggableWindowPosition, Text, VoltCardContentView, VoltCardHeaderView, VoltCardView } from '../../common';
import { useWiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
import { summarizeTransactionCounts } from './WiredChestTransactionCounts';
import { WiredPagedTable, WiredTableCell, WiredTableColumn } from './WiredPagedTable';
import { calculateLastPage } from './WiredPaging.helpers';

/** Rows per page of the detailed list. */
export const WIRED_TRANSACTION_LOGS_PAGE_SIZE = 25;
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

const typeLabel = (type: number): string => localizeWithFallback(`wired_transactions.type.${type}`, String(type));

const summarize = (furni: number, coins: number): string =>
    summarizeTransactionCounts(furni, coins, {
        onlyFurni: (amount) => localizeWithFallback('wiredchests.logs.only_furni', `${amount} furni`, ['amount'], [String(amount)]),
        onlyCoins: (amount) => localizeWithFallback('wiredchests.logs.only_coins', `${amount} credits`, ['amount'], [String(amount)]),
        both: (amount, amount2) =>
            localizeWithFallback('wiredchests.logs.furni_and_coins', `${amount} furni + ${amount2}c`, ['amount', 'amount2'], [String(amount), String(amount2)])
    });

const getCell = (row: IWiredTransactionInfo, columnId: string): WiredTableCell => {
    switch (columnId) {
        case 'type':
            return { content: typeLabel(row.transactionType) };
        case 'timestamp':
            return { content: row.readableTimestamp, title: row.readableTimestamp, className: 'tabular-nums' };
        case 'username':
            return {
                content: (
                    <button className="underline decoration-dotted" type="button" onClick={() => GetUserProfile(row.userId)}>
                        {row.userName}
                    </button>
                ),
                title: row.userName
            };
        case 'withdraws':
            return { content: summarize(row.withdrawFurniCount, row.withdrawCoinsCount) };
        case 'deposits':
            return { content: summarize(row.depositFurniCount, row.depositCoinsCount) };
        default:
            return { content: row.chestCount, className: 'tabular-nums' };
    }
};

/**
 * The detailed transaction list: 25 rows a page, with the list type and id above the table and the page controls under it.
 * A chest list asks its pages from the chest, a room list from the room.
 */
export const WiredTransactionLogsWindow: FC<WiredTransactionLogsWindowProps> = ({ data, onClose }) => {
    const { listType, listId, totalLogs, page, logs } = data;
    const lastPage = calculateLastPage(totalLogs, WIRED_TRANSACTION_LOGS_PAGE_SIZE);

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

    const columns: WiredTableColumn[] = [
        { id: 'type', title: localizeWithFallback('wiredchests.logs.col.type', 'Type'), className: 'w-[150px]' },
        { id: 'timestamp', title: localizeWithFallback('wiredchests.logs.col.timestamp', 'Timestamp'), className: 'w-[160px]' },
        { id: 'username', title: localizeWithFallback('wiredchests.logs.col.username', 'Username'), className: 'w-[140px]' },
        { id: 'withdraws', title: localizeWithFallback('wiredchests.logs.col.withdraws', 'Withdrawals'), className: 'w-[140px]' },
        { id: 'deposits', title: localizeWithFallback('wiredchests.logs.col.deposits', 'Deposits'), className: 'w-[140px]' },
        { id: 'chests', title: localizeWithFallback('wiredchests.logs.col.chests', 'Chests') }
    ];

    return (
        <VoltCardView
            className="h-[391px] max-h-[700px] min-h-[391px] w-[880px]"
            frameStyle={3}
            resizeAxis="vertical"
            theme="primary-slim"
            uniqueKey="wired-transaction-logs"
            windowPosition={DraggableWindowPosition.TOP_LEFT}
            offsetLeft={138}
            offsetTop={86}
        >
            <VoltCardHeaderView headerText={localizeWithFallback('wiredchests.logs.title', 'Transaction logs')} onCloseClick={onClose} />
            <VoltCardContentView className="text-black bg-[#f4efe3] p-3 flex flex-col gap-3 min-h-0" overflow="hidden">
                <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1 text-[12px]">
                        <div className="flex gap-1">
                            <Text bold>{localizeWithFallback('wiredchests.logs.list_type', 'List type:')}</Text>
                            <Text>{localizeWithFallback(`wiredchests.logs.type.${listType}`, listType === WIRED_TRANSACTION_LIST_CHEST ? 'Chest' : 'Room')}</Text>
                        </div>
                        <div className="flex gap-1">
                            <Text bold>
                                {listType === WIRED_TRANSACTION_LIST_CHEST
                                    ? localizeWithFallback('wiredchests.logs.chest_id', 'Chest id:')
                                    : localizeWithFallback('wiredchests.logs.room_id', 'Room id:')}
                            </Text>
                            <Text>{listId}</Text>
                        </div>
                    </div>
                    <Button variant="secondary" onClick={() => requests.refresh()}>
                        {localizeWithFallback('wiredchests.logs.refresh', 'Refresh')}
                    </Button>
                </div>
                <WiredPagedTable
                    columns={columns}
                    rows={logs}
                    getRowId={(row) => String(row.transactionId)}
                    getCell={getCell}
                    currentPage={page}
                    totalEntries={totalLogs}
                    lastPage={lastPage}
                    requests={requests}
                    emptyText={localizeWithFallback('wiredmenu.chests.room_logs.empty', 'Nothing to display')}
                    scrollResetKey={page}
                    bodyClassName="min-h-0 grow"
                    foundLabel={localizeWithFallback(
                        'wiredchests.logs.bottom_text',
                        `${totalLogs} transactions found. Showing page %page% of %page_count%`,
                        ['transaction_count'],
                        [String(totalLogs)]
                    ).split('%page%')[0]}
                />
            </VoltCardContentView>
        </VoltCardView>
    );
};
