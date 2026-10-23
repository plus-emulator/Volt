import { FC } from 'react';
import { GetConfigurationValue } from '../../../../../api';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { NativeTextStyleName } from '../../../../../common/native-text/NativeTextStyles';
import { CatalogLayoutProps } from './CatalogLayout.types';

/** The border style 2 panel colour (0xff8899a2) behind the white texts. */
const PANEL_COLOUR = 0x8899a2;

interface PetsInfoText {
    x: number;
    y: number;
    width: number;
    textStyle: NativeTextStyleName;
}

/** Page texts 1, 2 and 3 go to ctlg_text_1, ctlg_text_2 and ctlg_text_3 (PageLocalization "pets2" and "pets3"). */
export interface PetsInfoLayout {
    variant: 'pets2' | 'pets3';
    texts: [PetsInfoText, PetsInfoText, PetsInfoText];
}

/** AIR layout_pets2. Positions are on the page; the XML gives them inside the border at (10, 10). */
export const PETS2_LAYOUT: PetsInfoLayout = {
    variant: 'pets2',
    texts: [
        { x: 95, y: 36, width: 234, textStyle: 'u_headline_medium' },
        { x: 30, y: 82, width: 297, textStyle: 'u_regular' },
        { x: 30, y: 310, width: 306, textStyle: 'u_regular' }
    ]
};

/** AIR layout_pets3: a wider title, a wider text 2 and a bold text 3 higher up. */
const PETS3_LAYOUT: PetsInfoLayout = {
    variant: 'pets3',
    texts: [
        { x: 95, y: 36, width: 242, textStyle: 'u_headline_medium' },
        { x: 30, y: 82, width: 307, textStyle: 'u_regular' },
        { x: 30, y: 280, width: 306, textStyle: 'u_bold' }
    ]
};

/** The page texts arrive with <br /> line breaks; the AIR text fields show plain text. */
const toPlainText = (html: string): string =>
    (html ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');

export const CatalogPetsInfoLayoutView: FC<CatalogLayoutProps & { layout: PetsInfoLayout }> = ({ page, layout }) => {
    // ctlg_teaserimg_1 is a static bitmap: page image 1 replaces its default ctlg_pet_note.gif.
    const imageUrl = page.localization.getImage(1) || `${GetConfigurationValue<string>('image.library.url', '')}catalogue/ctlg_pet_note.gif`;

    return (
        <div className={`volt-catalog-pets-info-layout is-${layout.variant}`}>
            <div className="volt-catalog-pets-info-panel" />
            <div className="volt-catalog-pets-info-image">
                <img alt="" src={imageUrl} />
            </div>
            {layout.texts.map((field, index) => {
                const text = toPlainText(page.localization.getText(index + 1));

                if (!text) return null;

                return (
                    <NativeText
                        key={index}
                        transparent
                        background={PANEL_COLOUR}
                        className="volt-catalog-pets-info-text"
                        maxWidth={field.width}
                        overrides={{ color: 0xffffff }}
                        style={{ left: field.x, top: field.y }}
                        text={text}
                        textStyle={field.textStyle}
                    />
                );
            })}
        </div>
    );
};

export const CatalogLayoutPets3View: FC<CatalogLayoutProps> = (props) => <CatalogPetsInfoLayoutView {...props} layout={PETS3_LAYOUT} />;
