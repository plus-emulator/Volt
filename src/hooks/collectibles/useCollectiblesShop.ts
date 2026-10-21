import { GetNftStoreOffersMessageComposer, NftStoreOfferData, NftStoreOffersMessageEvent } from '@volt/renderer';
import { useEffect, useRef, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/** A navigation node of the shop: a localized category name and its offers in arrival order. */
export interface CollectiblesShopCategory {
    name: string;
    offers: NftStoreOfferData[];
}

// ShopTab.getNavigationCategory
const getCategoryKey = (productTypeId: number): string => {
    switch (productTypeId) {
        case 0:
        case 1:
            return 'shop.furni.title';
        case 10:
            return 'shop.pets.title';
        case 11:
            return 'shop.clothes.title';
        default:
            return 'product.type.other';
    }
};

// createNavigationNodes: categories in the order their first offer arrives.
const groupOffers = (offers: NftStoreOfferData[]): CollectiblesShopCategory[] => {
    const categories: CollectiblesShopCategory[] = [];

    for (const offer of offers) {
        if (!offer) continue;

        const name = LocalizeText(getCategoryKey(offer.productInfo.productTypeId));
        let category = categories.find((entry) => entry.name === name);

        if (!category) {
            category = { name, offers: [] };
            categories.push(category);
        }

        category.offers.push(offer);
    }

    return categories;
};

/** ShopTab: the store offers grouped by category, the selected offer and its preview. */
export const useCollectiblesShop = () => {
    const [ready, setReady] = useState(false);
    const [categories, setCategories] = useState<CollectiblesShopCategory[]>([]);
    const [activeCategory, setActiveCategory] = useState(-1);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const waitingRef = useRef(false);

    // requestNftStoreOffers
    useEffect(() => {
        if (waitingRef.current) return;

        waitingRef.current = true;
        SendMessageComposer(new GetNftStoreOffersMessageComposer());
    }, []);

    useMessageEvent<NftStoreOffersMessageEvent>(NftStoreOffersMessageEvent, (event) => {
        if (!waitingRef.current || categories.length) return;

        waitingRef.current = false;

        const grouped = groupOffers(event.getParser().nftStoreOffers);

        setCategories(grouped);
        setActiveCategory(grouped.length ? 0 : -1);
        setSelectedIndex(grouped.length && grouped[0].offers.length ? 0 : -1);
        setReady(true);
    });

    // activateCategory: populateGridItems selects the first offer of the category.
    const activateCategory = (index: number) => {
        if (index === activeCategory) return;

        setActiveCategory(index);
        setSelectedIndex(categories[index].offers.length ? 0 : -1);
    };

    const offers = activeCategory >= 0 ? categories[activeCategory].offers : [];
    const selected = selectedIndex >= 0 ? (offers[selectedIndex] ?? null) : null;

    return { ready, categories, activeCategory, activateCategory, offers, selectedIndex, setSelectedIndex, selected };
};
