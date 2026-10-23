import { IFurnitureData } from '@volt/renderer';
import { FurniCategory } from '../../../../../api';

/** PetPreviewCatalogWidget draws pets on palette 2 unless a shampoo picks the palette. */
const DEFAULT_PALETTE_ID = 2;

/** One custom part: layer id, part id and palette id. */
export type PetCustomPartData = [number, number, number];

export interface PetCustomizationPreview {
    typeId: number;
    paletteId: number;
    parts: PetCustomPartData[];
}

const parseNumberList = (value: string | undefined): number[] | null => {
    if (!value?.length) return null;

    const values = value.split(',').map((entry) => Number.parseInt(entry, 10));

    return values.length && values.every(Number.isInteger) ? values : null;
};

/**
 * PetPreviewCatalogWidget.onPreviewProduct: the pet image for a pet customization product, read from its custom params
 * ("<pet type> ..."). A shampoo looks up the palette of its colour tag with breed 1 through `getShampooPaletteId`.
 */
export const buildPetCustomizationPreview = (
    furnitureData: IFurnitureData | null | undefined,
    getShampooPaletteId: (petType: number, tag: string) => number | null
): PetCustomizationPreview | null => {
    if (!furnitureData?.customParams?.length) return null;

    const params = furnitureData.customParams.trim().split(/\s+/);
    const typeId = Number.parseInt(params[0], 10);

    if (!Number.isInteger(typeId) || typeId < 0) return null;

    const parts: PetCustomPartData[] = [];

    switch (furnitureData.specialType) {
        case FurniCategory.PET_SHAMPOO: {
            if (params.length < 2) return null;

            return { typeId, paletteId: getShampooPaletteId(typeId, params[1]) ?? 0, parts };
        }
        case FurniCategory.PET_CUSTOM_PART:
        case FurniCategory.PET_SADDLE: {
            if (params.length < 4) return null;

            const layers = parseNumberList(params[1]);
            const partIds = parseNumberList(params[2]);
            const paletteIds = parseNumberList(params[3]);

            if (!layers || !partIds || !paletteIds || layers.length !== partIds.length || layers.length !== paletteIds.length) return null;

            layers.forEach((layerId, index) => parts.push([layerId, partIds[index], paletteIds[index]]));
            break;
        }
        case FurniCategory.PET_CUSTOM_PART_SHAMPOO: {
            if (params.length < 3) return null;

            const layers = parseNumberList(params[1]);
            const paletteIds = parseNumberList(params[2]);

            if (!layers || !paletteIds || layers.length !== paletteIds.length) return null;

            layers.forEach((layerId, index) => parts.push([layerId, -1, paletteIds[index]]));
            break;
        }
        default:
            return null;
    }

    return { typeId, paletteId: DEFAULT_PALETTE_ID, parts };
};
