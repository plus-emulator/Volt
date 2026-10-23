import { CSSProperties, FC } from 'react';
import { IPurchasableOffer } from '../../../../../../api';
import { CatalogPriceBoxView } from '../../widgets/CatalogPriceBoxView';
import { AIR_PRICE_TINTS, getAirPriceTint } from '../CatalogAirPriceDisplayView';

/**
 * AIR priceDisplayWidget on the pet preview (HabboCatalogUtils.showPriceOnProduct): a border style 6, 29 high, tinted by the
 * currency, around price_box_new at (3, 4). The pet pages place it absolutely.
 */
export const CatalogPetPriceDisplayView: FC<{ offer: IPurchasableOffer; className?: string; style?: CSSProperties }> = ({ offer, className = '', style }) => {
    if (!offer || offer.page?.isBuilderPage) return null;

    const tint = getAirPriceTint(offer);

    return (
        <div className={`volt-catalog-pet-price is-${tint} ${className}`.trim()} style={style}>
            <CatalogPriceBoxView background={AIR_PRICE_TINTS[tint]} offer={offer} />
        </div>
    );
};
