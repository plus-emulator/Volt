import { FC } from 'react';
import { IPurchasableOffer } from '../../../../../api';
import { LayoutActivityPointIcon } from '../../../../../common';
import { NativeText } from '../../../../../common/native-text/NativeText';

/** The price fields getPriceArray reads, so club offers can use the same box. */
export type CatalogPriceBoxOffer = Pick<IPurchasableOffer, 'priceInCredits' | 'priceInActivityPoints' | 'activityPointType'>;

interface CatalogPriceBoxViewProps {
    offer: CatalogPriceBoxOffer;
    /** The surface colour under the amount texts. */
    background: number;
    className?: string;
}

/**
 * AIR price_display, filled by HabboCatalogUtils.showPriceInContainer: an itemlist_horizontal with 1px spacing that holds a
 * 1px spacer, then for each price an amount text (u_bold at font size 14, "+ " before the second one) at y 1 and its 24px
 * big currency icon window, then a 2px spacer. getPriceArray lists credits, then activity points, and 0 credits when free.
 */
export const CatalogPriceBoxView: FC<CatalogPriceBoxViewProps> = ({ offer, background, className = '' }) => {
    if (!offer) return null;

    const prices: { amount: number; unit: number }[] = [];

    if (offer.priceInCredits > 0) prices.push({ amount: offer.priceInCredits, unit: -1 });
    if (offer.priceInActivityPoints > 0) prices.push({ amount: offer.priceInActivityPoints, unit: offer.activityPointType });
    if (!prices.length) prices.push({ amount: 0, unit: -1 });

    return (
        <div className={`volt-catalog-price-box ${className}`.trim()}>
            {prices.map((price, index) => (
                <div key={index} className="volt-catalog-price-box-item">
                    <NativeText
                        className="volt-catalog-price-box-amount"
                        background={background}
                        overrides={{ size: 14 }}
                        text={(index > 0 ? '+ ' : '') + price.amount}
                        textStyle="u_bold"
                    />
                    <span className="volt-catalog-price-box-unit">
                        <LayoutActivityPointIcon big type={price.unit} />
                    </span>
                </div>
            ))}
        </div>
    );
};
