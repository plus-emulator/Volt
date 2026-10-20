import { GetCommunication, IWiredVariableHolderValue, WiredVariableHolders64Event, WiredVariableHoldersRequest64Composer } from '@volt/renderer';
import { useEffect, useState } from 'react';
import { GetRoomSession, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

// AIR WIN63-202610151745-318700621 WiredMenuOverviewTab.POLL_MS: holders are asked for again every 500 ms while highlighting.
const POLL_MS = 500;

interface HoldersSnapshot {
    roomId: number;
    variableId: string;
    holders: readonly IWiredVariableHolderValue<bigint>[];
}

/** The room's live holders of one variable, as the server lists them, polled while `variableId` is set. */
export const useWiredVariableHolders = (roomId: number, variableId: string | null) => {
    const [snapshot, setSnapshot] = useState<HoldersSnapshot | null>(null);

    useEffect(() => {
        if (!variableId || roomId <= 0) return;

        const request = () => SendMessageComposer(new WiredVariableHoldersRequest64Composer(variableId));

        request();
        const interval = window.setInterval(request, POLL_MS);

        return () => window.clearInterval(interval);
    }, [roomId, variableId]);

    useMessageEvent<WiredVariableHolders64Event>(WiredVariableHolders64Event, (event) => {
        const parser = event.getParser();

        if (!variableId || event.connection !== GetCommunication().connection || GetRoomSession()?.roomId !== roomId) return;
        if (parser.roomId !== roomId || parser.variable?.variableId !== variableId) return;

        setSnapshot({ roomId, variableId, holders: parser.holders });
    });

    return snapshot && snapshot.roomId === roomId && snapshot.variableId === variableId ? snapshot.holders : null;
};
