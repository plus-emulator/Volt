import { GetRoomContentLoader, GetRoomEngine, PetCustomPart, RoomContentLoadedEvent } from '@volt/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { LayoutPetImageView } from '../../../../../common';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { useCatalogData, useVoltEvent } from '../../../../../hooks';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogPurchaseSelectionPrompt } from '../widgets/CatalogPurchaseSelectionPrompt';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { buildPetCustomizationPreview, PetCustomizationPreview } from './petCustomization.helpers';
import { CatalogPetPriceDisplayView } from './pets/CatalogPetPriceDisplayView';

/** The catalog page colour behind the AIR text rasters. */
const PAGE_BACKGROUND = 0xe9e9e1;

/** PetPreviewCatalogWidget.init draws a white horse (type 15) on palette 2 before a product is picked. */
const DEFAULT_PREVIEW: PetCustomizationPreview = { typeId: 15, paletteId: 2, parts: [] };

/** A shampoo shows the palette of its colour tag that has breed 1. */
const getShampooPaletteId = (petType: number, tag: string): number | null => {
    const result = GetRoomEngine()
        .getPetColorResultsForTag(petType, tag)
        ?.find((color) => color.breed === 1);

    return result ? Number.parseInt(result.id, 10) : null;
};

/**
 * AIR layout_petcustomization (360x460): itemGridWidget (0, 245, 360x180), petPreviewWidget (0, 0, 360x240) with the pet
 * image centred in ctlg_teaserimg_1, ctlg_product_name (u_bold) at 8,12, ctlg_description (u_regular, 162 wide) 5px below it
 * and the price at the top right, and purchaseWidget at 0,430.
 */
export const CatalogLayoutPetCustomizationView: FC<CatalogLayoutProps> = ({ page }) => {
    const { currentOffer = null } = useCatalogData();
    const [assetRefreshKey, setAssetRefreshKey] = useState(0);
    const selectedOffer = currentOffer && page.offers.includes(currentOffer) ? currentOffer : null;
    const furnitureData = selectedOffer?.product?.furnitureData ?? null;
    const pageImage = page.localization.getImage(1);

    const preview = useMemo(() => {
        void assetRefreshKey;

        if (!selectedOffer) return pageImage ? null : DEFAULT_PREVIEW;

        return buildPetCustomizationPreview(furnitureData, getShampooPaletteId);
    }, [assetRefreshKey, furnitureData, pageImage, selectedOffer]);

    const petTypeName = preview ? (GetRoomContentLoader().getPetNameForType(preview.typeId) ?? null) : null;

    // The shampoo palette is read from the pet asset, so read it again once the asset has loaded.
    useEffect(() => {
        if (petTypeName) GetRoomContentLoader().downloadAsset(petTypeName);
    }, [petTypeName]);

    useVoltEvent<RoomContentLoadedEvent>(
        RoomContentLoadedEvent.RCLE_SUCCESS,
        (event) => {
            if (event.contentType === petTypeName) setAssetRefreshKey((key) => key + 1);
        },
        !!petTypeName
    );

    const customParts = useMemo(() => (preview?.parts ?? []).map(([layerId, partId, paletteId]) => new PetCustomPart(layerId, partId, paletteId)), [preview]);
    const productData = selectedOffer?.product?.productData ?? null;
    const productName = productData?.name || selectedOffer?.localizationName || '';
    const productDescription = productData?.description || selectedOffer?.localizationDescription || '';

    return (
        <div className="volt-catalog-pet-customization-layout">
            <div className="volt-catalog-pet-customization-grid">
                <CatalogItemGridWidgetView columnCount={6} columnMinHeight={74} columnMinWidth={53} />
            </div>
            <div className="volt-catalog-pet-customization-preview">
                {preview ? (
                    <LayoutPetImageView customParts={customParts} direction={2} paletteId={preview.paletteId} petColor={0xffffff} typeId={preview.typeId} />
                ) : (
                    !selectedOffer && !!pageImage && <img alt="" src={pageImage} />
                )}
            </div>
            {selectedOffer && (
                <>
                    {!!productName && (
                        <NativeText background={PAGE_BACKGROUND} className="volt-catalog-pet-customization-name" text={productName} textStyle="u_bold" />
                    )}
                    {!!productDescription && (
                        <NativeText
                            background={PAGE_BACKGROUND}
                            className="volt-catalog-pet-customization-description"
                            maxWidth={162}
                            text={productDescription}
                            textStyle="u_regular"
                        />
                    )}
                    <CatalogPetPriceDisplayView className="volt-catalog-pet-customization-price" offer={selectedOffer} />
                </>
            )}
            <div className="volt-catalog-pet-customization-purchase">
                {selectedOffer ? (
                    <div className="volt-catalog-offer-actions">
                        <CatalogPurchaseWidgetView />
                    </div>
                ) : (
                    <CatalogPurchaseSelectionPrompt />
                )}
            </div>
        </div>
    );
};
