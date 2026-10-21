import { NftStoreOfferData } from '@volt/renderer';
import { IPurchasableOffer, Offer } from '../catalog';
import { GetProductDataForLocalization } from '../volt/session';

export type CollectiblesPurchase = { offer: NftStoreOfferData; wallet: string };

const EMERALD = 1001;

/** PurchaseConfirmationDialog.showConfirmationDialog: the product name comes from the product data of the product code. */
export const CreateCollectiblesPurchaseOffer = (purchase: CollectiblesPurchase): IPurchasableOffer => {
    const productCode = purchase.offer.productCode;

    return {
        activate: () => {},
        clubLevel: 0,
        page: null,
        offerId: 0,
        localizationId: productCode,
        priceInCredits: 0,
        priceInActivityPoints: purchase.offer.emeraldPrice,
        activityPointType: EMERALD,
        giftable: false,
        product: null,
        pricingModel: '',
        priceType: Offer.PRICE_TYPE_ACTIVITYPOINTS,
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
