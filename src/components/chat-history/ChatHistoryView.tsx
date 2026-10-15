import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { ChatEntryType } from '../../api';
import { useChatHistory } from '../../hooks';
import { ChatHistoryBubbleView } from './ChatHistoryBubbleView';
import { getNativeChatGeometry } from '../room/widgets/chat/nativeChatScroller';

export const ChatHistoryView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const { chatHistory = [] } = useChatHistory();
    const elementRef = useRef<HTMLDivElement>(null);
    const prevChatLength = useRef<number>(0);

    const filteredChatHistory = useMemo(() => [...chatHistory], [chatHistory]);

    useEffect(() => {
        if (!elementRef.current || !isVisible) return;

        const element = elementRef.current;

        if (filteredChatHistory.length !== prevChatLength.current) {
            element.scrollTo({ top: element.scrollHeight });
            prevChatLength.current = filteredChatHistory.length;
        }
    }, [filteredChatHistory, isVisible]);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => !prevValue);
                        return;
                }
            },
            eventUrlPrefix: 'chat-history/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="volt-chat-history">
            <div className="volt-chat-history-tray-bar" />
            <div className="volt-chat-history-content">
                <div ref={elementRef} className="volt-chat-history-scroll">
                    {filteredChatHistory.map((row, index) => (
                        <div key={`${row.id}-${index}`} className={`volt-chat-history-row${row.type === ChatEntryType.TYPE_CHAT ? ' volt-chat-history-chat-row' : ''}`}
                            style={row.type === ChatEntryType.TYPE_CHAT ? { marginTop: -getNativeChatGeometry(row.style ?? 0).overlap.y } : undefined}>
                            <div className="volt-chat-history-time">{row.timestamp}</div>
                            {row.type === ChatEntryType.TYPE_CHAT && (
                                <div className="volt-chat-history-message">
                                    <ChatHistoryBubbleView entry={row} />
                                </div>
                            )}
                            {row.type === ChatEntryType.TYPE_ROOM_INFO && (
                                <div className="volt-chat-history-room-info">
                                    <i className="volt-icon icon-small-room" />
                                    <span>{row.message || row.name}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <button className="volt-chat-history-handle" type="button" onClick={() => setIsVisible(false)} />
        </div>
    );
};
