import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredDropdown } from '../WiredDropdown';
import { WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredActionBaseView } from './WiredActionBaseView';
import { WIRED_VISUALIZATION_AUDIENCE_EVERYONE, WiredVisualizationAudienceSection, WiredVisualizationSources } from './WiredFurniVisualizationParts';

/**
 * SET_FURNI_TRANSPARENCY (code 61), the official furni-transparency editor. AIR: roomevents/wired_setup/actiontypes/class_4285.as
 * buildInputs L52 (audience, visible/invisible 0 or 100, click-through, easing 0..4), readIntParamsFromForm L79
 * [audience, visibility, clickThrough, easing, targetUsers], onEditStart L65, merged sources L99-132.
 * Dossier: B/reviews/new-wireds-dossier-r88.json, code 61 (merged [[0,1],[-1,0]]: target furni or users, audience users).
 */

const VISIBILITY_VISIBLE = 0;
const VISIBILITY_INVISIBLE = 100;
const EASING_COUNT = 5;
const SOURCE_SELECTED = 100;
const EASING_LABELS = ['Instant', 'Linear', 'Ease in', 'Ease out', 'Ease in-out'];

export const WiredActionSetFurniTransparencyView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources = null, setUserSources = null, setFurniIds = null } = useWired();
    const [audience, setAudience] = useState(0);
    const [visibility, setVisibility] = useState(VISIBILITY_VISIBLE);
    const [clickThrough, setClickThrough] = useState(false);
    const [easing, setEasing] = useState(0);
    const [targetUsers, setTargetUsers] = useState(false);
    const [furniSource, setFurniSource] = useState(SOURCE_SELECTED);
    const [userSource, setUserSource] = useState(0);
    const [audienceUserSource, setAudienceUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        setAudience(trigger.intData?.[0] === WIRED_VISUALIZATION_AUDIENCE_EVERYONE ? WIRED_VISUALIZATION_AUDIENCE_EVERYONE : 0);
        setVisibility(trigger.intData?.[1] === VISIBILITY_INVISIBLE ? VISIBILITY_INVISIBLE : VISIBILITY_VISIBLE);
        setClickThrough(trigger.intData?.[2] === 1);
        setEasing(Math.min(EASING_COUNT - 1, Math.max(0, trigger.intData?.[3] ?? 0)));
        setTargetUsers(trigger.intData?.[4] === 1);
        setFurniSource(trigger.furniSources?.[0] ?? SOURCE_SELECTED);
        setUserSource(trigger.userSources?.[1] ?? 0);
        setAudienceUserSource(trigger.userSources?.[0] ?? 0);
    }, [trigger]);

    const save = () => {
        setIntParams([audience, visibility, clickThrough ? 1 : 0, easing, targetUsers ? 1 : 0]);
        setFurniSources?.([furniSource]);
        // class_4285.as:99 / class_4214 mergedSelections [[0, 1], [-1, 0]]: user slot 0 is the audience, user slot 1 the target users.
        setUserSources?.([audienceUserSource, userSource]);
        if (furniSource !== SOURCE_SELECTED) setFurniIds?.([]);
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={
                <WiredVisualizationSources
                    audienceUserSource={audienceUserSource}
                    furniSource={furniSource}
                    showAudienceSource={audience !== WIRED_VISUALIZATION_AUDIENCE_EVERYONE}
                    targetUsers={targetUsers}
                    userSource={userSource}
                    onAudienceUserSourceChange={setAudienceUserSource}
                    onFurniSourceChange={setFurniSource}
                    onTargetUsersChange={setTargetUsers}
                    onUserSourceChange={setUserSource}
                />
            }
        >
            <WiredVisualizationAudienceSection audience={audience} onChange={setAudience} />
            <WiredSection title={localizeWithFallback('wiredfurni.params.set_furni_transparency.visibility', 'Visibility:')}>
                <WiredRadioGroup
                    name="transparencyVisibility"
                    options={[
                        { id: VISIBILITY_VISIBLE, label: localizeWithFallback('wiredfurni.params.set_furni_transparency.visible', 'Visible') },
                        { id: VISIBILITY_INVISIBLE, label: localizeWithFallback('wiredfurni.params.set_furni_transparency.invisible', 'Invisible') }
                    ]}
                    value={visibility}
                    onChange={setVisibility}
                />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.set_furni_transparency.click_handling', 'Click handling:')}>
                <WiredCheckboxOption
                    checked={clickThrough}
                    label={localizeWithFallback('wiredfurni.params.set_furni_transparency.allow_click_through', 'Allow clicks to pass through the target')}
                    last={true}
                    onChange={setClickThrough}
                />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.set_furni_transparency.easing', 'Easing function:')}>
                <WiredDropdown
                    options={EASING_LABELS.map((label, id) => ({
                        id,
                        label: localizeWithFallback(`wiredfurni.params.set_furni_transparency.easing.${id}`, label)
                    }))}
                    value={easing}
                    onChange={setEasing}
                />
            </WiredSection>
        </WiredActionBaseView>
    );
};
