import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GroupInformationComposer, GroupInformationEvent, MessageEvent } from '@volt/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InfoStandWidgetFurniView } from './InfoStandWidgetFurniView';

const state = vi.hoisted(() => ({
    listeners: new Set<any>(),
    send: vi.fn(),
    groupInfo: vi.fn(),
    roomSession: { roomId: 1 },
    pickup: { pickupRoomObject: () => undefined },
    wiredTools: { openInspectionForFurni: () => undefined, showInspectButton: false }
}));

vi.mock('@volt/renderer', () => {
    class MessageEvent {
        constructor(public callBack: (event: any) => void) {}
    }
    class GroupInformationComposer {
        constructor(
            public groupId: number,
            public openWindow: boolean
        ) {}
    }

    return {
        MessageEvent,
        GroupInformationComposer,
        GroupInformationEvent: class extends MessageEvent {},
        FurnitureFloorUpdateEvent: class extends MessageEvent {},
        NowPlayingEvent: { NPE_SONG_CHANGED: 'NPE_SONG_CHANGED' },
        SongInfoReceivedEvent: { SIR_TRAX_SONG_INFO_RECEIVED: 'SIR_TRAX_SONG_INFO_RECEIVED' },
        GetRoomEngine: () => ({ getRoomObject: () => null }),
        GetSoundManager: () => ({ musicController: { getSongInfo: () => null, getRoomItemPlaylist: () => null } }),
        RoomControllerLevel: { GUEST: 1, MODERATOR: 4, GUILD_ADMIN: 3 },
        RoomObjectCategory: { FLOOR: 10, WALL: 20 },
        RoomObjectOperationType: {},
        RoomObjectVariable: {},
        RoomWidgetEnumItemExtradataParameter: { BRANDING_OPTIONS: 'RWEIEP_BRANDING_OPTIONS' },
        RoomWidgetFurniInfoUsagePolicyEnum: { EVERYBODY: 2, CONTROLLER: 1 },
        CrackableDataType: class {},
        CreateLinkEvent: vi.fn(),
        RoomRemoveBackgroundComposer: class {},
        SetObjectDataMessageComposer: class {},
        UpdateFurniturePositionComposer: class {},
        GetSessionDataManager: () => ({ getPermissionsSnapshot: () => new Map() }),
        GetCommunication: () => ({
            registerMessageEvent: (event: any) => state.listeners.add(event),
            removeMessageEvent: (event: any) => state.listeners.delete(event)
        })
    };
});

vi.mock('../../../../../api', () => ({
    GetConfigurationValue: (_key: string, value: unknown) => value,
    GetGroupInformation: (groupId: number) => state.groupInfo(groupId),
    isSafeExternalUrl: () => false,
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    SendMessageComposer: (composer: unknown) => state.send(composer)
}));

vi.mock('../../../../../common', () => ({
    Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    Column: ({ children }: any) => <div>{children}</div>,
    Flex: ({ children }: any) => <div>{children}</div>,
    LayoutBadgeImageView: ({ badgeCode }: any) => <img alt={badgeCode} />,
    LayoutCurrencyIcon: () => null,
    LayoutLimitedEditionCompactPlateView: () => null,
    LayoutRarityLevelView: () => null,
    LayoutRoomObjectImageView: () => null,
    PIXEL_ART_RENDERING: 'pixelated',
    Text: ({ children }: any) => <span>{children}</span>,
    UserProfileIconView: () => null
}));

vi.mock('../../../../../hooks', async () => ({
    useFurniPickupGuard: () => state.pickup,
    useHasPermission: () => false,
    useMessageEvent: (await import('../../../../../hooks/events/useMessageEvent')).useMessageEvent,
    useRoom: () => ({ roomSession: state.roomSession }),
    useVoltEvent: () => undefined,
    useWiredTools: () => state.wiredTools
}));

vi.mock('../../../../../layout', () => ({ VoltInput: () => null }));
vi.mock('./ImagePositionEditorView', () => ({ ImagePositionEditorView: () => null }));

const dispatch = (type: typeof MessageEvent, parser: unknown) => {
    act(() => {
        for (const listener of [...state.listeners]) {
            if (listener.constructor === type) listener.callBack({ getParser: () => parser });
        }
    });
};

// The group forum terminal: a floor furni whose stuff data names group 17.
const forumTerminal = {
    id: 5,
    category: 10,
    name: 'Group Forum',
    groupId: 17,
    ownerId: 0,
    stuffData: { isUnique: false, rarityLevel: -1 },
    roomControllerLevel: 0,
    purchaseOfferId: -1,
    rentOfferId: -1,
    expiration: -1
};

beforeEach(() => {
    state.send.mockClear();
    state.groupInfo.mockClear();
});

afterEach(() => {
    cleanup();
    state.listeners.clear();
});

describe('furni infostand group details', () => {
    it('asks for the group details and shows the badge and name they bring, like InfoStandWidgetHandler', () => {
        render(<InfoStandWidgetFurniView avatarInfo={forumTerminal as any} onClose={vi.fn()} />);

        expect(state.send).toHaveBeenCalledWith(new GroupInformationComposer(17, false));
        expect(screen.queryByRole('img')).toBeNull();

        dispatch(GroupInformationEvent, { id: 99, badge: 'b-other', title: 'Other group' });
        expect(screen.queryByText('Other group')).toBeNull();

        dispatch(GroupInformationEvent, { id: 17, badge: 'b0503Xs09114', title: 'Forum group', flag: true });
        expect(screen.getByRole('img', { name: 'b0503Xs09114' })).toBeInTheDocument();
        expect(screen.getByText('Forum group')).toBeInTheDocument();
    });

    it('opens the group details on a click on the group', () => {
        render(<InfoStandWidgetFurniView avatarInfo={forumTerminal as any} onClose={vi.fn()} />);

        dispatch(GroupInformationEvent, { id: 17, badge: 'b0503Xs09114', title: 'Forum group', flag: false });
        fireEvent.click(screen.getByText('Forum group'));

        expect(state.groupInfo).toHaveBeenCalledWith(17);
    });
});
