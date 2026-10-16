import { FC, useState } from 'react';
import { LocalizeText } from '../../../api';
import primaryIcon from '../../../assets/images/wired/native/furni_picks_1.png';
import secondaryIcon from '../../../assets/images/wired/native/furni_picks_2.png';
import atlas from '../../../assets/images/wired/illumina_light_button_unetched.png';
import xml from '../../../assets/images/wired/native/message_button_plain.xml?raw';
import { parseNativeSkin } from '../../mod-tools/native/NativeSkin';
import { NativeSkinView } from '../../mod-tools/native/NativeSkinView';
const skin = parseNativeSkin(xml);
// AIR MiniAssetIconButtonPreset selectedColor, then Util.lightenColor's byte-quantized HSL conversion.
const COLORS = { primary: { selected: 0x939844, hover: 0xabb14f }, secondary: { selected: 0x6168ad, hover: 0x7d83bb } };

/** mini_button_view: 19x19 plain102 skin, centred13x15 icon at3,2; selected stays pressed. */
export const WiredFurniPickButton: FC<{ kind: 'primary' | 'secondary'; active: boolean; disabled?: boolean; onClick: () => void }> = ({ kind, active, disabled, onClick }) => {
    const [hover, setHover] = useState(false);
    const [pressed, setPressed] = useState(false);
    const selected = !disabled && active;
    const hovered = !disabled && hover;
    return <button type="button" aria-label={`${LocalizeText('wiredfurni.params.furni_picking.tooltip')} ${kind === 'primary' ? 1 : 2}`} title={LocalizeText('wiredfurni.params.furni_picking.tooltip')} aria-pressed={active} disabled={disabled}
        style={{ position: 'relative', display: 'inline-block', flex: '0 0 19px', width: 19, height: 19, border: 0, padding: 0, background: 'transparent', opacity: disabled ? 0.5 : 1 }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPressed(false); }} onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onClick={() => { if (!active) onClick(); }}>
        <NativeSkinView skin={skin} layout="illumina_light_button_plain" atlas={atlas} width={19} height={19} state={selected || (!disabled && pressed) ? 'pressed' : hovered ? 'hovering' : 'default'} color={selected ? COLORS[kind].selected : hovered ? COLORS[kind].hover : 0xffffff} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <img src={kind === 'primary' ? primaryIcon : secondaryIcon} alt="" draggable={false} style={{ position: 'absolute', left: 3, top: 2, width: 13, height: 15, objectFit: 'none', imageRendering: 'pixelated', pointerEvents: 'none' }} />
    </button>;
};

/** PressedButtonMiniAssetIconButtonPreset with a neutral asset: the same 19x19 plain skin, always white (selectedColor 0xffffff). */
export const WiredMiniIconButton: FC<{ icon: string; label: string; disabled?: boolean; onClick: () => void }> = ({ icon, label, disabled, onClick }) => {
    const [hover, setHover] = useState(false);
    const [pressed, setPressed] = useState(false);
    const hovered = !disabled && hover;
    return <button type="button" aria-label={label} title={label || undefined} disabled={disabled}
        style={{ position: 'relative', display: 'block', flex: '0 0 19px', width: 19, height: 19, border: 0, padding: 0, background: 'transparent', opacity: disabled ? 0.5 : 1 }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPressed(false); }} onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onClick={onClick}>
        <NativeSkinView skin={skin} layout="illumina_light_button_plain" atlas={atlas} width={19} height={19} state={!disabled && pressed ? 'pressed' : hovered ? 'hovering' : 'default'} color={0xffffff} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <img src={icon} alt="" draggable={false} style={{ position: 'absolute', left: 3, top: 2, width: 13, height: 15, objectFit: 'none', imageRendering: 'pixelated', pointerEvents: 'none' }} />
    </button>;
};
