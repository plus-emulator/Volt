import { FC, PointerEvent } from 'react';
import { localizeWithFallback } from '../../../../api';
import { LayoutAvatarImageView } from '../../../../common/layout/LayoutAvatarImageView';

export type TouchChatMode = 'say' | 'shout' | 'whisper';

interface ChatInputTouchModeBarViewProps {
    mode: TouchChatMode;
    whisperTarget: string;
    whisperFigure: string;
    canWhisper: boolean;
    selectMode: (mode: TouchChatMode) => void;
}

// Keeps the chat field focused, so the on-screen keyboard stays open while a mode is picked.
const keepFocus = (event: PointerEvent) => event.preventDefault();

export const ChatInputTouchModeBarView: FC<ChatInputTouchModeBarViewProps> = (props) => {
    const { mode, whisperTarget, whisperFigure, canWhisper, selectMode } = props;
    const modes: { id: TouchChatMode; label: string; disabled?: boolean }[] = [
        { id: 'say', label: localizeWithFallback('widgets.chatinput.button.say', 'Say') },
        { id: 'shout', label: localizeWithFallback('widgets.chatinput.button.shout', 'Shout') },
        { id: 'whisper', label: localizeWithFallback('widgets.chatinput.button.whisper', 'Whisper'), disabled: !canWhisper }
    ];

    return (
        <div className="volt-touch-chat-modes">
            <div className="volt-touch-chat-mode-group" role="radiogroup">
                {modes.map((item) => (
                    <button
                        key={item.id}
                        aria-checked={mode === item.id}
                        className={`volt-touch-chat-mode${mode === item.id ? ' is-selected' : ''}`}
                        disabled={item.disabled}
                        role="radio"
                        type="button"
                        onPointerDown={keepFocus}
                        onClick={() => selectMode(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
            {mode === 'whisper' && whisperTarget && (
                <button
                    aria-label={localizeWithFallback('widgets.chatinput.button.say', 'Say')}
                    className="volt-touch-chat-target"
                    type="button"
                    onPointerDown={keepFocus}
                    onClick={() => selectMode('say')}
                >
                    {whisperFigure && <LayoutAvatarImageView className="volt-touch-chat-target-face" figure={whisperFigure} headOnly compactHead compactHeadSize={28} compactHeadPadding={0} direction={2} />}
                    <span className="volt-touch-chat-target-name">{whisperTarget}</span>
                    <span aria-hidden="true" className="volt-touch-chat-target-close" />
                </button>
            )}
        </div>
    );
};
