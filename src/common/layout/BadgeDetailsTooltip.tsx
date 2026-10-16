import { FC, RefObject, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BadgeLeaderboardStat, GetConfigurationValue, LocalizeText } from '../../api';
import colorlessBorderXml from '../../assets/images/wired/native/link/border-colorless.xml?raw';
import blueAtlas from '../../assets/mod-tools/skins/habbo-blue-skin.png';
import { parseNativeSkin } from '../../components/mod-tools/native/NativeSkin';
import { NativeSkinView } from '../../components/mod-tools/native/NativeSkinView';
import { NativeText } from '../native-text/NativeText';
import '../../css/layout/BadgeDetailsTooltip.css';

interface BadgeDetailsTooltipProps {
    anchor: RefObject<HTMLDivElement>;
    name: string;
    description: string;
    rarity?: BadgeLeaderboardStat;
}

// AIR WIN63-202610131318-860371703, class_3518.getWhiteBackgroundTagColor.
const TAG_COLORS = {
    common: 0x777777,
    uncommon: 0xffb74d,
    rare: 0x56a152,
    epic: 0x5194cc,
    mythical: 0xa564b5,
    legendary: 0xc02a20,
    unique: 0xcc9200
};

const TEXT_OVERRIDES = { antiAliasType: 'advanced' as const, sharpness: 0, thickness: 0, kerning: false };
const TAG_SKIN = parseNativeSkin(colorlessBorderXml);

/** AIR badge_details XML and InfoStandUserView.populateBadgeDetails / showBadgeInfo. */
export const BadgeDetailsTooltip: FC<BadgeDetailsTooltipProps> = ({ anchor, name, description, rarity }) => {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const rarityLabelRef = useRef<HTMLSpanElement>(null);
    const [position, setPosition] = useState<{ left: number; top: number }>(null);
    // The label auto-sizes and reflects its width change to rarity_tag (reflect_horizontal_resize_to_parent): 92 - 81 = 11 pixels around it.
    const [tagWidth, setTagWidth] = useState(92);
    const rarityKey = rarity?.rarity === 'uncommon' && !GetConfigurationValue<boolean>('badge_rarity.uncommon', false) ? 'common' : rarity?.rarity;
    const tagColor = TAG_COLORS[rarityKey] ?? TAG_COLORS.common;

    useLayoutEffect(() => {
        const tooltip = tooltipRef.current;
        const badge = anchor.current;

        if (!tooltip || !badge) return;

        const place = () => {
            const rect = badge.getBoundingClientRect();
            const width = tooltip.offsetWidth;
            const height = tooltip.offsetHeight;
            // Native placement is flush left and vertically centred. Keep the popup readable at viewport edges.
            const left = rect.left >= width ? rect.left - width : rect.right;
            const next = {
                left: Math.trunc(Math.max(0, Math.min(left, window.innerWidth - width))),
                top: Math.trunc(Math.max(0, Math.min(rect.top + (rect.height - height) / 2, window.innerHeight - height)))
            };

            setPosition((previous) => (previous?.left === next.left && previous?.top === next.top ? previous : next));
        };
        const observer = new ResizeObserver(place);

        observer.observe(tooltip);
        observer.observe(badge);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        place();

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [anchor]);

    useLayoutEffect(() => {
        const label = rarityLabelRef.current;

        if (!label) return;

        const measure = () => {
            const width = label.offsetWidth;

            if (width > 0) setTagWidth(width + 11);
        };
        const observer = new ResizeObserver(measure);

        observer.observe(label);
        measure();

        return () => observer.disconnect();
    }, [rarity]);

    return createPortal(
        <div ref={tooltipRef} role="tooltip" className="volt-badge-details" style={{ ...position, visibility: position ? 'visible' : 'hidden' }}>
            <NativeText text={name} textStyle="bold" background={0xffffff} maxWidth={250} overrides={TEXT_OVERRIDES} nativeResolution />
            {description && (
                <NativeText text={description} textStyle="regular" background={0xffffff} maxWidth={250} overrides={TEXT_OVERRIDES} nativeResolution />
            )}
            {rarity && (
                <div className="volt-badge-details__rarity">
                    <NativeSkinView
                        skin={TAG_SKIN}
                        layout="border_colorless"
                        atlas={blueAtlas}
                        width={tagWidth}
                        height={17}
                        color={tagColor}
                        className="volt-badge-details__rarity-skin"
                    />
                    <span ref={rarityLabelRef} className="volt-badge-details__rarity-label">
                        <NativeText
                            text={LocalizeText('badge.rarity.badge', ['rarity'], [LocalizeText(`badge.rarity.${rarityKey}`)])}
                            textStyle="bold"
                            background={tagColor}
                            style={{ height: 13, whiteSpace: 'nowrap' }}
                            overrides={{ ...TEXT_OVERRIDES, color: 0xffffff }}
                            nativeResolution
                        />
                    </span>
                </div>
            )}
            {rarity?.ownerCount > 0 && rarity.ownerCount < 1000 && (
                <NativeText
                    text={LocalizeText('badge.owner_count', ['count'], [rarity.ownerCount.toString()])}
                    textStyle="regular"
                    background={0xffffff}
                    maxWidth={250}
                    overrides={{ ...TEXT_OVERRIDES, color: 0x555555 }}
                    nativeResolution
                />
            )}
        </div>,
        document.body
    );
};
