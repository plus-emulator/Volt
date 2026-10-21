import { RelationshipStatusEnum, RelationshipStatusInfo } from '@volt/renderer';
import { FC } from 'react';
import { GetUserProfile, LocalizeText, localizeWithFallback } from '../../../../../api';

interface InfoStandWidgetUserRelationshipsRelationshipItemViewProps {
    type: number;
    relationship: RelationshipStatusInfo;
}

export const InfoStandWidgetUserRelationshipsRelationshipItemView: FC<InfoStandWidgetUserRelationshipsRelationshipItemViewProps> = (props) => {
    const { type = -1, relationship = null } = props;

    if (!relationship) return null;

    const relationshipName = RelationshipStatusEnum.RELATIONSHIP_NAMES[type].toLocaleLowerCase();

    return (
        <div className="volt-infostand__relationship">
            <span className="volt-infostand__relationship-icon">
                <i className={`volt-friends-spritesheet icon-${relationshipName}`} />
            </span>
            <span className="volt-infostand__relationship-name" onClick={(event) => GetUserProfile(relationship.randomFriendId)}>
                {relationship.randomFriendName}
            </span>
            {relationship.friendCount > 1 && (
                <span>
                    {' ' +
                        localizeWithFallback(
                            `infostand.relstatus.${relationshipName}.others`,
                            LocalizeText(`extendedprofile.relstatus.others.${relationshipName}`, ['count'], [(relationship.friendCount - 1).toString()]),
                            ['amount'],
                            [(relationship.friendCount - 1).toString()]
                        )}
                </span>
            )}
        </div>
    );
};
