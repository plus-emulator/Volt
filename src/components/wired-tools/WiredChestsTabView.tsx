import {
    IWiredTransactionInfo,
    RoomControllerLevel,
    WIRED_TRANSACTION_LIST_ROOM,
    WiredChestLockComposer,
    WiredTransactionGetRoomLogsComposer,
    WiredTransactionLogListEvent,
} from '@volt/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { GetUserProfile, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../api';
import { useMessageEvent, useNotification, useRoom } from '../../hooks';
import { summarizeTransactionCounts } from './WiredChestTransactionCounts';
import { WiredMenuButton, WiredMenuItem, WiredMenuPanel, WiredMenuTable } from './WiredMenuParts';
import { WIRED_TRANSACTION_LOGS_PAGE_SIZE, WiredTransactionLogsPage, WiredTransactionLogsWindow } from './WiredTransactionLogsWindow';

/** The preview asks for the 10 most recent transactions and refreshes on its own while the tab is open. */
const PREVIEW_AMOUNT = 10;
const FIRST_PAGE = 1;
const POLL_MS = 20000;

/**
 * Lock (1323) gets no answer, so the buttons are greyed for a short time-out
 * and the new state shows through the chests' stuff data.
 */
const LOCK_COOLDOWN_MS = 500;

const typeLabel = (type: number): string => localizeWithFallback(`wiredmenu.chests.transaction.type.${type}`, String(type));

const summarize = (furni: number, coins: number): string =>
    summarizeTransactionCounts(furni, coins, {
        onlyFurni: (amount) => localizeWithFallback('wiredmenu.chests.room_logs.only_furni', `${amount} furni`, ['amount'], [String(amount)]),
        onlyCoins: (amount) => localizeWithFallback('wiredmenu.chests.room_logs.only_coins', `${amount} coins`, ['amount'], [String(amount)]),
        both: (amount, amount2) =>
            localizeWithFallback('wiredmenu.chests.room_logs.furni_and_coins', `${amount} furni + ${amount2}c`, ['amount', 'amount2'], [String(amount), String(amount2)])
    });

export const WiredChestsTabView: FC<{}> = () => {
    const { roomSession = null } = useRoom();
    const { showConfirm = null } = useNotification();

    const [preview, setPreview] = useState<IWiredTransactionInfo[] | null>(null);
    const [detail, setDetail] = useState<WiredTransactionLogsPage | null>(null);
    const [lockBusy, setLockBusy] = useState(false);

    const canManageOwn = !!roomSession && (roomSession.isRoomOwner || roomSession.controllerLevel >= RoomControllerLevel.GUEST);
    const canManageAll = !!roomSession?.isRoomOwner;

    const requestPreview = useCallback(() => SendMessageComposer(new WiredTransactionGetRoomLogsComposer(PREVIEW_AMOUNT, FIRST_PAGE)), []);

    useEffect(() => {
        requestPreview();

        const handle = window.setInterval(requestPreview, POLL_MS);

        return () => window.clearInterval(handle);
    }, [requestPreview]);

    useMessageEvent<WiredTransactionLogListEvent>(WiredTransactionLogListEvent, (event) => {
        const parser = event.getParser();
        if (!parser) return;

        if (parser.amount === PREVIEW_AMOUNT && parser.page === FIRST_PAGE && parser.listType === WIRED_TRANSACTION_LIST_ROOM) {
            setPreview([...parser.logs]);

            return;
        }

        if (parser.amount !== WIRED_TRANSACTION_LOGS_PAGE_SIZE) return;

        setDetail({ listType: parser.listType, listId: parser.listId, totalLogs: parser.totalLogs, page: parser.page, logs: [...parser.logs] });
    });

    const sendLock = useCallback(
        (lock: boolean, all: boolean) => {
            if (lockBusy) return;

            setLockBusy(true);
            SendMessageComposer(new WiredChestLockComposer(lock, all));
            window.setTimeout(() => setLockBusy(false), LOCK_COOLDOWN_MS);
        },
        [lockBusy],
    );

    const lockEveryChest = useCallback(() => {
        if (!canManageAll || !showConfirm) return;

        showConfirm(
            localizeWithFallback(
                'wiredmenu.chests.chest_control.lock_all.warning.desc',
                'This locks every chest in the room, including the ones other people own. Wired keeps working - only what people do by hand stops.',
            ),
            () => sendLock(true, true),
            () => {
                // nothing to undo: the confirm was declined before anything was sent
            },
            LocalizeText('generic.ok'),
            LocalizeText('generic.cancel'),
            localizeWithFallback('wiredmenu.chests.chest_control.lock_all.warning.title', 'Are you sure?'),
        );
    }, [canManageAll, sendLock, showConfirm]);

    return (
        <>
            <WiredMenuItem h={17} w={84} x={14} y={18}>
                <span className="volt-wired-menu__text volt-wired-menu__text--bold">Chest control:</span>
            </WiredMenuItem>
            <WiredMenuPanel h={90} w={472} x={14} y={38}>
                <WiredMenuButton disabled={!canManageOwn || lockBusy} h={30} w={221} x={10} y={10} onClick={() => sendLock(true, false)}>
                    Lock all your chests
                </WiredMenuButton>
                <WiredMenuButton disabled={!canManageOwn || lockBusy} h={30} w={221} x={241} y={10} onClick={() => sendLock(false, false)}>
                    Unlock all your chests
                </WiredMenuButton>
                <WiredMenuButton disabled={!canManageAll || lockBusy} h={30} w={221} x={10} y={50} onClick={lockEveryChest}>
                    Lock all chests
                </WiredMenuButton>
            </WiredMenuPanel>
            <WiredMenuItem h={17} w={136} x={14} y={139}>
                <span className="volt-wired-menu__text volt-wired-menu__text--bold">Room Transaction Logs:</span>
            </WiredMenuItem>
            <WiredMenuItem h={17} w={197} x={286} y={139}>
                <span className="volt-wired-menu__text volt-wired-menu__text--soft">PREVIEW - showing 10 most recent</span>
            </WiredMenuItem>
            <WiredMenuTable
                columns={[
                    { key: 'type', title: 'Type', factor: 0.28 },
                    { key: 'username', title: 'Username', factor: 0.24 },
                    { key: 'withdraws', title: 'Withdrawals', factor: 0.24 },
                    { key: 'deposits', title: 'Deposits', factor: 0.24 }
                ]}
                emptyText={preview ? 'Nothing to display' : ''}
                h={168}
                rows={(preview ?? []).map((row) => ({
                    key: String(row.transactionId),
                    cells: {
                        type: typeLabel(row.transactionType),
                        username: row.userName,
                        withdraws: summarize(row.withdrawFurniCount, row.withdrawCoinsCount),
                        deposits: summarize(row.depositFurniCount, row.depositCoinsCount)
                    },
                    linkColumn: 'username',
                    onLink: () => GetUserProfile(row.userId)
                }))}
                w={472}
                x={14}
                y={159}
            />
            <WiredMenuButton h={30} w={114} x={14} y={336} onClick={() => SendMessageComposer(new WiredTransactionGetRoomLogsComposer(WIRED_TRANSACTION_LOGS_PAGE_SIZE, FIRST_PAGE))}>
                View detailed list
            </WiredMenuButton>

            {detail && <WiredTransactionLogsWindow data={detail} onClose={() => setDetail(null)} />}
        </>
    );
};
