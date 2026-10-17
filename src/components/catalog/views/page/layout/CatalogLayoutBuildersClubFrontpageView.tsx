import { CreateLinkEvent } from '@volt/renderer';
import { FC } from 'react';
import { LocalizeText, SanitizeHtml } from '../../../../../api';
import { useCatalogData } from '../../../../../hooks';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { BUILDERS_CLUB_MEMBERSHIP_PAGE, CatalogBuildersClubStatusView } from './buildersClub.helpers';

// layout_builders_club_frontpage (AIR WIN63-202610151745-318700621): ctlg_description and builderSubscriptionWidget.
// BuilderSubscriptionCatalogWidget opens the web shop from subscribe_button_big; Volt opens the membership page instead.
export const CatalogLayoutBuildersClubFrontpageView: FC<CatalogLayoutProps> = ({ page = null }) => {
    const { currentPage = null } = useCatalogData();
    const pageData = currentPage ?? page;
    const description = pageData?.localization?.getText(0) ?? '';

    return (
        <div className="volt-club-purchase-layout volt-builders-club-layout is-frontpage">
            <div className="volt-builders-club-description is-frontpage" dangerouslySetInnerHTML={{ __html: SanitizeHtml(description) }} />
            <div className="volt-builders-club-subscription">
                <CatalogBuildersClubStatusView />
                <button
                    className="volt-club-offer-action volt-builders-club-subscribe"
                    data-name="subscribe_button_big"
                    type="button"
                    onClick={() => CreateLinkEvent(`catalog/open/${BUILDERS_CLUB_MEMBERSHIP_PAGE}`)}
                >
                    {LocalizeText('builder.front_page.join')}
                </button>
            </div>
        </div>
    );
};
