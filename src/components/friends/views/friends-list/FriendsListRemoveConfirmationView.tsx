import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { FriendsDialogBorderView, FriendsDialogButtonView, FriendsDialogFrameView, FriendsDialogSnapshot, usePhoneDialogSize } from './FriendsListRoomInviteView';

interface FriendsRemoveConfirmationViewProps {
    snapshot: FriendsDialogSnapshot;
    removeSelectedFriends: (ids: number[]) => void;
    onCloseClick: () => void;
}

export const FriendsRemoveConfirmationView: FC<FriendsRemoveConfirmationViewProps> = ({ snapshot, removeSelectedFriends, onCloseClick }) => {
    const phone = usePhoneDialogSize('remove');

    return <FriendsDialogFrameView kind="remove" size={phone ?? undefined} title={LocalizeText('friendlist.removefriendconfirm.title')}
        initialPosition={snapshot.initialPosition} onCloseClick={onCloseClick}>
        <FriendsDialogBorderView width={phone ? phone.width - 12 : 150} height={phone ? 150 : 143} />
        <div className="volt-friends-remove-confirmation-text">{snapshot.caption}</div>
        <div className="friends-dialog-actions">
            <FriendsDialogButtonView thick caption={LocalizeText('generic.ok')} width={phone?.buttonWidth} height={phone ? 44 : undefined} onClick={() => removeSelectedFriends(snapshot.ids)} />
            <FriendsDialogButtonView caption={LocalizeText('generic.cancel')} width={phone?.buttonWidth} height={phone ? 44 : undefined} onClick={onCloseClick} />
        </div>
    </FriendsDialogFrameView>;
};
