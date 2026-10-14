// WIRED Label speech bubbles above wf_label furni (AIR WIN63-202610131318: FurnitureLabelWidget.as L44-160 and L190-265, FurnitureLabelView.as L96-200, class_3636 saveLabel L90; out 2638 WiredLabelSaveTextComposer).
import { IWiredLabelData, RoomObjectCategory, WiredLabelSaveTextComposer } from '@volt/renderer';
import { CSSProperties, FC, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AddAnimationTickerCallback, GetRoomObjectBounds, GetRoomObjectScreenLocation, SendMessageComposer, localizeWithFallback } from '../../../../api';
import { canViewWiredLabel, wiredLabelBubbleColor } from '../../../../api/wired/WiredLabel';
import { useObjectRollOutEvent, useObjectRollOverEvent, useObjectSelectedEvent, useRoom, useWiredToolsState } from '../../../../hooks';
import { useWiredLabelsEvents, useWiredLabelsStore } from '../../../../hooks/rooms/widgets/useWiredLabelsState';

const LABEL_HOVER_BLEND = 0.7;
const LABEL_ANCHOR_GAP = 4;

interface FurnitureLabelBubbleViewProps {
    roomId: number;
    label: IWiredLabelData;
    open: boolean;
    hovered: boolean;
    canModify: boolean;
}

interface ILabelDraft {
    /** The label text the draft was typed against; a newer server text replaces the draft. */
    base: string;
    text: string;
}

/** One bubble: an anchor that follows the furni on the room's animation clock, and a text field that is editable only while open. */
const FurnitureLabelBubbleView: FC<FurnitureLabelBubbleViewProps> = (props) => {
    const { roomId, label, open, hovered, canModify } = props;
    const { furnitureId, alwaysOpen } = label;
    const anchorRef = useRef<HTMLDivElement>(null);
    const [edit, setEdit] = useState<ILabelDraft | null>(null);
    const editRef = useRef<ILabelDraft | null>(null);
    const submittedRef = useRef<string | null>(null);
    const confirmedRef = useRef(label.text);
    const canModifyRef = useRef(canModify);

    const shownText = edit && edit.base === label.text ? edit.text : label.text;
    const shown = open || alwaysOpen;
    const editable = canModify && shown;
    const interactive = open || (alwaysOpen && canModify);
    const wantVisible = shown || hovered;
    const bubbleColor = wiredLabelBubbleColor(label.bubbleColor);

    useLayoutEffect(() => {
        confirmedRef.current = label.text;
        canModifyRef.current = canModify;
    });

    const saveIfChanged = useCallback(() => {
        const draft = editRef.current;

        if (!draft || draft.base !== confirmedRef.current || !canModifyRef.current) return;
        if (draft.text === confirmedRef.current || draft.text === submittedRef.current) return;

        SendMessageComposer(new WiredLabelSaveTextComposer(furnitureId, draft.text));
        submittedRef.current = draft.text;
    }, [furnitureId]);

    useEffect(() => {
        const update = () => {
            const anchor = anchorRef.current;
            const container = anchor?.parentElement;
            const bounds = GetRoomObjectBounds(roomId, furnitureId, RoomObjectCategory.FLOOR, 1);
            const point = GetRoomObjectScreenLocation(roomId, furnitureId, RoomObjectCategory.FLOOR, 1);

            if (!anchor || !container || !bounds || !point) {
                if (anchor) anchor.style.visibility = 'hidden';

                return;
            }

            const inView = bounds.left + bounds.width >= 0 && bounds.left <= container.clientWidth && bounds.top + bounds.height >= 0 && bounds.top <= container.clientHeight;

            anchor.style.visibility = inView ? 'visible' : 'hidden';
            anchor.style.left = `${point.x}px`;
            anchor.style.top = `${bounds.top - LABEL_ANCHOR_GAP}px`;
        };

        update();

        return AddAnimationTickerCallback(update);
    }, [roomId, furnitureId]);

    useEffect(() => {
        if (!open) saveIfChanged();
    }, [open, saveIfChanged]);

    useEffect(() => () => saveIfChanged(), [saveIfChanged]);

    const onChange = (value: string) => {
        const draft = { base: label.text, text: value };

        editRef.current = draft;
        setEdit(draft);
    };

    return (
        <div ref={anchorRef} className="volt-furni-label" style={{ visibility: 'hidden' }}>
            <div
                className="volt-furni-label__bubble"
                style={
                    {
                        backgroundColor: bubbleColor,
                        '--volt-label-color': bubbleColor,
                        opacity: shown ? 1 : LABEL_HOVER_BLEND,
                        display: wantVisible ? undefined : 'none',
                        pointerEvents: interactive ? 'auto' : 'none'
                    } as CSSProperties
                }
            >
                <textarea
                    className="volt-furni-label__text"
                    value={shownText}
                    readOnly={!editable}
                    rows={1}
                    spellCheck={false}
                    placeholder={editable ? localizeWithFallback('widget.furniture_label.placeholder', 'Write something here...') : undefined}
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={saveIfChanged}
                />
            </div>
        </div>
    );
};

/** Hover shows a label, a click on the furni toggles it open, and the labels the user may see are drawn above their furni. */
const FurnitureLabelLayerView: FC<{ roomId: number }> = (props) => {
    const { roomId } = props;
    const labels = useWiredLabelsStore((state) => state.labels);
    const { roomSettings } = useWiredToolsState();
    const [hoveredFurniId, setHoveredFurniId] = useState(0);
    const [openFurniIds, setOpenFurniIds] = useState<Record<number, boolean>>({});

    const isLabelObject = (eventRoomId: number, category: number) => eventRoomId === roomId && category === RoomObjectCategory.FLOOR;

    useObjectRollOverEvent((event) => {
        if (isLabelObject(event.roomId, event.category) && labels[event.id]) setHoveredFurniId(event.id);
    });

    useObjectRollOutEvent((event) => {
        if (isLabelObject(event.roomId, event.category)) setHoveredFurniId((current) => (current === event.id ? 0 : current));
    });

    useObjectSelectedEvent((event) => {
        const label = labels[event.id];

        if (!isLabelObject(event.roomId, event.category) || !label || !canViewWiredLabel(label, roomSettings.canInspect)) return;

        setOpenFurniIds((current) => ({ ...current, [event.id]: !current[event.id] }));
    });

    const visibleLabels = Object.values(labels).filter((label) => canViewWiredLabel(label, roomSettings.canInspect));

    return (
        <div className="volt-furni-label-layer" data-testid="furni-label-layer">
            {visibleLabels.map((label) => (
                <FurnitureLabelBubbleView
                    key={label.furnitureId}
                    roomId={roomId}
                    label={label}
                    open={!!openFurniIds[label.furnitureId]}
                    hovered={hoveredFurniId === label.furnitureId}
                    canModify={roomSettings.canModify}
                />
            ))}
        </div>
    );
};

/** Mounts the labels packets and draws the bubbles for the current room. Keyed by room so hover and open state reset on a room change. */
export const FurnitureLabelWidgetView: FC<{}> = () => {
    useWiredLabelsEvents();

    const { roomSession = null } = useRoom();

    if (!roomSession) return null;

    return <FurnitureLabelLayerView key={roomSession.roomId} roomId={roomSession.roomId} />;
};
