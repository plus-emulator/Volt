import { CatalogPageMessageOfferData } from '@volt/renderer';
import { FC, useCallback } from 'react';
import { GetProductDataForLocalization, LocalizeText, ProductImageUtility } from '../../../../../../api';
import { LayoutImage } from '../../../../../../common';
import { NativeText } from '../../../../../../common/native-text/NativeText';

/** club_gift_list_item: border style 0 tinted 0xe3e3e3, the colour behind its texts. */
const ROW_BACKGROUND = 0xe3e3e3;

export interface VipGiftItemViewProps {
    offer: CatalogPageMessageOfferData;
    isAvailable: boolean;
    isVip?: boolean;
    requirementText?: string;
    onSelect(localizationId: string): void;
}

export const VipGiftItem: FC<VipGiftItemViewProps> = (props) => {
    const { offer = null, isAvailable = false, isVip = false, requirementText = '', onSelect = null } = props;

    const getImageUrlForOffer = useCallback(() => {
        if (!offer || !offer.products.length) return '';

        const productData = offer.products[0];

        return ProductImageUtility.getProductImageUrl(productData.productType, productData.furniClassId, productData.extraParam);
    }, [offer]);

    // ClubGiftWidget.createListItem names the gift after its product data; AIR's product data keeps no description, so gift_desc stays empty.
    const getItemTitle = useCallback(() => {
        if (!offer || !offer.products.length) return '';

        const productName = GetProductDataForLocalization(offer.localizationId)?.name;

        if (productName) return productName;

        const productData = offer.products[0];

        const localizationKey =
            ProductImageUtility.getProductCategory(productData.productType, productData.furniClassId) === 2
                ? 'wallItem.name.' + productData.furniClassId
                : 'roomItem.name.' + productData.furniClassId;

        return LocalizeText(localizationKey);
    }, [offer]);

    // Official club_gift_list_item: image box left, name and requirement beside it,
    // Select bottom right (enabled only while this gift can be chosen), VIP mark in the corner.
    return (
        <div className="volt-catalog-club-gift">
            <div className="volt-catalog-club-gift-image">
                <LayoutImage imageUrl={getImageUrlForOffer()} />
            </div>
            {isVip && <span aria-hidden="true" className="volt-club-compact-mark is-vip volt-catalog-club-gift-vip" />}
            <NativeText tinted className="volt-catalog-club-gift-name" background={ROW_BACKGROUND} text={getItemTitle()} textStyle="u_bold" />
            {!!requirementText && (
                <NativeText className="volt-catalog-club-gift-requirement" background={ROW_BACKGROUND} maxWidth={236} text={requirementText} textStyle="u_small" />
            )}
            <button
                aria-disabled={!isAvailable}
                className="volt-catalog-club-gift-select"
                disabled={!isAvailable}
                type="button"
                onClick={() => {
                    if (!isAvailable) return;

                    onSelect(offer.localizationId);
                }}
            >
                {LocalizeText('catalog.club_gift.select')}
            </button>
        </div>
    );
};
