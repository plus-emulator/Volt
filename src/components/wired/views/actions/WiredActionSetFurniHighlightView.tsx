import { FC, useEffect, useMemo, useState } from 'react';
import { GetConfigurationValue, localizeWithFallback, WiredFurniType } from '../../../../api';
import {
    getWiredHighlightColors,
    getWiredHighlightShownStrength,
    getWiredHighlightStoredColor,
    getWiredHighlightStoredStrength,
    getWiredHighlightStrengthFromParam,
    getWiredHighlightStrengthOptions,
    hasWiredHighlightColor,
    isWiredHighlightDarkeningAvailable,
    parseWiredHighlightDarkenLevels,
    WIRED_HIGHLIGHT_COLORS,
    WIRED_HIGHLIGHT_DARKEN_LEVELS_KEY,
    WIRED_HIGHLIGHT_TYPE_BRIGHTEN,
    WIRED_HIGHLIGHT_TYPE_DARKEN,
    WiredHighlightStrengthOption
} from '../../../../api/wired/WiredFurniHighlight';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredDropdown } from '../WiredDropdown';
import { WiredSection } from '../WiredSection';
import { WiredActionBaseView } from './WiredActionBaseView';
import { WIRED_VISUALIZATION_AUDIENCE_EVERYONE, WiredVisualizationAudienceSection, WiredVisualizationSources } from './WiredFurniVisualizationParts';

/**
 * SET_FURNI_HIGHLIGHT (code 62), the official furni-highlight editor. AIR: roomevents/wired_setup/actiontypes/class_4214.as
 * buildInputs L67 (audience, type, strength, colour palette, animation, easing), readIntParamsFromForm L112
 * [audience, type, strength, colour, animation, easing, targetUsers], onEditStart L91, strength rules L149-202,
 * colour L204, animation L219 (brighten forces pulse), easing L230 (only with steady), warning L149 (type 3 to furni).
 * Dossier: B/reviews/new-wireds-dossier-r88.json, code 62.
 */

const SOURCE_SELECTED = 100;
const NORMAL_FURNI_WARNING_TYPE = 3;
const DEFAULT_COLOR = WIRED_HIGHLIGHT_COLORS[0];
const ANIMATION_STEADY = 0;
const ANIMATION_PULSE = 1;
const TYPE_LABELS = ['Outline', 'Soft glow', 'Darken', 'Color tint', 'Brighten', 'Neon aura'];
const EASING_LABELS = ['Instant', 'Linear', 'Ease in', 'Ease out', 'Ease in-out'];

const hexOf = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

const strengthLabel = (option: WiredHighlightStrengthOption) => {
    switch (option.kind) {
        case 'off':
            return localizeWithFallback('wiredfurni.params.set_furni_highlight.off', 'Off');
        case 'on':
            return localizeWithFallback('wiredfurni.params.set_furni_highlight.on', 'On');
        default:
            return localizeWithFallback('wiredfurni.params.set_furni_highlight.level', 'Level %level%').replace('%level%', String(option.level));
    }
};

export const WiredActionSetFurniHighlightView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources = null, setUserSources = null, setFurniIds = null } = useWired();
    const [audience, setAudience] = useState(0);
    const [type, setType] = useState(0);
    const [strength, setStrength] = useState(0);
    const [color, setColor] = useState(DEFAULT_COLOR);
    const [animation, setAnimation] = useState(ANIMATION_STEADY);
    const [easing, setEasing] = useState(0);
    const [targetUsers, setTargetUsers] = useState(false);
    const [furniSource, setFurniSource] = useState(SOURCE_SELECTED);
    const [userSource, setUserSource] = useState(0);
    const [audienceUserSource, setAudienceUserSource] = useState(0);
    // Observed on AIR WIN63-202610201032-107964540 (class_4226.as): the hotel lists the darken levels in ui-config, and Darken is
    // offered only when one of them is above Off.
    const darkenLevels = useMemo(() => parseWiredHighlightDarkenLevels(GetConfigurationValue<string | null>(WIRED_HIGHLIGHT_DARKEN_LEVELS_KEY, null)), []);
    const darkeningAvailable = isWiredHighlightDarkeningAvailable(darkenLevels);

    const isBrighten = type === WIRED_HIGHLIGHT_TYPE_BRIGHTEN;
    const effectiveAnimation = isBrighten ? ANIMATION_PULSE : animation;
    const colorEnabled = hasWiredHighlightColor(type);
    const easingEnabled = effectiveAnimation === ANIMATION_STEADY;
    const strengthOptions = getWiredHighlightStrengthOptions(type, darkenLevels);
    const colors = getWiredHighlightColors(type);

    useEffect(() => {
        if (!trigger) return;

        let savedType = Math.min(TYPE_LABELS.length - 1, Math.max(0, trigger.intData?.[1] ?? 0));
        let savedStrength = trigger.intData?.[2] ?? 0;
        let savedColor = trigger.intData?.[3] ?? DEFAULT_COLOR;

        // A saved Darken opens as an Outline switched off while the hotel offers no darkening.
        if (savedType === WIRED_HIGHLIGHT_TYPE_DARKEN && !darkeningAvailable) {
            savedType = 0;
            savedStrength = 0;
            savedColor = DEFAULT_COLOR;
        }

        setAudience(trigger.intData?.[0] === WIRED_VISUALIZATION_AUDIENCE_EVERYONE ? WIRED_VISUALIZATION_AUDIENCE_EVERYONE : 0);
        setType(savedType);
        setStrength(getWiredHighlightStrengthFromParam(savedType, savedStrength, darkenLevels));
        setColor(savedColor);
        setAnimation(trigger.intData?.[4] === ANIMATION_PULSE ? ANIMATION_PULSE : ANIMATION_STEADY);
        setEasing(Math.min(EASING_LABELS.length - 1, Math.max(0, trigger.intData?.[5] ?? 0)));
        setTargetUsers(trigger.intData?.[6] === 1);
        setFurniSource(trigger.furniSources?.[0] ?? SOURCE_SELECTED);
        setUserSource(trigger.userSources?.[1] ?? 0);
        setAudienceUserSource(trigger.userSources?.[0] ?? 0);
    }, [trigger, darkenLevels, darkeningAvailable]);

    const changeType = (next: number) => {
        // The strength keeps its nearest step on the new type; the colour and animation keep their values.
        setStrength(getWiredHighlightShownStrength(next, strength, darkenLevels));
        setType(next);
    };

    const save = () => {
        setIntParams([
            audience,
            type,
            getWiredHighlightStoredStrength(type, strength),
            getWiredHighlightStoredColor(type, color),
            effectiveAnimation,
            easing,
            targetUsers ? 1 : 0
        ]);
        setFurniSources?.([furniSource]);
        // class_4285.as:99 / class_4214 mergedSelections [[0, 1], [-1, 0]]: user slot 0 is the audience, user slot 1 the target users.
        setUserSources?.([audienceUserSource, userSource]);
        if (furniSource !== SOURCE_SELECTED) setFurniIds?.([]);
    };

    return (
        <WiredActionBaseView
            advancedAlwaysVisible
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={
                <WiredVisualizationSources
                    audienceUserSource={audienceUserSource}
                    furniSource={furniSource}
                    audienceSourceDisabled={audience === WIRED_VISUALIZATION_AUDIENCE_EVERYONE}
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
            <WiredSection title={localizeWithFallback('wiredfurni.params.set_furni_highlight.type', 'Highlight type:')}>
                <WiredDropdown
                    options={TYPE_LABELS.map((label, id) => ({
                        id,
                        label: localizeWithFallback(`wiredfurni.params.set_furni_highlight.type.${id}`, label)
                    })).filter((option) => darkeningAvailable || option.id !== WIRED_HIGHLIGHT_TYPE_DARKEN)}
                    value={type}
                    onChange={changeType}
                />
                {!targetUsers && type === NORMAL_FURNI_WARNING_TYPE && (
                    <Text small variant="danger">
                        {localizeWithFallback(
                            'wiredfurni.params.set_furni_highlight.normal_furni_warning',
                            'This highlight type does not work for non-BC items if the animation is set to "Steady"'
                        )}
                    </Text>
                )}
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.set_furni_highlight.strength', 'Strength:')}>
                <WiredDropdown
                    options={strengthOptions.map((option) => ({ id: option.value, label: strengthLabel(option) }))}
                    value={getWiredHighlightShownStrength(type, strength, darkenLevels)}
                    onChange={setStrength}
                />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.set_furni_highlight.color', 'Highlight color:')}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 18px)', gap: 3, width: 'max-content' }}>
                    {colors.map((swatch) => (
                        <button
                            key={swatch}
                            type="button"
                            disabled={!colorEnabled}
                            aria-label={hexOf(swatch)}
                            aria-pressed={color === swatch}
                            style={{
                                width: 18,
                                height: 18,
                                padding: 0,
                                border: `1px solid ${color === swatch ? '#ffffff' : '#555555'}`,
                                boxShadow: color === swatch ? 'inset 0 0 0 1px #000000' : undefined,
                                backgroundColor: hexOf(swatch)
                            }}
                            onClick={() => setColor(swatch)}
                        />
                    ))}
                </div>
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.set_furni_highlight.animation', 'Animation:')}>
                <WiredDropdown
                    disabled={isBrighten}
                    options={[
                        ...(isBrighten
                            ? []
                            : [{ id: ANIMATION_STEADY, label: localizeWithFallback('wiredfurni.params.set_furni_highlight.animation.0', 'Steady') }]),
                        { id: ANIMATION_PULSE, label: localizeWithFallback('wiredfurni.params.set_furni_highlight.animation.1', 'Pulse') }
                    ]}
                    value={effectiveAnimation}
                    onChange={setAnimation}
                />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.set_furni_highlight.easing', 'Easing function:')}>
                <WiredDropdown
                    disabled={!easingEnabled}
                    options={EASING_LABELS.map((label, id) => ({
                        id,
                        label: localizeWithFallback(`wiredfurni.params.set_furni_highlight.easing.${id}`, label)
                    }))}
                    value={easing}
                    onChange={setEasing}
                />
            </WiredSection>
        </WiredActionBaseView>
    );
};
