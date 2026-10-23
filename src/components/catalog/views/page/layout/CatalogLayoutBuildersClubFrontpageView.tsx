import { CreateLinkEvent } from '@volt/renderer';
import { FC } from 'react';
import { CatalogType, GetConfigurationValue, LocalizeText, OpenUrl, SanitizeHtml } from '../../../../../api';
import { useCatalogData } from '../../../../../hooks';
import { findNodeByName } from '../../../../../hooks/catalog/useCatalog.helpers';
import { readCatalogIndex } from '../../../../../hooks/catalog/useCatalogQueries';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { BUILDERS_CLUB_MEMBERSHIP_PAGE, BuildersClubButton, useBuildersClubSecondsLeft } from './buildersClub.helpers';

/** BuilderSubscriptionCatalogWidget: the try page has to exist in the Builders Club catalogue. Unknown until that index loads. */
const hasTryPage = (tryPage: string): boolean => {
    if (!tryPage) return false;

    const index = readCatalogIndex(CatalogType.BUILDER);

    if (!index) return true;

    return !!findNodeByName(tryPage, index.rootNode, index.rootNode);
};

/**
 * AIR layout_builders_club_frontpage (360x508): ctlg_description (page text 0) at (15, 10, 330x380) and
 * builderSubscriptionWidget (360x100, params 1040) on the page bottom. BuilderSubscriptionCatalogWidget.updateSubscriptionInfo
 * shows subscribe_button_big for members (or without a try page), else try_button; a buy membership page adds
 * subscribe_button_sms, which takes the try_button place when that is hidden and replaces subscribe_button_big.
 */
export const CatalogLayoutBuildersClubFrontpageView: FC<CatalogLayoutProps> = ({ page = null }) => {
    const { currentPage = null } = useCatalogData();
    const secondsLeft = useBuildersClubSecondsLeft();
    const pageData = currentPage ?? page;
    const description = pageData?.localization?.getText(0) ?? '';
    const tryPage = GetConfigurationValue<string>('builders_club.try_page', '');
    const smsPage = GetConfigurationValue<string>('builders_club.buy_membership_page', '');

    let showBig = secondsLeft > 0 || !hasTryPage(tryPage);
    const showTry = !showBig;
    const showSms = !!smsPage;

    if (showSms) showBig = false;

    const subscribe = () => {
        const url = GetConfigurationValue<string>('web.shop.subscription.relativeUrl', '');

        // A hotel without the AIR web shop setting keeps the in-catalogue membership page.
        if (url) OpenUrl(url);
        else CreateLinkEvent(`catalog/open/${BUILDERS_CLUB_MEMBERSHIP_PAGE}`);
    };

    return (
        <div className="volt-bc-layout">
            <div className="volt-bc-description is-frontpage" dangerouslySetInnerHTML={{ __html: SanitizeHtml(description) }} />
            <div className="volt-bc-subscription" data-widget="builderSubscriptionWidget">
                {showBig && (
                    <BuildersClubButton
                        caption={LocalizeText('builder.front_page.join')}
                        className="is-big"
                        height={50}
                        name="subscribe_button_big"
                        tint="blue"
                        width={180}
                        onClick={subscribe}
                    />
                )}
                {showTry && (
                    <BuildersClubButton
                        caption={LocalizeText('builder.front_page.try')}
                        className="is-try"
                        height={30}
                        name="try_button"
                        tint="yellow"
                        width={140}
                        onClick={() => CreateLinkEvent(`catalog/warehouse/${tryPage}`)}
                    />
                )}
                {showSms && (
                    <BuildersClubButton
                        caption={LocalizeText('builder.front_page.join.sms')}
                        className={`is-sms ${showTry ? '' : 'is-moved'}`}
                        height={30}
                        name="subscribe_button_sms"
                        tint="blue"
                        width={140}
                        onClick={() => OpenUrl(smsPage)}
                    />
                )}
            </div>
        </div>
    );
};
