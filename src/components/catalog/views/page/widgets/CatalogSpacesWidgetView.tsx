import { FC, useEffect, useMemo, useState } from 'react';
import { IPurchasableOffer, LocalizeText, Offer, ProductTypeEnum } from '../../../../../api';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { getCatalogGridMetrics, useCatalogData, useCatalogDisplayPreferences, useCatalogUiState } from '../../../../../hooks';
import { CatalogItemGridWidgetView } from './CatalogItemGridWidgetView';

/** SpacesNewCatalogWidget: the groups in tab order (group.walls, group.floors, group.views) and their furniture class names. */
const SPACES_GROUPS = [
    { tab: 'walls', className: 'wallpaper', side: 'left' },
    { tab: 'floors', className: 'floor', side: 'center' },
    { tab: 'views', className: 'landscape', side: 'right' }
] as const;

/**
 * AIR spacesNewWidget (embedded at 0,245 360x180 in layout_spaces_new): the "groups" selector (button_group_left/center/right,
 * style 100, 21 high, il_button captions), a border style 6 at blend 0.5 (0,25 360x155) and the item grid at 2,27.
 * Each group keeps its own selected offer; the first group (walls) is shown first.
 */
export const CatalogSpacesWidgetView: FC<{}> = () => {
    const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
    const [selectedOfferForGroup, setSelectedOfferForGroup] = useState<IPurchasableOffer[]>([null, null, null]);
    const { currentPage = null, currentOffer = null } = useCatalogData();
    const { setCurrentOffer = null, setPurchaseOptions = null } = useCatalogUiState();
    const { density = 'standard', showTilePrices = true } = useCatalogDisplayPreferences();
    const gridMetrics = getCatalogGridMetrics(density);

    // createOfferGroups: single and multi offers of wall or floor items, grouped by furniture class name.
    const groupedOffers = useMemo(() => {
        const groups: IPurchasableOffer[][] = SPACES_GROUPS.map(() => []);

        for (const offer of currentPage?.offers ?? []) {
            if (offer.pricingModel !== Offer.PRICING_MODEL_SINGLE && offer.pricingModel !== Offer.PRICING_MODEL_MULTI) continue;

            const product = offer.product;

            if (!product?.furnitureData || (product.productType !== ProductTypeEnum.WALL && product.productType !== ProductTypeEnum.FLOOR)) continue;

            const index = SPACES_GROUPS.findIndex((group) => group.className === product.furnitureData.className);

            if (index >= 0) groups[index].push(offer);
        }

        return groups;
    }, [currentPage]);

    useEffect(() => {
        setSelectedGroupIndex(0);
        setSelectedOfferForGroup(groupedOffers.map((offers) => offers[0] ?? null));
    }, [groupedOffers]);

    // switchCategory and selectIndex: showing a group selects its remembered offer.
    useEffect(() => {
        const offer = selectedOfferForGroup[selectedGroupIndex];

        if (offer) setCurrentOffer(offer);
    }, [selectedGroupIndex, selectedOfferForGroup, setCurrentOffer]);

    // A pick in the grid becomes the remembered offer of the shown group.
    useEffect(() => {
        if (!currentOffer || !groupedOffers[selectedGroupIndex].includes(currentOffer)) return;

        setSelectedOfferForGroup((previous) => {
            if (previous[selectedGroupIndex] === currentOffer) return previous;

            const next = [...previous];

            next[selectedGroupIndex] = currentOffer;

            return next;
        });
    }, [currentOffer, groupedOffers, selectedGroupIndex]);

    // select: SetExtraPurchaseParameterEvent with the product's extra parameter.
    useEffect(() => {
        if (!currentOffer) return;

        setPurchaseOptions((previous) => ({ ...previous, extraData: currentOffer.product.extraParam, extraParamRequired: true }));
    }, [currentOffer, setPurchaseOptions]);

    return (
        <div className="volt-air-spaces-widget">
            <div className="volt-air-spaces-groups" role="tablist">
                {SPACES_GROUPS.map((group, index) => (
                    <button
                        key={group.tab}
                        aria-selected={selectedGroupIndex === index}
                        className={`volt-air-spaces-group is-${group.side} ${selectedGroupIndex === index ? 'is-selected' : ''}`}
                        role="tab"
                        type="button"
                        onClick={() => setSelectedGroupIndex(index)}
                    >
                        <NativeText transparent background={0xffffff} text={LocalizeText(`catalog.spaces.tab.${group.tab}`)} textStyle="il_button" />
                    </button>
                ))}
            </div>
            <div className="volt-air-spaces-grid volt-catalog-grid-shell">
                <CatalogItemGridWidgetView
                    className={`volt-catalog-grid volt-catalog-grid-density-${density}`}
                    offers={groupedOffers[selectedGroupIndex]}
                    showPrices={showTilePrices}
                    {...gridMetrics}
                />
            </div>
        </div>
    );
};
