import { CSSProperties, FC } from 'react';
import boxBase from '../../../../assets/images/mysterybox/box-base.png';
import boxOverlay from '../../../../assets/images/mysterybox/box-overlay.png';
import keyBase from '../../../../assets/images/mysterybox/key-base.png';
import keyOverlay from '../../../../assets/images/mysterybox/key-overlay.png';
import { useTintedSkin } from '../../../../common';
import './MysteryBoxIconView.css';

const ICONS = {
    box: { base: boxBase, overlay: boxOverlay, width: 31, height: 36 },
    key: { base: keyBase, overlay: keyOverlay, width: 39, height: 39 }
};

interface MysteryBoxIconViewProps {
    icon: keyof typeof ICONS;
    tint: number | null;
    style?: CSSProperties;
}

/** A 39x39 slot with the tinted base bitmap and the plain overlay, both centred. */
export const MysteryBoxIconView: FC<MysteryBoxIconViewProps> = ({ icon, tint, style }) => {
    const { base, overlay, width, height } = ICONS[icon];
    const tinted = useTintedSkin(base, tint ?? undefined);
    const offset: CSSProperties = { left: Math.floor((39 - width) / 2), top: Math.floor((39 - height) / 2), width, height };

    return (
        <span aria-hidden="true" className="volt-mysterybox-icon" style={style}>
            {(tint === null || tinted) && (
                <span className="volt-mysterybox-icon__layer" style={{ ...offset, backgroundImage: tint === null ? `url("${base}")` : tinted }} />
            )}
            <span className="volt-mysterybox-icon__layer" style={{ ...offset, backgroundImage: `url("${overlay}")` }} />
        </span>
    );
};
