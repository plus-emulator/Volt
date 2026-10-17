import { GetRecolorableFurnitureColors, MapDataType } from '@volt/renderer';
import { CSSProperties, FC, useEffect, useMemo, useState } from 'react';
import { ApplyRecolorableColorToPage, CreateRecolorableStuffData, GetRecolorableColorParam, LocalizeText } from '../../../../../api';
import { ClassicScrollAreaView } from '../../../../../common';
import { useCatalogActions, useCatalogData, useCatalogUiState } from '../../../../../hooks';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { CatalogLayoutDefaultView } from './CatalogLayoutDefaultView';

// RecolorableFurnitureCatalogWidget._color starts white.
const DEFAULT_COLOR = 0xffffff;

const toCssColour = (colour: number) => `#${(colour & 0xffffff).toString(16).padStart(6, '0')}`;

/**
 * AIR `recolorable_furniture` (RecolorableFurnitureCatalogWidget.as:18-151, layout_recolorable_furniture): the default page with a
 * 150px preview, a 116px item grid and the class palette under it. The chosen colour becomes the "r,g,b" extra parameter of the
 * page's offers, so purchase, gift and placement all carry it.
 */
export const CatalogLayoutRecolorableFurnitureView: FC<CatalogLayoutProps> = (props) =>
{
    const { page = null } = props;
    const { currentOffer = null } = useCatalogData();
    const { selectCatalogOffer = null } = useCatalogActions();
    const { setPurchaseOptions = null } = useCatalogUiState();
    const [color, setColor] = useState(DEFAULT_COLOR);

    const isPageOffer = !!currentOffer && !!page?.offers.includes(currentOffer);
    const className = isPageOffer ? (currentOffer.product?.furnitureData?.className ?? null) : null;
    const colors = useMemo(() => (className ? GetRecolorableFurnitureColors(className) : []), [className]);
    const activeColor = colors.length ? (colors.includes(color) ? color : colors[0]) : null;

    // onOfferSelected keeps the colour it fell back to (RecolorableFurnitureCatalogWidget.as:90).
    if (activeColor !== null && activeColor !== color) setColor(activeColor);

    // onWidgetsInitialized (RecolorableFurnitureCatalogWidget.as:66): the page opens on its first offer.
    useEffect(() =>
    {
        if (!page?.offers.length || !selectCatalogOffer) return;

        selectCatalogOffer(page.offers[0]);
    }, [page, selectCatalogOffer]);

    // onOfferSelected / applyColor (RecolorableFurnitureCatalogWidget.as:79-123).
    useEffect(() =>
    {
        if (!isPageOffer || !setPurchaseOptions) return;

        if (activeColor === null)
        {
            setPurchaseOptions((prevValue) => ({ ...prevValue, previewStuffData: null }));

            return;
        }

        ApplyRecolorableColorToPage(page, activeColor);

        const extraData = currentOffer.product.extraParam;
        const colorParam = GetRecolorableColorParam(activeColor);

        setPurchaseOptions((prevValue) =>
        {
            const previous = prevValue.previewStuffData;

            // Same colour again: keep the options so the previewer does not rebuild the furni.
            if (
                prevValue.extraData === extraData &&
                previous instanceof MapDataType &&
                [previous.getValue('r'), previous.getValue('g'), previous.getValue('b')].join(',') === colorParam
            )
                return prevValue;

            return { ...prevValue, extraData, previewStuffData: CreateRecolorableStuffData(colorParam) };
        });
    }, [isPageOffer, activeColor, currentOffer, page, setPurchaseOptions]);

    return (
        <CatalogLayoutDefaultView
            {...props}
            colourGrid={
                <div className="volt-catalog-recolorable-palette">
                    <span className="volt-catalog-recolorable-palette-caption">{LocalizeText('catalog.recolorable.palette')}</span>
                    <div className="volt-catalog-colour-grid-shell">
                        <ClassicScrollAreaView className="h-full min-h-0">
                            <div aria-label={LocalizeText('catalog.recolorable.palette')} className="volt-catalog-colour-grid" role="radiogroup">
                                {colors.map((colour) =>
                                {
                                    const isChosen = colour === activeColor;

                                    return (
                                        <button
                                            key={colour}
                                            aria-checked={isChosen}
                                            aria-label={toCssColour(colour)}
                                            className={`volt-catalog-colour-swatch ${isChosen ? 'is-chosen' : ''}`}
                                            role="radio"
                                            style={{ '--volt-swatch-colour': toCssColour(colour) } as CSSProperties}
                                            type="button"
                                            onClick={() => setColor(colour)}
                                        />
                                    );
                                })}
                            </div>
                        </ClassicScrollAreaView>
                    </div>
                </div>
            }
            layoutClassName="is-recolorable"
            previewHeight={150}
        />
    );
};
