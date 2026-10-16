import { FC, useLayoutEffect, useRef, useState } from 'react';
import inputAtlas from '../../../assets/images/friends/swf/illumina_light_input_chat.png';
import inputSkinXml from '../../../assets/images/wired/native/input-border.xml?raw';
import { parseNativeSkin } from '../../mod-tools/native/NativeSkin';
import { NativeSkinView } from '../../mod-tools/native/NativeSkinView';

const INPUT_SKIN = parseNativeSkin(inputSkinXml);

/** WiredStyle illumina sets collapsed_view and expanded_view to border style 105 (NewVariablePicker.as:167-178): the input border skin. */
export const WiredInputBorderSkin: FC = () => {
    const ref = useRef<HTMLSpanElement>(null);
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);

    useLayoutEffect(() => {
        const parent = ref.current?.parentElement;
        if (!parent) return;
        // The skin covers the border box: the element's 1px transparent border is where the frame is drawn.
        const update = () => setSize({ width: parent.offsetWidth, height: parent.offsetHeight });
        update();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(update);
        observer.observe(parent);
        return () => observer.disconnect();
    }, []);

    return (
        <span ref={ref} aria-hidden="true" className="volt-wired__vpicker-frame">
            {size && size.width > 0 && size.height > 0 && <NativeSkinView skin={INPUT_SKIN} layout="illumina_light_border_input" atlas={inputAtlas} width={size.width} height={size.height} style={{ position: 'absolute', inset: 0 }} />}
        </span>
    );
};
