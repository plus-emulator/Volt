export interface ClubOfferLike {
    offerId: number;
    vip: boolean;
    months: number;
}

export interface ClubMembershipLike {
    clubDays: number;
    clubPeriods: number;
    isVip: boolean;
}

export type ClubPurchaseKind = 'vip' | 'loyalty' | 'club';

/**
 * The three AIR club purchase layouts. windowId is the offer source each widget asks for (requestOffers):
 * ClubBuyCatalogWidget 0, VipBuyCatalogWidget 1, LoyaltyVipBuyCatalogWidget 6.
 */
const CLUB_PURCHASE_LAYOUTS: Record<string, { kind: ClubPurchaseKind; windowId: number }> = {
    club_buy: { kind: 'club', windowId: 0 },
    vip_buy: { kind: 'vip', windowId: 1 },
    loyalty_vip_buy: { kind: 'loyalty', windowId: 6 }
};

export const getClubPurchaseLayout = (layoutCode: string) => CLUB_PURCHASE_LAYOUTS[layoutCode] ?? CLUB_PURCHASE_LAYOUTS.club_buy;

// ClubBuyController.onOffers: offers ordered by term, month terms only, narrowed to catalog.vip.buy.promo when that list is set.
const getShownOffers = <TOffer extends ClubOfferLike>(offers: readonly TOffer[], promotedMonthsCsv: string): TOffer[] => {
    const promotedMonths = promotedMonthsCsv
        .split(',')
        .map((value) => parseInt(value, 10))
        .filter((months) => !Number.isNaN(months) && months > 0);

    return offers
        .filter((offer) => offer.months > 0 && (promotedMonths.length === 0 || promotedMonths.includes(offer.months)))
        .sort((first, second) => first.months - second.months);
};

// The VIP widgets drop HC offers (showOffer returns when !vip); ClubBuyCatalogWidget splits them into its two lists.
export const groupClubOffers = <TOffer extends ClubOfferLike>(kind: ClubPurchaseKind, offers: readonly TOffer[], promotedMonthsCsv = '') => {
    const shown = getShownOffers(offers, promotedMonthsCsv);
    const vip = shown.filter((offer) => offer.vip);
    const hc = kind === 'club' ? shown.filter((offer) => !offer.vip) : [];

    return { hc, vip };
};

export const getClubMembershipSummary = (membership: ClubMembershipLike | null) => {
    if (!membership) return { active: false, tier: 'none' as const, totalDays: 0 };

    const totalDays = Math.max(0, membership.clubPeriods) * 31 + Math.max(0, membership.clubDays);

    if (!totalDays) return { active: false, tier: 'none' as const, totalDays: 0 };

    return {
        active: true,
        tier: membership.isVip ? ('vip' as const) : ('hc' as const),
        totalDays
    };
};

// The text pack can cut catalog.vip.buy.hccenter off at '<a href'. The official text is used whenever the anchor is incomplete.
const HC_CENTER_LINK_OFFICIAL = 'Find out about HC Payday, gifts, benefits and more in the <a href="event:habboUI/open/hccenter">HC Center >></a>';

export const getHcCenterLinkHtml = (localized: string): string => (localized.trimEnd().endsWith('<a href') ? HC_CENTER_LINK_OFFICIAL : localized);

/** Plain text for a native text field: <br> becomes a line break and other tags are dropped. */
export const toPlainClubText = (value: string): string =>
    (value ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
