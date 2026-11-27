import {
    AddLinkEventTracker,
    GetRoomEngine,
    GetSessionDataManager,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RoomEngineEvent,
    RoomEngineObjectEvent,
    RoomEnterEffect,
    RoomObjectCategory,
    RoomSessionDanceEvent
} from '@volt/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import {
    AvatarInfoFurni,
    AvatarInfoName,
    AvatarInfoPet,
    AvatarInfoRentableBot,
    AvatarInfoUser,
    GetConfigurationValue,
    IsTouchLayout,
    LocalizeText,
    RoomWidgetUpdateRentableBotChatEvent,
    useVoltLayout
} from '../../../../api';
import { Column } from '../../../../common';
import { useAvatarInfoWidget, useFurniPickupGuard, useMonsterPlantBreedingWidget, useVoltEvent, useRoom, useUiEvent } from '../../../../hooks';
import { NativeConfirmView } from '../../../notification-center/views/native/NativeConfirmView';
import { AvatarInfoBreedMonsterPlantsConfirmView } from './AvatarInfoBreedMonsterPlantsConfirmView';
import { AvatarInfoBreedPetView } from './AvatarInfoBreedPetView';
import { AvatarInfoBreedPetsResultView } from './AvatarInfoBreedPetsResultView';
import { AvatarInfoPetTrainingPanelView } from './AvatarInfoPetTrainingPanelView';
import { AvatarInfoRentableBotChatView } from './AvatarInfoRentableBotChatView';
import { AvatarInfoUseProductConfirmView } from './AvatarInfoUseProductConfirmView';
import { AvatarInfoUseProductView } from './AvatarInfoUseProductView';
import { InfoStandWidgetBotView } from './infostand/InfoStandWidgetBotView';
import { InfoStandWidgetFurniView } from './infostand/InfoStandWidgetFurniView';
import { InfoStandWidgetPetView } from './infostand/InfoStandWidgetPetView';
import { InfoStandWidgetRentableBotView } from './infostand/InfoStandWidgetRentableBotView';
import { InfoStandWidgetUserView } from './infostand/InfoStandWidgetUserView';
import { AvatarInfoWidgetAvatarView } from './menu/AvatarInfoWidgetAvatarView';
import { AvatarInfoWidgetBotView } from './menu/AvatarInfoWidgetBotView';
import { AvatarInfoWidgetDecorateView } from './menu/AvatarInfoWidgetDecorateView';
import { AvatarInfoWidgetNameView } from './menu/AvatarInfoWidgetNameView';
import { AvatarInfoWidgetOwnAvatarView } from './menu/AvatarInfoWidgetOwnAvatarView';
import { AvatarInfoWidgetOwnPetView } from './menu/AvatarInfoWidgetOwnPetView';
import { AvatarInfoWidgetPetView } from './menu/AvatarInfoWidgetPetView';
import { AvatarInfoWidgetRentableBotView } from './menu/AvatarInfoWidgetRentableBotView';

export const AvatarInfoWidgetView: FC<{}> = (props) => {
    const BLOCK_MENU_WINDOW_MS = 500;
    const BLOCK_ROTATE_WINDOW_MS = 500;
    const [isGameMode, setGameMode] = useState(false);
    const { pickupRoomObject } = useFurniPickupGuard();
    const [isDancing, setIsDancing] = useState(false);
    const isTouchLayout = IsTouchLayout(useVoltLayout());
    const [mobileUserDetailsOpen, setMobileUserDetailsOpen] = useState(false);
    // Touch: a tap only selects furni; its drawer opens after a long press on it.
    const [touchFurniSheet, setTouchFurniSheet] = useState<string>(null);
    const touchMenuRequestRef = useRef<{ roomIndex: number; until: number }>(null);
    const selectedUserIndexRef = useRef<number>(null);
    const [rentableBotChatEvent, setRentableBotChatEvent] = useState<RoomWidgetUpdateRentableBotChatEvent>(null);
    const {
        avatarInfo = null,
        setAvatarInfo = null,
        activeNameBubble = null,
        setActiveNameBubble = null,
        nameBubbles = [],
        removeNameBubble = null,
        productBubbles = [],
        confirmingProduct = null,
        updateConfirmingProduct = null,
        removeProductBubble = null,
        isDecorating = false,
        setIsDecorating = null
    } = useAvatarInfoWidget();
    const breeding = useMonsterPlantBreedingWidget();
    const { roomSession = null } = useRoom();

    // showBreedPetMenuForItems also drops an open use product confirmation.
    const requestBreedMenu = (petWebId: number) => {
        updateConfirmingProduct(null);
        breeding.requestBreedMenu(petWebId);
    };

    const updateAvatarClickControl = (updates: { suppressMenuUntil?: number; suppressRotateUntil?: number }) => {
        const globalScope = globalThis as any;

        if (!globalScope.__voltAvatarClickControl) {
            globalScope.__voltAvatarClickControl = {
                suppressMenuUntil: 0,
                suppressRotateUntil: 0
            };
        }

        Object.assign(globalScope.__voltAvatarClickControl, updates);
    };

    useVoltEvent<RoomEngineEvent>(RoomEngineEvent.NORMAL_MODE, (event) => {
        if (isGameMode) setGameMode(false);
    });

    useVoltEvent<RoomEngineEvent>(RoomEngineEvent.GAME_MODE, (event) => {
        if (!isGameMode) setGameMode(true);
    });

    useVoltEvent<RoomSessionDanceEvent>(RoomSessionDanceEvent.RSDE_DANCE, (event) => {
        if (event.roomIndex !== roomSession.ownRoomIndex) return;

        setIsDancing(event.danceId !== 0);
    });

    useUiEvent<RoomWidgetUpdateRentableBotChatEvent>(RoomWidgetUpdateRentableBotChatEvent.UPDATE_CHAT, (event) => setRentableBotChatEvent(event));

    useVoltEvent<RoomEngineObjectEvent>(RoomEngineObjectEvent.REQUEST_PICKUP, (event) => pickupRoomObject(event.objectId, event.category));

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'hide':
                        setAvatarInfo(null);
                        setActiveNameBubble(null);

                        if (roomSession) GetRoomEngine().clearSelectedAvatar(roomSession.roomId);
                        return;
                    case 'block-menu':
                        updateAvatarClickControl({ suppressMenuUntil: Date.now() + BLOCK_MENU_WINDOW_MS });
                        setAvatarInfo(null);
                        setActiveNameBubble(null);
                        return;
                    case 'block-rotate':
                        updateAvatarClickControl({ suppressRotateUntil: Date.now() + BLOCK_ROTATE_WINDOW_MS });
                        return;
                    case 'touch-furni':
                        setTouchFurniSheet(`${parts[2]}-${parts[3]}`);
                        return;
                    case 'touch-menu': {
                        const roomIndex = Number(parts[2]);

                        if (roomIndex === selectedUserIndexRef.current) setMobileUserDetailsOpen(true);
                        else touchMenuRequestRef.current = { roomIndex, until: Date.now() + 1500 };
                        return;
                    }
                }
            },
            eventUrlPrefix: 'avatar-info/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [roomSession, setActiveNameBubble, setAvatarInfo]);

    const selectedUserIndex = avatarInfo instanceof AvatarInfoUser && avatarInfo.type !== AvatarInfoUser.BOT ? avatarInfo.roomIndex : null;

    selectedUserIndexRef.current = selectedUserIndex;

    useEffect(() => {
        const request = touchMenuRequestRef.current;

        touchMenuRequestRef.current = null;
        setMobileUserDetailsOpen(selectedUserIndex !== null && request?.roomIndex === selectedUserIndex && request.until > Date.now());
    }, [selectedUserIndex]);

    const getTouchNameTag = () => {
        if (avatarInfo instanceof AvatarInfoUser) {
            return new AvatarInfoName(avatarInfo.roomIndex, RoomObjectCategory.UNIT, avatarInfo.webID, avatarInfo.name, avatarInfo.userType);
        }

        if (avatarInfo instanceof AvatarInfoFurni) return new AvatarInfoName(avatarInfo.id, avatarInfo.category, avatarInfo.id, avatarInfo.name, -1);

        return null;
    };

    const getMenuView = () => {
        if (!roomSession || isGameMode) return null;

        if (activeNameBubble) return <AvatarInfoWidgetNameView nameInfo={activeNameBubble} onClose={() => setActiveNameBubble(null)} />;

        if (avatarInfo) {
            switch (avatarInfo.type) {
                // AIR AvatarInfoWidget drops its view on RWFIUE_FURNI: furni actions live in the infostand, not in a bubble.
                case AvatarInfoFurni.FURNI:
                    return isTouchLayout ? <AvatarInfoWidgetNameView persistent nameInfo={getTouchNameTag()} onClose={() => {}} /> : null;
                case AvatarInfoUser.OWN_USER:
                case AvatarInfoUser.PEER: {
                    const info = avatarInfo as AvatarInfoUser;

                    if (isTouchLayout && !mobileUserDetailsOpen) {
                        if (info.isSpectatorMode) return null;

                        return <AvatarInfoWidgetNameView persistent nameInfo={getTouchNameTag()} onClose={() => {}} />;
                    }

                    if (GetConfigurationValue('user.tags.enabled')) GetSessionDataManager().getUserTags(info.roomIndex);

                    if (info.isSpectatorMode) return null;

                    if (info.isOwnUser) {
                        if (RoomEnterEffect.isRunning()) return null;

                        return (
                            <AvatarInfoWidgetOwnAvatarView
                                avatarInfo={info}
                                isDancing={isDancing}
                                setIsDecorating={setIsDecorating}
                                onClose={() => setAvatarInfo(null)}
                            />
                        );
                    }

                    return <AvatarInfoWidgetAvatarView avatarInfo={info} onClose={() => setAvatarInfo(null)} />;
                }
                case AvatarInfoPet.PET_INFO: {
                    const info = avatarInfo as AvatarInfoPet;

                    if (info.isOwner) return <AvatarInfoWidgetOwnPetView avatarInfo={info} onClose={() => setAvatarInfo(null)} onRequestBreed={requestBreedMenu} />;

                    return <AvatarInfoWidgetPetView avatarInfo={info} onClose={() => setAvatarInfo(null)} />;
                }
                case AvatarInfoRentableBot.RENTABLE_BOT: {
                    return <AvatarInfoWidgetRentableBotView avatarInfo={avatarInfo as AvatarInfoRentableBot} onClose={() => setAvatarInfo(null)} />;
                }
                case AvatarInfoUser.BOT:
                    return <AvatarInfoWidgetBotView avatarInfo={avatarInfo as AvatarInfoUser} onClose={() => setAvatarInfo(null)} />;
            }
        }

        return null;
    };

    const getInfostandView = () => {
        if (!avatarInfo) return null;

        switch (avatarInfo.type) {
            case AvatarInfoFurni.FURNI: {
                const furni = avatarInfo as AvatarInfoFurni;
                const closeFurni = () => {
                    setTouchFurniSheet(null);
                    setAvatarInfo(null);
                };

                if (isTouchLayout && touchFurniSheet !== `${furni.category}-${furni.id}`) return null;

                return <InfoStandWidgetFurniView avatarInfo={furni} onClose={closeFurni} />;
            }
            case AvatarInfoUser.OWN_USER:
            case AvatarInfoUser.PEER:
                return (
                    <InfoStandWidgetUserView
                        avatarInfo={avatarInfo as AvatarInfoUser}
                        setAvatarInfo={setAvatarInfo}
                        onClose={() => setAvatarInfo(null)}
                        onMore={() => setMobileUserDetailsOpen(true)}
                    />
                );
            case AvatarInfoUser.BOT:
                return <InfoStandWidgetBotView avatarInfo={avatarInfo as AvatarInfoUser} onClose={() => setAvatarInfo(null)} />;
            case AvatarInfoRentableBot.RENTABLE_BOT:
                return <InfoStandWidgetRentableBotView avatarInfo={avatarInfo as AvatarInfoRentableBot} onClose={() => setAvatarInfo(null)} />;
            case AvatarInfoPet.PET_INFO:
                return <InfoStandWidgetPetView avatarInfo={avatarInfo as AvatarInfoPet} onClose={() => setAvatarInfo(null)} />;
        }
    };

    return (
        <>
            {isDecorating && (
                <AvatarInfoWidgetDecorateView
                    roomIndex={roomSession.ownRoomIndex}
                    setIsDecorating={setIsDecorating}
                    userId={GetSessionDataManager().userId}
                    userName={GetSessionDataManager().userName}
                />
            )}
            {getMenuView()}
            {avatarInfo && (
                <Column alignItems="end" className="absolute right-[5px] bottom-[57px] pointer-events-none z-30 text-white">
                    {getInfostandView()}
                </Column>
            )}
            {nameBubbles.length > 0 &&
                nameBubbles.map((name, index) => <AvatarInfoWidgetNameView key={index} isFriendEntry={true} nameInfo={name} onClose={() => removeNameBubble(index)} />)}
            {productBubbles.length > 0 &&
                productBubbles.map((item, index) => {
                    return (
                        <AvatarInfoUseProductView
                            key={item.id}
                            item={item}
                            updateConfirmingProduct={updateConfirmingProduct}
                            onClose={() => removeProductBubble(index)}
                        />
                    );
                })}
            {breeding.breedBubbles.map((item) => (
                <AvatarInfoBreedPetView key={item.id} item={item} onBreed={breeding.chooseBreedTarget} onClose={() => breeding.removeBreedBubble(item)} />
            ))}
            {breeding.confirmation && (
                <AvatarInfoBreedMonsterPlantsConfirmView
                    confirmation={breeding.confirmation}
                    onAccept={breeding.acceptConfirmation}
                    onBreed={breeding.breed}
                    onCancel={breeding.cancelConfirmation}
                />
            )}
            {breeding.waiting && (
                <NativeConfirmView
                    cancelText={LocalizeText('generic.cancel')}
                    confirmText={LocalizeText('generic.ok')}
                    message={LocalizeText('breedpets.confirmation.notification.text')}
                    title={LocalizeText('breedpets.confirmation.notification.title')}
                    onCancel={breeding.cancelWaiting}
                    onConfirm={breeding.closeWaiting}
                />
            )}
            {breeding.result && <AvatarInfoBreedPetsResultView result={breeding.result} onClose={breeding.closeResult} />}
            {rentableBotChatEvent && <AvatarInfoRentableBotChatView chatEvent={rentableBotChatEvent} onClose={() => setRentableBotChatEvent(null)} />}
            {confirmingProduct && <AvatarInfoUseProductConfirmView item={confirmingProduct} onClose={() => updateConfirmingProduct(null)} />}
            <AvatarInfoPetTrainingPanelView />
        </>
    );
};
