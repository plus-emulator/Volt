export interface IChatEntry {
    id: number;
    webId: number;
    entityId: number;
    name: string;
    look?: string;
    message?: string;
    entityType?: number;
    style?: number;
    chatType?: number;
    imageUrl?: string;
    imageScale?: number;
    textSize?: import('../../components/room/widgets/chat-input/chatTextSize').ChatTextSize;
    hideUsername?: boolean;
    color?: string;
    roomId: number;
    timestamp: string;
    type: number;
}
