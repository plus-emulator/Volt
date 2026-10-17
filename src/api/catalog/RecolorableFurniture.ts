import { GetRecolorableFurnitureColors, MapDataType } from '@volt/renderer';
import { ICatalogPage } from './ICatalogPage';

/** AIR `recolorable_furniture` catalogue layout code (HabboCatalog.as:2935). */
export const RECOLORABLE_FURNITURE_LAYOUT = 'recolorable_furniture';

/** `0xRRGGBB` as the decimal "r,g,b" a product carries as its extra parameter (RecolorableFurnitureCatalogWidget.as:107). */
export const GetRecolorableColorParam = (color: number): string => [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff].join(',');

/** RecolorableFurnitureCatalogWidget.createStuffData (AIR RecolorableFurnitureCatalogWidget.as:38): MapData {state: "0", r, g, b}. */
export const CreateRecolorableStuffData = (colorParam: string): MapDataType =>
{
    const [r = '', g = '', b = ''] = (colorParam ?? '').split(',');
    const stuffData = new MapDataType();

    stuffData.setValue('state', '0');
    stuffData.setValue('r', r);
    stuffData.setValue('g', g);
    stuffData.setValue('b', b);

    return stuffData;
};

export const IsRecolorableFurniturePage = (page: ICatalogPage): boolean => !!page && page.layoutCode === RECOLORABLE_FURNITURE_LAYOUT;

/**
 * RecolorableFurnitureCatalogWidget.applyColor (AIR RecolorableFurnitureCatalogWidget.as:93-121): every offer on the page with a
 * palette gets the colour as its extra parameter when its palette has it, else that palette's first colour.
 */
export const ApplyRecolorableColorToPage = (page: ICatalogPage, color: number): void =>
{
    if (!page) return;

    for (const offer of page.offers)
    {
        const product = offer.product;

        if (!product?.furnitureData) continue;

        const palette = GetRecolorableFurnitureColors(product.furnitureData.className);

        if (!palette.length) continue;

        product.extraParam = GetRecolorableColorParam(palette.includes(color) ? color : palette[0]);
    }
};
