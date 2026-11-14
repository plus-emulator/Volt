import type { ChatBubbleMessage } from '../../../../api/room/widgets/ChatBubbleMessage';

export const PET_SPEECH_BUBBLE_MAX_AGE_MS = 6000;

export const isExpiredPetSpeechBubble = (chat: ChatBubbleMessage, now: number): boolean =>
    chat.petSpeechReceivedAt !== undefined && now - chat.petSpeechReceivedAt >= PET_SPEECH_BUBBLE_MAX_AGE_MS;
