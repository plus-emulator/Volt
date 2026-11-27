import { FC, PointerEvent, ReactNode, useMemo, useRef, useState } from 'react';
import { IsTouchLayout, useVoltLayout } from '../../../api';
import { DraggableWindow } from '../../../common/draggable-window';
import { parseNativeLayout } from '../native/NativeLayout';
import { NativeFrameView, NativeNodeHandlers, NativeNodeStates } from '../native/NativeLayoutView';
import startPanelXml from '../../../assets/mod-tools/xml/start_panel.xml?raw';
import roomToolIcon from '../../../assets/mod-tools/images/roomtools_history_open_icon.png';
import chatlogIcon from '../../../assets/mod-tools/images/roomtools_chat_history.png';
import userIcon from '../../../assets/mod-tools/images/placeholder_avatar_small_head_cropped_png.png';
import ticketIcon from '../../../assets/mod-tools/images/tools_file_icon.png';

const IMAGES: Record<string, string> = {
    roomtools_history_open_icon: roomToolIcon,
    roomtools_chat_history: chatlogIcon,
    placeholder_avatar_small_head_cropped_png: userIcon,
    tools_file_icon: ticketIcon
};

export interface StartPanelProps {
    canUseRoomTool: boolean;
    canUseChatlog: boolean;
    canUseUserInfo: boolean;
    canUseTicketQueue: boolean;
    userCaption: string;
    onRoomTool: () => void;
    onChatlog: () => void;
    onUserInfo: () => void;
    onTicketQueue: () => void;
    onClose: () => void;
    /** The start panel frame (the tracker's parent geometry): where it is shown and where a drag leaves it. */
    x: number;
    y: number;
    onMove: (x: number, y: number) => void;
}

const DISABLED = 0x666666;

export const StartPanelView: FC<StartPanelProps> = ({
    canUseRoomTool,
    canUseChatlog,
    canUseUserInfo,
    canUseTicketQueue,
    userCaption,
    onRoomTool,
    onChatlog,
    onUserInfo,
    onTicketQueue,
    onClose,
    x,
    y,
    onMove
}) => {
    const node = useMemo(() => parseNativeLayout(startPanelXml), []);
    // fme.show(): the four regions keep their offence_name label; a disabled button greys its label (0x666666), an enabled one is black
    const labelColor = (enabled: boolean) => (enabled ? 0 : DISABLED);
    const states: NativeNodeStates = {
        room_tool_but: { enabled: canUseRoomTool },
        chatlog_but: { enabled: canUseChatlog },
        userinfo_but: { enabled: canUseUserInfo },
        ticket_queue_but: { enabled: canUseTicketQueue },
        'room_tool_but/offence_name': { textColor: labelColor(canUseRoomTool) },
        'chatlog_but/offence_name': { textColor: labelColor(canUseChatlog) },
        'userinfo_but/offence_name': { textColor: labelColor(canUseUserInfo), caption: userCaption },
        'ticket_queue_but/offence_name': { textColor: labelColor(canUseTicketQueue) }
    };
    const handlers: NativeNodeHandlers = {
        room_tool_but: { onClick: onRoomTool },
        chatlog_but: { onClick: onChatlog },
        userinfo_but: { onClick: onUserInfo },
        ticket_queue_but: { onClick: onTicketQueue }
    };
    const isTouch = IsTouchLayout(useVoltLayout());

    if (isTouch) {
        return (
            <ModToolsDrawer>
                <NativeFrameView handlers={handlers} images={IMAGES} node={node} states={states} onClose={onClose} />
            </ModToolsDrawer>
        );
    }

    return (
        <DraggableWindow
            handleSelector=".native-frame__titlebar"
            initialPosition={{ x, y }}
            onPositionChange={(position) => onMove(position.x, position.y)}
            unconstrainedPosition
        >
            <NativeFrameView handlers={handlers} images={IMAGES} node={node} states={states} onClose={onClose} />
        </DraggableWindow>
    );
};

const SWIPE_PX = 40;

/** Touch layouts: the start panel lives on the left edge and slides in and out with its tab or a swipe. */
const ModToolsDrawer: FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(true);
    const swipe = useRef<{ pointer: number; x: number } | null>(null);

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        swipe.current = { pointer: event.pointerId, x: event.clientX };
    };

    const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
        const start = swipe.current;

        swipe.current = null;

        if (!start || start.pointer !== event.pointerId) return;

        const dx = event.clientX - start.x;

        if (dx <= -SWIPE_PX) setIsOpen(false);
        else if (dx >= SWIPE_PX) setIsOpen(true);
    };

    return (
        <div
            className="volt-modtools-drawer"
            data-open={isOpen}
            onPointerCancel={() => (swipe.current = null)}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
        >
            <div className="volt-modtools-drawer__panel">{children}</div>
            <button
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Hide mod tools' : 'Show mod tools'}
                className="volt-modtools-drawer__tab"
                type="button"
                onClick={() => setIsOpen((value) => !value)}
            />
        </div>
    );
};
