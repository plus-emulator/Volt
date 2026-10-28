import {
    GetCommunication,
    GetRoomEngine,
    GetStage,
    IRoomSession,
    IWiredVariableData,
    IWiredVariableObjectHolder,
    RoomObjectCategory,
    WiredAllVariableHoldersEvent,
    WiredGetAllVariableHoldersComposer
} from '@volt/renderer';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    AddAnimationTickerCallback,
    GetRoomObjectBounds,
    GetRoomObjectScreenLocation,
    localizeWithFallback,
    NotificationBubbleType,
    SendMessageComposer,
    WiredSelectionVisualizer
} from '../../api';
import { variableValueWithString } from '../../components/wired-tools/WiredCreatorTools.helpers';
import { VariableHighlightOverlay, VariableHighlightTarget } from '../../components/wired-tools/WiredCreatorTools.types';
import { useWiredCreatorToolsUiStore } from '../../components/wired-tools/wiredCreatorToolsUiStore';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

const POLL_MS = 500;
const MAX_HIGHLIGHTS = 1000;
const MAX_HIGHLIGHTS_WITH_VALUE = 400;
const VARIABLE_TARGET_FURNI = 0;
const VARIABLE_TARGET_USER = 1;

interface HoldersAnswer {
    variable: IWiredVariableData;
    holders: readonly IWiredVariableObjectHolder[];
}

/**
 * A user holder is the room user index. A furni holder is its furni id: a negative id is a wall item, and a
 * positive id that is not a floor item is looked up on the wall. Holders that are not in the room are left out.
 */
const toHighlightTargets = (roomSession: IRoomSession, answer: HoldersAnswer): VariableHighlightTarget[] => {
    const { variable, holders } = answer;
    const roomEngine = GetRoomEngine();
    const targets: VariableHighlightTarget[] = [];

    for (const holder of holders) {
        const label = variableValueWithString(variable, holder.value);

        if (variable.variableTarget === VARIABLE_TARGET_USER) {
            if (!roomSession.userDataManager.getUserDataByIndex(holder.objectId)) continue;
            if (!roomEngine.getRoomObject(roomSession.roomId, holder.objectId, RoomObjectCategory.UNIT)) continue;

            targets.push({ category: RoomObjectCategory.UNIT, objectId: holder.objectId, label });
            continue;
        }

        if (variable.variableTarget !== VARIABLE_TARGET_FURNI) continue;

        const objectId = Math.abs(holder.objectId);
        const isFloor = holder.objectId > 0 && !!roomEngine.getRoomObject(roomSession.roomId, objectId, RoomObjectCategory.FLOOR);
        const category = isFloor ? RoomObjectCategory.FLOOR : RoomObjectCategory.WALL;

        if (isFloor || roomEngine.getRoomObject(roomSession.roomId, objectId, category)) targets.push({ category, objectId, label });
    }

    return targets;
};

/**
 * Highlights the room's holders of `variable` while it is set: asks for them every 500 ms, gives each one the
 * variable holder glow and puts the value bubbles to draw in the creator tools store. Too many holders stop the highlight.
 */
export const useWiredVariableHighlight = (roomSession: IRoomSession | null, variable: IWiredVariableData | null, onStop: () => void): void => {
    const { showSingleBubble = null } = useNotification();
    const [answer, setAnswer] = useState<HoldersAnswer | null>(null);
    const setOverlays = useWiredCreatorToolsUiStore((s) => s.setVariableHighlightOverlays);
    const roomId = roomSession?.roomId ?? 0;
    const variableId = variable?.variableId ?? null;
    const onStopRef = useRef(onStop);

    useEffect(() => {
        onStopRef.current = onStop;
    });

    useEffect(() => {
        setAnswer(null);

        if (!variableId || roomId <= 0) return;

        const request = () => SendMessageComposer(new WiredGetAllVariableHoldersComposer(variableId));

        request();
        const interval = window.setInterval(request, POLL_MS);

        return () => window.clearInterval(interval);
    }, [roomId, variableId]);

    useMessageEvent<WiredAllVariableHoldersEvent>(WiredAllVariableHoldersEvent, (event) => {
        const parser = event.getParser();
        const received = parser.variable;

        if (!variableId || !received || received.variableId !== variableId || event.connection !== GetCommunication().connection) return;

        const limit = received.hasValue ? MAX_HIGHLIGHTS_WITH_VALUE : MAX_HIGHLIGHTS;

        if (parser.holders.length > limit) {
            showSingleBubble?.(
                localizeWithFallback('wiredmenu.variable_overview.highlight.error.too_many', 'Can not highlight this variable, it has too many holders'),
                NotificationBubbleType.INFO
            );
            onStopRef.current();
            return;
        }

        setAnswer({ variable: received, holders: parser.holders });
    });

    const targets = useMemo(() => (roomSession && answer && answer.variable.variableId === variableId ? toHighlightTargets(roomSession, answer) : []), [roomSession, answer, variableId]);

    useEffect(() => {
        if (!targets.length) return;

        const objects = targets.map(({ category, objectId }) => ({ category, objectId }));

        WiredSelectionVisualizer.applyVariableHighlightToObjects(objects);

        return () => WiredSelectionVisualizer.clearVariableHighlightFromObjects(objects);
    }, [targets]);

    useEffect(() => {
        if (!targets.length || roomId <= 0) {
            setOverlays([]);
            return;
        }

        const updateOverlays = () => {
            const stage = GetStage();
            const nextOverlays: VariableHighlightOverlay[] = [];

            for (const target of targets) {
                if (target.label === null) continue;

                const bounds = GetRoomObjectBounds(roomId, target.objectId, target.category);
                const location = GetRoomObjectScreenLocation(roomId, target.objectId, target.category);

                if (!bounds || !location) continue;

                nextOverlays.push({
                    ...target,
                    key: `${target.category}:${target.objectId}`,
                    x: Math.max(8, Math.min(Math.round(location.x), stage.width - 8)),
                    y: Math.max(8, Math.min(Math.round(bounds.top), stage.height - 40))
                });
            }

            setOverlays(nextOverlays);
        };

        updateOverlays();

        return AddAnimationTickerCallback(updateOverlays);
    }, [roomId, targets, setOverlays]);
};
