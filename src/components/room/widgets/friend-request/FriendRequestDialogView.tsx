import { RoomObjectCategory } from '@volt/renderer';
import { FC, useState } from 'react';
import { GetUserProfile, LocalizeText, MessengerRequest } from '../../../../api';
import { NativeText } from '../../../../common/native-text/NativeText';
import { ObjectLocationView } from '../object-location/ObjectLocationView';

// The instant_friend_request bubble fill: the bubble skin body multiplied by #fac919.
const BUBBLE_FILL = 0xb69111;
const WHITE = { color: 0xffffff };

// AIR FriendRequestDialog over the instant_friend_request layout.
export const FriendRequestDialogView: FC<{
    roomIndex: number;
    request: MessengerRequest;
    hideFriendRequest: (userId: number) => void;
    requestResponse: (requestId: number, flag: boolean) => void;
}> = (props) => {
    const { roomIndex = -1, request = null, hideFriendRequest = null, requestResponse = null } = props;
    // FriendRequestDialog.onProfile underlines the name while the pointer is over its region.
    const [isNameHovered, setIsNameHovered] = useState(false);

    return (
        <ObjectLocationView category={RoomObjectCategory.UNIT} objectId={roomIndex}>
            <div className="air-friend-request">
                <i className="air-friend-request__profile-icon" onClick={() => GetUserProfile(request.requesterUserId)} />
                <div
                    className="air-friend-request__text"
                    onClick={() => GetUserProfile(request.requesterUserId)}
                    onMouseEnter={() => setIsNameHovered(true)}
                    onMouseLeave={() => setIsNameHovered(false)}
                >
                    <NativeText
                        background={BUBBLE_FILL}
                        overrides={{ ...WHITE, underline: isNameHovered }}
                        text={LocalizeText('widget.friendrequest.from', ['username'], [request.name])}
                        maxWidth={142}
                        textStyle="u_bold"
                        width={142}
                    />
                </div>
                <div className="air-friend-request__decline" onClick={() => requestResponse(request.requesterUserId, false)}>
                    <NativeText background={BUBBLE_FILL} overrides={{ ...WHITE, size: 11, underline: true }} text={LocalizeText('widget.friendrequest.decline')} textStyle="u_regular" />
                </div>
                <button className="air-friend-request__accept" type="button" onClick={() => requestResponse(request.requesterUserId, true)}>
                    <i className="air-friend-request__accept-icon" />
                    <span className="air-friend-request__accept-label">
                        <NativeText transparent background={0xf3f3f3} overrides={{ size: 11 }} text={LocalizeText('widget.friendrequest.accept')} textStyle="button_shiny_bold" />
                    </span>
                </button>
                <div className="air-friend-request__close" onClick={() => hideFriendRequest(request.requesterUserId)} />
            </div>
        </ObjectLocationView>
    );
};
