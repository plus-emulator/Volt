import {
    CancelMysteryBoxWaitMessageEvent,
    GetSessionDataManager,
    GotMysteryBoxPrizeMessageEvent,
    MysteryBoxWaitingCanceledMessageComposer,
    ShowMysteryBoxWaitMessageEvent
} from '@volt/renderer';
import { FC, useState } from 'react';
import { GetConfigurationValue, LocalizeText, SendMessageComposer } from '../../../../api';
import borderSunkAtlas from '../../../../assets/mod-tools/skins/border-sunk.png';
import borderSunkXml from '../../../../assets/mod-tools/skins/border-sunk.xml?raw';
import { AirFrame } from '../../../../common/air/AirWindow';
import { LayoutPrizeProductImageView } from '../../../../common/layout/LayoutPrizeProductImageView';
import { NativeText } from '../../../../common/native-text/NativeText';
import { useMessageEvent } from '../../../../hooks';
import { parseNativeSkin } from '../../../mod-tools/native/NativeSkin';
import { NativeSkinView } from '../../../mod-tools/native/NativeSkinView';
import { NativeModalView } from '../../../notification-center/views/native/NativeModalView';
import { IlluminaLightButton } from '../mysterybox/IlluminaLightButton';
import { mysteryBoxTint } from '../mysterybox/MysteryBoxColors';
import { MysteryBoxIconView } from '../mysterybox/MysteryBoxIconView';
import './FurnitureMysteryBoxOpenDialogView.css';

interface FurnitureMysteryBoxOpenDialogViewProps {
    /** The owner of the box the user used last, or -1. */
    ownerId: number;
}

type Dialog = { kind: 'wait'; ownerId: number; isOwner: boolean; tint: number | null } | { kind: 'reward'; contentType: string; classId: number };

const BORDER_SUNK = parseNativeSkin(borderSunkXml);
// The body colour of the Illumina frame and of the sunk border.
const BACKGROUND = 0xe2e2e2;

const starUrl = () => `${GetConfigurationValue<string>('image.library.url', '')}Quests/ach_receive_star.png`;

/** The wait dialog (mystery_box_open_dialog) and the reward dialog (mystery_box_reward). Only one is open at a time. */
export const FurnitureMysteryBoxOpenDialogView: FC<FurnitureMysteryBoxOpenDialogViewProps> = ({ ownerId = -1 }) => {
    const [dialog, setDialog] = useState<Dialog>(null);

    useMessageEvent<ShowMysteryBoxWaitMessageEvent>(ShowMysteryBoxWaitMessageEvent, () => {
        const session = GetSessionDataManager();
        const isOwner = session.userId === ownerId;

        setDialog({ kind: 'wait', ownerId, isOwner, tint: mysteryBoxTint(isOwner ? session.mysteryBoxColor : session.mysteryKeyColor) });
    });

    useMessageEvent<CancelMysteryBoxWaitMessageEvent>(CancelMysteryBoxWaitMessageEvent, () => setDialog(null));

    useMessageEvent<GotMysteryBoxPrizeMessageEvent>(GotMysteryBoxPrizeMessageEvent, (event) => {
        const parser = event.getParser();

        setDialog({ kind: 'reward', contentType: parser.contentType, classId: parser.classId });
    });

    if (!dialog) return null;

    if (dialog.kind === 'wait') {
        const role = dialog.isOwner ? 'owner' : 'other';
        const cancel = () => {
            setDialog(null);
            SendMessageComposer(new MysteryBoxWaitingCanceledMessageComposer(dialog.ownerId));
        };

        return (
            <NativeModalView>
                <AirFrame className="volt-mysterybox-wait" title={LocalizeText(`mysterybox.dialog.${role}.title`)} onClose={cancel}>
                    <img alt="" className="volt-mysterybox-star" draggable={false} src={starUrl()} style={{ left: 7, top: 8 }} />
                    <MysteryBoxIconView icon={dialog.isOwner ? 'box' : 'key'} style={{ left: 41, top: 43 }} tint={dialog.tint} />
                    <NativeText
                        background={BACKGROUND}
                        className="volt-mysterybox-at"
                        style={{ left: 115, top: 34 }}
                        text={LocalizeText(`mysterybox.dialog.${role}.subtitle`)}
                        textStyle="il_heading_2"
                    />
                    <div className="volt-mysterybox-sunk">
                        <NativeSkinView atlas={borderSunkAtlas} height={60} layout="illumina_light_border_sunk" skin={BORDER_SUNK} width={310} />
                        <MysteryBoxIconView icon={dialog.isOwner ? 'key' : 'box'} style={{ left: 14, top: 11 }} tint={dialog.tint} />
                        <NativeText
                            background={BACKGROUND}
                            className="volt-mysterybox-at"
                            style={{ left: 62, top: 22 }}
                            text={LocalizeText(`mysterybox.dialog.${role}.waiting`)}
                            textStyle="regular"
                        />
                    </div>
                    <IlluminaLightButton
                        buttonStyle={101}
                        caption={LocalizeText(`mysterybox.dialog.${role}.cancel`)}
                        height={48}
                        width={124}
                        x={117}
                        y={186}
                        onClick={cancel}
                    />
                </AirFrame>
            </NativeModalView>
        );
    }

    const close = () => setDialog(null);

    return (
        <NativeModalView>
            <AirFrame className="volt-mysterybox-reward" title={LocalizeText('mysterybox.reward.text')} onClose={close}>
                <NativeText
                    background={BACKGROUND}
                    className="volt-mysterybox-at"
                    style={{ left: 150, top: 8 }}
                    text={LocalizeText('mysterybox.reward.title')}
                    textStyle="regular"
                />
                <div className="volt-mysterybox-prize">
                    <img alt="" className="volt-mysterybox-star" draggable={false} src={starUrl()} />
                    <div className="volt-mysterybox-prize__image">
                        <LayoutPrizeProductImageView classId={dialog.classId} productType={dialog.contentType} />
                    </div>
                </div>
                <IlluminaLightButton
                    buttonStyle={100}
                    caption={LocalizeText('mysterybox.reward.close')}
                    height={52}
                    width={175}
                    x={127}
                    y={141}
                    onClick={close}
                />
            </AirFrame>
        </NativeModalView>
    );
};
