import { FC } from 'react';
import { localizeWithFallback } from '../../../../api';
import { Text } from '../../../../common';
import { WiredDropdown } from '../WiredDropdown';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';

/**
 * The audience and merged-source parts shared by the furni visualisation editors (set furni transparency, set furni highlight).
 * AIR: class_4285.as (transparency) and class_4214.as (highlight), onAudienceChanged L84 / L139, isInputSourceDisabled L94 / L235,
 * mergedSelections [[0,1],[-1,0]] L99 / L240, mergedSelectionTitle L104 / L245, setMergedType L119 / L260 (target users is merged 0 type user).
 */

export const WIRED_VISUALIZATION_AUDIENCE_SELECTED_USERS = 0;
export const WIRED_VISUALIZATION_AUDIENCE_EVERYONE = 1;

export const WiredVisualizationAudienceSection: FC<{ audience: number; onChange: (audience: number) => void }> = ({ audience, onChange }) => (
    <WiredSection title={localizeWithFallback('wiredfurni.params.furni_visualization.audience', 'Who should see the effect?')}>
        <WiredDropdown
            options={[
                {
                    id: WIRED_VISUALIZATION_AUDIENCE_SELECTED_USERS,
                    label: localizeWithFallback('wiredfurni.params.furni_visualization.audience.selected_users', 'Selected users')
                },
                {
                    id: WIRED_VISUALIZATION_AUDIENCE_EVERYONE,
                    label: localizeWithFallback('wiredfurni.params.furni_visualization.audience.everyone', 'Everyone, including users who enter later')
                }
            ]}
            value={audience}
            onChange={onChange}
        />
        {audience === WIRED_VISUALIZATION_AUDIENCE_EVERYONE && (
            <div className="flex flex-col gap-1">
                <Text bold small>
                    {localizeWithFallback('wiredfurni.params.furni_visualization.audience.everyone_info.title', 'Keep this effect visible after reloads')}
                </Text>
                <Text small>
                    {localizeWithFallback(
                        'wiredfurni.params.furni_visualization.audience.everyone_info.body',
                        'To keep this effect visible at all times, including after a room reload, stack this WIRED Effect with "WIRED Trigger: Room Initialized".'
                    )}
                </Text>
            </div>
        )}
    </WiredSection>
);

export interface WiredVisualizationSourcesProps {
    targetUsers: boolean;
    onTargetUsersChange: (targetUsers: boolean) => void;
    furniSource: number;
    onFurniSourceChange: (source: number) => void;
    userSource: number;
    onUserSourceChange: (source: number) => void;
    audienceUserSource: number;
    onAudienceUserSourceChange: (source: number) => void;
    showAudienceSource: boolean;
}

/** Footer: merged slot 0 is the target (furni or users), slot 1 is the audience users, which is off when everyone sees it. */
export const WiredVisualizationSources: FC<WiredVisualizationSourcesProps> = (props) => {
    const {
        targetUsers,
        onTargetUsersChange,
        furniSource,
        onFurniSourceChange,
        userSource,
        onUserSourceChange,
        audienceUserSource,
        onAudienceUserSourceChange,
        showAudienceSource
    } = props;

    return (
        <>
            <WiredSection title={localizeWithFallback('wiredfurni.params.sources.merged.title.target', 'Select target:')}>
                <WiredRadioGroup
                    name="visualizationTarget"
                    options={[
                        { id: 0, label: localizeWithFallback('wiredfurni.params.sources.furni.title', 'Select furni source:') },
                        { id: 1, label: localizeWithFallback('wiredfurni.params.sources.users.title', 'Select users source:') }
                    ]}
                    value={targetUsers ? 1 : 0}
                    onChange={(value) => onTargetUsersChange(value === 1)}
                />
            </WiredSection>
            <WiredSourcesSelector
                showFurni={!targetUsers}
                showUsers={targetUsers}
                furniSource={furniSource}
                userSource={userSource}
                onChangeFurni={onFurniSourceChange}
                onChangeUsers={onUserSourceChange}
            />
            {showAudienceSource && (
                <WiredSourcesSelector
                    showUsers={true}
                    userSlot={1}
                    userSource={audienceUserSource}
                    usersTitle="wiredfurni.params.visualization.visibility_audience"
                    onChangeUsers={onAudienceUserSourceChange}
                />
            )}
        </>
    );
};
