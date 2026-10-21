import { MintTokenOfferData, NftStoreOfferData } from '@volt/renderer';
import { IPurchasableOffer } from '../catalog';
import { GetProductDataForLocalization } from '../volt/session';

export type CollectiblesPurchase =
    | { kind: 'mint_tokens'; offer: MintTokenOfferData; wallet: string }
    | { kind: 'nft_store'; offer: NftStoreOfferData; wallet: string };

const SILVER = 1000;
const EMERALD = 1001;

/** PurchaseConfirmationDialog.showConfirmationDialog: the product name comes from the product data of the product code. */
export const CreateCollectiblesPurchaseOffer = (purchase: CollectiblesPurchase): IPurchasableOffer => {
    const productCode = purchase.offer.productCode;
    const isMintTokens = purchase.kind === 'mint_tokens';

    return {
        activate: () => {},
        clubLevel: 0,
        page: null,
        offerId: isMintTokens ? purchase.offer.offerId : 0,
        localizationId: productCode,
        priceInCredits: 0,
        priceInActivityPoints: isMintTokens ? purchase.offer.silverPrice : purchase.offer.emeraldPrice,
        activityPointType: isMintTokens ? SILVER : EMERALD,
        giftable: false,
        product: null,
        pricingModel: '',
        priceType: 'price_type_silver',
        bundlePurchaseAllowed: false,
        isRentOffer: false,
        badgeCode: '',
        localizationName: GetProductDataForLocalization(productCode)?.name ?? '',
        localizationDescription: '',
        isLazy: false,
        products: [],
        itemIds: '',
        haveOffer: true
    };
};
