import { GetSessionDataManager } from '@volt/renderer';
import { LocalizeBadgeName, LocalizeText } from '../utils';

/** IProductDisplayInfo as the hub uses it: the renderer's NftProductData fits it, and a mintable item maps onto it. */
export interface ICollectibleProduct {
    productTypeId: number;
    itemTypeId: string;
    petFigureString: string;
    figureSetIds: number[];
}

// productTypeId values (CollectiblesController.getProductType).
export const CollectibleProductType = {
    UNKNOWN: -1,
    WALL: 0,
    FLOOR: 1,
    EFFECT: 2,
    BADGE: 4,
    CHAT_STYLE: 9,
    PET: 10,
    CLOTHING: 11
} as const;

// CollectiblesController.tempCategoryMapping: wallpaper, floor and landscape wall types have no preview.
const UNPREVIEWED_WALL_TYPES = [3001, 3002, 4057];

export const IsPreviewableWallItem = (furniId: number): boolean => !UNPREVIEWED_WALL_TYPES.includes(furniId);

/** CollectiblesController.getProductType */
export const GetCollectibleProductType = (product: ICollectibleProduct): string => {
    if (!product) return 'unknown';

    switch (product.productTypeId) {
        case CollectibleProductType.WALL:
            return LocalizeText('product.type.wall');
        case CollectibleProductType.FLOOR:
            return LocalizeText('product.type.room');
        case CollectibleProductType.EFFECT:
            return LocalizeText('product.type.effect');
        case CollectibleProductType.BADGE:
            return LocalizeText('product.type.badge');
        case CollectibleProductType.CHAT_STYLE:
            return LocalizeText('product.type.chatstyle');
        case CollectibleProductType.PET:
            return LocalizeText('product.type.pets');
        case CollectibleProductType.CLOTHING:
            return LocalizeText('product.type.clothing');
        default:
            return 'Unknown';
    }
};

/** CollectiblesController.getProductName */
export const GetCollectibleProductName = (product: ICollectibleProduct): string => {
    if (!product) return 'unknown';

    const typeId = parseInt(product.itemTypeId);

    switch (product.productTypeId) {
        case CollectibleProductType.UNKNOWN:
            return 'unknown';
        case CollectibleProductType.WALL:
            return GetSessionDataManager().getWallItemData(typeId)?.name ?? '(missing wall item)';
        case CollectibleProductType.FLOOR:
        case CollectibleProductType.CLOTHING:
            return GetSessionDataManager().getFloorItemData(typeId)?.name ?? '(missing floor item)';
        case CollectibleProductType.EFFECT:
            return LocalizeText(`fx_${product.itemTypeId}`);
        case CollectibleProductType.BADGE:
            return LocalizeBadgeName(product.itemTypeId);
        case CollectibleProductType.CHAT_STYLE:
            return LocalizeText('product.type.chatstyle');
        case CollectibleProductType.PET:
            return LocalizeText(`pet.type.${product.itemTypeId}`);
        default:
            return '(missing)';
    }
};

// util/class_2752.as looks the upper-cased rarity up in lower-case keys, so every rarity gets the fallback colour; kept as AIR does it.
const RARITY_COLORS: Record<string, number> = {
    common: 0x5e696d,
    uncommon: 0x006154,
    rare: 0x125875,
    epic: 0x6d1c66,
    legendary: 0x821c00,
    'legendary+': 0xaa6800
};

export const GetCollectibleRarityColor = (rarity: string): number => RARITY_COLORS[(rarity ?? '').toUpperCase()] ?? 0x888888;

// renderer/collections/class_4406.as
const PROGRESS_START_PERCENT = 1;
const PROGRESS_MID_PERCENT = 50;
const PROGRESS_END_PERCENT = 99;
const PROGRESS_START_COLOR = 0xbb5b00;
const PROGRESS_MID_COLOR = 0xc5a300;
const PROGRESS_END_COLOR = 0x88b400;
const PROGRESS_NOT_STARTED_COLOR = 0x880015;
const PROGRESS_COMPLETE_COLOR = 0x00910a;

const interpolateColor = (from: number, to: number, fraction: number): number => {
    const channel = (shift: number) => {
        const start = (from >> shift) & 0xff;
        const end = (to >> shift) & 0xff;

        return start + fraction * (end - start);
    };

    // RGBToHex shifts Numbers, which truncates each channel to an int.
    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};

export const GetCollectionProgressColor = (collected: number, total: number): number => {
    if (collected === total) return PROGRESS_COMPLETE_COLOR;
    if (collected === 0) return PROGRESS_NOT_STARTED_COLOR;

    const percent = (collected * 100) / total;

    if (percent <= PROGRESS_MID_PERCENT) {
        return interpolateColor(PROGRESS_START_COLOR, PROGRESS_MID_COLOR, (percent - PROGRESS_START_PERCENT) / (PROGRESS_MID_PERCENT - PROGRESS_START_PERCENT));
    }

    return interpolateColor(PROGRESS_MID_COLOR, PROGRESS_END_COLOR, (percent - PROGRESS_MID_PERCENT) / (PROGRESS_END_PERCENT - PROGRESS_MID_PERCENT));
};

// CollectiblesView.onCollectionsScoreMessage: one colour band per five levels.
const LEVEL_COLORS = [0x7c8c92, 0x26990b, 0x007dea, 0xd300f3];

export const GetCollectorLevelColor = (level: number): number => LEVEL_COLORS[Math.trunc(Math.max(0, (level - 1) / 5))] ?? 0xed9a01;

/** The "dd/MM/yyyy" DateTimeFormatter the hub uses for expiry and claim dates. */
export const FormatCollectiblesDate = (time: number): string => {
    const date = new Date(time);
    const pad = (value: number) => value.toString().padStart(2, '0');

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};
