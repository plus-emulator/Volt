import { FC } from 'react';
import { GetImageIconUrlForProduct, LocalizeText, MarketPlaceOfferState, MarketplaceOfferData, ProductTypeEnum } from '../../../../../../api';
import { LayoutLimitedEditionStyledNumberView } from '../../../../../../common';
import { NativeText } from '../../../../../../common/native-text/NativeText';
import { CatalogAirShinyButton } from '../CatalogAirShinyButton';

export interface MarketplaceItemViewProps {
    offerData: MarketplaceOfferData;
    type?: number;
    onClick(offerData: MarketplaceOfferData): void;
}

export const OWN_OFFER = 1;
export const PUBLIC_OFFER = 2;

/** The offer_item / ongoing_item, sold_item and expired_item border colours (background="true"). */
const ROW_COLOR: Record<number, number> = {
    [MarketPlaceOfferState.ONGOING]: 0xf6f6f3,
    [MarketPlaceOfferState.SOLD]: 0xe2f5d8,
    [MarketPlaceOfferState.EXPIRED]: 0xf5d5d3
};

/** MarketPlaceOwnItemsCatalogWidget.updateList: at least one minute, split into hours and minutes. */
const getTimeLeft = (minutesLeft: number) => {
    const time = Math.max(1, minutesLeft);
    const hours = Math.floor(time / 60);
    const minutes = time - hours * 60;
    let text = minutes + ' ' + LocalizeText('catalog.marketplace.offer.minutes');

    if (hours > 0) text = hours + ' ' + LocalizeText('catalog.marketplace.offer.hours') + ' ' + text;

    return LocalizeText('catalog.marketplace.offer.time_left', ['time'], [text]);
};

/**
 * A 340x58 offer row of AIR layout_marketplace (offer_item) or layout_marketplace_own_items (ongoing_item, sold_item,
 * expired_item): border style 100 over the row colour, the 40x40 icon box at (9, 9) and the texts at x 57 (public) or 58 (own).
 */
export const CatalogLayoutMarketplaceItemView: FC<MarketplaceItemViewProps> = ({ offerData = null, type = PUBLIC_OFFER, onClick = null }) => {
    if (!offerData) return null;

    const isOwn = type === OWN_OFFER;
    const status = isOwn ? offerData.status : MarketPlaceOfferState.ONGOING;
    const background = ROW_COLOR[status] ?? ROW_COLOR[MarketPlaceOfferState.ONGOING];
    const textX = isOwn ? 58 : 57;
    const textY = isOwn ? 5 : 6;
    const localizationKey = (offerData.furniType === MarketplaceOfferData.TYPE_WALL ? 'wallItem' : 'roomItem') + '.%s.' + offerData.furniId;
    const icon = GetImageIconUrlForProduct(
        offerData.furniType === MarketplaceOfferData.TYPE_FLOOR ? ProductTypeEnum.FLOOR : ProductTypeEnum.WALL,
        offerData.furniId,
        offerData.extraData
    );
    const lines: { key: string; text: string; style: 'u_bold' | 'u_small'; y: number; italic?: boolean }[] = [
        { key: 'name', text: LocalizeText(localizationKey.replace('%s', 'name')), style: 'u_bold', y: textY }
    ];

    if (isOwn) {
        lines.push({ key: 'desc', text: LocalizeText(localizationKey.replace('%s', 'desc')), style: 'u_small', y: 17, italic: true });

        if (status !== MarketPlaceOfferState.EXPIRED) {
            lines.push({ key: 'price', text: LocalizeText('catalog.marketplace.offer.price_own_item', ['price'], [offerData.price.toString()]), style: 'u_small', y: 29 });
        }

        let statusText = getTimeLeft(offerData.timeLeftMinutes);

        if (status === MarketPlaceOfferState.SOLD) statusText = LocalizeText('catalog.marketplace.offer.sold');
        else if (status === MarketPlaceOfferState.EXPIRED) statusText = LocalizeText('catalog.marketplace.offer.expired');

        lines.push({ key: 'status', text: statusText, style: 'u_small', y: 41 });
    } else {
        const average = offerData.averagePrice !== 0 ? offerData.averagePrice.toString() : ' - ';

        lines.push({
            key: 'price',
            text: LocalizeText('catalog.marketplace.offer.price_public_item', ['price', 'average'], [offerData.price.toString(), average]),
            style: 'u_small',
            y: 30
        });
        lines.push({ key: 'count', text: LocalizeText('catalog.marketplace.offer_count', ['count'], [offerData.offerCount.toString()]), style: 'u_small', y: 42 });
    }

    return (
        <div className="volt-catalog-market-row" style={{ backgroundColor: `#${background.toString(16).padStart(6, '0')}` }}>
            <div className="volt-catalog-market-row-icon">
                {!!icon && <img alt="" draggable={false} src={icon} />}
                {offerData.isUniqueLimitedItem && (
                    <div className="volt-catalog-market-row-ltd">
                        <LayoutLimitedEditionStyledNumberView value={offerData.stuffData.uniqueNumber} />
                    </div>
                )}
            </div>
            {lines.map((line) => (
                <NativeText
                    key={line.key}
                    background={background}
                    className="volt-catalog-market-row-text"
                    overrides={line.italic ? { italic: true } : undefined}
                    style={{ left: textX, top: line.y }}
                    text={line.text}
                    textStyle={line.style}
                />
            ))}
            {isOwn && status === MarketPlaceOfferState.ONGOING && (
                <CatalogAirShinyButton caption={LocalizeText('catalog.marketplace.offer.pick')} rect={[145, 31, 189, 22]} onClick={() => onClick(offerData)} />
            )}
            {!isOwn && (
                <>
                    <CatalogAirShinyButton caption={LocalizeText('buy')} rect={[295, 6, 39, 22]} onClick={() => onClick(offerData)} />
                    {/* more_button opens marketplace_offer_details, which needs the item stats request; Volt has no details view yet. */}
                    <CatalogAirShinyButton disabled caption={LocalizeText('catalog.marketplace.view_more')} rect={[137, 31, 197, 22]} />
                </>
            )}
        </div>
    );
};
