import { renderHook } from '@testing-library/react';
import { CreateLinkEvent, GetRoomEngine } from '@volt/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatInputActions } from './useChatInputActions';

const roomState = vi.hoisted(() => ({ roomSession: null as unknown }));

vi.mock('../useRoom', () => ({ useRoom: () => roomState }));
vi.mock('../../notification', () => ({ useNotification: () => ({ showVoltAlert: vi.fn(), showConfirm: vi.fn() }) }));
vi.mock('../../wired-tools', () => ({ useWiredToolsActions: () => ({ openMonitor: vi.fn() }) }));

const withChooserDisabled = (disabled: boolean) =>
    vi.mocked(GetRoomEngine).mockReturnValue({ activeRoomHasChooserDisabled: disabled } as unknown as ReturnType<typeof GetRoomEngine>);

const sendChat = (text: string) => renderHook(() => useChatInputActions()).result.current.sendChat(text, 0);

describe('useChatInputActions :chooser (AIR ChatInputWidgetHandler)', () => {
    beforeEach(() => {
        vi.mocked(CreateLinkEvent).mockClear();
        roomState.roomSession = { roomId: 1, controllerLevel: 0 };
    });

    afterEach(() => {
        vi.mocked(GetRoomEngine).mockRestore();
    });

    it('opens the user chooser when the room allows it', () => {
        withChooserDisabled(false);

        expect(sendChat(':chooser')).toBeNull();
        expect(CreateLinkEvent).toHaveBeenCalledWith('user-chooser/');
    });

    it('silently swallows :chooser for visitors without rights in a chooser-disabled room', () => {
        withChooserDisabled(true);

        expect(sendChat(':chooser')).toBeNull();
        expect(CreateLinkEvent).not.toHaveBeenCalled();
    });

    it('still opens the user chooser for rights holders in a chooser-disabled room', () => {
        withChooserDisabled(true);
        roomState.roomSession = { roomId: 1, controllerLevel: 1 };

        sendChat(':chooser');

        expect(CreateLinkEvent).toHaveBeenCalledWith('user-chooser/');
    });

    it('leaves :furni unaffected', () => {
        withChooserDisabled(true);

        sendChat(':furni');

        expect(CreateLinkEvent).toHaveBeenCalledWith('furni-chooser/');
    });
});
