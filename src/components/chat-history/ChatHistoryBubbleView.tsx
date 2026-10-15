import { FC, useEffect, useMemo, useState } from 'react';
import { ChatBubbleMessage, ChatBubbleUtilities, IChatEntry, SanitizeHtml } from '../../api';
import { ChatWidgetMessageView } from '../room/widgets/chat/ChatWidgetMessageView';

export const ChatHistoryBubbleView: FC<{ entry: IChatEntry }> = ({ entry }) => {
    // Old entries used a different low-resolution face canvas. Rebuild them
    // from the figure, just like entries restored without an image from storage.
    const storedImage = entry.imageScale === 2 ? entry.imageUrl : null;
    const [restoredImage, setRestoredImage] = useState<string>(null);

    useEffect(() => {
        let disposed = false;
        setRestoredImage(null);
        if (storedImage || !entry.look) return;

        void ChatBubbleUtilities.getUserImage(entry.look, true).then((image) => {
            if (!disposed) setRestoredImage(image);
        }).catch(() => {});

        return () => { disposed = true; };
    }, [storedImage, entry.look]);

    const chat = useMemo(() => {
        const message = new ChatBubbleMessage(
            entry.entityId, 100, entry.roomId, entry.message ?? '', SanitizeHtml(entry.message ?? ''), entry.name,
            null, entry.chatType ?? 0, entry.style ?? 0, storedImage || restoredImage, entry.color
        );
        message.imageScale = 2;
        message.textSize = entry.textSize ?? 's';
        message.hideUsername = entry.hideUsername ?? false;
        return message;
    }, [entry, storedImage, restoredImage]);

    // AIR ChatBubbleFactory.getHistoryLineEntry draws the normal ChatBubble,
    // including its face, native TextField, tint and pointer, at NORMAL width.
    return <ChatWidgetMessageView chat={chat} makeRoom={null} layout="history" />;
};
