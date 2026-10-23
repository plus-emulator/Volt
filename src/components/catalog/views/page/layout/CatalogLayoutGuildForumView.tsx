import { FC } from 'react';
import { GetConfigurationValue, LocalizeText } from '../../../../../api';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { useCatalogData, useCatalogUiState, useUserGroups } from '../../../../../hooks';
import { CatalogFirstProductSelectorWidgetView } from '../widgets/CatalogFirstProductSelectorWidgetView';
import { CatalogGuildBadgeWidgetView } from '../widgets/CatalogGuildBadgeWidgetView';
import { CatalogGuildSelectorWidgetView } from '../widgets/CatalogGuildSelectorWidgetView';
import { CatalogNativeHtmlText } from '../widgets/CatalogNativeHtmlText';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogLayoutProps } from './CatalogLayout.types';

const PAGE_BACKGROUND = 0xe9e9e1;

/**
 * AIR layout_guild_forum: authored 360x662, the catalog sets the page to 460 high, so the bottom widgets move up by 202 and
 * the html text shrinks to 326. Page text 1 is ctlg_description; the teaser is a fixed image, not a page image.
 */
export const CatalogLayouGuildForumView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null } = useCatalogData();
    const { purchaseOptions = null } = useCatalogUiState();
    const { data: groups = null } = useUserGroups();

    const libraryUrl = GetConfigurationValue<string>('image.library.url', '');
    // GuildSelectorCatalogWidget.populateAndSelectFavorite toggles the purchase widget on any group membership at all.
    const hasGroups = !!(groups && groups.length);
    // The guild selector stores the chosen guild id as the purchase parameter.
    const selectedGroupId = purchaseOptions?.extraData ?? null;
    const selectedGroup = (selectedGroupId && groups?.find((group) => group.groupId.toString() === selectedGroupId)) || null;
    // GuildForumSelectorCatalogWidget.selectGroup: a group with a forum only gets the warning that this buys another terminal for it
    // (warningWidget, ${catalog.alert.group_has_forum}); the purchase stays open.
    const selectedGroupHasForum = !!selectedGroup?.hasForum;

    return (
        <div className="volt-catalog-guild-forum">
            <CatalogFirstProductSelectorWidgetView />
            <CatalogNativeHtmlText background={PAGE_BACKGROUND} className="volt-catalog-guild-forum-text" html={page.localization.getText(1)} width={260} />
            {!!libraryUrl && <img alt="" className="volt-catalog-guild-forum-teaser" src={`${libraryUrl}catalogue/guild_forums_teaser.gif`} />}
            {!!currentOffer && (
                <div className="volt-catalog-guild-forum-price volt-catalog-guild-price">
                    <div className="volt-catalog-preview-price volt-catalog-price-frame">
                        <CatalogTotalPriceWidget />
                    </div>
                </div>
            )}
            <CatalogGuildBadgeWidgetView className="volt-catalog-guild-forum-badge" />
            <CatalogGuildSelectorWidgetView forumSelector className="volt-catalog-guild-forum-selector" />
            {selectedGroupHasForum && (
                <div className="volt-catalog-guild-forum-warning" role="alert">
                    <NativeText background={PAGE_BACKGROUND} maxWidth={360} overrides={{ color: 0x6f0000 }} text={LocalizeText('catalog.alert.group_has_forum')} textStyle="u_regular" />
                </div>
            )}
            <div className="volt-catalog-guild-forum-purchase">
                {!!currentOffer && hasGroups && (
                    <div className="volt-catalog-offer-actions">
                        <CatalogPurchaseWidgetView noGiftOption={true} />
                    </div>
                )}
            </div>
        </div>
    );
};
