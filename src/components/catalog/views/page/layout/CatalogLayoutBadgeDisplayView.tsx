import { FC } from 'react';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { useCatalogData } from '../../../../../hooks';
import { getCatalogPlainText } from '../../../catalogLocalization.helpers';
import { CatalogCentredImageView } from '../widgets/CatalogCentredImageView';
import { CatalogBadgeSelectorWidgetView } from '../widgets/CatalogBadgeSelectorWidgetView';
import { CatalogFirstProductSelectorWidgetView } from '../widgets/CatalogFirstProductSelectorWidgetView';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogLimitedItemWidgetView } from '../widgets/CatalogLimitedItemWidgetView';
import { CatalogPreviewControls } from '../widgets/CatalogPreviewControls';
import { CatalogProductDetailsView } from '../widgets/CatalogProductDetailsView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutBadgeDisplayView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const isBundleOffer = currentOffer?.pricingModel === 'pricing_model_bundle';
    const teaserImage = page.localization.getImage(1);
    const teaserText = getCatalogPlainText(page.localization.getText(1));

    return (
        <div className="volt-catalog-badge-display-layout">
            <CatalogFirstProductSelectorWidgetView />
            <section className={`volt-catalog-badge-preview ${currentOffer ? '' : 'is-empty'} ${isBundleOffer ? 'is-bundle' : ''}`.trim()}>
                {/* Before UserBadgeSelectorCatalogWidget selects offer 0, the product view shows image 1 centred and text 1. */}
                {!currentOffer && (
                    <>
                        {!!teaserImage && <CatalogCentredImageView key={teaserImage} src={teaserImage} />}
                        {!!teaserText && (
                            <NativeText
                                nativeResolution
                                background={0xe9e9e1}
                                className="volt-catalog-welcome-description"
                                maxWidth={280}
                                overrides={{ italic: true }}
                                text={teaserText}
                                textStyle="u_small"
                            />
                        )}
                    </>
                )}
                {currentOffer && (
                    <>
                        <div className="volt-catalog-badge-product-render">
                            <CatalogViewProductWidgetView height={240} />
                        </div>
                        <div className="volt-catalog-badge-product-copy volt-catalog-preview-details">
                            <CatalogProductDetailsView offer={currentOffer} />
                        </div>
                        {!isBundleOffer && <CatalogPreviewControls productType={currentOffer.product.productType} roomPreviewer={roomPreviewer} />}
                        <div className="volt-catalog-badge-limited">
                            <CatalogLimitedItemWidgetView />
                        </div>
                        <div className="volt-catalog-badge-total-price volt-catalog-preview-price volt-catalog-price-frame">
                            <CatalogTotalPriceWidget alignItems="end" />
                        </div>
                    </>
                )}
            </section>

            <section className="volt-catalog-badge-product-picker">
                <CatalogItemGridWidgetView className="volt-catalog-badge-offer-list" columnCount={1} columnMinHeight={70} columnMinWidth={70} />
            </section>

            <section className="volt-catalog-badge-picker">
                <CatalogBadgeSelectorWidgetView />
            </section>

            <div className="volt-catalog-badge-purchase">{currentOffer && <CatalogPurchaseWidgetView />}</div>
        </div>
    );
};
