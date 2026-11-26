import { FC, useLayoutEffect, useRef, useState } from 'react';
import buttonAtlas from '../../../../assets/images/friends/messenger-submit.png';
import skinXml from '../../../../assets/images/mysterybox/illumina-light-skin-button.xml?raw';
import { NativeText } from '../../../../common/native-text/NativeText';
import { parseNativeSkin } from '../../../mod-tools/native/NativeSkin';
import { NativeSkinView } from '../../../mod-tools/native/NativeSkinView';
import './IlluminaLightButton.css';

const SKIN = parseNativeSkin(skinXml);

interface IlluminaLightButtonProps {
    caption: string;
    /** Button style 101 colours the hover glow 0xbbbbbb; style 100 keeps it white. */
    buttonStyle: 100 | 101;
    x: number;
    y: number;
    width: number;
    height: number;
    onClick: () => void;
}

/** Button styles 100 and 101: the illumina_light_skin_button skin with an il_button caption in the middle. */
export const IlluminaLightButton: FC<IlluminaLightButtonProps> = ({ caption, buttonStyle, x, y, width, height, onClick }) => {
    const [hovering, setHovering] = useState(false);
    const [pressed, setPressed] = useState(false);
    const state = pressed ? 'pressed' : hovering ? 'hovering' : 'default';
    const captionRef = useRef<HTMLSpanElement>(null);
    const [captionPosition, setCaptionPosition] = useState({ left: 0, top: 0 });

    // The caption label sits at floor(button / 2) - floor(label / 2) on both axes.
    useLayoutEffect(() => {
        const element = captionRef.current;

        if (!element) return;

        const place = () =>
            setCaptionPosition({
                left: Math.floor(width / 2) - Math.floor(element.offsetWidth / 2),
                top: Math.floor(height / 2) - Math.floor(element.offsetHeight / 2)
            });
        const observer = new ResizeObserver(place);

        place();
        observer.observe(element);

        return () => observer.disconnect();
    }, [width, height]);

    return (
        <button
            className="volt-mysterybox-button"
            style={{ left: x, top: y, width, height }}
            type="button"
            onClick={onClick}
            onPointerDown={() => setPressed(true)}
            onPointerEnter={() => setHovering(true)}
            onPointerLeave={() => {
                setHovering(false);
                setPressed(false);
            }}
            onPointerUp={() => setPressed(false)}
        >
            <NativeSkinView
                atlas={buttonAtlas}
                className="volt-mysterybox-button__skin"
                color={buttonStyle === 101 ? 0xbbbbbb : undefined}
                height={height}
                layout="illumina_light_button"
                skin={SKIN}
                state={state}
                width={width}
            />
            <span ref={captionRef} className="volt-mysterybox-button__caption" style={captionPosition}>
                <NativeText transparent background={0xffffff} text={caption} textStyle="il_button" />
            </span>
        </button>
    );
};
