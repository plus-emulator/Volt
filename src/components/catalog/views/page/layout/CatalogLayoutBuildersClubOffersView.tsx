import { NotEnoughBalanceMessageEvent, PurchaseFromCatalogComposer } from '@volt/renderer';
import { FC, useCallback, useRef, useState } from 'react';
import { CatalogPurchaseState, GetConfigurationValue, LocalizeText, OpenUrl, SanitizeHtml, SendMessageComposer } from '../../../../../api';
import { LayoutCurrencyIcon, LayoutLoadingSpinnerView } from '../../../../../common';
import { CatalogEvent, CatalogPurchasedEvent, CatalogPurchaseFailureEvent } from '../../../../../events';
import {
    useCatalogActions,
    useCatalogData,
    useCatalogSkipPurchaseConfirmation,
    useMessageEvent,
    useNotification,
    usePurse,
    useUiEvent
} from '../../../../../hooks';
import { CatalogProductlessOffer } from '../../../../../hooks/catalog/useCatalogQueries';
import { CatalogClubPriceFieldView } from './CatalogClubPriceFieldView';
import { CatalogClubPurchaseConfirmView } from './CatalogClubPurchaseConfirmView';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { BUILDERS_CLUB_ADDONS_LAYOUT, CatalogBuildersClubStatusView, getBuildersClubOfferName, useBuildersClubSecondsLeft } from './buildersClub.helpers';

// layout_builders_club_loyalty / layout_builders_club_addons (AIR WIN63-202610151745-318700621): ctlg_description, then one
// row per page offer with item_header, the price and item_buy. BuilderLoyaltyCatalogWidget.as:20-58, BuilderAddonsCatalogWidget.as:22-70.
export const CatalogLayoutBuildersClubOffersView: FC<CatalogLayoutProps> = ({ page = null }) => {
    const [pendingOffer, setPendingOffer] = useState<CatalogProductlessOffer | null>(null);
    const [purchaseState, setPurchaseState] = useState(CatalogPurchaseState.NONE);
    const [catalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const { currentPage = null, productlessOffers } = useCatalogData();
    const { resetPlacedOfferData = null } = useCatalogActions();
    const { getCurrencyAmount = null } = usePurse();
    const { showConfirm = null, simpleAlert = null } = useNotification();
    const secondsLeft = useBuildersClubSecondsLeft();
    const isPurchasingRef = useRef(false);
    const pageData = currentPage ?? page;
    const isAddonsPage = pageData?.layoutCode === BUILDERS_CLUB_ADDONS_LAYOUT;
    // BuilderAddonsCatalogWidget: addons need a running membership (builderSecondsLeft > 0); the trial warning shows otherwise.
    const addonsLocked = isAddonsPage && secondsLeft <= 0;
    const libraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const iconUrl = libraryUrl ? `${libraryUrl}catalogue/icon_193.png` : '';

    const settlePurchase = useCallback(() => {
        isPurchasingRef.current = false;
        setPurchaseState(CatalogPurchaseState.NONE);
        setPendingOffer(null);
    }, []);

    const onCatalogEvent = useCallback(
        (event: CatalogEvent) => {
            if (!isPurchasingRef.current) return;

            settlePurchase();

            if (event.type === CatalogPurchaseFailureEvent.PURCHASE_FAILED) {
                const code = (event as CatalogPurchaseFailureEvent).code;

                simpleAlert?.(
                    LocalizeText(code > 0 ? `catalog.alert.purchaseerror.description.${code}` : 'catalog.alert.purchaseerror.description'),
                    null,
                    null,
                    null,
                    LocalizeText('catalog.alert.purchaseerror.title')
                );
            }
        },
        [settlePurchase, simpleAlert]
    );

    useUiEvent(CatalogPurchasedEvent.PURCHASE_SUCCESS, onCatalogEvent);
    useUiEvent(CatalogPurchaseFailureEvent.PURCHASE_FAILED, onCatalogEvent);
    useMessageEvent<NotEnoughBalanceMessageEvent>(NotEnoughBalanceMessageEvent, () => {
        if (isPurchasingRef.current) settlePurchase();
    });

    const showInsufficientBalanceAlert = useCallback(
        (offer: CatalogProductlessOffer) => {
            if (!getCurrencyAmount) return false;

            if (offer.priceCredits > getCurrencyAmount(-1)) {
                const description = LocalizeText('catalog.alert.notenough.credits.description');
                const title = LocalizeText('catalog.alert.notenough.title');

                if (showConfirm) {
                    const settle = () => resetPlacedOfferData?.();

                    showConfirm(
                        description,
                        () => {
                            settle();

                            const shopUrl = GetConfigurationValue<string>('web.shop.relativeUrl', '');

                            if (shopUrl) OpenUrl(shopUrl);
                        },
                        settle,
                        null,
                        null,
                        title
                    );
                } else {
                    simpleAlert?.(description, null, null, null, title);
                }

                return true;
            }

            if (offer.priceActivityPoints > getCurrencyAmount(offer.priceActivityPointsType)) {
                const fallbackLocalization = offer.priceActivityPointsType === 0 ? 'tooltip.duckets' : offer.priceActivityPointsType === 5 ? 'tooltip.diamonds' : '';
                const currencyLocalization = GetConfigurationValue<string>(`activitypoint.name.${offer.priceActivityPointsType}`, fallbackLocalization);

                if (currencyLocalization) {
                    const currencyName = LocalizeText(currencyLocalization);

                    simpleAlert?.(
                        LocalizeText('catalog.alert.notenough.activitypoints.description', ['currencyname'], [currencyName]),
                        null,
                        null,
                        null,
                        LocalizeText('catalog.alert.notenough.activitypoints.title', ['currencyname'], [currencyName])
                    );
                } else {
                    simpleAlert?.(
                        LocalizeText('catalog.alert.notenough.activitypoints.description'),
                        null,
                        null,
                        null,
                        LocalizeText(`catalog.alert.notenough.activitypoints.title.${offer.priceActivityPointsType}`)
                    );
                }

                return true;
            }

            return false;
        },
        [getCurrencyAmount, resetPlacedOfferData, showConfirm, simpleAlert]
    );

    const submitPurchase = useCallback(
        (offer: CatalogProductlessOffer) => {
            if (!pageData || isPurchasingRef.current) return;

            if (showInsufficientBalanceAlert(offer)) {
                setPendingOffer(null);
                setPurchaseState(CatalogPurchaseState.NONE);

                return;
            }

            isPurchasingRef.current = true;
            setPendingOffer(offer);
            setPurchaseState(CatalogPurchaseState.PURCHASE);
            SendMessageComposer(new PurchaseFromCatalogComposer(pageData.pageId, offer.offerId, '', 1));
        },
        [pageData, showInsufficientBalanceAlert]
    );

    const startPurchase = useCallback(
        (offer: CatalogProductlessOffer) => {
            if (isPurchasingRef.current || addonsLocked) return;

            if (showInsufficientBalanceAlert(offer)) return;

            if (catalogSkipPurchaseConfirmation) {
                submitPurchase(offer);
                return;
            }

            setPendingOffer(offer);
            setPurchaseState(CatalogPurchaseState.CONFIRM);
        },
        [addonsLocked, catalogSkipPurchaseConfirmation, showInsufficientBalanceAlert, submitPurchase]
    );

    const renderPrice = (offer: CatalogProductlessOffer) => (
        <span className="volt-club-offer-prices">
            {(isAddonsPage || offer.priceCredits > 0 || offer.priceActivityPoints <= 0) && (
                <span className="volt-club-offer-price" data-currency-type="-1">
                    <CatalogClubPriceFieldView value={offer.priceCredits} />
                    <LayoutCurrencyIcon type={-1} />
                </span>
            )}
            {offer.priceActivityPoints > 0 && (
                <span className="volt-club-offer-price" data-currency-type={offer.priceActivityPointsType}>
                    <CatalogClubPriceFieldView value={`${offer.priceCredits > 0 || isAddonsPage ? '+ ' : ''}${offer.priceActivityPoints}`} />
                    <LayoutCurrencyIcon type={offer.priceActivityPointsType} />
                </span>
            )}
        </span>
    );

    const description = pageData?.localization?.getText(0) ?? '';

    return (
        <div className={`volt-club-purchase-layout volt-builders-club-layout ${isAddonsPage ? 'is-addons-page' : 'is-loyalty-page'}`}>
            <div className="volt-builders-club-description" dangerouslySetInnerHTML={{ __html: SanitizeHtml(description) }} />
            {!!libraryUrl && <img alt="" aria-hidden="true" className="volt-builders-club-art is-top" draggable={false} src={`${libraryUrl}catalogue/bc_top.png`} />}
            {!!libraryUrl && <img alt="" aria-hidden="true" className="volt-builders-club-art is-bottom" draggable={false} src={`${libraryUrl}catalogue/bc_bottom.png`} />}
            <div className="volt-builders-club-offers" data-widget={isAddonsPage ? 'builderAddonsWidget' : 'builderLoyaltyWidget'}>
                {productlessOffers.map((offer) => {
                    const isPending = pendingOffer?.offerId === offer.offerId;

                    return (
                        <article key={offer.offerId} className="volt-club-offer is-wide volt-builders-club-offer" data-offer-id={offer.offerId}>
                            <header className="volt-club-offer-header">
                                {!!iconUrl && <img alt="" aria-hidden="true" className="volt-builders-club-offer-icon" draggable={false} src={iconUrl} />}
                                <strong>{getBuildersClubOfferName(offer.localizationId)}</strong>
                            </header>
                            <div className="volt-club-offer-footer">
                                {renderPrice(offer)}
                                <div className="volt-club-offer-actions">
                                    <button
                                        className="volt-club-offer-action is-buy"
                                        disabled={purchaseState === CatalogPurchaseState.PURCHASE || addonsLocked}
                                        type="button"
                                        onClick={() => startPurchase(offer)}
                                    >
                                        {isPending && purchaseState === CatalogPurchaseState.PURCHASE ? <LayoutLoadingSpinnerView /> : LocalizeText('buy')}
                                    </button>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
            {isAddonsPage && addonsLocked && <div className="volt-builders-club-trial-warning">{LocalizeText('builder.addon_page.warning.trial')}</div>}
            <CatalogBuildersClubStatusView />

            {pendingOffer && purchaseState === CatalogPurchaseState.CONFIRM && (
                <CatalogClubPurchaseConfirmView
                    confirmText={LocalizeText('catalog.purchase_confirmation.buy')}
                    iconUrl={iconUrl || undefined}
                    offer={pendingOffer}
                    productText={getBuildersClubOfferName(pendingOffer.localizationId)}
                    titleText={LocalizeText('catalog.purchase.confirmation.dialog.title')}
                    onCancel={() => {
                        setPendingOffer(null);
                        setPurchaseState(CatalogPurchaseState.NONE);
                    }}
                    onConfirm={() => submitPurchase(pendingOffer)}
                />
            )}
        </div>
    );
};
