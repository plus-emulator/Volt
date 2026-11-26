import { GetSessionDataManager, MysteryBoxKeysUpdateEvent } from '@volt/renderer';
import { FC, useState } from 'react';
import { GetConfigurationValue, LocalizeText, OpenUrl } from '../../../../api';
import boxSmall from '../../../../assets/images/mysterybox/box-small.png';
import keySmall from '../../../../assets/images/mysterybox/key-small.png';
import maximizeIcon from '../../../../assets/images/mysterybox/maximize-unetched.png';
import minimizeIcon from '../../../../assets/images/mysterybox/minimize-unetched.png';
import trackerBorder from '../../../../assets/images/mysterybox/tracker-border.png';
import { useTintedSkin } from '../../../../common';
import { NativeText } from '../../../../common/native-text/NativeText';
import { useActiveRoomSessionSnapshot, useVoltEvent } from '../../../../hooks';
import { mysteryBoxTint } from './MysteryBoxColors';
import { MysteryBoxIconView } from './MysteryBoxIconView';
import './MysteryBoxExtensionView.css';

const HEADER_COLOR = 0x676767;
const BODY_COLOR = 0x201e19;

// AIR keeps the minimised state in its in-memory config, so it lasts for the session only.
let minimised = false;

interface SlotProps {
    icon: 'box' | 'key';
    color: string;
    x: number;
}

const TrackerSlot: FC<SlotProps> = ({ icon, color, x }) => (
    <div
        className="volt-mysterybox-tracker__slot"
        style={{ left: x }}
        title={color ? LocalizeText(`mysterybox.tracker.${icon}.${color.toLowerCase()}`) : undefined}
    >
        <img alt="" className="volt-mysterybox-tracker__bitmap" draggable={false} src={trackerBorder} />
        {color && <MysteryBoxIconView icon={icon} style={{ left: 0, top: 0 }} tint={mysteryBoxTint(color)} />}
    </div>
);

const SmallIcon: FC<{ src: string; color: string; x: number; y: number; width: number; height: number }> = ({ src, color, x, y, width, height }) => {
    const tinted = useTintedSkin(src, mysteryBoxTint(color));

    if (!tinted) return null;

    return <span aria-hidden="true" className="volt-mysterybox-tracker__small" style={{ left: x, top: y, width, height, backgroundImage: tinted }} />;
};

/** The mystery box toolbar extension (layout mystery_box_toolbar_extension): the box and key the user holds. */
export const MysteryBoxExtensionView: FC<{}> = () => {
    const roomSession = useActiveRoomSessionSnapshot();
    const [isMinimised, setIsMinimised] = useState(minimised);
    const [boxColor, setBoxColor] = useState(() => GetSessionDataManager()?.mysteryBoxColor ?? '');
    const [keyColor, setKeyColor] = useState(() => GetSessionDataManager()?.mysteryKeyColor ?? '');

    useVoltEvent<MysteryBoxKeysUpdateEvent>(MysteryBoxKeysUpdateEvent.MYSTERY_BOX_KEYS_UPDATE, (event) => {
        setBoxColor(event.boxColor ?? '');
        setKeyColor(event.keyColor ?? '');
    });

    if (!roomSession || !GetConfigurationValue<boolean>('mysterybox.tracker.active', false)) return null;

    const faqUrl = GetConfigurationValue<string>('mysterybox.faq.url', '');

    const toggle = (value: boolean) => {
        minimised = value;
        setIsMinimised(value);
    };

    return (
        <div className={`volt-mysterybox-tracker${isMinimised ? ' is-minimised' : ''}`}>
            <div className="volt-mysterybox-tracker__body">
                <div className="volt-mysterybox-tracker__header" />
                <NativeText
                    className="volt-mysterybox-tracker__title"
                    background={HEADER_COLOR}
                    maxWidth={150}
                    overrides={{ size: 10, bold: true, color: 0xffffff }}
                    text={LocalizeText('mysterybox.tracker.title')}
                    textStyle="regular"
                />
                <NativeText
                    className="volt-mysterybox-tracker__description"
                    transparent
                    background={BODY_COLOR}
                    maxWidth={174}
                    overrides={{ color: 0xffffff }}
                    text={LocalizeText('mysterybox.tracker.description')}
                    textStyle="regular"
                />
                <div className="volt-mysterybox-tracker__slots">
                    <TrackerSlot color={boxColor} icon="box" x={0} />
                    <TrackerSlot color={keyColor} icon="key" x={50} />
                </div>
                {faqUrl !== '' && (
                    <button className="volt-mysterybox-tracker__faq" type="button" onClick={() => OpenUrl(faqUrl)}>
                        <NativeText
                            transparent
                            background={BODY_COLOR}
                            overrides={{ color: 0x00beff }}
                            text={LocalizeText('mysterybox.tracker.link')}
                            textStyle="u_bold"
                        />
                    </button>
                )}
            </div>
            <button
                aria-expanded={!isMinimised}
                aria-label={LocalizeText('mysterybox.tracker.title')}
                className="volt-mysterybox-tracker__toggle"
                type="button"
                onClick={() => toggle(!isMinimised)}
            >
                <img alt="" draggable={false} src={isMinimised ? maximizeIcon : minimizeIcon} />
            </button>
            {isMinimised && boxColor && <SmallIcon color={boxColor} height={20} src={boxSmall} width={19} x={124} y={2} />}
            {isMinimised && keyColor && <SmallIcon color={keyColor} height={19} src={keySmall} width={20} x={144} y={3} />}
        </div>
    );
};
