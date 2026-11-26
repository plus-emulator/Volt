import { GetSessionDataManager, RoomDataParser } from '@volt/renderer';
import { FC, KeyboardEvent, MouseEvent } from 'react';
import { CreateRoomSession, DoorStateType, IsPhoneLayout, TryVisitRoom, useVoltLayout } from '../../../../api';
import { LayoutBadgeImageView, LayoutRoomThumbnailView } from '../../../../common';
import { NativeText } from '../../../../common/native-text/NativeText';
import { useDoorState, useNavigatorRoomInfoPopupStore } from '../../../../hooks';
import { NavigatorSearchResultItemInfoView } from './NavigatorSearchResultItemInfoView';
import { NavigatorUserCountView } from './NavigatorUserCountView';

export interface NavigatorSearchResultItemViewProps {
    roomData: RoomDataParser;
    thumbnail?: boolean;
    eventTitle?: boolean;
    stripe?: boolean;
}

export const NavigatorSearchResultItemView: FC<NavigatorSearchResultItemViewProps> = (props) => {
    const { roomData = null, thumbnail = false, eventTitle = false, stripe = false } = props;
    const { setSnapshot: setDoorData } = useDoorState();
    const isPhone = IsPhoneLayout(useVoltLayout());
    const title = eventTitle && roomData.roomAdName ? roomData.roomAdName : roomData.roomName;

    const doorClass = () => {
        if (roomData.doorMode === RoomDataParser.DOORBELL_STATE) return 'volt-navigator-air__door volt-navigator-air__door--doorbell';
        if (roomData.doorMode === RoomDataParser.PASSWORD_STATE) return 'volt-navigator-air__door volt-navigator-air__door--password';
        if (roomData.doorMode === RoomDataParser.INVISIBLE_STATE) return 'volt-navigator-air__door volt-navigator-air__door--invisible';

        return '';
    };

    const visitRoom = (event: MouseEvent) => {
        event.stopPropagation();
        if (roomData.ownerId !== GetSessionDataManager().userId) {
            if (roomData.habboGroupId !== 0) {
                TryVisitRoom(roomData.roomId);
                return;
            }

            switch (roomData.doorMode) {
                case RoomDataParser.DOORBELL_STATE:
                    setDoorData((prevValue) => {
                        const newValue = { ...prevValue };
                        newValue.roomInfo = roomData;
                        newValue.state = DoorStateType.START_DOORBELL;
                        return newValue;
                    });
                    return;
                case RoomDataParser.PASSWORD_STATE:
                    setDoorData((prevValue) => {
                        const newValue = { ...prevValue };
                        newValue.roomInfo = roomData;
                        newValue.state = DoorStateType.START_PASSWORD;
                        return newValue;
                    });
                    return;
            }
        }

        CreateRoomSession(roomData.roomId);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        visitRoom(event as unknown as MouseEvent);
    };

    const retargetPopup = (event: MouseEvent<HTMLElement>) => {
        useNavigatorRoomInfoPopupStore.getState().retargetIfVisible(roomData, thumbnail ? 'tile' : 'row', event.currentTarget.getBoundingClientRect());
    };

    if (isPhone)
        return (
            <div className="volt-navigator-air__phone-room">
                <button type="button" className="volt-navigator-air__phone-visit" aria-label={title} onClick={visitRoom}>
                    <LayoutRoomThumbnailView className="volt-navigator-air__phone-art" customUrl={roomData.officialRoomPicRef} roomId={roomData.roomId} />
                    <span className="volt-navigator-air__phone-details">
                        <strong>{title}</strong>
                        {roomData.showOwner && roomData.ownerName && <small>{roomData.ownerName}</small>}
                        <span className="volt-navigator-air__phone-status">
                            <NavigatorUserCountView userCount={roomData.userCount} maxUserCount={roomData.maxUserCount} />
                            {roomData.doorMode !== RoomDataParser.OPEN_STATE && <i className={doorClass()} />}
                            {roomData.habboGroupId > 0 && <i className="volt-navigator-air__group" />}
                        </span>
                    </span>
                </button>
                <NavigatorSearchResultItemInfoView roomData={roomData} thumbnail={thumbnail} />
            </div>
        );

    if (thumbnail)
        return (
            <div
                role="button"
                tabIndex={0}
                aria-label={title}
                className={`volt-navigator-air__tile${stripe ? ' is-stripe' : ''}`}
                onClick={visitRoom}
                onKeyDown={handleKeyDown}
                onMouseEnter={retargetPopup}
            >
                <LayoutRoomThumbnailView className="volt-navigator-air__tile-thumb" customUrl={roomData.officialRoomPicRef} roomId={roomData.roomId}>
                    <NavigatorUserCountView userCount={roomData.userCount} maxUserCount={roomData.maxUserCount} />
                    {roomData.doorMode !== RoomDataParser.OPEN_STATE && <i className={`volt-navigator-air__tile-door ${doorClass()}`} />}
                </LayoutRoomThumbnailView>
                {roomData.habboGroupId > 0 && (
                    <LayoutBadgeImageView badgeCode={roomData.groupBadgeCode} className="volt-navigator-air__tile-badge" isGroup={true} />
                )}
                <div className="volt-navigator-air__tile-name">
                    <NativeText text={title} textStyle="u_small" background={0xebe9df} maxWidth={92} nativeResolution />
                    <NavigatorSearchResultItemInfoView roomData={roomData} thumbnail={true} />
                </div>
            </div>
        );

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={title}
            className={`volt-navigator-air__row${stripe ? ' is-stripe' : ''}`}
            onClick={visitRoom}
            onKeyDown={handleKeyDown}
            onMouseEnter={retargetPopup}
        >
            <NavigatorUserCountView userCount={roomData.userCount} maxUserCount={roomData.maxUserCount} />
            <span className="volt-navigator-air__row-name">
                <NativeText text={title} textStyle="u_regular" background={stripe ? 0xffffff : 0xd6eeff} nativeResolution />
            </span>
            {roomData.doorMode !== RoomDataParser.OPEN_STATE && <i className={`volt-navigator-air__row-door ${doorClass()}`} />}
            {roomData.habboGroupId > 0 && <i className="volt-navigator-air__row-group volt-navigator-air__group" />}
            <NavigatorSearchResultItemInfoView roomData={roomData} />
        </div>
    );
};
