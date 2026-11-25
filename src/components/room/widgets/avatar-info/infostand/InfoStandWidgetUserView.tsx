import {
    CreateLinkEvent,
    GetSessionDataManager,
    RelationshipStatusInfoEvent,
    RelationshipStatusInfoMessageParser,
    RoomSessionFavoriteGroupUpdateEvent,
    RoomSessionUserBadgesEvent,
    RoomSessionUserFigureUpdateEvent,
    UserRelationshipsComposer
} from '@volt/renderer';
import React, { Dispatch, FC, FocusEvent, KeyboardEvent, SetStateAction, useCallback, useEffect, useState } from 'react';
import {
    AvatarInfoUser,
    CloneObject,
    GetConfigurationValue,
    GetGroupInformation,
    GetUserProfile,
    IsTouchLayout,
    LocalizeText,
    localizeWithFallback,
    SendMessageComposer,
    useVoltLayout
} from '../../../../../api';
import homeIcon from '../../../../../assets/images/infostand/home-icon.png';
import pencilIcon from '../../../../../assets/images/infostand/pencil-icon.png';
import { Column, Flex, LayoutAvatarImageView, LayoutBadgeImageView, Text, UserIdentityView } from '../../../../../common';
import { useMessageEvent, useVoltEvent, useRoom } from '../../../../../hooks';
import { InfoStandAvatarView } from './InfoStandAvatarView';
import { InfoStandBadgeSlotView } from './InfoStandBadgeSlotView';
import { InfoStandWidgetUserRelationshipsView } from './InfoStandWidgetUserRelationshipsView';
import { InfoStandWidgetUserTagsView } from './InfoStandWidgetUserTagsView';
import { TouchInfoSheetView } from './TouchInfoSheetView';
import { TouchInfoStandUserActionsView } from './TouchInfoStandUserActionsView';

interface InfoStandWidgetUserViewProps {
    avatarInfo: AvatarInfoUser;
    setAvatarInfo: Dispatch<SetStateAction<AvatarInfoUser>>;
    onClose: () => void;
    /** Touch layouts: opens the full context menu behind the More button. */
    onMore?: () => void;
}

export const InfoStandWidgetUserView: FC<InfoStandWidgetUserViewProps> = (props) => {
    const { avatarInfo = null, setAvatarInfo = null, onClose = null, onMore = null } = props;
    const isTouch = IsTouchLayout(useVoltLayout());
    const [motto, setMotto] = useState<string>(null);
    const [isEditingMotto, setIsEditingMotto] = useState(false);
    const [relationships, setRelationships] = useState<RelationshipStatusInfoMessageParser>(null);
    const { roomSession = null } = useRoom();

    const handleProfileClick = useCallback(() => {
        GetUserProfile(avatarInfo.webID);
    }, [avatarInfo.webID]);

    const saveMotto = (motto: string) => {
        if (!isEditingMotto || motto.length > GetConfigurationValue<number>('motto.max.length', 38) || !roomSession) return;

        roomSession.sendMottoMessage(motto);
        setIsEditingMotto(false);
    };

    const onMottoBlur = (event: FocusEvent<HTMLInputElement>) => saveMotto(event.target.value);

    const onMottoKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();

        switch (event.key) {
            case 'Enter':
                saveMotto((event.target as HTMLInputElement).value);
                return;
        }
    };

    useVoltEvent<RoomSessionUserBadgesEvent>(RoomSessionUserBadgesEvent.RSUBE_BADGES, (event) => {
        if (!avatarInfo || avatarInfo.webID !== event.userId) return;

        // Deduplicate badges from server
        const seen = new Set<string>();
        const dedupedBadges = event.badges.map((code) => {
            if (!code || seen.has(code)) return '';
            seen.add(code);
            return code;
        });

        const oldBadges = avatarInfo.badges.join('');

        if (oldBadges === dedupedBadges.join('')) return;

        setAvatarInfo((prevValue) => {
            if (!prevValue) return prevValue;

            const newValue = CloneObject(prevValue);
            newValue.badges = dedupedBadges;
            return newValue;
        });
    });

    useVoltEvent<RoomSessionUserFigureUpdateEvent>(RoomSessionUserFigureUpdateEvent.USER_FIGURE, (event) => {
        if (!avatarInfo || avatarInfo.roomIndex !== event.roomIndex) return;

        setAvatarInfo((prevValue) => {
            if (!prevValue) return prevValue;

            const newValue = CloneObject(prevValue);
            newValue.figure = event.figure;
            newValue.motto = event.customInfo;
            newValue.achievementScore = event.activityPoints;
            newValue.badgesRank = event.badgesRank;
            return newValue;
        });
    });

    useVoltEvent<RoomSessionFavoriteGroupUpdateEvent>(RoomSessionFavoriteGroupUpdateEvent.FAVOURITE_GROUP_UPDATE, (event) => {
        if (!avatarInfo || avatarInfo.roomIndex !== event.roomIndex) return;

        setAvatarInfo((prevValue) => {
            if (!prevValue) return prevValue;

            const newValue = CloneObject(prevValue);
            const clearGroup = event.status === -1 || event.habboGroupId <= 0;

            newValue.groupId = clearGroup ? -1 : event.habboGroupId;
            newValue.groupName = clearGroup ? null : event.habboGroupName;
            newValue.groupBadgeId = clearGroup ? null : GetSessionDataManager().getGroupBadge(event.habboGroupId);
            return newValue;
        });
    });

    useMessageEvent<RelationshipStatusInfoEvent>(RelationshipStatusInfoEvent, (event) => {
        const parser = event.getParser();

        if (!avatarInfo || avatarInfo.webID !== parser.userId) return;

        setRelationships(parser);
    });

    useEffect(() => {
        setIsEditingMotto(false);
        setMotto(avatarInfo.motto);

        SendMessageComposer(new UserRelationshipsComposer(avatarInfo.webID));

        return () => {
            setRelationships(null);
        };
    }, [avatarInfo]);

    if (!avatarInfo) return null;

    const badgesRank = avatarInfo.badgesRank;
    const isOwnUser = avatarInfo.type === AvatarInfoUser.OWN_USER;
    const mottoMaxLength = GetConfigurationValue<number>('motto.max.length', 38);
    const showRelationships = GetConfigurationValue<boolean>('relationship.status.enabled', true);
    const showAchievementScore = GetConfigurationValue<boolean>('activity.point.display.enabled', true);

    if (isTouch) {
        const touchBadges = avatarInfo.badges.filter((code) => !!code).slice(0, 4);

        return (
            <TouchInfoSheetView className="volt-touch-infosheet--user" title={avatarInfo.name} onClose={onClose}>
                <div className="volt-touch-infosheet__summary">
                    <button type="button" className="volt-touch-infosheet__figure" aria-label={avatarInfo.name} onClick={handleProfileClick}>
                        <LayoutAvatarImageView nativeCroppedHead trimmed direction={4} figure={avatarInfo.figure} scale={2} />
                    </button>
                    <div className="volt-touch-infosheet__info">
                        <div className="volt-touch-infosheet__name">{avatarInfo.name}</div>
                        {isOwnUser && isEditingMotto ? (
                            <input
                                autoFocus={true}
                                className="volt-touch-infosheet__motto-input"
                                maxLength={mottoMaxLength}
                                type="text"
                                value={motto ?? ''}
                                onBlur={onMottoBlur}
                                onChange={(event) => setMotto(event.target.value)}
                                onKeyDown={onMottoKeyDown}
                            />
                        ) : (
                            (motto || isOwnUser) && (
                                <div
                                    className={`volt-touch-infosheet__motto ${motto ? '' : 'is-placeholder'}`}
                                    onClick={isOwnUser ? () => setIsEditingMotto(true) : undefined}
                                >
                                    {motto || LocalizeText('infostand.motto.change')}
                                </div>
                            )
                        )}
                        {(touchBadges.length > 0 || avatarInfo.groupId > 0) && (
                            <div className="volt-touch-infosheet__badges">
                                {touchBadges.map((code) => (
                                    <div key={code} className="volt-touch-infosheet__badge">
                                        <LayoutBadgeImageView badgeCode={code} showInfo={true} />
                                    </div>
                                ))}
                                {avatarInfo.groupId > 0 && touchBadges.length < 4 && (
                                    <div className="volt-touch-infosheet__badge" onClick={() => GetGroupInformation(avatarInfo.groupId)}>
                                        <LayoutBadgeImageView badgeCode={avatarInfo.groupBadgeId} customTitle={avatarInfo.groupName} isGroup={true} showInfo={true} />
                                    </div>
                                )}
                            </div>
                        )}
                        {showAchievementScore && (
                            <div className="volt-touch-infosheet__meta">
                                {LocalizeText('infostand.text.achievement_score')} {avatarInfo.achievementScore}
                            </div>
                        )}
                    </div>
                </div>
                <TouchInfoStandUserActionsView avatarInfo={avatarInfo} onMore={onMore ?? onClose} />
            </TouchInfoSheetView>
        );
    }

    return (
        <>
            <div className="volt-infostand pointer-events-auto z-30">
                <button type="button" className="volt-infostand__close" aria-label="Close" onClick={onClose} />
                <div className="volt-infostand__header">
                    <button
                        type="button"
                        className="volt-infostand__home"
                        aria-label={LocalizeText('infostand.profile.link.tooltip')}
                        onClick={handleProfileClick}
                    >
                        <img src={homeIcon} alt="" draggable={false} />
                    </button>
                    <button type="button" className="volt-infostand__profile-link" onClick={handleProfileClick}>
                        <UserIdentityView
                            className="volt-infostand__identity"
                            nameClassName="text-white"
                            username={avatarInfo.name}
                        />
                    </button>
                </div>
                <div className="volt-infostand__rule" />
                <div className="volt-infostand__figure-row">
                    <div className="volt-infostand__avatar-well" onClick={handleProfileClick}>
                        <InfoStandAvatarView direction={4} figure={avatarInfo.figure} top={24} left={17} />
                    </div>
                    <div className="volt-infostand__badges">
                        {(() => {
                            const maxSlots = GetConfigurationValue<number>('user.badges.max.slots', 5);
                            const showGroup = maxSlots <= 5;
                            const items: React.ReactNode[] = [];
                            items.push(<InfoStandBadgeSlotView key={0} slotIndex={0} badgeCode={avatarInfo.badges[0]} isOwnUser={isOwnUser} />);
                            if (showGroup) {
                                items.push(
                                    <Flex
                                        key="group"
                                        center
                                        className="relative h-[42px] w-[42px] bg-no-repeat bg-center"
                                        pointer={avatarInfo.groupId > 0}
                                        onClick={() => GetGroupInformation(avatarInfo.groupId)}
                                    >
                                        {avatarInfo.groupId > 0 && (
                                            <LayoutBadgeImageView
                                                badgeCode={avatarInfo.groupBadgeId}
                                                customTitle={avatarInfo.groupName}
                                                isGroup={true}
                                                showInfo={true}
                                            />
                                        )}
                                    </Flex>
                                );
                            } else {
                                items.push(<InfoStandBadgeSlotView key="slot1" slotIndex={1} badgeCode={avatarInfo.badges[1]} isOwnUser={isOwnUser} />);
                            }
                            const startIdx = showGroup ? 1 : 2;
                            for (let i = startIdx; i < maxSlots; i++) {
                                items.push(<InfoStandBadgeSlotView key={i} slotIndex={i} badgeCode={avatarInfo.badges[i]} isOwnUser={isOwnUser} />);
                            }
                            return items;
                        })()}
                    </div>
                </div>
                <div className="volt-infostand__rule" />
                <div className="volt-infostand__motto volt-infostand__motto--box">
                    {isOwnUser && <img src={pencilIcon} alt="" className="volt-infostand__pen" />}
                    {!isOwnUser && (
                        <Text fullWidth pointer textBreak wrap className="volt-infostand__motto-text" variant="white">
                            {motto}
                        </Text>
                    )}
                    {isOwnUser && !isEditingMotto && (
                        <Text
                            fullWidth
                            pointer
                            textBreak
                            wrap
                            className={`volt-infostand__motto-text ${motto ? '' : 'is-placeholder'}`}
                            variant="white"
                            onClick={() => setIsEditingMotto(true)}
                        >
                            {motto || LocalizeText('infostand.motto.change')} 
                        </Text>
                    )}
                    {isOwnUser && isEditingMotto && (
                        <>
                            <input
                                autoFocus={true}
                                className="motto-input"
                                maxLength={mottoMaxLength}
                                type="text"
                                value={motto}
                                onBlur={onMottoBlur}
                                onChange={(event) => setMotto(event.target.value)}
                                onKeyDown={onMottoKeyDown}
                            />
                            <span className="volt-infostand__motto-count">
                                {motto.length}/{mottoMaxLength}
                            </span>
                        </>
                    )}
                </div>
                {badgesRank >= 0 && (
                    <>
                        <div className="volt-infostand__rule" />
                        <div className="volt-infostand__score volt-infostand__score--rank" onClick={() => CreateLinkEvent('badge_leaderboard/0/-1/0')}>{localizeWithFallback('infostand.text.badges_rank', `Badge rank: #${badgesRank}`, ['rank'], [`#${badgesRank}`])}</div>
                    </>
                )}
                {showAchievementScore && (
                    <>
                        <div className="volt-infostand__rule" />
                        {isOwnUser ? (
                            <button
                                type="button"
                                className="volt-infostand__score volt-infostand__score-link"
                                title={localizeWithFallback('achievements.title', 'Achievements')}
                                onClick={() => CreateLinkEvent('achievements/show')}
                            >
                                {LocalizeText('infostand.text.achievement_score')}
                            </button>
                        ) : (
                            <div className="volt-infostand__score">{LocalizeText('infostand.text.achievement_score')}</div>
                        )}
                        <div className="volt-infostand__score">{avatarInfo.achievementScore}</div>
                    </>
                )}
                {avatarInfo.carryItem > 0 && (
                    <>
                        <div className="volt-infostand__rule" />
                        <div className="volt-infostand__carry">
                            {LocalizeText('infostand.text.handitem', ['item'], [LocalizeText('handitem' + avatarInfo.carryItem)])}
                        </div>
                    </>
                )}
                <div className="volt-infostand__rule" />
                {showRelationships && (
                    <div className="volt-infostand__relationships">
                        <InfoStandWidgetUserRelationshipsView relationships={relationships} />
                    </div>
                )}
                {GetConfigurationValue('user.tags.enabled') && (
                    <Column className="mt-1" gap={1}>
                        <InfoStandWidgetUserTagsView tags={GetSessionDataManager().tags} />
                    </Column>
                )}
            </div>
        </>
    );
};
