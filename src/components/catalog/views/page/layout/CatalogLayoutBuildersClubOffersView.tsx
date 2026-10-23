import { NotEnoughBalanceMessageEvent, PurchaseFromCatalogComposer } from '@volt/renderer';
import { FC, useCallback, useRef, useState } from 'react';
import { CatalogPurchaseState, GetConfigurationValue, LocalizeText, OpenUrl, SanitizeHtml, SendMessageComposer } from '../../../../../api';
import creditsIcon from '../../../../../assets/images/catalog/air/builder/pursearea-credits-icon.png';
import diamondIcon from '../../../../../assets/images/catalog/air/builder/pursearea-diamond-icon.png';
import { ClassicScrollAreaView } from '../../../../../common';
import { NativeText } from '../../../../../common/native-text/NativeText';
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
import { CatalogClubPurchaseConfirmView } from './CatalogClubPurchaseConfirmView';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { CatalogPriceBoxView } from '../widgets/CatalogPriceBoxView';
import { BUILDERS_CLUB_ADDONS_LAYOUT, BuildersClubButton, getBuildersClubOfferName, useBuildersClubSecondsLeft } from './buildersClub.helpers';

/** The page colour, the row fill (border style 2 tinted 0xd7d7cf) and the row header (border style 3 tinted 0xafafa9). */
const PAGE_COLOR = 0xe9e9e1;
const ROW_COLOR = 0xd7d7cf;
const HEADER_COLOR = 0xafafa9;

/**
 * AIR layout_builders_club_loyalty / layout_builders_club_addons (360x508): ctlg_description (page text 0) at (15, 28, 276x80),
 * bc_bottom at (290, 316), the offer list at (14, 108) whose height follows the page (params 2064), and bc_top at (249, 21)
 * drawn over everything. One 269x77 row per offer (BuilderLoyaltyCatalogWidget, BuilderAddonsCatalogWidget).
 */
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

    const renderPrice = (offer: CatalogProductlessOffer) => {
        // BuilderLoyaltyCatalogWidget: item_cost_box gets the AIR price_display.
        if (!isAddonsPage)
            return (
                <CatalogPriceBoxView
                    background={ROW_COLOR}
                    className="volt-bc-offer-price"
                    offer={{ priceInCredits: offer.priceCredits, priceInActivityPoints: offer.priceActivityPoints, activityPointType: offer.priceActivityPointsType }}
                />
            );

        // BuilderAddonsCatalogWidget: item_price and the credits icon, then diamonds_price and its icon when there are activity points.
        return (
            <div className="volt-bc-offer-price is-addons">
                <NativeText background={ROW_COLOR} text={String(offer.priceCredits)} textStyle="u_headline_small" />
                <img alt="" className="volt-bc-offer-currency" draggable={false} src={creditsIcon} />
                {offer.priceActivityPoints > 0 && (
                    <>
                        <NativeText background={ROW_COLOR} text={String(offer.priceActivityPoints)} textStyle="u_headline_small" />
                        <img alt="" className="volt-bc-offer-currency" draggable={false} src={diamondIcon} />
                    </>
                )}
            </div>
        );
    };

    const description = pageData?.localization?.getText(0) ?? '';

    return (
        <div className={`volt-bc-layout is-offers ${isAddonsPage ? 'is-addons-page' : 'is-loyalty-page'}`}>
            <div className="volt-bc-description" dangerouslySetInnerHTML={{ __html: SanitizeHtml(description) }} />
            {!!libraryUrl && <img alt="" aria-hidden="true" className="volt-bc-art is-bottom" draggable={false} src={`${libraryUrl}catalogue/bc_bottom.png`} />}
            <div className="volt-bc-offers" data-widget={isAddonsPage ? 'builderAddonsWidget' : 'builderLoyaltyWidget'}>
                <ClassicScrollAreaView className="h-full min-h-0">
                    <div className="volt-bc-offer-list">
                        {productlessOffers.map((offer) => (
                            <article key={offer.offerId} className="volt-bc-offer" data-offer-id={offer.offerId}>
                                <header className="volt-bc-offer-header">
                                    {!!iconUrl && <img alt="" aria-hidden="true" className="volt-bc-offer-icon" draggable={false} src={iconUrl} />}
                                    <NativeText
                                        background={HEADER_COLOR}
                                        className="volt-bc-offer-name"
                                        overrides={{ color: 0xffffff }}
                                        text={getBuildersClubOfferName(offer.localizationId)}
                                        textStyle="u_headline_medium"
                                    />
                                </header>
                                {renderPrice(offer)}
                                <BuildersClubButton
                                    caption={LocalizeText('buy')}
                                    className="volt-bc-offer-buy"
                                    disabled={purchaseState === CatalogPurchaseState.PURCHASE || addonsLocked}
                                    height={35}
                                    name="item_buy"
                                    tint="blue"
                                    width={142}
                                    onClick={() => startPurchase(offer)}
                                />
                            </article>
                        ))}
                    </div>
                </ClassicScrollAreaView>
            </div>
            {addonsLocked && (
                <NativeText
                    tinted
                    background={PAGE_COLOR}
                    className="volt-bc-trial-warning"
                    overrides={{ color: 0xcc0000 }}
                    text={LocalizeText('builder.addon_page.warning.trial')}
                    textStyle="u_bold"
                />
            )}
            {!!libraryUrl && <img alt="" aria-hidden="true" className="volt-bc-art is-top" draggable={false} src={`${libraryUrl}catalogue/bc_top.png`} />}

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
