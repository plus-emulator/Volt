import { FC } from 'react';
import { LocalizeText } from '../../../../../api';
import { SubpixelText } from '../../../../../common/native-text/SubpixelText';

const LOCALIZATION_KEY = 'catalog.purchase.select.info';

/** purchaseWidget selection_information: ${catalog.purchase.select.info} in u_headline_small 0x666666, centred in a 341px text field (so on sub-pixel pens). */
export const CatalogPurchaseSelectionPrompt: FC = () => {
    const localizedText = LocalizeText(LOCALIZATION_KEY);
    const text =
        !localizedText || localizedText === LOCALIZATION_KEY || localizedText === `\${${LOCALIZATION_KEY}}` ? 'Select an item to continue.' : localizedText;

    return (
        <span className="volt-catalog-purchase-selection-prompt" role="status">
            <SubpixelText
                align="center"
                background={0xd2d1cb}
                className="volt-catalog-purchase-selection-text"
                color={0x666666}
                text={text}
                textStyle="u_headline_small"
                width={341}
            />
        </span>
    );
};
