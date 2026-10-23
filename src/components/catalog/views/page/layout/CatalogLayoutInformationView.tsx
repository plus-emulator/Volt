import { FC, ReactNode } from 'react';
import { GetConfigurationValue, LocalizeText, OpenUrl, SanitizeHtml, localizeWithFallback } from '../../../../../api';
import duckatIcon from '../../../../../assets/images/purse-swf/icons/2381_duckat_icon_0_png$7c0915a94ebd1a1746053f94976b8ba1-1879246012.png';
import { useNotification } from '../../../../../hooks';
import { CatalogAirHtmlTextView } from './CatalogAirHtmlTextView';
import { AirPivotPoint, CatalogAirStaticImageView } from './CatalogAirStaticImageView';
import { CatalogLayoutProps } from './CatalogLayout.types';

/** The catalog page colour behind the AIR text rasters. */
const PAGE_BACKGROUND = 0xe9e9e1;
/** layout_info_rentables: the centre of the #d8d8d8 border style 2. */
const RENTABLES_BACKGROUND = 0xd8d8d8;
/** layout_recycler_info: the centre of the #fbc362 border style 2. */
const RECYCLER_BACKGROUND = 0xfbc362;

const getLibraryImage = (name: string) => {
    const libraryUrl = GetConfigurationValue<string>('image.library.url', '');

    return libraryUrl ? `${libraryUrl}catalogue/${name}.gif` : null;
};

interface StaticImage {
    x: number;
    y: number;
    width: number;
    height: number;
    pivot: AirPivotPoint;
    /** The layout's own asset_uri, used until the page sends an image for the element. */
    asset: string;
}

const StaticImage: FC<{ image: StaticImage; src?: string; className?: string }> = ({ image, src = null, className = '' }) => (
    <CatalogAirStaticImageView
        className={className}
        height={image.height}
        pivot={image.pivot}
        src={src || getLibraryImage(image.asset)}
        style={{ left: image.x, top: image.y }}
        width={image.width}
    />
);

/**
 * layout_info_duckets and layout_info_loyalty: the html ctlg_description gets page text 0 (PageLocalization), the
 * illustration is the layout's static_bitmap.
 */
const INFO_TEXT_LAYOUTS: Record<string, { text: { x: number; y: number; width: number; height: number }; illustration: StaticImage }> = {
    info_duckets: {
        text: { x: 24, y: 19, width: 226, height: 420 },
        illustration: { asset: 'duckets_info_illustration', x: 236, y: 10, width: 123, height: 360, pivot: 'top left' }
    },
    info_loyalty: {
        text: { x: 24, y: 19, width: 226, height: 322 },
        illustration: { asset: 'diamond_info_illustration', x: 237, y: 39, width: 123, height: 350, pivot: 'top left' }
    }
};

const InfoTextLayout: FC<CatalogLayoutProps> = ({ page }) => {
    const layout = INFO_TEXT_LAYOUTS[page.layoutCode];

    return (
        <div className="volt-air-info-layout">
            <CatalogAirHtmlTextView
                background={PAGE_BACKGROUND}
                height={layout.text.height}
                html={page.localization.getText(0)}
                style={{ left: layout.text.x, top: layout.text.y }}
                width={layout.text.width}
            />
            <StaticImage image={layout.illustration} />
        </div>
    );
};

/** The five rows of layout_info_rentables; rulepic2 has no pivot point, rulepic4 is 46 high. */
const RENTABLES_PICTURES: { pivot: AirPivotPoint; height: number }[] = [
    { pivot: 'center', height: 40 },
    { pivot: 'top left', height: 40 },
    { pivot: 'center', height: 40 },
    { pivot: 'center', height: 46 },
    { pivot: 'center', height: 40 }
];

/**
 * layout_info_rentables: a #d8d8d8 border style 2 (17, 20, 328x425) holding an itemlist_vertical (10, 9) with spacing 3. Each
 * row (306 wide) grows to its children: the mirrored toolbar_duckat_icon_0 at 1,3, ctlg_text_N (u_regular, 232 wide) at 31,3
 * and rentables_rulepicN.gif at 266,1. Page texts 1 to 5 fill ctlg_text_1 to ctlg_text_5.
 */
const InfoRentablesLayout: FC<CatalogLayoutProps> = ({ page }) => (
    <div className="volt-air-info-layout">
        <div className="volt-air-info-rentables">
            <div className="volt-air-info-rentables-list">
                {RENTABLES_PICTURES.map((picture, index) => (
                    <div key={index} className="volt-air-info-rentables-row" style={{ minHeight: 1 + picture.height }}>
                        <img alt="" className="volt-air-info-rentables-icon" draggable={false} src={duckatIcon} />
                        <CatalogAirHtmlTextView
                            background={RENTABLES_BACKGROUND}
                            className="volt-air-info-rentables-text"
                            html={page.localization.getText(index + 1)}
                            width={232}
                        />
                        <StaticImage
                            className="volt-air-info-rentables-picture"
                            image={{ asset: `rentables_rulepic${index + 1}`, x: 266, y: 1, width: 40, height: picture.height, pivot: picture.pivot }}
                        />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

/**
 * layout_recycler_info: a #fbc362 border style 2 (10, 10, 340x440) holding ctlg_teaserimg_1 (20, 10, 57x57, page image 1,
 * else ctlg_ecotron_box.gif), ctlg_description (u_headline_medium, white, sharpness and thickness 0, 83,26, 242 wide, page
 * text 1) and ctlg_special_txt (u_regular, white, 15,72, 307 wide, page text 2).
 */
const InfoRecyclerLayout: FC<CatalogLayoutProps> = ({ page }) => (
    <div className="volt-air-info-layout">
        <div className="volt-air-info-recycler">
            <StaticImage
                image={{ asset: 'ctlg_ecotron_box', x: 20, y: 10, width: 57, height: 57, pivot: 'center' }}
                src={page.localization.getImage(1)}
            />
            <CatalogAirHtmlTextView
                background={RECYCLER_BACKGROUND}
                color={0xffffff}
                html={page.localization.getText(1)}
                style={{ left: 83, top: 26 }}
                textStyle="u_headline_medium"
                width={242}
            />
            <CatalogAirHtmlTextView
                background={RECYCLER_BACKGROUND}
                color={0xffffff}
                html={page.localization.getText(2)}
                style={{ left: 15, top: 72 }}
                width={307}
            />
        </div>
    </div>
);

/** LocalizationCatalogWidget.onClickLink: the localized link (with AIR's own default), opened after the external link alert. */
const MONKEY_LINKS: Record<string, [string, string]> = {
    monkey: ['link.format.monkey', 'http://store.apple.com/'],
    niko: ['link.format.niko', 'http://itunes.apple.com/us/app/niko/id481670205?mt=8']
};

/**
 * layout_monkey (niko uses it too): ctlg_teaserimg_1_region (10, 20, 339x344) with catalog_monkey_teaser.gif at top centre
 * and ctlg_special_img_region (10, 375, 339x80) with catalog_monkey_store2_en.gif centred. Page images 1 and 2 replace them.
 * Both regions are links.
 */
const MonkeyLayout: FC<CatalogLayoutProps> = ({ page }) => {
    const { simpleAlert = null } = useNotification();
    const [linkKey, linkDefault] = MONKEY_LINKS[page.layoutCode] ?? MONKEY_LINKS.monkey;

    const openLink = () => {
        const url = localizeWithFallback(linkKey, linkDefault);

        if (!url) return;

        simpleAlert?.(LocalizeText('catalog.alert.external.link.desc'), null, null, null, LocalizeText('catalog.alert.external.link.title'));
        OpenUrl(url);
    };

    const region = (key: string, x: number, y: number, width: number, height: number, image: ReactNode) => (
        <button key={key} className="volt-air-info-monkey-region" style={{ left: x, top: y, width, height }} type="button" onClick={openLink}>
            {image}
        </button>
    );

    return (
        <div className="volt-air-info-layout">
            {region(
                'teaser',
                10,
                20,
                339,
                344,
                <StaticImage image={{ asset: 'catalog_monkey_teaser', x: 0, y: 0, width: 339, height: 344, pivot: 'top center' }} src={page.localization.getImage(1)} />
            )}
            {region(
                'special',
                10,
                375,
                339,
                80,
                <StaticImage image={{ asset: 'catalog_monkey_store2_en', x: 0, y: 0, width: 339, height: 80, pivot: 'center' }} src={page.localization.getImage(2)} />
            )}
        </div>
    );
};

const NATIVE_INFO_LAYOUTS: Record<string, FC<CatalogLayoutProps>> = {
    info_duckets: InfoTextLayout,
    info_loyalty: InfoTextLayout,
    info_rentables: InfoRentablesLayout,
    recycler_info: InfoRecyclerLayout,
    monkey: MonkeyLayout,
    niko: MonkeyLayout
};

export const CatalogLayoutInformationView: FC<CatalogLayoutProps> = (props) => {
    const { page } = props;
    const NativeLayout = NATIVE_INFO_LAYOUTS[page.layoutCode];

    if (NativeLayout) return <NativeLayout {...props} />;

    // Layout codes without an AIR layout asset (AIR shows no page for them): a plain list of the page's images and texts.
    const images = Array.from({ length: 4 }, (_, index) => page.localization.getImage(index)).filter(Boolean);
    const texts = Array.from({ length: 8 }, (_, index) => page.localization.getText(index)).filter(Boolean);

    if (!images.length && !texts.length) {
        return (
            <div className="volt-catalog-specialized-state" role="status">
                {localizeWithFallback('catalog.layout.info.empty', 'Information will be available here soon.')}
            </div>
        );
    }

    return (
        <article className="volt-catalog-information-layout">
            {!!images.length && (
                <div className="volt-catalog-information-images">
                    {images.map((image, index) => (
                        <img key={`${image}-${index}`} alt="" src={image} />
                    ))}
                </div>
            )}
            <div className="volt-catalog-information-copy">
                {texts.map((text, index) => (
                    <section key={index} dangerouslySetInnerHTML={{ __html: SanitizeHtml(text) }} />
                ))}
            </div>
        </article>
    );
};
