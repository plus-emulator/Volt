import { CreateLinkEvent, FrontPageItem } from '@volt/renderer';
import { FC, useCallback, useEffect } from 'react';
import { useCatalogData } from '../../../../../../hooks';
import { CatalogRedeemVoucherView } from '../../common/CatalogRedeemVoucherView';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { CatalogLayoutFrontPageItemView } from './CatalogLayoutFrontPageItemView';

/** FeaturedItemsCatalogWidget.eventProc: two mobile page names open their desktop pages. */
const PAGE_ALIASES: Record<string, string> = { room_bundles_mobile: 'room_bundles', mobile_subscriptions: 'hc_membership' };

/** FeaturedItemsCatalogWidget.init: the first item plus up to three list items. */
const MAX_FRONT_PAGE_ITEMS = 4;

// layout_frontpage_featured: 552x460. First item 184x460 at (0,0), list at (192,0), voucher border at (200,399).
export const CatalogLayoutFrontpage4View: FC<CatalogLayoutProps> = (props) => {
    const { page = null, hideNavigation = null } = props;
    const { frontPageItems = [] } = useCatalogData();

    const selectItem = useCallback((item: FrontPageItem) => {
        switch (item.type) {
            case FrontPageItem.ITEM_CATALOGUE_PAGE:
                CreateLinkEvent(`catalog/open/${PAGE_ALIASES[item.catalogPageLocation] ?? item.catalogPageLocation}`);
                return;
            case FrontPageItem.ITEM_PRODUCT_OFFER:
                // openCatalogPageByOfferId: the page that holds the offer.
                CreateLinkEvent(`catalog/open/offerId/${item.productOfferId}`);
                return;
        }
    }, []);

    useEffect(() => {
        hideNavigation();
    }, [page, hideNavigation]);

    return (
        <div className="volt-cfp">
            {frontPageItems[0] && <CatalogLayoutFrontPageItemView first item={frontPageItems[0]} onSelect={selectItem} />}
            <div className="volt-cfp-list">
                {frontPageItems.slice(1, MAX_FRONT_PAGE_ITEMS).map((item, index) => (
                    <CatalogLayoutFrontPageItemView key={`${item.itemName}-${index}`} item={item} onSelect={selectItem} />
                ))}
            </div>
            <CatalogRedeemVoucherView text={page.localization.getText(1)} />
        </div>
    );
};
