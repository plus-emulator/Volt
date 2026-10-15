import { FC } from 'react';
import bubbleXml from '../../../../assets/images/wired/label/bubble.xml?raw';
import pointerXml from '../../../../assets/images/wired/label/bubble-pointer-down.xml?raw';
import ubuntuAtlas from '../../../../assets/images/habbo-skin/2796_habbo_skin_ubuntu_png$3e7b6c31bebfcaeb507157a302e0b5be1308799348.png';
import { parseNativeSkin } from '../../../mod-tools/native/NativeSkin';
import { NativeSkinView } from '../../../mod-tools/native/NativeSkinView';

const bubble = parseNativeSkin(bubbleXml);
const pointer = parseNativeSkin(pointerXml);

// AIR style 5 has no bubble skin: SkinContainer falls back to style 0.
// The 52x35 bubble's default down-pointer is centred and bottom-aligned.
export const FurnitureLabelColorPreview: FC<{ color: number }> = ({ color }) => (
    <div className="volt-furni-label-settings__preview" aria-hidden="true">
        <NativeSkinView skin={bubble} atlas={ubuntuAtlas} layout="bubble" width={52} height={35} color={color} />
        <NativeSkinView skin={pointer} atlas={ubuntuAtlas} layout="pointer_down" width={13} height={9} color={color} style={{ position: 'absolute', left: 20, top: 26 }} />
    </div>
);
