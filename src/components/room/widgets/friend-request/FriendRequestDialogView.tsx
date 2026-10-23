import { RoomObjectCategory } from '@volt/renderer';
import { FC } from 'react';
import { GetUserProfile, LocalizeText, MessengerRequest } from '../../../../api';
import { ObjectLocationView } from '../object-location/ObjectLocationView';

// AIR FriendRequestDialog over the instant_friend_request layout.
export const FriendRequestDialogView: FC<{
    roomIndex: number;
    request: MessengerRequest;
    hideFriendRequest: (userId: number) => void;
    requestResponse: (requestId: number, flag: boolean) => void;
}> = (props) => {
    const { roomIndex = -1, request = null, hideFriendRequest = null, requestResponse = null } = props;

    return (
        <ObjectLocationView category={RoomObjectCategory.UNIT} objectId={roomIndex}>
            <div className="air-friend-request">
                <i className="air-friend-request__profile-icon" onClick={() => GetUserProfile(request.requesterUserId)} />
                <div className="air-friend-request__text" onClick={() => GetUserProfile(request.requesterUserId)}>
                    {LocalizeText('widget.friendrequest.from', ['username'], [request.name])}
                </div>
                <div className="air-friend-request__decline" onClick={() => requestResponse(request.requesterUserId, false)}>
                    {LocalizeText('widget.friendrequest.decline')}
                </div>
                <button className="air-friend-request__accept" type="button" onClick={() => requestResponse(request.requesterUserId, true)}>
                    <i className="air-friend-request__accept-icon" />
                    <span className="air-friend-request__accept-label">{LocalizeText('widget.friendrequest.accept')}</span>
                </button>
                <div className="air-friend-request__close" onClick={() => hideFriendRequest(request.requesterUserId)} />
            </div>
        </ObjectLocationView>
    );
};
