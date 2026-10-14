import { FC, useLayoutEffect, useRef, useState } from 'react';
import atlas from '../../../assets/images/friends/swf/illumina_light_input_chat.png';
import skinXml from '../../../assets/images/wired/native/input-border.xml?raw';
import { parseNativeSkin } from '../../mod-tools/native/NativeSkin';
import { NativeSkinView } from '../../mod-tools/native/NativeSkinView';
import '../../../css/WiredTextArea.css';

const skin = parseNativeSkin(skinXml);
interface WiredTextAreaProps {
    value: string;
    onChange?: (value: string) => void;
    height: number;
    maxLength?: number;
    placeholder?: string;
    readOnly?: boolean;
    wrap?: boolean;
    label?: string;
}

/** AIR TextAreaPreset uses input_template border105, field x4/y2, and the requested outer height. */
export const WiredTextArea: FC<WiredTextAreaProps> = ({ value, onChange, height, maxLength = -1, placeholder, readOnly = false, wrap = false, label }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    useLayoutEffect(() => {
        const update = () => setWidth(Math.floor(ref.current?.clientWidth ?? 0));
        const observer = new ResizeObserver(update);
        observer.observe(ref.current);
        update();
        return () => observer.disconnect();
    }, []);
    const warningRange = maxLength > 10 ? Math.min(30, Math.max(6, Math.trunc(maxLength / 5))) : 0;
    return <div ref={ref} className="volt-wired__textarea" style={{ height }}>
        {width > 0 && <NativeSkinView skin={skin} layout="illumina_light_border_input" atlas={atlas} width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />}
        <textarea className="volt-wired__textarea-field" aria-label={label} value={value} readOnly={readOnly} wrap={wrap ? 'soft' : 'off'} spellCheck={false}
            maxLength={maxLength > 0 ? maxLength : undefined} placeholder={placeholder} onChange={event => onChange?.(event.target.value.replace(/\n\r/g, '\n').replace(/\r/g, '\n'))} />
        {warningRange > 0 && value.length > maxLength - warningRange && <span className="volt-wired__input-limit">{value.length}/{maxLength}</span>}
    </div>;
};
