import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChatBubbleMessage } from '../../../../api/room/widgets/ChatBubbleMessage';
import { localizeWithFallback } from '../../../../api/utils/localizeWithFallback';
import { RoomChatFormatter } from '../../../../api/utils/RoomChatFormatter';
import { ChatWidgetMessageView } from '../../../room/widgets/chat/ChatWidgetMessageView';
import { WiredText } from '../WiredText';

/** MessageEditorPreviewPreset uses the same bubble as room chat, scaled down only when it exceeds the preview width. */
export const WiredMessagePreview = ({ value, styleId, username, type, width }: { value: string; styleId: number; username: string; type: number; width: number }) => {
    const area = useRef<HTMLDivElement>(null);
    const bubble = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ scale: 1, width: 0, height: 69 });
    const chat = useMemo(() => {
        const result = new ChatBubbleMessage(-1, -1, -1, value, RoomChatFormatter(value), username, null, type, styleId);
        result.textSize = 's';
        result.hideUsername = !username;
        return result;
    }, [value, styleId, username, type]);

    useLayoutEffect(() => {
        const measure = () => {
            if (!area.current || !bubble.current) return;
            const naturalWidth = bubble.current.offsetWidth;
            const naturalHeight = bubble.current.offsetHeight;
            const scale = naturalWidth ? Math.min(1, area.current.clientWidth / naturalWidth) : 1;
            setSize({ scale, width: naturalWidth * scale, height: Math.max(69, Math.ceil(naturalHeight * scale)) });
        };
        const observer = new ResizeObserver(measure);
        observer.observe(area.current);
        observer.observe(bubble.current);
        measure();
        return () => observer.disconnect();
    }, []);

    return <div className="volt-wired-message-preview">
        <WiredText soft text={localizeWithFallback('wiredfurni.params.message_editor.preview.title', 'Preview')} />
        <div ref={area} className="volt-wired-message-preview__area" style={{ minHeight: size.height, paddingBottom: size.height > 69 ? 5 : 0 }}>
            <div style={{ width: size.width, height: size.height, position: 'relative' }}>
                <div ref={bubble} className="volt-wired-message-preview__bubble" style={{ transform: `scale(${size.scale})` }}>
                    <ChatWidgetMessageView chat={chat} makeRoom={null} bubbleWidth={width} />
                </div>
            </div>
        </div>
    </div>;
};
