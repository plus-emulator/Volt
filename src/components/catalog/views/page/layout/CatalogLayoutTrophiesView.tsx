import { CSSProperties, FC, useEffect, useMemo, useState } from 'react';
import { IPurchasableOffer, SanitizeHtml } from '../../../../../api';
import previewArrowLeft from '../../../../../assets/images/catalog/air/preview-arrow-left.png';
import previewArrowRight from '../../../../../assets/images/catalog/air/preview-arrow-right.png';
import { LayoutFurniImageView } from '../../../../../common';
import { useCatalogActions, useCatalogData, useCatalogUiState } from '../../../../../hooks';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogLayoutProps } from './CatalogLayout.types';

type TrophyMetal = 'g' | 's' | 'b';

/** One trophy model: its offers keyed by metal, or by '' when the offer has no metal suffix. */
type TrophyModel = Map<TrophyMetal | '', IPurchasableOffer>;

/** TrophyCatalogWidget.onWidgetsInitialized: gold, silver and bronze swatches, in that order. */
const TROPHY_METALS: { metal: TrophyMetal; colour: number }[] = [
    { metal: 'g', colour: 0xffcc00 },
    { metal: 's', colour: 0xcccccc },
    { metal: 'b', colour: 0xcc6600 }
];

/** TrophyCatalogWidget.getTrophyTypeFromProduct: a trailing `_g`, `_s` or `_b`, except for prizetrophy_2011_ offers. */
const getTrophyMetal = (localizationId: string): TrophyMetal | '' => {
    if (localizationId.includes('prizetrophy_2011_')) return '';

    const separator = localizationId.lastIndexOf('_');
    const suffix = localizationId.substring(separator + 1);

    return separator > -1 && (suffix === 'g' || suffix === 's' || suffix === 'b') ? suffix : '';
};

const groupTrophyModels = (offers: IPurchasableOffer[]): TrophyModel[] => {
    const models = new Map<string, TrophyModel>();

    for (const offer of offers) {
        const metal = getTrophyMetal(offer.localizationId);
        const baseName = metal ? offer.localizationId.slice(0, -2) : offer.localizationId;

        if (!models.has(baseName)) models.set(baseName, new Map());

        const model = models.get(baseName);

        if (!model.has(metal)) model.set(metal, offer);
    }

    return [...models.values()];
};

const pickTrophyOffer = (model: TrophyModel, metal: TrophyMetal) => model?.get(metal) ?? model?.values().next().value ?? null;

const toCssColour = (colour: number) => `#${colour.toString(16).padStart(6, '0')}`;

/**
 * AIR layout_trophies: the page text, the trophy preview with its price and model arrows (trophyWidget),
 * the gold/silver/bronze colour grid, the inscription and the purchase row. There is no item grid.
 */
export const CatalogLayoutTrophiesView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const [trophyText, setTrophyText] = useState('');
    const [metal, setMetal] = useState<TrophyMetal>('g');
    const { currentOffer = null } = useCatalogData();
    const { setPurchaseOptions = null } = useCatalogUiState();
    const { selectCatalogOffer = null } = useCatalogActions();

    const offers = page?.offers ?? [];
    const models = useMemo(() => groupTrophyModels(page?.offers ?? []), [page?.offers]);
    const modelIndex = currentOffer ? models.findIndex((model) => [...model.values()].includes(currentOffer)) : -1;
    const product = modelIndex > -1 ? currentOffer.product : null;
    const showModelButtons = offers.length !== 1;
    const showColourGrid = offers.length !== 1 || !!offers[0]?.product?.furnitureData?.fullName?.includes('*');

    useEffect(() => {
        if (modelIndex > -1 || !models.length) return;

        setMetal('g');
        selectCatalogOffer(pickTrophyOffer(models[0], 'g'));
    }, [modelIndex, models, selectCatalogOffer]);

    useEffect(() => {
        if (!currentOffer) return;

        setPurchaseOptions((prevValue) => ({ ...prevValue, extraData: trophyText }));
    }, [currentOffer, trophyText, setPurchaseOptions]);

    const selectModel = (index: number) => {
        const offer = pickTrophyOffer(models[(index + models.length) % models.length], metal);

        if (offer) selectCatalogOffer(offer);
    };

    const selectMetal = (nextMetal: TrophyMetal) => {
        setMetal(nextMetal);

        const offer = pickTrophyOffer(models[Math.max(modelIndex, 0)], nextMetal);

        if (offer) selectCatalogOffer(offer);
    };

    return (
        <div className="volt-catalog-trophy-layout">
            <div className="volt-catalog-trophy-description" dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(0)) }} />

            <div className="volt-catalog-trophy-widget">
                {product && (
                    <>
                        <div className="volt-catalog-trophy-image">
                            <LayoutFurniImageView
                                direction={2}
                                extraData={product.extraParam}
                                productClassId={product.productClassId}
                                productType={product.productType}
                            />
                        </div>
                        <div className="volt-catalog-trophy-price volt-catalog-preview-price volt-catalog-price-frame">
                            <CatalogTotalPriceWidget alignItems="end" />
                        </div>
                    </>
                )}
                {showModelButtons && (
                    <>
                        <button
                            aria-label="Previous trophy"
                            className="volt-catalog-trophy-model-button is-prev"
                            type="button"
                            onClick={() => selectModel(modelIndex - 1)}
                        >
                            <img alt="" draggable={false} src={previewArrowLeft} />
                        </button>
                        <button
                            aria-label="Next trophy"
                            className="volt-catalog-trophy-model-button is-next"
                            type="button"
                            onClick={() => selectModel(modelIndex + 1)}
                        >
                            <img alt="" draggable={false} src={previewArrowRight} />
                        </button>
                    </>
                )}
            </div>

            {showColourGrid && (
                <div className="volt-catalog-colour-grid-shell volt-catalog-trophy-colours">
                    <div aria-label="Metal" className="volt-catalog-colour-grid" role="radiogroup">
                        {TROPHY_METALS.map((entry) => (
                            <button
                                key={entry.metal}
                                aria-checked={metal === entry.metal}
                                className={`volt-catalog-colour-swatch ${metal === entry.metal ? 'is-chosen' : ''}`}
                                role="radio"
                                style={{ '--volt-swatch-colour': toCssColour(entry.colour) } as CSSProperties}
                                type="button"
                                onClick={() => selectMetal(entry.metal)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="volt-catalog-trophy-inscription-label" dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(1)) }} />

            <div className="volt-catalog-trophy-inscription">
                <textarea maxLength={300} value={trophyText} onChange={(event) => setTrophyText(event.target.value)} />
            </div>

            <div className="volt-catalog-purchase-row">
                {currentOffer && (
                    <div className="volt-catalog-offer-actions flex gap-1.5">
                        <CatalogPurchaseWidgetView />
                    </div>
                )}
            </div>
        </div>
    );
};
