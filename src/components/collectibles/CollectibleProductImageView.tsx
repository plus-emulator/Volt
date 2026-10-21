import { GetAvatarRenderManager, GetRoomEngine, GetSessionDataManager, RoomPreviewer } from '@volt/renderer';
import { Point } from 'pixi.js';
import { FC, ReactNode, useCallback, useEffect, useState } from 'react';
import { CollectibleProductType, ICollectibleProduct, IsPreviewableWallItem } from '../../api';
import placeholderImage from '../../assets/images/collectibles/collectables-collection-default.png';
import stampLarge from '../../assets/images/collectibles/collectables-icon-curator-stamp-large.png';
import stampSmall from '../../assets/images/collectibles/collectables-icon-curator-stamp-small.png';
import downloadIcon from '../../assets/images/collectibles/avatar-editor-avatar-editor-download-icon.png';
import { LayoutAvatarImageView, LayoutBadgeImageView, LayoutFurniIconImageView, LayoutFurniImageView, LayoutPetImageView } from '../../common';
import { LayoutRoomPreviewerView } from '../../common/layout/LayoutRoomPreviewerView';
import { useUserDataSnapshot } from '../../hooks/session/useSessionSnapshots';
import { at } from './CollectiblesSkinView';

const EFFECT_ICONS = Object.fromEntries(Object.entries(import.meta.glob('../../assets/images/avatareditor/effects/*.png', { eager: true, import: 'default' }) as Record<string, string>)
    .map(([ path, url ]) => [ path.slice(path.lastIndexOf('_') + 1, -4), url ])) as Record<string, string>;

// The chat style selector_preview bitmaps stand in for both the icon and the bubble AIR draws in createChatItemPreview.
const CHAT_STYLE_PREVIEWS = Object.fromEntries(Object.entries(import.meta.glob('../../assets/images/chat-style-previews/*.png', { eager: true, import: 'default' }) as Record<string, string>)
    .map(([ path, url ]) => [ path.slice(path.lastIndexOf('/') + 1, -4), url ])) as Record<string, string>;

const floorItemId = (product: ICollectibleProduct) => GetSessionDataManager().getFloorItemData(parseInt(product.itemTypeId))?.id ?? null;

const wallItemId = (product: ICollectibleProduct) => {
    const id = GetSessionDataManager().getWallItemData(parseInt(product.itemTypeId))?.id ?? null;

    return id !== null && IsPreviewableWallItem(id) ? id : null;
};

/** EffectPreviewer: the user's avatar with the effect in a room previewer without walls and floor. */
const EffectPreview: FC<{ figure: string; effect: number }> = ({ figure, effect }) => {
    const [previewer, setPreviewer] = useState<RoomPreviewer>(null);

    const attach = useCallback((node: HTMLDivElement) => {
        if (!node) return;

        const instance = new RoomPreviewer(GetRoomEngine(), ++RoomPreviewer.PREVIEW_COUNTER);
        instance.backgroundColor = null;
        instance.disableUpdate = true;
        instance.addViewOffset = new Point(2, 36);
        instance.updateRoomWallsAndFloorVisibility(false, false);
        setPreviewer(instance);

        return () => {
            instance.dispose();
            setPreviewer((current) => (current === instance ? null : current));
        };
    }, []);

    useEffect(() => {
        if (!previewer) return;

        previewer.addAvatarIntoRoom(figure, effect);
        previewer.updateAvatarDirection(2, 2);
        previewer.updatePreviewRoomView(true);
    }, [previewer, figure, effect]);

    return (
        <div ref={attach} className="volt-collectibles-effect-preview" style={at(93, 0, 100, 260)}>
            {previewer && <LayoutRoomPreviewerView height={260} roomPreviewer={previewer} onPreviewClick={() => {}} />}
        </div>
    );
};

interface CollectibleProductPreviewViewProps {
    /** null shows the placeholder (CollectibleProductPreviewer.setPlaceholder). */
    product: ICollectibleProduct;
    /** The minting previewer has no badge, pet, unknown or effect widget. */
    fullPreviewer?: boolean;
}

/** CollectiblesController.previewImage into the 290x260 preview area of the layout. */
export const CollectibleProductPreviewView: FC<CollectibleProductPreviewViewProps> = ({ product, fullPreviewer = true }) => {
    const { figure, gender } = useUserDataSnapshot();
    const centered = (content: ReactNode) => <div className="volt-collectibles-product-preview" style={at(-5, -20, 300, 300)}>{content}</div>;

    if (!product) return <img alt="" className="volt-collectibles-abs" draggable={false} src={placeholderImage} style={at(91, 64, 108, 132)} />;

    switch (product.productTypeId) {
        case CollectibleProductType.WALL: {
            const id = wallItemId(product);

            return id === null ? null : centered(<LayoutFurniImageView direction={90} productClassId={id} productType="i" />);
        }
        case CollectibleProductType.FLOOR: {
            const id = floorItemId(product);

            return id === null ? null : centered(<LayoutFurniImageView direction={90} productClassId={id} productType="s" />);
        }
        case CollectibleProductType.EFFECT:
            return fullPreviewer && product.itemTypeId !== '' ? <EffectPreview effect={parseInt(product.itemTypeId)} figure={figure} /> : null;
        case CollectibleProductType.BADGE:
            return fullPreviewer ? (
                <div className="volt-collectibles-centered" style={at(105, 90, 80, 80)}>
                    <LayoutBadgeImageView badgeCode={product.itemTypeId} scale={2} />
                </div>
            ) : null;
        case CollectibleProductType.CHAT_STYLE:
            return CHAT_STYLE_PREVIEWS[product.itemTypeId] ? centered(<img alt="" draggable={false} src={CHAT_STYLE_PREVIEWS[product.itemTypeId]} />) : null;
        case CollectibleProductType.PET:
            return fullPreviewer ? (
                <div className="volt-collectibles-centered" style={at(53, 60, 180, 140)}>
                    <LayoutPetImageView direction={2} figure={product.petFigureString} scale={2} />
                </div>
            ) : null;
        case CollectibleProductType.CLOTHING:
            return (
                <div className="volt-collectibles-centered" style={at(100, 53, 90, 130)}>
                    <LayoutAvatarImageView direction={2} figure={GetAvatarRenderManager().getFigureStringWithFigureIds(figure, gender, product.figureSetIds)} />
                </div>
            );
        case CollectibleProductType.UNKNOWN:
            return fullPreviewer ? <img alt="" className="volt-collectibles-abs" draggable={false} src={stampLarge} style={at(121, 106, 48, 48)} /> : null;
        default:
            return null;
    }
};

interface CollectibleProductIconViewProps {
    product: ICollectibleProduct;
    variant: 'grid' | 'reward' | 'widget';
}

const ICON_RECTS = {
    grid: { bitmap: at(2, 4, 46, 40), widget: at(5, 4, 40, 40), unknown: at(16, 15, 18, 18) },
    reward: { bitmap: at(10, 9, 32, 32), widget: at(10, 9, 32, 32), unknown: at(10, 9, 32, 32) },
    widget: { bitmap: at(0, 0, 40, 40), widget: at(0, 0, 40, 40), unknown: at(11, 11, 18, 18) }
} as const;

/** CollectiblesController.previewIcon into an item template. */
export const CollectibleProductIconView: FC<CollectibleProductIconViewProps> = ({ product, variant }) => {
    const rects = ICON_RECTS[variant];
    const bitmap = (content: ReactNode) => <div className="volt-collectibles-centered" style={rects.bitmap}>{content}</div>;

    if (!product) return null;

    switch (product.productTypeId) {
        case CollectibleProductType.WALL: {
            const id = wallItemId(product);

            return id === null ? null : bitmap(<LayoutFurniIconImageView productClassId={id} productType="i" />);
        }
        case CollectibleProductType.FLOOR:
        case CollectibleProductType.CLOTHING: {
            const id = floorItemId(product);

            return id === null ? null : bitmap(<LayoutFurniIconImageView productClassId={id} productType="s" />);
        }
        case CollectibleProductType.EFFECT:
            return EFFECT_ICONS[product.itemTypeId] ? bitmap(<img alt="" draggable={false} src={EFFECT_ICONS[product.itemTypeId]} />) : null;
        case CollectibleProductType.BADGE:
            return (
                <div className="volt-collectibles-centered" style={rects.widget}>
                    <LayoutBadgeImageView badgeCode={product.itemTypeId} />
                </div>
            );
        case CollectibleProductType.CHAT_STYLE:
            return CHAT_STYLE_PREVIEWS[product.itemTypeId] ? bitmap(<img alt="" draggable={false} src={CHAT_STYLE_PREVIEWS[product.itemTypeId]} />) : null;
        case CollectibleProductType.PET:
            return variant !== 'reward' ? (
                <div className="volt-collectibles-centered" style={rects.widget}>
                    <LayoutPetImageView direction={2} figure={product.petFigureString} scale={0.5} />
                </div>
            ) : null;
        case CollectibleProductType.UNKNOWN:
            return <img alt="" className="volt-collectibles-unknown-icon" draggable={false} src={variant === 'reward' ? downloadIcon : stampSmall} style={rects.unknown} />;
        default:
            return null;
    }
};
