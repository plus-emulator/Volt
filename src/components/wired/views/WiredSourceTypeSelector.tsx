import { Fragment, useState } from 'react';
import { localizeWithFallback } from '../../../api';
import contextIcon from '../../../assets/images/wired/native/icon_source_context.png';
import furniIcon from '../../../assets/images/wired/native/icon_source_furni.png';
import globalIcon from '../../../assets/images/wired/native/icon_source_global.png';
import userIcon from '../../../assets/images/wired/native/icon_source_users.png';
import atlas from '../../../assets/images/wired/native/source-selector/buttons.png';
import leftXml from '../../../assets/images/wired/native/source-selector/left.xml?raw';
import middleXml from '../../../assets/images/wired/native/source-selector/middle.xml?raw';
import rightXml from '../../../assets/images/wired/native/source-selector/right.xml?raw';
import { parseNativeSkin } from '../../mod-tools/native/NativeSkin';
import { NativeSkinView } from '../../mod-tools/native/NativeSkinView';

export type WiredSourceType = 'furni' | 'user' | 'global' | 'context';

// Package 25 NewSourceTypeOption: Util.lightenColor(type colour, active ? 1.26 : 1.55).
// These are the resulting RGB colours after AIR's byte-quantized HSL conversion.
const TYPES = {
    furni: { icon: furniIcon, height: 11, selected: 0xe5be21, hover: 0xebcd57, key: 'furni', label: 'Furniture' },
    user: { icon: userIcon, height: 10, selected: 0x30b233, hover: 0x48ce4b, key: 'users', label: 'Users' },
    global: { icon: globalIcon, height: 7, selected: 0x25a6b1, hover: 0x31c7d5, key: 'global', label: 'Room' },
    context: { icon: contextIcon, height: 10, selected: 0xda7828, hover: 0xe3985b, key: 'context', label: 'Context' }
};
const SKINS = { left: parseNativeSkin(leftXml), middle: parseNativeSkin(middleXml), right: parseNativeSkin(rightXml) };

export const wiredSourceTypeColor = (type: WiredSourceType, selected: boolean, hovered: boolean) => selected ? TYPES[type].selected : hovered ? TYPES[type].hover : 0xffffff;

/** NewSourceTypePicker gives the divider to an active neighbour before a hovered neighbour. */
export const wiredSourceSplitterColor = (left: WiredSourceType, right: WiredSourceType, value: WiredSourceType, hovered: WiredSourceType | null) => {
    const leftActive = left === value;
    const rightActive = right === value;
    const color = leftActive || (!rightActive && left === hovered)
        ? wiredSourceTypeColor(left, leftActive, left === hovered)
        : rightActive || right === hovered ? wiredSourceTypeColor(right, rightActive, right === hovered) : 0xffffff;
    return ((Math.trunc(((color >> 16) & 255) * 145 / 255) << 16)
        | (Math.trunc(((color >> 8) & 255) * 145 / 255) << 8)
        | Math.trunc((color & 255) * 145 / 255));
};
const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

interface WiredSourceTypeSelectorProps {
    types: WiredSourceType[];
    value: WiredSourceType;
    onChange: (type: WiredSourceType) => void;
    disabled?: boolean;
}

/** Package 25 sourcetype_selector_view: 17px ends, 14px middle buttons, 1px dividers, 19px high. */
export const WiredSourceTypeSelector = ({ types, value, onChange, disabled = false }: WiredSourceTypeSelectorProps) => {
    const [hovered, setHovered] = useState<WiredSourceType | null>(null);
    const activeHover = disabled ? null : hovered;

    return (
        <div role="group" aria-label={localizeWithFallback('wiredfurni.params.variables.variable_selection', 'Variable selection:')} style={{ display: 'inline-flex', alignItems: 'center', gap: 0, height: 19, flexShrink: 0 }}>
            {types.map((type, index) => {
                const side = index === 0 ? 'left' : index === types.length - 1 ? 'right' : 'middle';
                const width = side === 'middle' ? 14 : 17;
                const selected = value === type;
                const hovering = activeHover === type;
                const descriptor = TYPES[type];
                const label = localizeWithFallback(`wiredfurni.params.sourcetype.${descriptor.key}`, descriptor.label);
                const color = wiredSourceTypeColor(type, selected, hovering);
                return (
                    <Fragment key={type}>
                        <button
                            type="button"
                            aria-label={label}
                            aria-pressed={selected}
                            title={label}
                            disabled={disabled}
                            onMouseEnter={() => { if (!disabled) setHovered(type); }}
                            onMouseLeave={() => setHovered(null)}
                            onClick={() => onChange(type)}
                            style={{ position: 'relative', display: 'block', width, minWidth: width, height: 19, minHeight: 19, border: 0, borderRadius: 0, margin: 0, padding: 0, background: 'transparent', flexShrink: 0 }}
                        >
                            <NativeSkinView skin={SKINS[side]} layout={`illumina_light_button_multi_${side}`} state={disabled ? 'disabled' : selected ? 'pressed' : hovering ? 'hovering' : 'default'} atlas={atlas} width={width} height={19} color={color} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
                            <img src={descriptor.icon} alt="" draggable={false} style={{ position: 'absolute', left: side === 'left' ? 6 : side === 'right' ? 4 : 3, top: Math.trunc(10 - (descriptor.height + 1) / 2), maxWidth: 'none', imageRendering: 'pixelated', filter: 'drop-shadow(0 -1px 0 #00000048)', pointerEvents: 'none' }} />
                        </button>
                        {index < types.length - 1 && <span aria-hidden="true" style={{ display: 'block', width: 1, height: 19, flexShrink: 0, background: `linear-gradient(to bottom, ${hex(wiredSourceSplitterColor(type, types[index + 1], value, activeHover))} 0 18px, #f2f2f2 18px 19px)` }} />}
                    </Fragment>
                );
            })}
        </div>
    );
};
