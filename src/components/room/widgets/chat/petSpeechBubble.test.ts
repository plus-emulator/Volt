import { describe, expect, it } from 'vitest';
import { ChatBubbleMessage } from '../../../../api/room/widgets/ChatBubbleMessage';
import { createChatLineQueue, reserveChatLine, settleChatLine, takeReadyChatLines } from '../../../../hooks/rooms/widgets/chatLineQueue';
import { NativeChatScroller } from './nativeChatScroller';
import { isExpiredPetSpeechBubble } from './petSpeechBubble';

describe('pet speech after a frame pause', () => {
    it('expires at six seconds while preserving other queued messages in order', () => {
        const queue = createChatLineQueue<ChatBubbleMessage>();
        const stale = new ChatBubbleMessage();
        stale.petSpeechReceivedAt = 0;
        const human = new ChatBubbleMessage();
        const recent = new ChatBubbleMessage();
        recent.petSpeechReceivedAt = 1;
        for (const message of [stale, human, recent]) {
            settleChatLine(queue, reserveChatLine(queue), message);
        }
        expect(isExpiredPetSpeechBubble(stale, 5999)).toBe(false);
        expect(takeReadyChatLines(queue).filter(message => !isExpiredPetSpeechBubble(message, 6000))).toEqual([human, recent]);
        expect(queue.pending.size).toBe(0);
    });

    it('removes a previously registered bubble before the resumed frame is laid out', () => {
        const scroller = new NativeChatScroller();
        scroller.resize(250, 1000);
        const old = new ChatBubbleMessage(1, 0, 42, 'Neigh', '', 'Lucas', { x: 500, y: 220 });
        old.width = 110;
        old.height = 24;
        old.petSpeechReceivedAt = 0;
        scroller.register(old, 0);
        const topBefore = old.top;
        scroller.removeChats(new Set([old]));
        scroller.advance(87500, [old]);
        expect(old.top).toBe(topBefore);
    });
});
