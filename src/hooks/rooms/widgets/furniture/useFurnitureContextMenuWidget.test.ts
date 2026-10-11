import { act, cleanup, renderHook } from '@testing-library/react';
import { CreateLinkEvent, GroupFurniContextMenuInfoMessageEvent, MessageEvent } from '@volt/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFurnitureContextMenuWidget } from './useFurnitureContextMenuWidget';

const state = vi.hoisted(() => ({
    listeners: new Set<any>()
}));

vi.mock('@volt/renderer', () => {
    class MessageEvent {
        constructor(public callBack: (event: any) => void) {}
    }

    return {
        MessageEvent,
        GroupFurniContextMenuInfoMessageEvent: class extends MessageEvent {},
        CreateLinkEvent: vi.fn(),
        ContextMenuEnum: {},
        GetRoomEngine: () => ({}),
        RoomEngineTriggerWidgetEvent: {},
        RoomObjectCategory: { FLOOR: 10 },
        RoomObjectVariable: {},
        GetCommunication: () => ({
            registerMessageEvent: (event: any) => state.listeners.add(event),
            removeMessageEvent: (event: any) => state.listeners.delete(event)
        })
    };
});

vi.mock('../../../../api', () => ({
    IsOwnerOfFurniture: () => false,
    TryJoinGroup: vi.fn(),
    TryVisitRoom: vi.fn()
}));

vi.mock('../../../events', async () => ({
    useMessageEvent: (await import('../../../events/useMessageEvent')).useMessageEvent,
    useVoltEvent: () => undefined
}));

vi.mock('../../useRoom', () => ({ useRoom: () => ({ roomSession: { roomId: 1 } }) }));

const dispatch = (type: typeof MessageEvent, parser: unknown) => {
    act(() => {
        for (const listener of [...state.listeners]) {
            if (listener.constructor === type) listener.callBack({ getParser: () => parser });
        }
    });
};

beforeEach(() => vi.mocked(CreateLinkEvent).mockClear());

afterEach(() => {
    cleanup();
    state.listeners.clear();
});

describe('group furni context menu', () => {
    it('opens the forum of the group through groupforum/<group id> and closes, like GuildFurnitureContextMenuView', () => {
        const { result } = renderHook(() => useFurnitureContextMenuWidget());

        dispatch(GroupFurniContextMenuInfoMessageEvent, {
            objectId: 12,
            guildId: 34,
            guildName: 'Group',
            guildHomeRoomId: 56,
            userIsMember: true,
            guildHasReadableForum: true
        });
        expect(result.current.objectId).toBe(12);

        act(() => result.current.processAction('open_forum'));

        expect(CreateLinkEvent).toHaveBeenCalledWith('groupforum/34');
        expect(result.current.objectId).toBe(-1);
        expect(result.current.mode).toBeNull();
    });
});
