import { FC, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChatBubbleMessage, GetConfigurationValue, resolveChatBubbleWidth } from '../../../../api';
import { useChatWidget, useChatWindow } from '../../../../hooks';
import { useSessionInfo } from '../../../../hooks/session/useSessionInfo';
import { CHAT_FONT_SCALES } from '../chat-input/chatTextSize';
import { ChatWidgetMessageView } from './ChatWidgetMessageView';
import { ChatWidgetWindowView } from './ChatWidgetWindowView';
import { measureChatBubble } from './chatBubbleMetrics';
import { getChatViewerHeight } from './freeFlowChatLayout';
import { NativeChatScroller } from './nativeChatScroller';
import { isExpiredPetSpeechBubble, PET_SPEECH_BUBBLE_MAX_AGE_MS } from './petSpeechBubble';

export const ChatWidgetView: FC<{}> = (props) => {
    const { chatMessages = [], setChatMessages = null, chatSettings = null, getScrollSpeed = 6000, roomId = null } = useChatWidget();
    const { chatFontScale } = useSessionInfo();
    const fontScale = CHAT_FONT_SCALES[chatFontScale];
    const [chatWindowEnabled] = useChatWindow();
    const elementRef = useRef<HTMLDivElement>(null);
    const chatMessagesRef = useRef(chatMessages);
    const [scroller] = useState(() => new NativeChatScroller());
    // Bubbles that mounted or resized since the last frame, with their creation mode.
    const pendingRef = useRef(new Map<ChatBubbleMessage, number>());
    const settingsRef = useRef({ mode: chatSettings.mode, speed: getScrollSpeed, fontScale });

    chatMessagesRef.current = chatMessages;
    settingsRef.current = { mode: chatSettings.mode, speed: getScrollSpeed, fontScale };

    const makeRoom = useCallback((chat: ChatBubbleMessage, creationMode: number) => {
        pendingRef.current.set(chat, creationMode);
    }, []);

    useEffect(() => {
        scroller.configure(chatSettings.mode, getScrollSpeed, fontScale);
    }, [scroller, chatSettings.mode, getScrollSpeed, fontScale]);

    useLayoutEffect(() => {
        scroller.clear();
    }, [scroller, roomId]);

    useLayoutEffect(() => {
        const resize = () => {
            const element = elementRef.current;
            if (!element) return;
            const configuredHeightPercentage = GetConfigurationValue<number>('chat.viewer.height.percentage', 0.25);
            const newHeight = getChatViewerHeight(document.body.offsetHeight, configuredHeightPercentage);
            element.style.height = `${newHeight}px`;
            scroller.resize(newHeight, document.body.offsetWidth);
        };
        window.addEventListener('resize', resize);
        resize();
        return () => window.removeEventListener('resize', resize);
    }, [scroller]);

    useEffect(() => {
        let frame = 0;
        let previous = performance.now();
        const placePending = () => {
            const pending = pendingRef.current;
            if (!pending.size) return;
            const entries = [...pending];
            pending.clear();
            // Every read first, then every write: one layout for all of this frame's new bubbles,
            // instead of one forced layout per bubble between the previous bubble's writes.
            for (const [chat] of entries) measureChatBubble(chat);
            const settings = settingsRef.current;
            scroller.configure(settings.mode, settings.speed, settings.fontScale);
            for (const [chat, creationMode] of entries) if (chat.elementRef) scroller.register(chat, creationMode);
        };
        const update = () => {
            const now = performance.now();
            const elapsed = now - previous;
            previous = now;
            let chats = chatMessagesRef.current;
            let expired: Set<ChatBubbleMessage> | undefined;

            if (elapsed >= PET_SPEECH_BUBBLE_MAX_AGE_MS) {
                expired = new Set([...chats, ...pendingRef.current.keys()].filter(chat => isExpiredPetSpeechBubble(chat, now)));
                for (const chat of expired) {
                    pendingRef.current.delete(chat);
                    if (chat.elementRef) chat.elementRef.style.visibility = 'hidden';
                }
                chats = chats.filter(chat => !expired.has(chat));
                scroller.removeChats(expired);
            }

            placePending();
            // Advance once per frame without replaying missed frames.
            const removed = scroller.advance(elapsed, chats);
            if (removed.length || expired?.size) {
                const ids = new Set(removed);
                setChatMessages(messages => messages.filter(chat => !ids.has(chat.id) && !expired?.has(chat)));
            }
            frame = window.requestAnimationFrame(update);
        };
        frame = window.requestAnimationFrame(update);
        return () => {
            window.cancelAnimationFrame(frame);
            pendingRef.current.clear();
            scroller.clear();
        };
    }, [scroller, setChatMessages]);

    return (
        <div
            ref={elementRef}
            className="absolute flex justify-center items-center w-full top-0 min-h-px z-(--chat-zindex) bg-transparent roundehidden shadow-none pointer-events-none"
        >
            {!chatWindowEnabled &&
                chatMessages.map((chat) => (
                    <ChatWidgetMessageView
                        key={chat.id}
                        bubbleWidth={resolveChatBubbleWidth(chat.bubbleWidthOverride, chatSettings.weight)}
                        chat={chat}
                        mode={chatSettings.mode}
                        makeRoom={makeRoom}
                        measuredByMakeRoom
                        imageUrl={chat.imageUrl}
                        color={chat.color}
                    />
                ))}
            {chatWindowEnabled && <ChatWidgetWindowView />}
        </div>
    );
};
