import { CreateLinkEvent } from '@volt/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../../../api';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { getCatalogPlainText } from '../../../catalogLocalization.helpers';
import { CatalogCentredImageView } from '../widgets/CatalogCentredImageView';
import { CatalogLayoutProps } from './CatalogLayout.types';

const PAGE_BACKGROUND = 0xe9e9e1;

/**
 * AIR layout_guild_frontpage (360x460). Page text 0 only fills the catalog header, text 1 is ctlg_description, text 2 is
 * ctlg_special_txt and image 1 is ctlg_teaserimg_1.
 */
export const CatalogLayouGuildFrontpageView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const title = getCatalogPlainText(page.localization.getText(2));
    const description = getCatalogPlainText(page.localization.getText(1));
    const teaserImage = page.localization.getImage(1);

    // BuyGuildWidget.onButtonClicked: start the group purchase and close the catalog.
    const startGuildPurchase = () => {
        CreateLinkEvent('groups/create');
        CreateLinkEvent('catalog/hide');
    };

    return (
        <div className="volt-catalog-guild-frontpage">
            <div className="volt-catalog-guild-frontpage-image">{!!teaserImage && <CatalogCentredImageView key={teaserImage} src={teaserImage} />}</div>
            {!!title && <NativeText background={PAGE_BACKGROUND} className="volt-catalog-guild-frontpage-title" text={title} textStyle="u_headline_medium" />}
            {!!description && (
                <NativeText background={PAGE_BACKGROUND} className="volt-catalog-guild-frontpage-description" maxWidth={335} text={description} textStyle="u_regular" />
            )}
            <button className="volt-catalog-guild-shiny-button volt-catalog-guild-frontpage-button" type="button" onClick={startGuildPurchase}>
                <NativeText transparent background={0xffffff} text={LocalizeText('catalog.start.guild.purchase.button')} textStyle="button_shiny_regular" />
            </button>
        </div>
    );
};
