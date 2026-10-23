import { FC, useEffect } from 'react';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { useCatalogData } from '../../../../../hooks';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogSpacesWidgetView } from '../widgets/CatalogSpacesWidgetView';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogAirPriceDisplayView } from './CatalogAirPriceDisplayView';
import { CatalogLayoutProps } from './CatalogLayout.types';

/** The catalog page colour behind the AIR text rasters. */
const PAGE_BACKGROUND = 0xe9e9e1;

/**
 * AIR layout_spaces_new (360x460): productViewWidget (0, 0, 360x240, NO_ROOM_CANVAS) with ctlg_product_name (u_bold) and
 * ctlg_description (u_small italic) stacked at 10,12 in black and the price 6px in from its bottom right, roomPreviewWidget
 * over it, spacesNewWidget (0, 245, 360x180) and purchaseWidget (0, 430).
 */
export const CatalogLayoutSpacesView: FC<CatalogLayoutProps> = () => {
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();

    useEffect(() => {
        roomPreviewer?.updatePreviewObjectBoundingRectangle();
    }, [roomPreviewer]);

    return (
        <div className="volt-air-spaces-layout">
            <div className="volt-air-spaces-preview">
                {/* roomPreviewWidget draws a still room image (RoomEngine.getRoomImage); Volt shows the live room preview instead. */}
                {currentOffer && <CatalogViewProductWidgetView height={240} />}
                {currentOffer && (
                    <div className="volt-air-spaces-details">
                        <NativeText background={PAGE_BACKGROUND} maxWidth={280} overrides={{ color: 0x000000 }} text={currentOffer.localizationName} textStyle="u_bold" />
                        {!!currentOffer.localizationDescription && (
                            <NativeText
                                background={PAGE_BACKGROUND}
                                maxWidth={280}
                                overrides={{ color: 0x000000, italic: true }}
                                text={currentOffer.localizationDescription}
                                textStyle="u_small"
                            />
                        )}
                    </div>
                )}
                {currentOffer && <CatalogAirPriceDisplayView className="volt-air-spaces-price" offer={currentOffer} />}
            </div>
            <CatalogSpacesWidgetView />
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
