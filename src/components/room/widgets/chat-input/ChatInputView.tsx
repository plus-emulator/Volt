import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChatMessageTypeEnum, CreateLinkEvent, GetConfigurationValue, LocalizeText, localizeWithFallback, RoomWidgetUpdateChatInputContentEvent } from '../../../../api';
import { IsTouchLayout, useVoltLayout } from '../../../../api/touch/VoltLayout';
import { Text } from '../../../../common';
import { useChatHelpButton, useChatInputWidget, useClientAccessLists, useRoom, useSessionInfo, useUiEvent, useUserDataSnapshot } from '../../../../hooks';
import { ChatInputHabbiconSelectorView } from './ChatInputHabbiconSelectorView';
import { ChatInputStyleSelectorView } from './ChatInputStyleSelectorView';
import { ChatInputTouchModeBarView, TouchChatMode } from './ChatInputTouchModeBarView';
import { ChatStyleDefinition, getChatStyleLibrary, getSelectableChatStyleIds } from './chatStyles';

export const ChatInputView: FC<{}> = (props) => {
    const [chatValue, setChatValue] = useState<string>('');
    const [portalTarget, setPortalTarget] = useState<HTMLElement>(null);
    const { chatStyleId = 0, updateChatStyleId = null } = useSessionInfo();
    const {
        selectedUsername = '',
        floodBlocked = false,
        floodBlockedSeconds = 0,
        setIsTyping = null,
        setIsIdle = null,
        sendChat = null
    } = useChatInputWidget();
    const { roomSession = null } = useRoom();
    const { chatStyleIds, purchasableChatStyleIds } = useClientAccessLists();
    const { clubLevel = 0, isAmbassador = false, securityLevel = 0 } = useUserDataSnapshot();
    const selectableChatStyleIds = useMemo(() => getSelectableChatStyleIds(
        getChatStyleLibrary(GetConfigurationValue<ChatStyleDefinition[]>('chat.styles', [])),
        chatStyleIds,
        GetConfigurationValue<string>('disabled.custom.chat.styles', ''),
        { hasClub: clubLevel > 0, isAmbassador, hasSecurity: securityLevel >= 4, purchasableStyleIds: purchasableChatStyleIds }
    ), [ chatStyleIds, purchasableChatStyleIds, clubLevel, isAmbassador, securityLevel ]);
    const inputRef = useRef<HTMLInputElement>(null);
    const { isHelpButtonVisible, hoverRegionProps, helpButtonProps } = useChatHelpButton();
    const isTouch = IsTouchLayout(useVoltLayout());
    const [touchMode, setTouchMode] = useState<TouchChatMode>('say');
    const [whisperTarget, setWhisperTarget] = useState('');

    const chatModeIdWhisper = useMemo(() => LocalizeText('widgets.chatinput.mode.whisper'), []);
    const chatModeIdShout = useMemo(() => LocalizeText('widgets.chatinput.mode.shout'), []);
    const chatModeIdSpeak = useMemo(() => LocalizeText('widgets.chatinput.mode.speak'), []);
    const maxChatLength = useMemo(() => GetConfigurationValue<number>('chat.input.maxlength', 200), []);

    const anotherInputHasFocus = useCallback(() => {
        const activeElement = document.activeElement;

        if (!activeElement) return false;

        if (inputRef && inputRef.current === activeElement) return false;

        if (!(activeElement instanceof HTMLInputElement) && !(activeElement instanceof HTMLTextAreaElement)) return false;

        return true;
    }, [inputRef]);

    const setInputFocus = useCallback(() => {
        inputRef.current.focus();

        inputRef.current.setSelectionRange(inputRef.current.value.length * 2, inputRef.current.value.length * 2);
    }, [inputRef]);

    const checkSpecialKeywordForInput = useCallback(() => {
        setChatValue((prevValue) => {
            if (prevValue !== chatModeIdWhisper || !selectedUsername.length) return prevValue;

            return `${prevValue} ${selectedUsername}`;
        });
    }, [selectedUsername, chatModeIdWhisper]);

    const sendChatValue = useCallback(
        (value: string, shiftKey: boolean = false, keepWhisperPrefix: boolean = true) => {
            if (!value || value === '') return;

            let chatType = shiftKey ? ChatMessageTypeEnum.CHAT_SHOUT : ChatMessageTypeEnum.CHAT_DEFAULT;
            let text = value;

            const parts = text.split(' ');

            let recipientName = '';
            let append = '';

            switch (parts[0]) {
                case chatModeIdWhisper:
                    chatType = ChatMessageTypeEnum.CHAT_WHISPER;
                    recipientName = parts[1];
                    append = chatModeIdWhisper + ' ' + recipientName + ' ';

                    parts.shift();
                    parts.shift();
                    break;
                case chatModeIdShout:
                    chatType = ChatMessageTypeEnum.CHAT_SHOUT;

                    parts.shift();
                    break;
                case chatModeIdSpeak:
                    chatType = ChatMessageTypeEnum.CHAT_DEFAULT;

                    parts.shift();
                    break;
            }

            text = parts.join(' ');

            setIsTyping(false);
            setIsIdle(false);

            if (text.length <= maxChatLength) {
                if (/%CC%/g.test(encodeURIComponent(text))) {
                    setChatValue('');
                } else {
                    setChatValue('');
                    sendChat(text, chatType, recipientName, chatStyleId);
                }
            }

            setChatValue(keepWhisperPrefix ? append : '');
        },
        [chatModeIdWhisper, chatModeIdShout, chatModeIdSpeak, maxChatLength, chatStyleId, setIsTyping, setIsIdle, sendChat]
    );

    const sendTouchChatValue = useCallback(
        (value: string) => {
            if (!value || !value.trim().length) return;

            if (touchMode === 'whisper' && whisperTarget) {
                sendChatValue(`${chatModeIdWhisper} ${whisperTarget} ${value}`, false, false);
                return;
            }

            sendChatValue(value, touchMode === 'shout');
        },
        [touchMode, whisperTarget, chatModeIdWhisper, sendChatValue]
    );

    const selectTouchMode = useCallback(
        (mode: TouchChatMode) => {
            if (mode === 'whisper') {
                const target = selectedUsername || whisperTarget;

                if (!target) return;

                setWhisperTarget(target);
            }

            setTouchMode(mode);
        },
        [selectedUsername, whisperTarget]
    );

    const updateChatInput = useCallback(
        (value: string) => {
            if (!value || !value.length) {
                setIsTyping(false);
            } else {
                setIsTyping(true);
                setIsIdle(true);
            }

            setChatValue(value);
        },
        [setIsTyping, setIsIdle]
    );

    const onKeyDownEvent = useCallback(
        (event: KeyboardEvent) => {
            if (floodBlocked || !inputRef.current || anotherInputHasFocus()) return;

            if (document.activeElement !== inputRef.current) setInputFocus();

            const value = (event.target as HTMLInputElement).value;

            switch (event.key) {
                case ' ':
                case 'Space':
                    checkSpecialKeywordForInput();
                    return;
                case 'NumpadEnter':
                case 'Enter':
                    if (isTouch) sendTouchChatValue(value);
                    else sendChatValue(value, event.shiftKey);
                    return;
                case 'Backspace':
                    if (value) {
                        const parts = value.split(' ');

                        if (parts[0] === chatModeIdWhisper && parts.length === 3 && parts[2] === '') {
                            setChatValue('');
                        }
                    }
                    return;
            }
        },
        [floodBlocked, inputRef, chatModeIdWhisper, isTouch, anotherInputHasFocus, setInputFocus, checkSpecialKeywordForInput, sendChatValue, sendTouchChatValue]
    );

    useUiEvent<RoomWidgetUpdateChatInputContentEvent>(RoomWidgetUpdateChatInputContentEvent.CHAT_INPUT_CONTENT, (event) => {
        switch (event.chatMode) {
            case RoomWidgetUpdateChatInputContentEvent.TEXT:
                setChatValue(event.userName);
                inputRef.current?.focus();
                return;
            case RoomWidgetUpdateChatInputContentEvent.WHISPER: {
                if (isTouch) {
                    setWhisperTarget(event.userName);
                    setTouchMode('whisper');
                    setChatValue('');
                    inputRef.current?.focus();
                    return;
                }

                setChatValue(`${chatModeIdWhisper} ${event.userName} `);
                return;
            }
            case RoomWidgetUpdateChatInputContentEvent.SHOUT:
                return;
        }
    });


    useEffect(() => {
        document.body.addEventListener('keydown', onKeyDownEvent);

        return () => {
            document.body.removeEventListener('keydown', onKeyDownEvent);
        };
    }, [onKeyDownEvent]);

    useEffect(() => {
        if (!inputRef.current?.parentElement) return;

        inputRef.current.parentElement.dataset.value = chatValue;
    }, [chatValue]);

    useEffect(() => {
        if (!isTouch) setTouchMode('say');
    }, [isTouch]);

    useEffect(() => {
        if (!roomSession) return;

        if (portalTarget && portalTarget.isConnected) return;

        let frame = 0;

        const locate = () => {
            const target = document.getElementById('toolbar-chat-input-container');

            if (target) {
                setPortalTarget(target);
                return;
            }

            frame = window.requestAnimationFrame(locate);
        };

        locate();

        return () => window.cancelAnimationFrame(frame);
    }, [roomSession, portalTarget]);

    if (!roomSession || roomSession.isSpectator || !portalTarget) return null;

    if (isTouch) {
        const whisperFigure = whisperTarget ? (roomSession.userDataManager?.getUserDataByName(whisperTarget)?.figure ?? '') : '';

        return createPortal(
            <div className="volt-touch-chat" data-chat-mode={touchMode}>
                <ChatInputTouchModeBarView
                    canWhisper={!!(selectedUsername || whisperTarget)}
                    mode={touchMode}
                    selectMode={selectTouchMode}
                    whisperFigure={whisperFigure}
                    whisperTarget={whisperTarget}
                />
                <div className="volt-touch-chat-bar">
                    <ChatInputStyleSelectorView chatStyleId={chatStyleId} chatStyleIds={selectableChatStyleIds} selectChatStyleId={updateChatStyleId} />
                    {!floodBlocked && (
                        <div className="volt-touch-chat-field">
                            <input
                                ref={inputRef}
                                autoComplete="off"
                                className="volt-touch-chat-input"
                                enterKeyHint="send"
                                maxLength={maxChatLength}
                                placeholder={LocalizeText('widgets.chatinput.default')}
                                type="text"
                                value={chatValue}
                                onChange={(event) => updateChatInput(event.target.value)}
                            />
                        </div>
                    )}
                    {floodBlocked && (
                        <div className="volt-touch-chat-field volt-touch-chat-flood">
                            {LocalizeText('chat.input.alert.flood', ['time'], [floodBlockedSeconds.toString()])}
                        </div>
                    )}
                    <ChatInputHabbiconSelectorView />
                    <button
                        className="volt-touch-chat-send"
                        disabled={floodBlocked}
                        type="button"
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() => sendTouchChatValue(chatValue)}
                    >
                        {localizeWithFallback('widgets.chatinput.button.send', 'Send')}
                    </button>
                </div>
            </div>,
            portalTarget
        );
    }

    return createPortal(
        // justify-start, not between: the style trigger overlaps the bubble's pointed
        // left cap via a negative margin. With justify-between, hiding an optional
        // trailing button (habbicons disabled) redistributes the slack between the
        // trigger and the bubble, exposing the cap and opening a gap.
        <div className="volt-chat-input-container swf-chat-input relative flex w-full items-center justify-start overflow-visible">
            <ChatInputStyleSelectorView chatStyleId={chatStyleId} chatStyleIds={selectableChatStyleIds} selectChatStyleId={updateChatStyleId} />
            {!floodBlocked && (
                <div className="flex-1 items-center input-sizer swf-chat-input-sizer" {...hoverRegionProps}>
                    <input
                        ref={inputRef}
                        className="swf-chat-input-field w-full border-none bg-transparent"
                        maxLength={maxChatLength}
                        placeholder={LocalizeText('widgets.chatinput.default')}
                        type="text"
                        value={chatValue}
                        onChange={(event) => updateChatInput(event.target.value)}
                        onMouseDown={(event) => setInputFocus()}
                    />
                </div>
            )}
            {floodBlocked && (
                <div className="swf-chat-flood flex min-w-0 flex-1 items-center" {...hoverRegionProps}>
                    <Text variant="danger" className="w-full truncate whitespace-nowrap text-[0.8rem] font-bold leading-none">
                        {LocalizeText('chat.input.alert.flood', ['time'], [floodBlockedSeconds.toString()])}
                    </Text>
                </div>
            )}
            {/* AIR builds `helpbutton` hidden and shows it only while the bubble or the button is hovered. */}
            {isHelpButtonVisible && (
                <button
                    aria-label={LocalizeText('chat.input.help')}
                    className="swf-chat-help-button"
                    type="button"
                    onClick={() => CreateLinkEvent('habbopages/chat/commands')}
                    {...helpButtonProps}
                />
            )}
            <ChatInputHabbiconSelectorView />
        </div>,
        portalTarget
    );
};
