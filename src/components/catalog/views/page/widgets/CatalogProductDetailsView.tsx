import { FC } from 'react';
import { IPurchasableOffer, LocalizeText, Offer, ProductTypeEnum } from '../../../../../api';
import noRecycleIcon from '../../../../../assets/images/catalog/air/inventory-furni-no-recycle.png';
import noTradeIcon from '../../../../../assets/images/catalog/air/inventory-furni-no-trade.png';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { useCatalogProductMetadata, useCatalogUiState } from '../../../../../hooks';

export const CatalogProductDetailsView: FC<{ offer: IPurchasableOffer }> = ({ offer }) => {
    const { currentType = 'NORMAL' } = useCatalogUiState();
    const metadata = useCatalogProductMetadata(offer?.page?.pageId ?? 0, currentType);

    if (!offer) return null;

    const product = offer.product;
    const name = offer.localizationName || product?.productData?.name || '';
    const description = offer.localizationDescription;
    const isFurniture = product?.productType === ProductTypeEnum.FLOOR || product?.productType === ProductTypeEnum.WALL;
    const offerMetadata = metadata?.filter((entry) => entry.offerId === offer.offerId) ?? [];
    const productMetadata =
        offerMetadata.find((entry) => entry.itemBaseId === product?.furnitureData?.id) ??
        offerMetadata.find((entry) => entry.productClassId === product?.productClassId);
    // ProductViewCatalogWidget.updateAvailabilityIndicators: no trade or recycle markers on Builders Club pages.
    const hasMetadata = !offer?.page?.isBuilderPage && isFurniture && !!productMetadata;
    const tradeable = hasMetadata && productMetadata.tradeable;
    const recyclable = hasMetadata && productMetadata.recyclable;
    const showNoTrade = hasMetadata && !tradeable;
    const showNoRecycle = hasMetadata && (!recyclable || !tradeable);
    const tradeableLabel = LocalizeText('shop.marketplace.item.not.tradeable');
    const recyclableLabel = LocalizeText('recycler.alert.non.recyclable');
    // ProductViewCatalogWidget: the texts turn black when no room canvas is shown (deals and badges).
    const textColor = offer.pricingModel === Offer.PRICING_MODEL_BUNDLE || product?.productType === ProductTypeEnum.BADGE ? 0x000000 : 0xffffff;

    return (
        <div aria-label={name} className="volt-catalog-product-details" role="group">
            {/* ctlg_product_name (u_bold) and ctlg_description (u_small italic), 280px wide: white over the room canvas, black when it is hidden. */}
            <NativeText
                nativeResolution
                transparent
                background={textColor ^ 0xffffff}
                className="volt-catalog-product-details-name"
                maxWidth={280}
                overrides={{ color: textColor }}
                text={name}
                textStyle="u_bold"
            />
            {!!description && (
                <NativeText
                    nativeResolution
                    transparent
                    background={textColor ^ 0xffffff}
                    className="volt-catalog-product-details-description"
                    maxWidth={280}
                    overrides={{ color: textColor, italic: true }}
                    text={description}
                    textStyle="u_small"
                />
            )}
            {(showNoTrade || showNoRecycle) && (
                <div className="volt-catalog-product-details-badges" role="list">
                    {showNoTrade && (
                        <span
                            aria-label={tradeableLabel}
                            className="volt-catalog-product-capability is-no-trade"
                            data-capability="tradeable"
                            role="listitem"
                            title={tradeableLabel}
                        >
                            <img alt="" aria-hidden="true" src={noTradeIcon} />
                        </span>
                    )}
                    {showNoRecycle && (
                        <span
                            aria-label={recyclableLabel}
                            className="volt-catalog-product-capability is-no-recycle"
                            data-capability="recyclable"
                            role="listitem"
                            title={recyclableLabel}
                        >
                            <img alt="" aria-hidden="true" src={noRecycleIcon} />
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
