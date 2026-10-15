import { FC, useEffect, useRef } from 'react';
import { localizeWithFallback } from '../../../../api';
import { useNotification } from '../../../../hooks';
import { WiredDropdown } from '../WiredDropdown';
import { WiredSection } from '../WiredSection';
import { WiredMergedSourceSection } from '../WiredSourcesSelector';
import { WiredSourceTypeSelector } from '../WiredSourceTypeSelector';

/**
 * The audience and merged-source parts shared by the furni visualisation editors (set furni transparency, set furni highlight).
 * AIR: class_4285.as (transparency) and class_4214.as (highlight), onAudienceChanged L84 / L139, isInputSourceDisabled L94 / L235,
 * mergedSelections [[0,1],[-1,0]] L99 / L240, mergedSelectionTitle L104 / L245, setMergedType L119 / L260 (target users is merged 0 type user).
 */

export const WIRED_VISUALIZATION_AUDIENCE_SELECTED_USERS = 0;
export const WIRED_VISUALIZATION_AUDIENCE_EVERYONE = 1;

export const WiredVisualizationAudienceSection: FC<{ audience: number; onChange: (audience: number) => void }> = ({ audience, onChange }) => {
    const { simpleAlert } = useNotification();
    const informed = useRef(audience === WIRED_VISUALIZATION_AUDIENCE_EVERYONE);
    useEffect(() => { if (audience === WIRED_VISUALIZATION_AUDIENCE_EVERYONE) informed.current = true; }, [audience]);
    const change = (next: number) => {
        if (next === WIRED_VISUALIZATION_AUDIENCE_EVERYONE && !informed.current) {
            informed.current = true;
            simpleAlert(
                localizeWithFallback('wiredfurni.params.furni_visualization.audience.everyone_info.body', 'To keep this effect visible at all times, including after a room reload, stack this WIRED Effect with "WIRED Trigger: Room Initialized".'),
                null, null, null,
                localizeWithFallback('wiredfurni.params.furni_visualization.audience.everyone_info.title', 'Keep this effect visible after reloads')
            );
        }
        onChange(next);
    };
    return <WiredSection title={localizeWithFallback('wiredfurni.params.furni_visualization.audience', 'Who should see the effect?')}>
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
            onChange={change}
        />
    </WiredSection>;
};

export interface WiredVisualizationSourcesProps {
    targetUsers: boolean;
    onTargetUsersChange: (targetUsers: boolean) => void;
    furniSource: number;
    onFurniSourceChange: (source: number) => void;
    userSource: number;
    onUserSourceChange: (source: number) => void;
    audienceUserSource: number;
    onAudienceUserSourceChange: (source: number) => void;
    /** isInputSourceDisabled(1, MERGED_SOURCE): the audience section is greyed while everyone sees the effect. */
    audienceSourceDisabled: boolean;
}

/**
 * Footer (AIR WIN63-202610131318 class_4214.as:235-272 / class_4285.as:94-130): merged 0 "target" pairs furni slot 0 with user slot 1 and,
 * having no custom type picker, carries the furni/users type selector in its header; merged 1 "visibility_audience" is user slot 0 only.
 * Both sections are always shown; the audience one is greyed (not hidden) while the audience is everyone.
 */
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
        audienceSourceDisabled
    } = props;

    return (
        <>
            <WiredMergedSourceSection
                scope={targetUsers ? 'users' : 'furni'}
                title="wiredfurni.params.sources.merged.title.target"
                furniSlot={0}
                userSlot={1}
                furniSource={furniSource}
                userSource={userSource}
                headerOption={<WiredSourceTypeSelector types={['furni', 'user']} value={targetUsers ? 'user' : 'furni'} onChange={type => onTargetUsersChange(type === 'user')} />}
                onChangeFurni={onFurniSourceChange}
                onChangeUsers={onUserSourceChange}
            />
            <WiredMergedSourceSection
                scope="users"
                title="wiredfurni.params.visualization.visibility_audience"
                userSlot={0}
                userSource={audienceUserSource}
                disabled={audienceSourceDisabled}
                onChangeUsers={onAudienceUserSourceChange}
            />
        </>
    );
};
