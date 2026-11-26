import { CSSProperties, FC } from 'react';
import { LocalizeText } from '../../../../../api';
import frank from '../../../../../assets/images/effectbox/frank1.png';
import frameBase from '../../../../../assets/images/habbo-skin/slices/frame-ubuntu-3-base.png';
import { useTintedSkin, VoltCardHeaderView, VoltCardView } from '../../../../../common';
import { AirSkinButton } from '../../../../../common/air/AirSkinButton';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { useRoom } from '../../../../../hooks';

interface EffectBoxConfirmViewProps {
    objectId: number;
    onClose: () => void;
}

// effectbox_xml colours.
const FRAME_COLOR = 0x67a3bf;
const HEADER_BODY_COLOR = 0x0e3f52;
const BOTTOM_COLOR = 0xe9e9e1;

/** EffectBoxOpenDialogView: the effectbox_xml window. OK sends the multistate use of the box and closes; cancel and close only close. */
export const EffectBoxConfirmView: FC<EffectBoxConfirmViewProps> = (props) => {
    const { objectId = -1, onClose = null } = props;
    const { roomSession = null } = useRoom();
    const frameImage = useTintedSkin(frameBase, FRAME_COLOR, 33);

    const openBox = () => {
        roomSession?.useMultistateItem(objectId);

        onClose();
    };

    return (
        <VoltCardView
            className="volt-effectbox"
            frameStyle={3}
            isResizable={false}
            nativeShadow
            style={frameImage ? ({ '--volt-card-frame-3': frameImage } as CSSProperties) : undefined}
            uniqueKey="effectbox"
        >
            <VoltCardHeaderView headerText={LocalizeText('effectbox.name.title')} onCloseClick={onClose} />
            <div className="volt-effectbox-content">
                <div className="volt-effectbox-header-border">
                    <div className="volt-effectbox-header-body" />
                    <img alt="" className="volt-effectbox-frank" draggable={false} src={frank} />
                    <div className="volt-effectbox-header">
                        <div className="volt-effectbox-title">
                            <NativeText
                                background={HEADER_BODY_COLOR}
                                overrides={{ size: 24, color: 0xffffff }}
                                text={LocalizeText('effectbox.header.title')}
                                textStyle="u_headline_big"
                            />
                        </div>
                        <div className="volt-effectbox-description">
                            <NativeText
                                background={HEADER_BODY_COLOR}
                                leading={2}
                                maxWidth={354}
                                overrides={{ color: 0xffffff }}
                                text={LocalizeText('effectbox.header.description')}
                                textStyle="u_regular"
                            />
                        </div>
                    </div>
                </div>
                <div className="volt-effectbox-bottom">
                    <button className="volt-effectbox-cancel" type="button" onClick={onClose}>
                        <NativeText
                            background={BOTTOM_COLOR}
                            overrides={{ color: 0x333333, underline: true }}
                            text={LocalizeText('generic.cancel')}
                            textStyle="u_regular"
                        />
                    </button>
                    <AirSkinButton
                        caption={LocalizeText('generic.ok')}
                        className="volt-effectbox-ok"
                        height={33}
                        kind="shiny-thick-green"
                        widthMin={130}
                        onClick={openBox}
                    />
                </div>
            </div>
        </VoltCardView>
    );
};
