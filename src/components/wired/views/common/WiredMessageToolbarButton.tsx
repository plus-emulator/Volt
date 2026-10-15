import { ButtonHTMLAttributes, useState } from 'react';
import atlas from '../../../../assets/images/wired/native/source-selector/buttons.png';
import plainAtlas from '../../../../assets/images/wired/illumina_light_button_unetched.png';
import leftXml from '../../../../assets/images/wired/native/source-selector/left.xml?raw';
import middleXml from '../../../../assets/images/wired/native/source-selector/middle.xml?raw';
import rightXml from '../../../../assets/images/wired/native/source-selector/right.xml?raw';
import plainXml from '../../../../assets/images/wired/native/message_button_plain.xml?raw';
import unetchedXml from '../../../../assets/images/wired/native/message_button_unetched.xml?raw';
import { parseNativeSkin } from '../../../mod-tools/native/NativeSkin';
import { NativeSkinView } from '../../../mod-tools/native/NativeSkinView';
import { NativeText } from '../../../../common/native-text/NativeText';

const skins = { left: parseNativeSkin(leftXml), middle: parseNativeSkin(middleXml), right: parseNativeSkin(rightXml), plain: parseNativeSkin(plainXml), unetched: parseNativeSkin(unetchedXml) };
type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & { kind: keyof typeof skins; width: number; text: string; bold?: boolean; italic?: boolean; underline?: boolean; color?: number };

/** AIR toolbar styles 102–106, at the dimensions in wired_style_illumina.xml. */
export const WiredMessageToolbarButton = ({ kind, width, text, bold, italic, underline, color = 0, disabled, className = '', ...props }: Props) => {
    const [hover, setHover] = useState(false);
    const [pressed, setPressed] = useState(false);
    const multi = kind === 'left' || kind === 'middle' || kind === 'right';
    return <button {...props} type="button" disabled={disabled} className={`volt-wired-message-editor__native-button ${className}`} style={{ width, minWidth: width, opacity: disabled ? .5 : 1 }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPressed(false); }} onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)}>
        <NativeSkinView skin={skins[kind]} layout={`illumina_light_button_${multi ? 'multi_' : ''}${kind}`} state={disabled ? 'default' : pressed ? 'pressed' : hover ? 'hovering' : 'default'} atlas={multi ? atlas : plainAtlas} width={width} height={19} color={0xffffff} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <NativeText background={0xe2e2e2} text={text} textStyle={multi || width === 19 ? 'il_regular' : 'il_button'} overrides={{ bold, italic, underline, color }} className="volt-wired-message-editor__button-text" />
    </button>;
};
