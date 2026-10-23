import { ClubOfferData, CreateLinkEvent, PurchaseFromCatalogComposer } from '@volt/renderer';
import { FC, useCallback, useMemo, useRef, useState } from 'react';
import { CatalogPurchaseState, DispatchUiEvent, GetConfigurationValue, LocalizeText, OpenUrl, SanitizeHtml, SendMessageComposer } from '../../../../../api';
import hcCatalogTeaser from '../../../../../assets/images/catalog/air/hc/hc-catalog-teaser.gif';
import vipIconMedium from '../../../../../assets/images/catalog/air/vip-icon-medium.png';
import { LayoutLoadingSpinnerView } from '../../../../../common';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { SubpixelText } from '../../../../../common/native-text/SubpixelText';
import { CatalogEvent, CatalogInitGiftEvent, CatalogPurchasedEvent, CatalogPurchaseFailureEvent } from '../../../../../events';
import {
    useCatalogActions,
    useCatalogData,
    useCatalogSkipPurchaseConfirmation,
    useCatalogUiState,
    useClubOffers,
    useNotification,
    usePurse,
    useUiEvent
} from '../../../../../hooks';
import { CatalogPriceBoxView } from '../widgets/CatalogPriceBoxView';
import { CatalogClubPurchaseConfirmView } from './CatalogClubPurchaseConfirmView';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { getClubMembershipSummary, getClubPurchaseLayout, getHcCenterLinkHtml, groupClubOffers, toPlainClubText } from './clubPurchase.helpers';

/** The page colour (0xe9e9e1) under the layout root, which paints white at alpha 0x21 (color 0x2121ffffff). */
const PAGE_BACKGROUND = 0xecece5;
/** border style 2 (border_colorless) tints used by the club layouts and their items. */
const GREY_FRAME = 0x969696;
const GREY_FILL = 0xdfdfdf;
const HC_FRAME = 0x9b9448;
const HC_FILL = 0xebeada;

/** static_bitmap pivot placement (BitmapDataRenderer): the free space halved and truncated toward zero. */
const pivotOffset = (box: number, size: number) => Math.trunc((box - size) / 2);

/** ctlg_teaserimg_1: page image 1 when the page has one (LocalizationCatalogWidget), else the layout's hc_catalog_teaser.gif. */
const ClubTeaserView: FC<{ src: string; height: number; centreVertically: boolean }> = ({ src, height, centreVertically }) => {
    const [size, setSize] = useState<{ width: number; height: number }>(null);

    return (
        <div className="volt-club-teaser" style={{ height }}>
            <img
                alt=""
                draggable={false}
                src={src}
                style={size ? { left: pivotOffset(152, size.width), top: centreVertically ? pivotOffset(height, size.height) : 0 } : { visibility: 'hidden' }}
                onLoad={(event) => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            />
        </div>
    );
};

export const CatalogLayoutVipBuyView: FC<CatalogLayoutProps> = ({ page = null }) => {
    const [pendingOffer, setPendingOffer] = useState<ClubOfferData | null>(null);
    const [purchaseWillBeGift, setPurchaseWillBeGift] = useState(false);
    const [purchaseState, setPurchaseState] = useState(CatalogPurchaseState.NONE);
    const [catalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const { currentPage = null } = useCatalogData();
    const { resetPlacedOfferData = null } = useCatalogActions();
    const { giftReceiver = null } = useCatalogUiState();
    const { purse = null, getCurrencyAmount = null } = usePurse();
    const { showConfirm = null, simpleAlert = null } = useNotification();
    const pageData = currentPage ?? page;
    const { kind, windowId } = getClubPurchaseLayout(pageData?.layoutCode ?? 'club_buy');
    const { data: offers = null } = useClubOffers(windowId);
    const isPurchasingRef = useRef(false);
    const isVipPage = kind !== 'club';
    const offerGroups = useMemo(() => groupClubOffers(kind, offers ?? [], GetConfigurationValue<string>('catalog.vip.buy.promo', '')), [kind, offers]);
    const membership = useMemo(() => getClubMembershipSummary(purse), [purse]);

    const onCatalogEvent = useCallback((event: CatalogEvent) => {
        if (!isPurchasingRef.current) return;

        switch (event.type) {
            case CatalogPurchasedEvent.PURCHASE_SUCCESS:
                isPurchasingRef.current = false;
                setPurchaseWillBeGift(false);
                setPurchaseState(CatalogPurchaseState.NONE);
                setPendingOffer(null);
                return;
            case CatalogPurchaseFailureEvent.PURCHASE_FAILED:
                isPurchasingRef.current = false;
                setPurchaseWillBeGift(false);
                setPurchaseState(CatalogPurchaseState.NONE);
                setPendingOffer(null);
                return;
        }
    }, []);

    useUiEvent(CatalogPurchasedEvent.PURCHASE_SUCCESS, onCatalogEvent);
    useUiEvent(CatalogPurchaseFailureEvent.PURCHASE_FAILED, onCatalogEvent);

    const getPurchaseHeader = useCallback(
        (offer: ClubOfferData) => {
            const extensionOrSubscription = membership.tier === 'vip' ? 'extension.' : 'subscription.';
            const daysOrMonths = offer.months === 0 ? 'days' : 'months';
            const value = offer.months === 0 ? offer.extraDays : offer.months;

            return LocalizeText(`catalog.vip.buy.confirm.${extensionOrSubscription}${daysOrMonths}`, [`NUM_${daysOrMonths.toUpperCase()}`], [value.toString()]);
        },
        [membership.tier]
    );

    const getPurchaseValidUntil = useCallback((offer: ClubOfferData) => {
        return LocalizeText(
            'catalog.vip.buy.confirm.end_date',
            ['day', 'month', 'year'],
            [offer.day.toString(), offer.month.toString(), offer.year.toString()]
        );
    }, []);

    const showInsufficientBalanceAlert = useCallback(
        (offer: ClubOfferData) => {
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
                const currencyLocalization = GetConfigurationValue<string>(
                    `activitypoint.name.${offer.priceActivityPointsType}`,
                    offer.priceActivityPointsType === 0 ? 'tooltip.duckets' : ''
                );

                if (currencyLocalization) {
                    const currencyName = LocalizeText(currencyLocalization);
                    const description = LocalizeText('catalog.alert.notenough.activitypoints.description', ['currencyname'], [currencyName]);
                    const title = LocalizeText('catalog.alert.notenough.activitypoints.title', ['currencyname'], [currencyName]);

                    if (offer.priceActivityPointsType === 0 && showConfirm) {
                        const settle = () => resetPlacedOfferData?.();

                        showConfirm(
                            description,
                            () => {
                                settle();

                                const ducketsUrl = GetConfigurationValue<string>('link.format.duckets', '');

                                if (ducketsUrl) OpenUrl(ducketsUrl);
                            },
                            settle,
                            null,
                            null,
                            title
                        );
                    } else {
                        simpleAlert?.(description, null, null, null, title);
                    }
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
        (offer: ClubOfferData) => {
            if (!pageData || isPurchasingRef.current) return;

            if (showInsufficientBalanceAlert(offer)) {
                setPendingOffer(null);
                setPurchaseState(CatalogPurchaseState.NONE);

                return;
            }

            isPurchasingRef.current = true;
            setPurchaseWillBeGift(false);
            setPendingOffer(offer);
            setPurchaseState(CatalogPurchaseState.PURCHASE);
            SendMessageComposer(new PurchaseFromCatalogComposer(pageData.pageId, offer.offerId, null, 1));
        },
        [pageData, showInsufficientBalanceAlert]
    );

    const startPurchase = useCallback(
        (offer: ClubOfferData) => {
            if (isPurchasingRef.current) return;

            if (showInsufficientBalanceAlert(offer)) return;

            if (catalogSkipPurchaseConfirmation) {
                submitPurchase(offer);
                return;
            }

            setPurchaseWillBeGift(false);
            setPendingOffer(offer);
            setPurchaseState(CatalogPurchaseState.CONFIRM);
        },
        [catalogSkipPurchaseConfirmation, showInsufficientBalanceAlert, submitPurchase]
    );

    const startGift = useCallback(
        (offer: ClubOfferData) => {
            if (!pageData || isPurchasingRef.current || !offer.giftable) return;
            if (showInsufficientBalanceAlert(offer)) return;

            setPurchaseWillBeGift(true);
            setPendingOffer(offer);
            setPurchaseState(CatalogPurchaseState.CONFIRM);
        },
        [pageData, showInsufficientBalanceAlert]
    );

    const confirmPendingOffer = useCallback(() => {
        if (!pendingOffer) return;

        if (purchaseWillBeGift) {
            if (!pageData) return;

            DispatchUiEvent(new CatalogInitGiftEvent(pageData.pageId, pendingOffer.offerId, '', giftReceiver ?? ''));
            setPurchaseWillBeGift(false);
            setPendingOffer(null);
            setPurchaseState(CatalogPurchaseState.NONE);
            return;
        }

        submitPurchase(pendingOffer);
    }, [giftReceiver, pageData, pendingOffer, purchaseWillBeGift, submitPurchase]);

    const renderBuyButton = (offer: ClubOfferData, className: string) => (
        <button className={className} disabled={isPurchasingRef.current} type="button" onClick={() => startPurchase(offer)}>
            {pendingOffer?.offerId === offer.offerId && purchaseState === CatalogPurchaseState.PURCHASE ? (
                <LayoutLoadingSpinnerView />
            ) : (
                LocalizeText('catalog.club.button.buy')
            )}
        </button>
    );

    // vip_buy_item (320x75): grey frame, header bar with vip_icon_medium and item_header (u_bold 14, white), item_price at 5,41
    // filled like price_display, item_gift at 130,37 (hidden when not giftable) and item_buy at 225,37.
    const renderVipOffer = (offer: ClubOfferData) => {
        const header =
            offer.months > 0
                ? LocalizeText('catalog.vip.item.header.months', ['NUM_MONTHS'], [offer.months.toString()])
                : LocalizeText('catalog.vip.item.header.days', ['NUM_DAYS'], [offer.extraDays.toString()]);

        return (
            <article key={offer.offerId} className="volt-air-club-vip-item" data-offer-id={offer.offerId}>
                <div className="volt-air-club-vip-item-header">
                    <img alt="" aria-hidden="true" className="volt-club-vip-medium-mark" draggable={false} src={vipIconMedium} />
                    <NativeText className="volt-air-club-vip-item-title" background={GREY_FRAME} overrides={{ size: 14, color: 0xffffff }} text={header} textStyle="u_bold" />
                </div>
                <CatalogPriceBoxView
                    background={GREY_FILL}
                    className="volt-air-club-vip-item-price"
                    offer={{ priceInCredits: offer.priceCredits, priceInActivityPoints: offer.priceActivityPoints, activityPointType: offer.priceActivityPointsType }}
                />
                {offer.giftable && (
                    <button className="volt-club-offer-action is-gift" disabled={isPurchasingRef.current} type="button" onClick={() => startGift(offer)}>
                        {LocalizeText('catalog.purchase_confirmation.gift')}
                    </button>
                )}
                {renderBuyButton(offer, 'volt-club-offer-action is-buy')}
            </article>
        );
    };

    // club_buy_hc_item / club_buy_vip_item (151x67): header text, item_price (catalog.club.price, credits only) at 9,44 and a
    // shiny item_buy button that sizes to its caption with its right edge at 143.
    const renderClubOffer = (offer: ClubOfferData) => {
        const header = LocalizeText('catalog.club.item.header', ['months'], [offer.months.toString()]);

        return (
            <article key={offer.offerId} className={`volt-air-club-item ${offer.vip ? 'is-vip' : 'is-hc'}`} data-offer-id={offer.offerId}>
                <div className="volt-air-club-item-header">
                    <span aria-hidden="true" className={`volt-club-compact-mark ${offer.vip ? 'is-vip' : 'is-hc'}`} />
                    {offer.vip ? (
                        <NativeText className="volt-air-club-item-title" background={GREY_FRAME} overrides={{ color: 0xffffff }} text={header} textStyle="u_regular" width={90} />
                    ) : (
                        <SubpixelText align="center" className="volt-air-club-item-title" background={HC_FRAME} color={0xffffff} text={header} textStyle="u_regular" width={141} />
                    )}
                </div>
                <NativeText
                    className="volt-air-club-item-price"
                    background={offer.vip ? GREY_FILL : HC_FILL}
                    text={LocalizeText('catalog.club.price', ['price'], [offer.priceCredits.toString()])}
                    textStyle="u_regular"
                />
                {renderBuyButton(offer, 'volt-air-club-item-buy')}
            </article>
        );
    };

    const membershipHeaderKey = {
        hc: 'catalog.club.buy.header.hc',
        none: 'catalog.club.buy.header.none',
        vip: 'catalog.club.buy.header.vip'
    }[membership.tier];
    const membershipInfoKey = {
        hc: 'catalog.club.buy.info.hc',
        none: 'catalog.club.buy.info.none',
        vip: 'catalog.club.buy.info.vip'
    }[membership.tier];
    const remainingKey = membership.tier === 'vip' ? 'catalog.club.buy.remaining.vip' : 'catalog.club.buy.remaining.hc';
    // initClubType: a VIP member gets the extend texts.
    const vipTitle = LocalizeText(membership.tier === 'vip' ? 'catalog.vip.extend.title' : 'catalog.vip.buy.title');
    const vipInfo =
        membership.tier === 'vip' ? LocalizeText('catalog.vip.extend.info', ['days'], [membership.totalDays.toString()]) : LocalizeText('catalog.vip.buy.info');
    // layout_loyalty_vip_buy keeps its texts 158 wide; layout_vip_buy uses 178.
    const vipTextWidth = kind === 'loyalty' ? 158 : 178;
    const teaserSource = pageData?.localization?.getImage(1) || hcCatalogTeaser;

    // ClubBuyCatalogWidget.openExternalLink, and showVipBenefits when the benefits window is off: the link.format.club page.
    const openClubLink = () => {
        const url = GetConfigurationValue<string>('link.format.club', '');

        if (!url) return;

        simpleAlert?.(LocalizeText('catalog.alert.external.link.desc'), null, null, null, LocalizeText('catalog.alert.external.link.title'));
        OpenUrl(url);
    };

    return (
        <div className={`volt-air-club ${isVipPage ? 'is-vip-page' : 'is-club-page'} is-${kind}`}>
            {isVipPage ? (
                <>
                    <div className="volt-club-vip-intro">
                        <ClubTeaserView key={teaserSource} centreVertically={kind === 'loyalty'} height={kind === 'loyalty' ? 161 : 291} src={teaserSource} />
                        <div className="volt-club-vip-copy">
                            <SubpixelText
                                align="center"
                                background={PAGE_BACKGROUND}
                                className="volt-club-vip-title"
                                text={toPlainClubText(vipTitle)}
                                textStyle="u_bold"
                                width={vipTextWidth}
                            />
                            <NativeText
                                align="center"
                                background={PAGE_BACKGROUND}
                                leading={3}
                                maxWidth={vipTextWidth}
                                text={toPlainClubText(vipInfo)}
                                textStyle="u_regular"
                                width={vipTextWidth}
                            />
                        </div>
                    </div>
                    <div className="volt-club-vip-offers">{offerGroups.vip.map(renderVipOffer)}</div>
                    {kind === 'loyalty' ? (
                        <button className="volt-air-club-vip-link" type="button" onClick={openClubLink}>
                            <NativeText
                                align="center"
                                background={PAGE_BACKGROUND}
                                overrides={{ color: 0x038ef4, underline: true }}
                                text={LocalizeText('catalog.vip.buy.link')}
                                textStyle="u_regular"
                                width={286}
                            />
                        </button>
                    ) : (
                        <div
                            className="volt-club-center-link"
                            dangerouslySetInnerHTML={{ __html: SanitizeHtml(getHcCenterLinkHtml(LocalizeText('catalog.vip.buy.hccenter'))) }}
                            role="link"
                            tabIndex={0}
                            onClick={(event) => {
                                event.preventDefault();
                                CreateLinkEvent('habboUI/open/hccenter');
                            }}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') return;

                                event.preventDefault();
                                CreateLinkEvent('habboUI/open/hccenter');
                            }}
                        />
                    )}
                </>
            ) : (
                <>
                    <header className="volt-air-club-header">
                        <SubpixelText align="center" background={GREY_FILL} text={LocalizeText(membershipHeaderKey)} textStyle="u_headline_small" width={307} />
                    </header>
                    <NativeText className="volt-air-club-info" background={PAGE_BACKGROUND} maxWidth={307} text={LocalizeText(membershipInfoKey)} textStyle="u_regular" />
                    <span aria-hidden="true" className="volt-club-emblem" />
                    <div className="volt-club-columns">
                        <section className="volt-club-hc-column">
                            {/* showClubInfo runs in initClubType, before the offers arrive, so the info item heads the HC list. */}
                            {membership.tier === 'vip' && (
                                <div className="volt-air-club-info-item">
                                    <div className="volt-air-club-item-header">
                                        <SubpixelText
                                            align="center"
                                            className="volt-air-club-info-item-title"
                                            background={HC_FRAME}
                                            color={0xffffff}
                                            text={LocalizeText('catalog.club.info.header')}
                                            textStyle="u_regular"
                                            width={141}
                                        />
                                    </div>
                                    <NativeText
                                        className="volt-air-club-info-item-content"
                                        background={HC_FILL}
                                        maxWidth={134}
                                        text={LocalizeText('catalog.club.info.content')}
                                        textStyle="u_regular"
                                    />
                                </div>
                            )}
                            {offerGroups.hc.map(renderClubOffer)}
                        </section>
                        <section className="volt-club-vip-column">{offerGroups.vip.map(renderClubOffer)}</section>
                    </div>
                    {membership.active && (
                        <div className="volt-air-club-remaining">
                            <NativeText background={GREY_FILL} text={LocalizeText(remainingKey, ['days'], [membership.totalDays.toString()])} textStyle="u_regular" />
                        </div>
                    )}
                    <button className="volt-air-club-link" type="button" onClick={openClubLink}>
                        <NativeText
                            align="center"
                            background={PAGE_BACKGROUND}
                            overrides={{ underline: true }}
                            text={LocalizeText('catalog.club.buy.link')}
                            textStyle="u_regular"
                            width={340}
                        />
                    </button>
                </>
            )}

            {pendingOffer && purchaseState !== CatalogPurchaseState.NONE && purchaseState !== CatalogPurchaseState.PURCHASE && (
                <CatalogClubPurchaseConfirmView
                    offer={pendingOffer}
                    productText={getPurchaseHeader(pendingOffer)}
                    validUntilText={getPurchaseValidUntil(pendingOffer)}
                    onCancel={() => {
                        setPurchaseWillBeGift(false);
                        setPendingOffer(null);
                        setPurchaseState(CatalogPurchaseState.NONE);
                    }}
                    onConfirm={confirmPendingOffer}
                />
            )}
        </div>
    );
};
