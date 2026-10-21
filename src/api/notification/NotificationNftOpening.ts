import { NftProductData } from '@volt/renderer';

/** The extra data of a nft_opening notification (CollectiblesController.onRedeemLootBoxStateEvent): the reward and its rarity. */
export interface NotificationNftOpening {
    product: NftProductData;
    rarity: string;
}
