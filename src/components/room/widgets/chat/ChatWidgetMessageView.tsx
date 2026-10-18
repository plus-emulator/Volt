import { GetRoomEngine, RoomChatSettings, RoomObjectCategory } from '@volt/renderer';
import { CSSProperties, FC, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChatBubbleMessage, GetConfigurationValue } from '../../../../api';
import { useOnClickChat } from '../../../../hooks';
import { useSessionInfo } from '../../../../hooks/session/useSessionInfo';
import { ChatTextSize, getChatFontScale, getChatTextSize } from '../chat-input/chatTextSize';
import { AIR_CHAT_BUBBLE_STYLES } from './airChatStyles';
import { measureBubbleVisualOffsets } from './chatBubbleMetrics';
import { getNativeChatCreation, getNativeChatGeometry } from './nativeChatScroller';
import { getNativeChatBaseFontSize, getNativeDefaultSkin, isNativeAnonymousStyle } from './nativeChatSkin';
import { NativeChatText } from './NativeChatText';

// style_<assetId>_chat_bubble_* / _icon bitmaps, keyed by file name.
const AIR_STYLE_IMAGES = Object.fromEntries(Object.entries(import.meta.glob('../../../../assets/images/chat/air-styles/*.png', { eager: true, import: 'default' }) as Record<string, string>)
    .map(([ path, url ]) => [ path.slice(path.lastIndexOf('/') + 1), url ])) as Record<string, string>;

// Ubuntu SWF ascent + descent at the given size, floored to twips (Air32NativeTextRenderer.resolveLineMetrics).
const getTextLineHeight = (size: number) => Math.floor(19087 * size / 20480 * 20) / 20 + Math.floor(3891 * size / 20480 * 20) / 20;

// Rendered lines: the native canvas is ceil(lines * (line + 1)) + 4 tall; HTML text yields one rect per line box.
const countTextLines = (element: HTMLElement, lineHeight: number): number => {
    const native = element.querySelector<HTMLElement>('.native-chat-text[data-native-chat-text="rendered"]');

    if (native) return Math.max(1, Math.round((native.offsetHeight - 4) / lineHeight));

    const text = element.querySelector('.chat-text');

    if (!text) return 1;

    const range = document.createRange();
    range.selectNodeContents(text);

    // Fragments of one line share a top; a new line starts at least half a line lower.
    const tops = Array.from(range.getClientRects()).filter(rect => rect.width > 0).map(rect => rect.top).sort((a, b) => a - b);
    let lines = tops.length ? 1 : 0;

    for (let index = 1; index < tops.length; index++) if (tops[index] - tops[index - 1] > lineHeight / 2) lines++;

    return Math.max(1, lines);
};

interface ChatWidgetMessageViewProps {
    chat: ChatBubbleMessage;
    makeRoom: (chat: ChatBubbleMessage, creationMode: number) => void;
    mode?: number;
    bubbleWidth?: number;
    showPointer?: boolean;
    layout?: 'room' | 'history';
}

export const ChatWidgetMessageView: FC<ChatWidgetMessageViewProps> = ({
    chat = null,
    makeRoom = null,
    mode = RoomChatSettings.CHAT_MODE_FREE_FLOW,
    bubbleWidth = RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL,
    showPointer = true,
    layout = 'room'
}) => {
    const [creationMode] = useState(() => getNativeChatCreation(chat)?.mode ?? mode);
    const [isVisible, setIsVisible] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const { chatFontScale } = useSessionInfo();
    const [chatTextSize] = useState<ChatTextSize>(() => chat.textSize ?? getChatTextSize(chatFontScale));
    useLayoutEffect(() => {
        chat.textSize ??= chatTextSize;
    }, [chat, chatTextSize]);
    const [faceSize, setFaceSize] = useState(() => {
        const size = GetConfigurationValue<boolean>('zoom.enabled', false) ? 25 : 50;

        return { width: size, height: size };
    });
    const [defaultSkin, setDefaultSkin] = useState<string>(null);
    const fontScale = getChatFontScale(chatTextSize);
    const anonymous = isNativeAnonymousStyle(chat.styleId);
    // Styles drawn from their AIR regpoints (PooledChatBubble.recreate, AIR PooledChatBubble.as:116-283).
    const airStyle = AIR_CHAT_BUBBLE_STYLES[chat.styleId] ?? null;

    // PooledChatBubble adds the pointer to every non-anonymous bubble, so the sprite height the chat flow stacks with
    // (displayedHeight) includes the part of the pointer below the bubble (PooledChatBubble.as:228-233, 356-359).
    chat.pointerOverhang = (airStyle?.pointer && !anonymous) ? Math.max(0, airStyle.pointer.size[1] - (airStyle.size[1] - airStyle.pointer.y)) : 0;
    const [lineCount, setLineCount] = useState(1);
    const elementRef = useRef<HTMLDivElement>(null);
    const makeRoomRef = useRef(makeRoom);
    const { onClickChat } = useOnClickChat();
    const formattedText = useMemo(() => `${chat.formattedText}`, [chat.formattedText]);

    const getBubbleWidth = useMemo(() => {
        // AIR's history factory always requests NORMAL (350), and ChatBubble
        // reserves 15 pixels before laying out its TextField and background.
        if (layout === 'history') return 'max-w-[335px]';
        switch (bubbleWidth) {
            case RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL:
                return 'max-w-[350px]';
            case RoomChatSettings.CHAT_BUBBLE_WIDTH_THIN:
                return 'max-w-[240px]';
            case RoomChatSettings.CHAT_BUBBLE_WIDTH_WIDE:
                return 'max-w-[2000px]';
            default:
                return 'max-w-[350px]';
        }
    }, [bubbleWidth, layout]);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const { offsetWidth: width, offsetHeight: height } = element;
        const visualOffsets = measureBubbleVisualOffsets(element);

        chat.width = width;
        chat.height = height;
        chat.visualOffsetTop = visualOffsets.top;
        chat.visualOffsetBottom = visualOffsets.bottom;
        chat.elementRef = element;

        if (airStyle) setLineCount(countTextLines(element, getTextLineHeight(airStyle.fontSize * fontScale) + 1));

        setIsReady(true);

        makeRoomRef.current?.(chat, creationMode);
    }, [
        chat,
        chat.formattedText,
        chatTextSize,
        isVisible,
        showPointer,
        creationMode,
        airStyle,
        fontScale
    ]);

    useEffect(() => {
        if (chat.styleId !== 0) return;
        let disposed = false;
        getNativeDefaultSkin(chat.color).then((skin) => {
            if (!disposed) setDefaultSkin(skin);
        });
        return () => { disposed = true; };
    }, [chat.styleId, chat.color]);

    useEffect(() => {
        makeRoomRef.current = makeRoom;
    }, [makeRoom]);

    useEffect(() => {
        const element = elementRef.current;

        if (!element || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => {
            const { offsetWidth: width, offsetHeight: height } = element;

            if (airStyle) setLineCount(countTextLines(element, getTextLineHeight(airStyle.fontSize * fontScale) + 1));

            if (width === chat.width && height === chat.height) return;

            const visualOffsets = measureBubbleVisualOffsets(element);

            chat.width = width;
            chat.height = height;
            chat.visualOffsetTop = visualOffsets.top;
            chat.visualOffsetBottom = visualOffsets.bottom;

            if (makeRoomRef.current) makeRoomRef.current(chat, creationMode);
        });

        observer.observe(element);

        // AIR-style bubbles have a fixed text height; the text itself reports when it reflows or the native canvas lands.
        const text = element.querySelector('.native-chat-text, .chat-text');

        if (text) observer.observe(text);

        return () => observer.disconnect();
    }, [chat, creationMode, airStyle, fontScale]);

    useEffect(() => {
        return () => {
            chat.elementRef = null;
        };
    }, [chat]);

    useEffect(() => {
        if (!isReady || !chat || isVisible) return;

        makeRoomRef.current?.(chat, creationMode);
        setIsVisible(true);
    }, [chat, isReady, isVisible, creationMode]);

    const messageClassName = `message [overflow-wrap:anywhere] break-words${chat.type === 2 ? ' font-bold' : ''}`;
    const nativeTextWidth = layout === 'history' ? 291 : bubbleWidth === RoomChatSettings.CHAT_BUBBLE_WIDTH_THIN ? 196 : bubbleWidth === RoomChatSettings.CHAT_BUBBLE_WIDTH_WIDE ? 1956 : 306;
    // style_normal's tint mask ends before the 2px TextField gutter; shirt colour cannot alter the text surface.
    const nativeTextEnabled = chat.styleId === 0 && fontScale === 1;
    const unlimitedHeight = getNativeChatGeometry(chat.styleId).unlimitedHeight;

    if (airStyle) {
        const [ sliceX, sliceY, sliceWidth, sliceHeight ] = airStyle.slice;
        const [ baseWidth, baseHeight ] = airStyle.size;
        const [ marginX, marginY, marginWidth, marginHeight ] = airStyle.margins;
        const emblem = (lineCount > 1 && airStyle.emblemMultiline) || airStyle.emblem;
        // An icon replaces the avatar face (ChatBubbleFactory.as:96); faces only show on styles with faceXY.
        const faceUrl = airStyle.face ? (airStyle.icon ? AIR_STYLE_IMAGES[airStyle.icon.image] : (!anonymous && chat.imageUrl) || null) : null;
        const [ faceWidth, faceHeight ] = airStyle.icon ? airStyle.icon.size : [ faceSize.width, faceSize.height ];
        const pointer = showPointer && !anonymous ? airStyle.pointer : null;
        const bubbleStyle = {
            borderImage: `url(${ (airStyle.tint && defaultSkin) || AIR_STYLE_IMAGES[airStyle.base] }) ${ sliceY } ${ baseWidth - sliceX - sliceWidth } ${ baseHeight - sliceY - sliceHeight } ${ sliceX } fill / ${ sliceY }px ${ baseWidth - sliceX - sliceWidth }px ${ baseHeight - sliceY - sliceHeight }px ${ sliceX }px / 0 stretch`,
            // TextField width is the bubble width minus the margins; text wraps 4px (gutters) inside it.
            maxWidth: (layout === 'history' ? 335 : bubbleWidth === RoomChatSettings.CHAT_BUBBLE_WIDTH_THIN ? 240 : bubbleWidth === RoomChatSettings.CHAT_BUBBLE_WIDTH_WIDE ? 2000 : 350) - 4,
            minWidth: baseWidth,
            minHeight: baseHeight,
            color: airStyle.color,
            '--chat-pointer-margin-left': `${ pointer?.margins?.[0] ?? 28 }px`,
            '--chat-pointer-margin-right': `${ pointer?.margins?.[1] ?? 15 }px`
        } as CSSProperties;
        // TextField at textFieldMargins (x, y) with a 2px gutter; the bubble is int(textHeight + margins), textHeight being
        // ascent + descent of the Ubuntu SWF font per line plus 1px between lines (see NativeChatText).
        const fontSize = airStyle.fontSize * fontScale;
        const textLine = getTextLineHeight(fontSize);
        const contentHeight = Math.trunc(textLine * lineCount + (lineCount - 1) + marginY + marginHeight);
        // The native canvas carries the gutters itself (fieldWidth = textWidth + 4).
        const contentStyle: CSSProperties = {
            padding: nativeTextEnabled ? `${ marginY }px ${ marginWidth - 4 }px 0 ${ marginX }px` : `${ marginY + 2 }px ${ marginWidth - 2 }px 0 ${ marginX + 2 }px`,
            lineHeight: `${ textLine + 1 }px`,
            height: unlimitedHeight ? contentHeight : Math.min(contentHeight, Math.trunc(108 * fontScale)),
            overflow: 'hidden'
        };

        return (
            <div
                ref={elementRef}
                className={`bubble-container native-room-bubble chat-text-size ${layout === 'history' ? 'native-history-bubble relative' : 'newbubblehe absolute'} ${isVisible ? 'visible' : 'invisible'} w-max select-none pointer-events-auto`}
                style={{ '--chat-text-size': `${fontSize}px`, transition: 'none' } as CSSProperties}
                onClick={() => {
                    if (!anonymous) GetRoomEngine().selectRoomObject(chat.roomId, chat.senderId, RoomObjectCategory.UNIT);
                }}
            >
                <div
                    className={`chat-bubble air-chat-bubble type-${chat.type} ${getBubbleWidth}${chat.type === 1 && !anonymous ? ' native-whisper' : ''}${nativeTextEnabled ? ' air-native-text' : ''} relative z-1 wrap-break-word`}
                    style={bubbleStyle}
                >
                    {emblem && <img alt="" className="air-chat-emblem" src={AIR_STYLE_IMAGES[emblem.image]} style={{ left: emblem.position[0], top: emblem.position[1] }} />}
                    {pointer && (
                        <img
                            alt=""
                            className="pointer air-chat-pointer"
                            src={AIR_STYLE_IMAGES[pointer.image]}
                            style={{ top: `calc(100% - ${ baseHeight - pointer.y }px)`, width: pointer.size[0], height: pointer.size[1] }}
                        />
                    )}
                    {faceUrl && (
                        <div className="air-chat-face" style={{
                            left: Math.trunc(airStyle.face[0] - faceWidth / 2 - (airStyle.notification ? 0.5 : 0)),
                            width: faceWidth,
                            height: `min(${ faceHeight }px, 100%)`,
                            // Notification styles centre the face vertically, lifted by half the pointer.
                            top: airStyle.notification
                                ? `calc(max(1px, 50% - ${ faceHeight / 2 }px) - ${ (airStyle.pointer?.size[1] ?? 2) / 2 - 1 }px)`
                                : `max(1px, calc(${ airStyle.face[1] }px - min(${ faceHeight }px, 100%) / 2))`
                        }}>
                            <img
                                alt=""
                                src={faceUrl}
                                style={{ width: faceWidth, height: faceHeight }}
                                onLoad={(event) => {
                                    if (airStyle.icon) return;
                                    const imageScale = chat.imageScale || 1;

                                    setFaceSize({
                                        width: event.currentTarget.naturalWidth / imageScale,
                                        height: event.currentTarget.naturalHeight / imageScale
                                    });
                                }}
                            />
                        </div>
                    )}
                    <div className="chat-content" style={contentStyle}>
                        {nativeTextEnabled && (
                            <NativeChatText
                                username={chat.hideUsername ? '' : chat.username}
                                html={formattedText}
                                type={chat.type}
                                anonymous={anonymous}
                                maxWidth={nativeTextWidth}
                                className={messageClassName}
                                onClick={onClickChat}
                            />
                        )}
                        {!nativeTextEnabled && (
                            <span className="chat-text">
                                {!anonymous && !chat.hideUsername && <b className="username">{chat.username}: </b>}
                                <span className={messageClassName} dangerouslySetInnerHTML={{ __html: formattedText }} onClick={onClickChat} />
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={elementRef}
            className={`bubble-container native-room-bubble chat-text-size ${layout === 'history' ? 'native-history-bubble relative' : 'newbubblehe absolute'} ${isVisible ? 'visible' : 'invisible'} w-max select-none pointer-events-auto`}
            style={{ '--chat-text-size': `${getNativeChatBaseFontSize(chat.styleId) * fontScale}px`, transition: 'none' } as CSSProperties}
            onClick={() => {
                if (!anonymous) GetRoomEngine().selectRoomObject(chat.roomId, chat.senderId, RoomObjectCategory.UNIT);
            }}
        >
            <div
                className={`chat-bubble bubble-${chat.styleId} type-${chat.type} ${getBubbleWidth}${chat.type === 1 && !anonymous ? ' native-whisper' : ''} relative z-1 wrap-break-word`}
            >
                <div className="user-container absolute overflow-hidden" style={{
                    left: Math.trunc(13 - faceSize.width / 2),
                    width: faceSize.width,
                    height: `min(${faceSize.height}px, 100%)`,
                    top: `max(1px, calc(12px - min(${faceSize.height}px, 100%) / 2))`
                }}>
                    {!anonymous && chat.imageUrl && chat.imageUrl.length > 0 && (
                        <img
                            alt=""
                            src={chat.imageUrl}
                            className="user-image absolute bottom-0 left-0 max-w-none"
                            style={{ width: faceSize.width, height: faceSize.height }}
                            onLoad={(event) => {
                                const imageScale = chat.imageScale || 1;

                                setFaceSize({
                                    width: event.currentTarget.naturalWidth / imageScale,
                                    height: event.currentTarget.naturalHeight / imageScale
                                });
                            }}
                        />
                    )}
                </div>
                <div className="chat-content" style={layout === 'history' && !getNativeChatGeometry(chat.styleId).unlimitedHeight
                    ? { maxHeight: Math.trunc(108 * fontScale), overflow: 'hidden' }
                    : undefined}>
                    {!anonymous && !chat.hideUsername && <b className="username">{chat.username}: </b>}
                    <span className={messageClassName} dangerouslySetInnerHTML={{ __html: formattedText }} onClick={onClickChat} />
                </div>
                {showPointer && !anonymous && (
                    <div
                        className="pointer absolute w-[9px] h-[6px] bottom-[-5px]"
                        style={{ left: '50%' }}
                    />
                )}
            </div>
        </div>
    );
};
