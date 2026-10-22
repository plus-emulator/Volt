import { FC, ReactNode, SyntheticEvent, useState } from 'react';
import { CatalogType, GetConfigurationValue, IPurchasableOffer, LocalizeText, ProductTypeEnum } from '../../../../../api';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { getCatalogGridMetrics, useCatalogData, useCatalogDisplayPreferences, useCatalogUiState } from '../../../../../hooks';
import { getCatalogPlainText } from '../../../catalogLocalization.helpers';
import { CatalogHeaderView } from '../../catalog-header/CatalogHeaderView';
import { CatalogAddOnBadgeWidgetView } from '../widgets/CatalogAddOnBadgeWidgetView';
import { CatalogBuilderWidgetView } from '../widgets/CatalogBuilderWidgetView';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogLimitedItemWidgetView } from '../widgets/CatalogLimitedItemWidgetView';
import { CatalogPreviewControls } from '../widgets/CatalogPreviewControls';
import { CatalogProductDetailsView } from '../widgets/CatalogProductDetailsView';
import { CatalogPurchaseSelectionPrompt } from '../widgets/CatalogPurchaseSelectionPrompt';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogSpinnerWidgetView } from '../widgets/CatalogSpinnerWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

interface CatalogLayoutDefaultViewProps extends CatalogLayoutProps {
    /** `default_3x3_color_grouping`: grouped grid offers plus the colour grid that sits under the item grid. */
    gridOffers?: IPurchasableOffer[];
    isGridOfferActive?: (offer: IPurchasableOffer) => boolean;
    colourGrid?: ReactNode;
    /** Extra layout class, e.g. `is-recolorable` for the `recolorable_furniture` geometry. */
    layoutClassName?: string;
    previewHeight?: number;
}

/** LocalizationCatalogWidget.setElementImage: the teaser keeps its own size, centred on whole pixels in the product view. */
const CatalogTeaserImageView: FC<{ src: string }> = ({ src }) => {
    const [offset, setOffset] = useState<{ left: number; top: number }>(null);

    const onLoad = (event: SyntheticEvent<HTMLImageElement>) => {
        const image = event.currentTarget;
        const view = image.parentElement;

        setOffset({
            left: Math.floor((view.clientWidth - image.naturalWidth) / 2),
            top: Math.floor((view.clientHeight - image.naturalHeight) / 2)
        });
    };

    return (
        <img
            alt=""
            className="volt-catalog-welcome-image"
            src={src}
            style={offset ? { left: offset.left, top: offset.top } : { visibility: 'hidden' }}
            onLoad={onLoad}
        />
    );
};

export const CatalogLayoutDefaultView: FC<CatalogLayoutDefaultViewProps> = (props) => {
    const { page = null, gridOffers, isGridOfferActive, colourGrid = null, layoutClassName = '', previewHeight = 240 } = props;
    const { currentOffer = null, currentPage = null, roomPreviewer = null } = useCatalogData();
    const { currentType = CatalogType.NORMAL } = useCatalogUiState();
    const isBuilder = currentType === CatalogType.BUILDER;
    const { density = 'standard', showTilePrices = true } = useCatalogDisplayPreferences();
    const gridMetrics = getCatalogGridMetrics(density);

    // PageLocalization: text 1 is ctlg_description, the line in the product view before an offer is picked.
    const teaserText = (page?.localization.getText(1) ?? '').replace(/\r\n?/g, '\n');
    const hasTeaserText = !!teaserText.replace(/<[^>]*>/g, '').trim();
    // SpinnerCatalogWidget and TotalPriceWidget hide themselves on Builders Club pages.
    const showBundlePurchase =
        !isBuilder &&
        !!currentOffer?.bundlePurchaseAllowed &&
        GetConfigurationValue<boolean>('catalog.multiple.purchase.enabled', true);
    const isBundleOffer = currentOffer?.pricingModel === 'pricing_model_bundle';

    return (
        <div className={`volt-catalog-default-layout flex flex-col h-full gap-2 ${colourGrid ? 'has-colour-grid' : ''} ${layoutClassName}`}>
            <div className="volt-catalog-product-view">
                {currentOffer && (
                    <div className="volt-catalog-offer-panel flex gap-0">
                        <div
                            className={`volt-catalog-offer-preview relative flex items-center justify-center ${currentOffer.product.productType === ProductTypeEnum.BADGE ? 'is-badge' : ''} ${isBundleOffer ? 'is-bundle' : ''}`}
                            style={{ flex: '1 1 auto', minWidth: 0, width: '100%' }}
                        >
                            <div className="volt-catalog-preview-details">
                                <CatalogProductDetailsView offer={currentOffer} />
                            </div>
                            <div className="volt-catalog-preview-limited">
                                <CatalogLimitedItemWidgetView />
                            </div>
                            {currentOffer.product.productType !== ProductTypeEnum.BADGE && (
                                <>
                                    {!isBundleOffer && <CatalogPreviewControls productType={currentOffer.product.productType} roomPreviewer={roomPreviewer} />}
                                    <CatalogViewProductWidgetView height={previewHeight} />
                                    <CatalogAddOnBadgeWidgetView className="bg-muted rounded bottom-1 right-1 absolute" />
                                </>
                            )}
                            {currentOffer.product.productType === ProductTypeEnum.BADGE && <CatalogAddOnBadgeWidgetView className="scale-200" />}
                        </div>
                    </div>
                )}

                {!currentOffer && (
                    <div className="volt-catalog-welcome">
                        {!!page.localization.getImage(1) && <CatalogTeaserImageView key={page.localization.getImage(1)} src={page.localization.getImage(1)} />}
                        {hasTeaserText && (
                            <NativeText
                                nativeResolution
                                background={0xe9e9e1}
                                className="volt-catalog-welcome-description"
                                maxWidth={280}
                                overrides={{ italic: true }}
                                text={getCatalogPlainText(teaserText)}
                                textStyle="u_small"
                            />
                        )}
                    </div>
                )}
            </div>

            <div className="volt-catalog-grid-shell flex-1 overflow-auto min-h-0">
                {GetConfigurationValue('catalog.headers') && <CatalogHeaderView imageUrl={currentPage.localization.getImage(0)} />}
                <CatalogItemGridWidgetView
                    className={`volt-catalog-grid volt-catalog-grid-density-${density}`}
                    isOfferActive={isGridOfferActive}
                    offers={gridOffers}
                    showPrices={showTilePrices}
                    {...gridMetrics}
                />
            </div>

            {colourGrid}

            {showBundlePurchase && (
                <div className="volt-catalog-price-row flex items-center justify-between gap-2">
                    <div className="volt-catalog-spinner-slot">
                        <CatalogSpinnerWidgetView />
                    </div>
                    <div className="volt-catalog-total-price-slot">
                        <span className="volt-catalog-total-price-label">
                            <NativeText nativeResolution background={0xe9e9e1} overrides={{ color: 0x666666 }} text={LocalizeText('catalog.bundlewidget.price')} textStyle="u_regular" />
                        </span>
                        <CatalogTotalPriceWidget classNames={['volt-catalog-total-price-value']} />
                    </div>
                </div>
            )}

            <div className={`volt-catalog-purchase-row flex items-start justify-end ${isBuilder ? 'is-builder' : ''}`}>
                {isBuilder ? (
                    <CatalogBuilderWidgetView />
                ) : currentOffer ? (
                    <div className="volt-catalog-offer-actions flex gap-1.5">
                        <CatalogPurchaseWidgetView />
                    </div>
                ) : (
                    <CatalogPurchaseSelectionPrompt />
                )}
            </div>
        </div>
    );
};
