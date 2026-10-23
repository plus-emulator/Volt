import { SelectClubGiftComposer } from '@volt/renderer';
import { FC, useCallback, useMemo } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../../../api';
import { ClassicScrollAreaView } from '../../../../../../common';
import { NativeText } from '../../../../../../common/native-text/NativeText';
import { useClubGifts, useNotification, usePurse } from '../../../../../../hooks';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { ClubGiftText, getGiftRequirementText, getPastClubDaysText } from './clubGifts.helpers';
import { VipGiftItem } from './VipGiftItemView';

/** The catalog page colour behind the AIR text rasters (ctlg_presents paints no background). */
const PAGE_BACKGROUND = 0xe9e9e1;

let isSelectingGift = false;

const localizeClubGiftText = (text: ClubGiftText | null): string => {
    if (!text) return '';

    if (!text.params) return LocalizeText(text.key);

    const names = ['days', 'months'];
    const values = [text.params.days.toString(), text.params.months.toString()];
    const localized = LocalizeText(text.key, names, values);

    // A text pack may leave the short form empty; the long form carries the same information.
    if ((localized && localized !== text.key) || text.key.endsWith('.long')) return localized;

    return LocalizeText(`${text.key}.long`, names, values);
};

export const CatalogLayoutVipGiftsView: FC<CatalogLayoutProps> = (props) => {
    const { purse = null } = usePurse();
    const { data: clubGifts = null } = useClubGifts();
    const { showConfirm = null } = useNotification();

    const giftsAvailable = useCallback(() => {
        if (!clubGifts) return '';

        if (clubGifts.giftsAvailable > 0) return LocalizeText('catalog.club_gift.available', ['amount'], [clubGifts.giftsAvailable.toString()]);

        if (clubGifts.daysUntilNextGift > 0) return LocalizeText('catalog.club_gift.days_until_next', ['days'], [clubGifts.daysUntilNextGift.toString()]);

        // ClubGiftController.hasClub: the user has club days left.
        if (purse?.clubDays > 0) return LocalizeText('catalog.club_gift.not_available');

        return LocalizeText('catalog.club_gift.no_club');
    }, [clubGifts, purse]);

    // The official widget keeps its past VIP days line hidden: HC and VIP time count together in this one.
    const pastClubDaysText = purse ? localizeClubGiftText(getPastClubDaysText(purse.pastClubDays, purse.pastVipDays)) : '';

    const selectGift = useCallback(
        (localizationId: string) => {
            showConfirm(
                LocalizeText('catalog.club_gift.confirm'),
                () => {
                    if (isSelectingGift) return;

                    isSelectingGift = true;

                    // The server replies with a fresh ClubGiftInfoEvent after
                    // accepting the selection; useClubGifts subscribes to that
                    // event via useVoltEventInvalidator, so giftsAvailable
                    // refreshes from the authoritative source — no need to
                    // mutate the parser locally.
                    SendMessageComposer(new SelectClubGiftComposer(localizationId));

                    setTimeout(() => (isSelectingGift = false), 5000);
                },
                null
            );
        },
        [showConfirm]
    );

    const sortGifts = useMemo(() => {
        if (!clubGifts) return [];

        return [...clubGifts.offers].sort((a, b) => clubGifts.getOfferExtraData(a.offerId).daysRequired - clubGifts.getOfferExtraData(b.offerId).daysRequired);
    }, [clubGifts]);

    const infoText = giftsAvailable();

    // AIR layout_club_gifts: info_text (u_italic) at 0,0, gift_list at 0,35 and past_club_days (u_small, centred) at 0,445.
    return (
        <div className="volt-catalog-club-gifts">
            {!!infoText && (
                <NativeText className="volt-catalog-club-gifts-info" background={PAGE_BACKGROUND} maxWidth={360} text={infoText} textStyle="u_italic" />
            )}
            <ClassicScrollAreaView className="volt-catalog-club-gifts-list" contentClassName="volt-catalog-club-gifts-list-content" scrollStep={59}>
                {clubGifts &&
                    clubGifts.offers.length > 0 &&
                    sortGifts.map((offer) => {
                        const giftData = clubGifts.getOfferExtraData(offer.offerId);

                        return (
                            <VipGiftItem
                                key={offer.offerId}
                                isAvailable={giftData.isSelectable && clubGifts.giftsAvailable > 0}
                                isVip={giftData.isVip}
                                offer={offer}
                                requirementText={purse ? localizeClubGiftText(getGiftRequirementText(giftData, purse, clubGifts.giftsAvailable)) : ''}
                                onSelect={selectGift}
                            />
                        );
                    })}
            </ClassicScrollAreaView>
            {!!pastClubDaysText && (
                <NativeText
                    align="center"
                    className="volt-catalog-club-gifts-past"
                    background={PAGE_BACKGROUND}
                    text={pastClubDaysText}
                    textStyle="u_small"
                    width={360}
                />
            )}
        </div>
    );
};
