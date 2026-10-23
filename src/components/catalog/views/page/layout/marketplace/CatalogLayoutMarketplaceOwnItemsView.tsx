import {
    CancelMarketplaceOfferMessageComposer,
    GetMarketplaceOwnOffersMessageComposer,
    MarketplaceCancelOfferResultEvent,
    MarketplaceOwnOffersEvent,
    RedeemMarketplaceOfferCreditsMessageComposer
} from '@volt/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText, localizeWithFallback, MarketPlaceOfferState, MarketplaceOfferData, NotificationAlertType, SendMessageComposer } from '../../../../../../api';
import { ClassicScrollAreaView } from '../../../../../../common';
import { HabboDropMenuView } from '../../../../../../common/dropmenu/HabboDropMenuView';
import { NativeText } from '../../../../../../common/native-text/NativeText';
import { useMessageEvent, useNotification } from '../../../../../../hooks';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { CatalogAirShinyButton } from '../CatalogAirShinyButton';
import { CatalogLayoutMarketplaceItemView, OWN_OFFER } from './CatalogLayoutMarketplaceItemView';
import { MARKETPLACE_PAGE_BACKGROUND } from './CatalogLayoutMarketplaceSearchFormView';

const MAX_SEARCH_LENGTH = 40;

/** offer_category_dropmenu: OPEN, SOLD and EXPIRED map to the offer states 1, 2 and 3. */
const CATEGORIES = [
    { value: MarketPlaceOfferState.ONGOING, key: 'shop.marketplace.own.offers.category.open', fallback: 'OPEN' },
    { value: MarketPlaceOfferState.SOLD, key: 'shop.marketplace.own.offers.category.sold', fallback: 'SOLD' },
    { value: MarketPlaceOfferState.EXPIRED, key: 'shop.marketplace.own.offers.category.expired', fallback: 'EXPIRED' }
];

export const CatalogLayoutMarketplaceOwnItemsView: FC<CatalogLayoutProps> = (props) => {
    const [creditsWaiting, setCreditsWaiting] = useState(0);
    const [offers, setOffers] = useState<MarketplaceOfferData[]>([]);
    const { simpleAlert = null } = useNotification();
    const isRedeemingRef = useRef<boolean>(false);
    const pendingCancelsRef = useRef<Set<number>>(new Set());
    const [category, setCategory] = useState<number>(MarketPlaceOfferState.ONGOING);
    const [searchInput, setSearchInput] = useState('');
    const [searchText, setSearchText] = useState('');
    const [loaded, setLoaded] = useState(false);

    useMessageEvent<MarketplaceOwnOffersEvent>(MarketplaceOwnOffersEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const offers = parser.offers.map((offer) => {
            const newOffer = new MarketplaceOfferData(
                offer.offerId,
                offer.furniId,
                offer.furniType,
                offer.extraData,
                offer.stuffData,
                offer.price,
                offer.status,
                offer.averagePrice,
                offer.offerCount
            );

            newOffer.timeLeftMinutes = offer.timeLeftMinutes;

            return newOffer;
        });

        setCreditsWaiting(parser.creditsWaiting);
        setOffers(offers);
        setLoaded(true);
    });

    useMessageEvent<MarketplaceCancelOfferResultEvent>(MarketplaceCancelOfferResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        if (!parser.success) {
            simpleAlert(
                LocalizeText('catalog.marketplace.cancel_failed'),
                NotificationAlertType.DEFAULT,
                null,
                null,
                LocalizeText('catalog.marketplace.operation_failed.topic')
            );

            return;
        }

        setOffers((prevValue) => prevValue.filter((value) => value.offerId !== parser.offerId));
    });

    const soldOffers = useMemo(() => {
        return offers.filter((value) => value.status === MarketPlaceOfferState.SOLD);
    }, [offers]);

    const redeemSoldOffers = useCallback(() => {
        if (isRedeemingRef.current) return;

        isRedeemingRef.current = true;

        setOffers((prevValue) => {
            const idsToDelete = soldOffers.map((value) => value.offerId);

            return prevValue.filter((value) => idsToDelete.indexOf(value.offerId) === -1);
        });

        // Without this the redeem panel stays visible (creditsWaiting > 0) after
        // the sold offers are optimistically removed, showing "get 0 sold items".
        setCreditsWaiting(0);

        SendMessageComposer(new RedeemMarketplaceOfferCreditsMessageComposer());

        setTimeout(() => (isRedeemingRef.current = false), 3000);
    }, [soldOffers]);

    const takeItemBack = (offerData: MarketplaceOfferData) => {
        if (pendingCancelsRef.current.has(offerData.offerId)) return;

        pendingCancelsRef.current.add(offerData.offerId);

        SendMessageComposer(new CancelMarketplaceOfferMessageComposer(offerData.offerId));

        setTimeout(() => pendingCancelsRef.current.delete(offerData.offerId), 2000);
    };

    useEffect(() => {
        SendMessageComposer(new GetMarketplaceOwnOffersMessageComposer());
    }, []);

    const categoryOptions = useMemo(() => CATEGORIES.map((entry) => ({ value: entry.value, label: localizeWithFallback(entry.key, entry.fallback) })), []);

    // The own offers request has no category, so the category menu and the name search filter the full list on the client
    // (MarketPlaceOwnItemsCatalogWidget.matchesSearch: lowercased name and description).
    const visibleOffers = useMemo(() => {
        const query = searchText.toLowerCase();

        return offers.filter((offer) => {
            if (offer.status !== category) return false;
            if (!query) return true;

            const prefix = offer.furniType === MarketplaceOfferData.TYPE_WALL ? 'wallItem' : 'roomItem';
            const text = (LocalizeText(`${prefix}.name.${offer.furniId}`) + ' ' + LocalizeText(`${prefix}.desc.${offer.furniId}`)).toLowerCase();

            return text.indexOf(query) >= 0;
        });
    }, [category, offers, searchText]);

    // updateStatusDisplay: searching until the list arrives, then the count or no_items.
    let statusText = localizeWithFallback('catalog.marketplace.searching', '');

    if (loaded) {
        statusText = visibleOffers.length > 0
            ? LocalizeText('catalog.marketplace.items_found', ['count'], [visibleOffers.length.toString()])
            : LocalizeText('catalog.marketplace.no_items');
    }

    return (
        <div className="volt-catalog-market-layout">
            <NativeText
                background={MARKETPLACE_PAGE_BACKGROUND}
                className="volt-catalog-market-own-info"
                maxWidth={340}
                text={LocalizeText('catalog.marketplace.own_info')}
                textStyle="u_italic"
            />
            <HabboDropMenuView<number>
                nativeCaption
                className="volt-catalog-market-category"
                label={localizeWithFallback('shop.marketplace.own.offers.category.open', 'OPEN')}
                options={categoryOptions}
                skinStyle={3}
                value={category}
                onSelect={setCategory}
            />
            <div className="volt-catalog-market-own-search">
                <input
                    maxLength={MAX_SEARCH_LENGTH}
                    type="text"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && setSearchText(searchInput)}
                />
                {!searchInput.length && (
                    <NativeText
                        background={0xffffff}
                        className="volt-catalog-market-own-placeholder"
                        overrides={{ color: 0x666666 }}
                        text={LocalizeText('catalog.search')}
                        textStyle="u_regular"
                    />
                )}
                {!!searchInput.length && (
                    <button
                        aria-label={LocalizeText('generic.cancel')}
                        className="volt-catalog-market-own-clear"
                        type="button"
                        onClick={() => {
                            setSearchInput('');
                            setSearchText('');
                        }}
                    />
                )}
            </div>
            <CatalogAirShinyButton caption={LocalizeText('generic.search')} rect={[270, 39, 69, 25]} onClick={() => setSearchText(searchInput)} />
            <ClassicScrollAreaView className="volt-catalog-market-list is-own">
                {visibleOffers.map((offer) => (
                    <CatalogLayoutMarketplaceItemView key={offer.offerId} offerData={offer} type={OWN_OFFER} onClick={takeItemBack} />
                ))}
            </ClassicScrollAreaView>
            <NativeText background={MARKETPLACE_PAGE_BACKGROUND} className="volt-catalog-market-status is-own" text={statusText} textStyle="u_small" />
            {/* recall_all_button / mark_as_seen_button need the recall-all and clear-history requests; until then the sold
                credits are still redeemed from here, in the bottom button slot. */}
            {category === MarketPlaceOfferState.SOLD && creditsWaiting > 0 && (
                <CatalogAirShinyButton
                    caption={LocalizeText('catalog.marketplace.offer.redeem')}
                    rect={[249, 434, 90, 24]}
                    onClick={redeemSoldOffers}
                />
            )}
        </div>
    );
};
