import { FC } from 'react';
import { GetCollectibleRarityColor, LocalizeText, NotificationBubbleItem } from '../../../../api';
import { CollectibleProductIconView } from '../../../collectibles/CollectibleProductImageView';
import { at, ShinyButton, SkinBorder } from '../../../collectibles/CollectiblesSkinView';
import { BUBBLE_FADE_IN_MS, useNativeBubbleLife } from '../native/useNativeBubbleLife';

interface NotificationNftOpeningBubbleViewProps {
    item: NotificationBubbleItem;
    onClose: () => void;
}

/** notification_nft_opening_xml as HabboNotificationItemView.showNftOpeningNotification fills it: the reward icon and a rarity button. */
export const NotificationNftOpeningBubbleView: FC<NotificationNftOpeningBubbleViewProps> = ({ item, onClose }) => {
    const { shown, dismiss, hoverProps } = useNativeBubbleLife(onClose);
    const opening = item.nftOpening;

    return (
        <div className="volt-native-bubble-slot">
            <div
                className="volt-collectibles-nft-opening"
                style={{ opacity: shown ? 1 : 0, transition: `opacity ${BUBBLE_FADE_IN_MS}ms linear` }}
                onClick={dismiss}
                {...hoverProps}
            >
                <SkinBorder color={0x006154} skin="colorless" style={at(0, 0, 190, 110)} />
                <SkinBorder color={0x012723} skin="colorless" style={at(0, 0, 190, 24)} />
                <div className="volt-collectibles-nft-opening-header-fill" style={at(0, 15, 190, 10)} />
                <div className="volt-collectibles-nft-opening-title" style={at(7, 4, 194, 17)}>
                    {LocalizeText('collectibles.reward_box.notif.title')}
                </div>
                <div className="volt-collectibles-nft-opening-icon" style={at(9, 31, 40, 40)}>
                    {opening && <CollectibleProductIconView product={opening.product} variant="widget" />}
                </div>
                <div className="volt-collectibles-nft-opening-text" style={at(65, 29, 115, 50)}>
                    {item.message}
                </div>
                <ShinyButton
                    caption={`${LocalizeText('collectibles.item.rarity')}: ${opening?.rarity ?? ''}`}
                    color={GetCollectibleRarityColor(opening?.rarity)}
                    style={at(6, 80, 178, 25)}
                    whiteCaption={false}
                    onClick={() => {}}
                />
            </div>
        </div>
    );
};
