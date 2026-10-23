import {
    BuyMarketplaceOfferMessageComposer,
    GetCommunication,
    GetMarketplaceOffersMessageComposer,
    GetSessionDataManager,
    MarketPlaceOffersEvent,
    MarketplaceBuyOfferResultEvent,
    VoltEventType
} from '@volt/renderer';
import { FC, useCallback, useMemo, useRef, useState } from 'react';
import {
    IMarketplaceSearchOptions,
    LocalizeText,
    localizeWithFallback,
    MarketplaceOfferData,
    MarketplaceSearchType,
    NotificationAlertType,
    SendMessageComposer
} from '../../../../../../api';
import { ClassicScrollAreaView } from '../../../../../../common';
import { NativeCenteredField } from '../../../../../../common/native-text/NativeCenteredField';
import { NativeText } from '../../../../../../common/native-text/NativeText';
import { useMessageEvent, useNotification, useVoltEvent, usePurse } from '../../../../../../hooks';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { CatalogLayoutMarketplaceItemView, PUBLIC_OFFER } from './CatalogLayoutMarketplaceItemView';
import { MARKETPLACE_PAGE_BACKGROUND, SearchFormView } from './CatalogLayoutMarketplaceSearchFormView';

const SORT_TYPES_VALUE = [1, 2];
const SORT_TYPES_ACTIVITY = [3, 4, 5, 6];
const SORT_TYPES_ADVANCED = [1, 2, 3, 4, 5, 6];

/** search_selector: button_group_left/center/right style 100 at x 0, 107 and 213 (107, 106 and 107 wide, 25 high). */
const SEARCH_TABS = [
    { type: MarketplaceSearchType.BY_ACTIVITY, key: 'catalog.marketplace.search_by_activity', part: 'left', x: 0, width: 107 },
    { type: MarketplaceSearchType.BY_VALUE, key: 'catalog.marketplace.search_by_value', part: 'center', x: 107, width: 106 },
    { type: MarketplaceSearchType.ADVANCED, key: 'catalog.marketplace.search_advanced', part: 'right', x: 213, width: 107 }
] as const;

/** The flat colour of each button_group template behind its il_button caption. */
const TAB_SURFACE = { default: 0xffffff, selected: 0x989898 };
export interface CatalogLayoutMarketplacePublicItemsViewProps extends CatalogLayoutProps {}

export const CatalogLayoutMarketplacePublicItemsView: FC<CatalogLayoutMarketplacePublicItemsViewProps> = (props) => {
    const [searchType, setSearchType] = useState(MarketplaceSearchType.BY_ACTIVITY);
    const [totalItemsFound, setTotalItemsFound] = useState(0);
    const [offers, setOffers] = useState(new Map<number, MarketplaceOfferData>());
    const [lastSearch, setLastSearch] = useState<IMarketplaceSearchOptions>({ minPrice: -1, maxPrice: -1, query: '', type: 3 });
    const [searching, setSearching] = useState(true);
    const [combineUniques, setCombineUniques] = useState(true);
    const { getCurrencyAmount = null } = usePurse();
    const { simpleAlert = null, showConfirm = null } = useNotification();
    const pendingOfferIdRef = useRef<number>(null);

    const buyOffer = useCallback((offerId: number) =>
    {
        if (pendingOfferIdRef.current !== null) return;

        pendingOfferIdRef.current = offerId;
        SendMessageComposer(new BuyMarketplaceOfferMessageComposer(offerId));
    }, []);

    // The server forgets a buy with its socket and answers nothing for it on the next connection.
    useVoltEvent(VoltEventType.CONNECTION_STATE_CHANGED, () =>
    {
        if (GetCommunication().connection.connectionState.authenticated) return;

        pendingOfferIdRef.current = null;
    });

    const requestOffers = useCallback((options: IMarketplaceSearchOptions) => {
        setLastSearch(options);
        setSearching(true);
        SendMessageComposer(new GetMarketplaceOffersMessageComposer(options.minPrice, options.maxPrice, options.query, options.type));
    }, []);

    const getSortTypes = useMemo(() => {
        switch (searchType) {
            case MarketplaceSearchType.BY_ACTIVITY:
                return SORT_TYPES_ACTIVITY;
            case MarketplaceSearchType.BY_VALUE:
                return SORT_TYPES_VALUE;
            case MarketplaceSearchType.ADVANCED:
                return SORT_TYPES_ADVANCED;
        }
        return [];
    }, [searchType]);

    const purchaseItem = useCallback(
        (offerData: MarketplaceOfferData) => {
            if (offerData.price > getCurrencyAmount(-1)) {
                simpleAlert(
                    LocalizeText('catalog.alert.notenough.credits.description'),
                    NotificationAlertType.DEFAULT,
                    null,
                    null,
                    LocalizeText('catalog.alert.notenough.title')
                );
                return;
            }

            const offerId = offerData.offerId;
            const sessionUserId = GetSessionDataManager().userId;

            showConfirm(
                LocalizeText('catalog.marketplace.confirm_header'),
                () => {
                    // A confirmation left open across a logout must not buy for another user.
                    if (GetSessionDataManager().userId === sessionUserId) buyOffer(offerId);
                },
                null,
                null,
                null,
                LocalizeText('catalog.marketplace.confirm_title')
            );
        },
        [getCurrencyAmount, simpleAlert, showConfirm, buyOffer]
    );

    useMessageEvent<MarketPlaceOffersEvent>(MarketPlaceOffersEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const latestOffers = new Map<number, MarketplaceOfferData>();
        parser.offers.forEach((entry) => {
            const offerEntry = new MarketplaceOfferData(
                entry.offerId,
                entry.furniId,
                entry.furniType,
                entry.extraData,
                entry.stuffData,
                entry.price,
                entry.status,
                entry.averagePrice,
                entry.offerCount
            );
            offerEntry.timeLeftMinutes = entry.timeLeftMinutes;
            latestOffers.set(entry.offerId, offerEntry);
        });

        setTotalItemsFound(parser.totalItemsFound);
        setOffers(latestOffers);
        setSearching(false);
    });

    useMessageEvent<MarketplaceBuyOfferResultEvent>(MarketplaceBuyOfferResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser || parser.requestedOfferId !== pendingOfferIdRef.current || ![1, 2, 3, 4].includes(parser.result)) return;

        // Typed marketplace results carry the requested offer id; unrelated purchases,
        // alerts and search refreshes cannot release an active buy.
        pendingOfferIdRef.current = null;

        switch (parser.result) {
            case 1:
                requestOffers(lastSearch);
                break;
            case 2:
                setOffers((prev) => {
                    const newVal = new Map(prev);
                    newVal.delete(parser.requestedOfferId);
                    return newVal;
                });
                simpleAlert(
                    LocalizeText('catalog.marketplace.not_available_header'),
                    NotificationAlertType.DEFAULT,
                    null,
                    null,
                    LocalizeText('catalog.marketplace.not_available_title')
                );
                break;
            case 3:
                // our shit was updated
                // todo: some dialogue modal
                setOffers((prev) => {
                    const newVal = new Map(prev);

                    const item = newVal.get(parser.requestedOfferId);
                    if (item) {
                        // Delete the OLD key first, then set under the (possibly
                        // unchanged) new id. The old code did set()-then-delete(),
                        // so when the server returned the same id for the re-priced
                        // offer the set was immediately undone and the offer vanished.
                        newVal.delete(parser.requestedOfferId);

                        item.offerId = parser.offerId;
                        item.price = parser.newPrice;
                        item.offerCount--;
                        newVal.set(item.offerId, item);
                    }

                    return newVal;
                });

                const sessionUserId = GetSessionDataManager().userId;

                showConfirm(
                    LocalizeText('catalog.marketplace.confirm_higher_header') +
                        '\n' +
                        LocalizeText('catalog.marketplace.confirm_price', ['price'], [parser.newPrice.toString()]),
                    () =>
                    {
                        // A confirmation left open across a logout must not buy for another user.
                        if (GetSessionDataManager().userId === sessionUserId) buyOffer(parser.offerId);
                    },
                    null,
                    null,
                    null,
                    LocalizeText('catalog.marketplace.confirm_higher_title')
                );
                break;
            case 4:
                simpleAlert(
                    LocalizeText('catalog.alert.notenough.credits.description'),
                    NotificationAlertType.DEFAULT,
                    null,
                    null,
                    LocalizeText('catalog.alert.notenough.title')
                );
                break;
        }
    });

    // MarketPlaceCatalogWidget.updateStatusDisplay: the server's total, with the shown count when the list is cut.
    let statusText = localizeWithFallback('catalog.marketplace.searching', '');

    if (!searching) {
        if (totalItemsFound > 0) {
            statusText = LocalizeText('catalog.marketplace.items_found', ['count'], [totalItemsFound.toString()]);

            if (offers.size > 0 && offers.size < totalItemsFound)
                statusText += '. ' + LocalizeText('catalog.marketplace.items_shown', ['count'], [offers.size.toString()]) + '.';
        } else {
            statusText = LocalizeText('catalog.marketplace.no_items');
        }
    }

    return (
        <div className="volt-catalog-market-layout">
            {SEARCH_TABS.map((tab) => {
                const selected = tab.type === searchType;

                return (
                    <button
                        key={tab.type}
                        className={`volt-catalog-market-tab is-${tab.part} ${selected ? 'is-selected' : ''}`.trim()}
                        style={{ left: tab.x, width: tab.width }}
                        type="button"
                        onClick={() => setSearchType(tab.type)}
                    >
                        <span className="volt-catalog-market-tab-caption">
                            <NativeCenteredField width={tab.width}>
                                <NativeText transparent background={selected ? TAB_SURFACE.selected : TAB_SURFACE.default} text={LocalizeText(tab.key)} textStyle="il_button" />
                            </NativeCenteredField>
                        </span>
                    </button>
                );
            })}
            <div className="volt-catalog-market-search">
                <SearchFormView
                    combineUniques={combineUniques}
                    searchType={searchType}
                    sortTypes={getSortTypes}
                    onCombineUniquesChange={setCombineUniques}
                    onSearch={requestOffers}
                />
            </div>
            <NativeText background={MARKETPLACE_PAGE_BACKGROUND} className="volt-catalog-market-status is-offers" text={statusText} textStyle="u_small" />
            <ClassicScrollAreaView className="volt-catalog-market-list is-offers">
                {Array.from(offers.values()).map((entry) => (
                    <CatalogLayoutMarketplaceItemView key={entry.offerId} offerData={entry} type={PUBLIC_OFFER} onClick={purchaseItem} />
                ))}
            </ClassicScrollAreaView>
        </div>
    );
};
