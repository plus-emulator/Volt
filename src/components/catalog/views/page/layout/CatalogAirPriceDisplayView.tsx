import { CSSProperties, FC } from 'react';
import { IPurchasableOffer } from '../../../../../api';
import { CatalogPriceBoxView } from '../widgets/CatalogPriceBoxView';

/** Border style 6 tints set by showPriceOnProduct, with the centre colour of each tinted skin (the surface under the amounts). */
export const AIR_PRICE_TINTS = {
    none: 0xbab8b4,
    credits: 0xa68e58,
    duckets: 0x7c8e97,
    points: 0x63988d
} as const;

export type AirPriceTint = keyof typeof AIR_PRICE_TINTS;

/** HabboCatalogUtils.showPriceOnProduct: gold with no activity points, blue for duckets only, green for other points only. */
export const getAirPriceTint = (offer: IPurchasableOffer): AirPriceTint => {
    if (offer.priceInCredits === 0 && offer.priceInActivityPoints > 0) return offer.activityPointType === 0 ? 'duckets' : 'points';
    if (offer.priceInActivityPoints === 0) return 'credits';

    return 'none';
};

interface CatalogAirPriceDisplayViewProps {
    offer: IPurchasableOffer;
    className?: string;
    style?: CSSProperties;
}

/**
 * AIR priceDisplayWidget (HabboCatalogUtils.showPriceOnProduct): a border style 6 at least 20x28 (29 high), tinted by the
 * currency, that grows to an itemlist of a 3px spacer, price_box_new at (3, 4) holding price_display, and another 3px spacer.
 */
export const CatalogAirPriceDisplayView: FC<CatalogAirPriceDisplayViewProps> = ({ offer, className = '', style }) => {
    if (!offer || offer.page?.isBuilderPage) return null;

    const tint = getAirPriceTint(offer);

    return (
        <div className={`volt-catalog-air-price-display is-${tint} ${className}`.trim()} style={style}>
            <CatalogPriceBoxView background={AIR_PRICE_TINTS[tint]} offer={offer} />
        </div>
    );
};
