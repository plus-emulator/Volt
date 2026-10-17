import { FC } from 'react';
import { FriendlyTime, GetProductDataForLocalization, LocalizeText } from '../../../../../api';
import { useBuildersClubStore } from '../../../../../state/buildersClubStore';

export const BUILDERS_CLUB_ADDONS_LAYOUT = 'builders_club_addons';
export const BUILDERS_CLUB_MEMBERSHIP_PAGE = 'builders_club_membership';

// CatalogOffer.localizationName: the productdata name for the offer's localization key, otherwise the key's localization.
export const getBuildersClubOfferName = (localizationId: string): string =>
{
    const name = GetProductDataForLocalization(localizationId)?.name;

    return name || LocalizeText(localizationId);
};

export const useBuildersClubSecondsLeft = () => useBuildersClubStore((state) => state.secondsLeft);

// Builders Club header texts: builder.header.title with the member / grace / trial status, days left and the furni limit.
export const CatalogBuildersClubStatusView: FC = () =>
{
    const received = useBuildersClubStore((state) => state.received);
    const secondsLeft = useBuildersClubStore((state) => state.secondsLeft);
    const secondsLeftWithGrace = useBuildersClubStore((state) => state.secondsLeftWithGrace);
    const furniLimit = useBuildersClubStore((state) => state.furniLimit);
    const furniCount = useBuildersClubStore((state) => state.furniCount);

    if (!received) return null;

    const statusKey = secondsLeft > 0 ? 'builder.header.status.member' : secondsLeftWithGrace > 0 ? 'builder.header.status.grace' : 'builder.header.status.trial';

    return (
        <div className="volt-builders-club-status" data-member={secondsLeft > 0}>
            <strong>{LocalizeText('builder.header.title', ['BCSTATUS'], [LocalizeText(statusKey)])}</strong>
            {secondsLeft > 0 && <span>{LocalizeText('builder.header.status.membership', ['DURATION'], [FriendlyTime.format(secondsLeft)])}</span>}
            <span>{LocalizeText('builder.header.status.limit', ['COUNT', 'LIMIT'], [furniCount.toString(), furniLimit.toString()])}</span>
        </div>
    );
};
