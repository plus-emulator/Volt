import { FC } from 'react';
import { IPurchasableOffer } from '../../../../../api';
import { getCatalogBundlePrice, ICatalogBundlePrice } from '../../../../../api/catalog/CatalogBundleDiscount';
import { LayoutCurrencyIcon } from '../../../../../common';
import { SubpixelText } from '../../../../../common/native-text/SubpixelText';
import { useCatalogBundleDiscountRuleset, useCatalogUiState } from '../../../../../hooks';

interface CatalogPriceDisplayWidgetViewProps {
    offer: IPurchasableOffer;
    separator?: boolean;
    bigIcons?: boolean;
}

export const CatalogPriceDisplayWidgetView: FC<CatalogPriceDisplayWidgetViewProps> = (props) => {
    const { offer = null, separator = false, bigIcons = false } = props;
    const { purchaseOptions = null } = useCatalogUiState();
    const { data: bundleDiscountRuleset = null } = useCatalogBundleDiscountRuleset();
    const { quantity = 1 } = purchaseOptions;

    if (!offer) return null;

    const credits = getCatalogBundlePrice(offer.priceInCredits, quantity, offer.bundlePurchaseAllowed, bundleDiscountRuleset);
    const activityPoints = getCatalogBundlePrice(offer.priceInActivityPoints, quantity, offer.bundlePurchaseAllowed, bundleDiscountRuleset);

    // totalPriceWidget amount texts: bold on sub-pixel pens, the struck original price in 0x999999.
    const Price = ({ price }: { price: ICatalogBundlePrice }) => (
        <>
            {price.hasDiscount && (
                <SubpixelText
                    transparent
                    background={0xe9e9e1}
                    className="volt-catalog-standard-price-original"
                    color={0x999999}
                    text={String(price.originalPrice)}
                    textStyle="u_bold"
                />
            )}
            <SubpixelText transparent background={0xe9e9e1} className="volt-catalog-standard-price-text" text={String(price.price)} textStyle="u_bold" />
        </>
    );

    return (
        <div className="volt-catalog-standard-price-display">
            {offer.priceInCredits > 0 && (
                <div className="volt-catalog-standard-price-pill is-credits" data-currency-type="-1">
                    <Price price={credits} />
                    <LayoutCurrencyIcon type={-1} />
                </div>
            )}
            {separator && offer.priceInCredits > 0 && offer.priceInActivityPoints > 0 && (
                <SubpixelText transparent background={0xe9e9e1} className="volt-catalog-standard-price-plus" text="+" textStyle="u_bold" />
            )}
            {offer.priceInActivityPoints > 0 && (
                <div className="volt-catalog-standard-price-pill is-activity-points" data-currency-type={offer.activityPointType}>
                    <Price price={activityPoints} />
                    <LayoutCurrencyIcon big={bigIcons} type={offer.activityPointType} />
                </div>
            )}
        </div>
    );
};
