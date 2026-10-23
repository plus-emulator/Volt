import { FC } from 'react';
import { GetProductIconUrl, IProduct, ProductTypeEnum } from '../../../../../api';
import { ClassicScrollAreaView, LayoutBadgeImageView } from '../../../../../common';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { useCatalogData } from '../../../../../hooks';
import { CatalogFirstProductSelectorWidgetView } from '../widgets/CatalogFirstProductSelectorWidgetView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogAirHtmlTextView } from './CatalogAirHtmlTextView';
import { CatalogAirPriceDisplayView } from './CatalogAirPriceDisplayView';
import { CatalogAirStaticImageView } from './CatalogAirStaticImageView';
import { CatalogLayoutProps } from './CatalogLayout.types';

/** The catalog page colour behind the AIR text rasters. */
const PAGE_BACKGROUND = 0xe9e9e1;
/** The centre colour of the #e0e0e0 border_slot. */
const SLOT_BACKGROUND = 0xe0e0e0;
/** gridItem: 36x36, columns placed side by side without spacing. */
const GRID_ITEM_SIZE = 36;
const GRID_COLUMNS = 4;

/** gridItem multiContainer: a #ff3300 border style 2 at (18, 21) around the Volter "x<count>" at (3, 0). */
const BundleGridItem: FC<{ product: IProduct; iconUrl: string; index: number }> = ({ product, iconUrl, index }) => (
    <div
        className="volt-air-bundle-item"
        style={{ left: (index % GRID_COLUMNS) * GRID_ITEM_SIZE, top: Math.floor(index / GRID_COLUMNS) * GRID_ITEM_SIZE }}
    >
        <CatalogAirStaticImageView height={GRID_ITEM_SIZE} pivot="center" src={iconUrl} width={GRID_ITEM_SIZE} />
        {product.productCount > 1 && (
            <div className="volt-air-bundle-item-count">
                <NativeText background={0xff3300} overrides={{ color: 0xcccc66 }} text={`x${product.productCount}`} textStyle="regular" />
            </div>
        )}
    </div>
);

/**
 * AIR layout_single_bundle (360x460): html ctlg_description at 15,13 and ctlg_special_txt at 159,92, bundleGridScrollWidget
 * (border style 6, 164,117 186x247) with its bundleGrid at 4,3, the ctlg_teaserimg_1 static_bitmap at 6,119 157x238, a
 * #e0e0e0 border style 3 at 17,385 324x40 holding ctlg_special_img (10,5) and the bold ctlg_text_1 (51,10),
 * addOnBadgeViewWidget at 12,125, simplePriceWidget at 74,125 83x30 and purchaseWidget at 0,430.
 */
export const CatalogLayoutSingleBundleView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null } = useCatalogData();
    // BundleGridViewCatalogWidget.populateItemGrid: every product of the offer except badges.
    const products = (currentOffer?.products ?? []).filter((product) => product.productType !== ProductTypeEnum.BADGE);
    const rows = Math.ceil(products.length / GRID_COLUMNS);

    return (
        <div className="volt-air-bundle-layout">
            <CatalogFirstProductSelectorWidgetView />
            <CatalogAirHtmlTextView background={PAGE_BACKGROUND} className="volt-air-bundle-description" height={62} html={page.localization.getText(1)} width={329} />
            <CatalogAirHtmlTextView background={PAGE_BACKGROUND} className="volt-air-bundle-special-text" height={25} html={page.localization.getText(2)} width={173} />
            <div className="volt-air-bundle-grid-border">
                <ClassicScrollAreaView className="volt-air-bundle-grid-scroll">
                    <div className="volt-air-bundle-grid" style={{ height: rows * GRID_ITEM_SIZE }}>
                        {products.map((product, index) => (
                            <BundleGridItem key={index} iconUrl={GetProductIconUrl(product, currentOffer)} index={index} product={product} />
                        ))}
                    </div>
                </ClassicScrollAreaView>
            </div>
            <CatalogAirStaticImageView className="volt-air-bundle-teaser" height={238} pivot="center" src={page.localization.getImage(1)} width={157} />
            <div className="volt-air-bundle-info">
                <CatalogAirStaticImageView className="volt-air-bundle-special-image" height={30} pivot="center" src={page.localization.getImage(2)} width={32} />
                <CatalogAirHtmlTextView bold background={SLOT_BACKGROUND} className="volt-air-bundle-info-text" height={22} html={page.localization.getText(3)} width={256} />
            </div>
            {!!currentOffer?.badgeCode && (
                <div className="volt-air-bundle-badge">
                    <LayoutBadgeImageView badgeCode={currentOffer.badgeCode} />
                </div>
            )}
            {/* simplePriceWidget: showPriceOnProduct puts the price at fake_productimage's top right (x = 83 - width, y = 0). */}
            <div className="volt-air-bundle-price">
                <CatalogAirPriceDisplayView offer={currentOffer} />
            </div>
            <div className="volt-catalog-purchase-row">
                {currentOffer && (
                    <div className="volt-catalog-offer-actions">
                        <CatalogPurchaseWidgetView />
                    </div>
                )}
            </div>
        </div>
    );
};
