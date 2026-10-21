import { GetSessionDataManager, NftProductData, NftRewardBoxResultMessageEvent, NftRewardBoxStateMessageEvent } from '@volt/renderer';
import { useState } from 'react';
import { GetCollectibleProductName, LocalizeText, NotificationBubbleType, NotificationNftOpening } from '../../api';
import stampLarge from '../../assets/images/collectibles/collectables-icon-curator-stamp-large.png';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

/** CollectiblesController.onRedeemLootBoxStateEvent / onRedeemLootBoxResultEvent and the CollectiblesRewardBoxView reward queue. */
export const useCollectiblesRewardBox = () => {
    const [rewards, setRewards] = useState<NftProductData[]>([]);
    const { showSingleBubble = null } = useNotification();

    useMessageEvent<NftRewardBoxStateMessageEvent>(NftRewardBoxStateMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.start || !parser.reward) return;

        if (GetSessionDataManager().userId === parser.openerAvatarId) {
            setRewards((current) => [ ...current, parser.reward ]);

            return;
        }

        const text = LocalizeText('collectibles.reward_box.notif.desc', ['name', 'item'], [LocalizeText('generic.someone'), GetCollectibleProductName(parser.reward)]);
        const opening: NotificationNftOpening = { product: parser.reward, rarity: parser.reward.rarity };

        showSingleBubble?.(text, NotificationBubbleType.NFT_OPENING, null, null, '', opening);
    });

    useMessageEvent<NftRewardBoxResultMessageEvent>(NftRewardBoxResultMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.fail) showSingleBubble?.(LocalizeText('generic.error'), NotificationBubbleType.INFO, stampLarge);
        if (parser.notInStarDustWallet) showSingleBubble?.(LocalizeText('collectibles.reward_box.wrong_wallet'), NotificationBubbleType.INFO, stampLarge);
    });

    // showNextRewardOrClose
    const showNext = () => setRewards((current) => current.slice(1));

    return { reward: rewards[0] ?? null, showNext };
};
