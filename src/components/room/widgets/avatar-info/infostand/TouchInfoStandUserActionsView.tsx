import { AvatarExpressionEnum, CreateLinkEvent, TradingOpenComposer } from '@volt/renderer';
import { FC } from 'react';
import {
    AvatarInfoUser,
    DispatchUiEvent,
    GetConfigurationValue,
    GetUserProfile,
    LocalizeText,
    localizeWithFallback,
    RoomWidgetUpdateChatInputContentEvent,
    SendMessageComposer
} from '../../../../../api';
import addFriendIcon from '../../../../../assets/images/friends/swf/ask_for_friend.png';
import tradeIcon from '../../../../../assets/images/friends/swf/friendlist_go_room.png';
import profileIcon from '../../../../../assets/images/friends/swf/open_homepage.png';
import whisperIcon from '../../../../../assets/images/friends/swf/start_chat.png';
import respectIcon from '../../../../../assets/images/navigator/air/icon-fav-yes.png';
import { useFriends, useRoom, useSessionInfo } from '../../../../../hooks';
import { TouchSheetButton } from './TouchInfoSheetView';

interface TouchInfoStandUserActionsViewProps {
    avatarInfo: AvatarInfoUser;
    onMore: () => void;
}

/** The black AIR buttons of the touch InfoStand; everything else stays in the context menu behind More. */
export const TouchInfoStandUserActionsView: FC<TouchInfoStandUserActionsViewProps> = ({ avatarInfo, onMore }) => {
    const { canRequestFriend = null } = useFriends();
    const { userRespectRemaining = 0, respectUser = null } = useSessionInfo();
    const { roomSession = null } = useRoom();
    const profile = () => GetUserProfile(avatarInfo.webID);

    if (avatarInfo.isOwnUser) {
        return (
            <div className="volt-touch-infosheet__actions">
                <TouchSheetButton onClick={() => CreateLinkEvent('avatar-editor/show')}>{LocalizeText('widget.memenu.myclothes')}</TouchSheetButton>
                <TouchSheetButton onClick={() => roomSession?.sendExpressionMessage(AvatarExpressionEnum.WAVE.ordinal)}>
                    {LocalizeText('widget.memenu.wave')}
                </TouchSheetButton>
                <TouchSheetButton icon={profileIcon} onClick={profile}>
                    {localizeWithFallback('infostand.button.profile', 'Profile')}
                </TouchSheetButton>
                <TouchSheetButton onClick={() => CreateLinkEvent('achievements/show')}>{localizeWithFallback('achievements.title', 'Achievements')}</TouchSheetButton>
                <TouchSheetButton onClick={onMore}>{localizeWithFallback('generic.more', 'More')}</TouchSheetButton>
            </div>
        );
    }

    const canTrade = avatarInfo.canTrade || GetConfigurationValue<boolean>('talent.track.citizenship.enabled', false);

    return (
        <div className="volt-touch-infosheet__actions">
            {canRequestFriend(avatarInfo.webID) && (
                <TouchSheetButton icon={addFriendIcon} onClick={() => CreateLinkEvent(`friends/request/${avatarInfo.webID}/${avatarInfo.name}`)}>
                    {LocalizeText('infostand.button.friend')}
                </TouchSheetButton>
            )}
            <TouchSheetButton
                icon={whisperIcon}
                onClick={() => DispatchUiEvent(new RoomWidgetUpdateChatInputContentEvent(RoomWidgetUpdateChatInputContentEvent.WHISPER, avatarInfo.name))}
            >
                {LocalizeText('infostand.button.whisper')}
            </TouchSheetButton>
            {canTrade && (
                <TouchSheetButton icon={tradeIcon} onClick={() => SendMessageComposer(new TradingOpenComposer(avatarInfo.roomIndex))}>
                    {LocalizeText('infostand.button.trade')}
                </TouchSheetButton>
            )}
            {userRespectRemaining > 0 && (
                <TouchSheetButton icon={respectIcon} onClick={() => respectUser(avatarInfo.webID)}>
                    {LocalizeText('infostand.button.respect', ['count'], [userRespectRemaining.toString()])}
                </TouchSheetButton>
            )}
            <TouchSheetButton icon={profileIcon} onClick={profile}>
                {localizeWithFallback('infostand.button.profile', 'Profile')}
            </TouchSheetButton>
            <TouchSheetButton onClick={onMore}>{localizeWithFallback('generic.more', 'More')}</TouchSheetButton>
        </div>
    );
};
