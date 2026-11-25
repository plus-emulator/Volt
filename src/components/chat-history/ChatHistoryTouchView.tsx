import { FC, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ChatEntryType, ChatMessageTypeEnum, GetSessionDataManager, IChatEntry, localizeWithFallback, SanitizeChatHtml } from '../../api';
import { LayoutAvatarImageView, VoltCardHeaderView, VoltCardView } from '../../common';

type ChatHistoryFilter = 'all' | 'whispers' | 'mentions';

const LONG_PRESS_MS = 500;
const LONG_PRESS_SLOP = 10;

interface ChatHistoryTouchViewProps {
    chatHistory: IChatEntry[];
    onClose: () => void;
}

const isMention = (entry: IChatEntry, userName: string) => !!userName && entry.name !== userName && !!entry.message && entry.message.toLowerCase().includes(userName.toLowerCase());

export const ChatHistoryTouchView: FC<ChatHistoryTouchViewProps> = ({ chatHistory, onClose }) => {
    const [filter, setFilter] = useState<ChatHistoryFilter>('all');
    const [copiedIndex, setCopiedIndex] = useState(-1);
    const scrollRef = useRef<HTMLDivElement>(null);
    const pressRef = useRef<{ timer: number; x: number; y: number }>(null);
    const userName = GetSessionDataManager()?.userName ?? '';

    const rows = useMemo(() => {
        if (filter === 'all') return chatHistory;

        return chatHistory.filter((entry) => {
            if (entry.type !== ChatEntryType.TYPE_CHAT) return false;

            if (filter === 'whispers') return entry.chatType === ChatMessageTypeEnum.CHAT_WHISPER;

            return isMention(entry, userName);
        });
    }, [chatHistory, filter, userName]);

    useEffect(() => {
        const element = scrollRef.current;

        if (element) element.scrollTo({ top: element.scrollHeight });
    }, [rows]);

    useEffect(() => {
        if (copiedIndex < 0) return;

        const timeout = window.setTimeout(() => setCopiedIndex(-1), 1200);

        return () => window.clearTimeout(timeout);
    }, [copiedIndex]);

    useEffect(() => () => {
        if (pressRef.current) window.clearTimeout(pressRef.current.timer);
    }, []);

    const cancelPress = () => {
        if (!pressRef.current) return;

        window.clearTimeout(pressRef.current.timer);
        pressRef.current = null;
    };

    const startPress = (event: PointerEvent, entry: IChatEntry, index: number) => {
        cancelPress();

        if (!entry.message) return;

        const timer = window.setTimeout(() => {
            pressRef.current = null;
            void navigator.clipboard?.writeText(entry.message).then(() => setCopiedIndex(index)).catch(() => {});
        }, LONG_PRESS_MS);

        pressRef.current = { timer, x: event.clientX, y: event.clientY };
    };

    const movePress = (event: PointerEvent) => {
        const press = pressRef.current;

        if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > LONG_PRESS_SLOP) cancelPress();
    };

    const filters: { id: ChatHistoryFilter; label: string }[] = [
        { id: 'all', label: localizeWithFallback('chathistory.filter.all', 'All') },
        { id: 'whispers', label: localizeWithFallback('chathistory.filter.whispers', 'Whispers') },
        { id: 'mentions', label: localizeWithFallback('chathistory.filter.mentions', 'Mentions') }
    ];

    return (
        <VoltCardView className="volt-chat-history-sheet" frameStyle={3} isResizable={false} touchPresentation="full" uniqueKey="chat-history">
            <VoltCardHeaderView headerText={localizeWithFallback('room.chathistory.button.text', 'Chat history')} onCloseClick={onClose} />
            <div className="volt-chat-history-sheet-body">
                <div className="volt-chat-history-filters" role="tablist">
                    {filters.map((item) => (
                        <button
                            key={item.id}
                            aria-selected={filter === item.id}
                            className={`volt-chat-history-filter${filter === item.id ? ' is-selected' : ''}`}
                            role="tab"
                            type="button"
                            onClick={() => setFilter(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <div ref={scrollRef} className="volt-chat-history-lines">
                    {rows.map((entry, index) => {
                        if (entry.type === ChatEntryType.TYPE_ROOM_INFO) {
                            return (
                                <div key={`${entry.id}-${index}`} className="volt-chat-history-section">
                                    <i className="volt-icon icon-small-room" />
                                    <span>{entry.message || entry.name}</span>
                                    <span className="volt-chat-history-section-time">{entry.timestamp}</span>
                                </div>
                            );
                        }

                        if (entry.type !== ChatEntryType.TYPE_CHAT) return null;

                        const isWhisper = entry.chatType === ChatMessageTypeEnum.CHAT_WHISPER;

                        return (
                            <div
                                key={`${entry.id}-${index}`}
                                className={`volt-chat-history-line${isWhisper ? ' is-whisper' : ''}${copiedIndex === index ? ' is-copied' : ''}`}
                                onContextMenu={(event) => event.preventDefault()}
                                onPointerCancel={cancelPress}
                                onPointerDown={(event) => startPress(event, entry, index)}
                                onPointerLeave={cancelPress}
                                onPointerMove={movePress}
                                onPointerUp={cancelPress}
                            >
                                <span className="volt-chat-history-line-time">{entry.timestamp}</span>
                                <div className="volt-chat-history-line-face">
                                    {entry.look ? (
                                        <LayoutAvatarImageView figure={entry.look} headOnly compactHead compactHeadSize={28} compactHeadPadding={0} direction={2} />
                                    ) : (
                                        entry.imageUrl && <img alt="" className={entry.imageScale === 2 ? 'is-2x' : undefined} src={entry.imageUrl} />
                                    )}
                                </div>
                                <div className="volt-chat-history-line-text">
                                    {!entry.hideUsername && <b>{entry.name}: </b>}
                                    <span dangerouslySetInnerHTML={{ __html: SanitizeChatHtml(entry.message ?? '') }} />
                                </div>
                                {copiedIndex === index && <span className="volt-chat-history-line-copied">{localizeWithFallback('generic.copied', 'Copied')}</span>}
                            </div>
                        );
                    })}
                    {!rows.length && <div className="volt-chat-history-empty">{localizeWithFallback('generic.no_results', 'No messages')}</div>}
                </div>
            </div>
        </VoltCardView>
    );
};
