import { FurnitureType } from '@volt/renderer';
import { FC } from 'react';
import { ProductImageUtility } from '../../../../api';
import { LayoutLimitedEditionStyledNumberView, LayoutRarityLevelView, PIXEL_ART_RENDERING } from '../../../../common';
import { ChestText } from './chest/ChestAirParts';
import { ChestFurniGroup } from './chestFurniGrouping';

/**
 * furni_template (FurniChestItemView): a 42x42 region with a 40x40 border style 5 at (1,1), 0xcbcbcb and 0xd6d6d6 while hovered,
 * the product icon over it, the count badge when the group has more than one item and the selected outline on top.
 */
export const FurniChestGridItem: FC<{
    group: ChestFurniGroup;
    selected: boolean;
    onSelect: () => void;
    title?: string;
}> = ({ group, selected, onSelect, title }) => {
    const stuff = group.sample.stuffData;
    const isLtd = (stuff?.uniqueNumber ?? 0) > 0;
    const isRarity = group.specialType === 19;

    return (
        <div className="volt-chest-air__item" data-air-name="furni_template" title={title} onClick={onSelect}>
            <div className="volt-chest-air__item-border">
                {isLtd && <div className="unique-bg-override volt-chest-air__item-ltd-bg" />}
                <img
                    alt=""
                    className="volt-chest-air__item-icon"
                    draggable={false}
                    src={ProductImageUtility.getProductImageUrl(group.wallItem ? FurnitureType.WALL : FurnitureType.FLOOR, group.baseItemId, group.legacyPosterId)}
                    style={{ imageRendering: PIXEL_ART_RENDERING }}
                />
                {group.quantity > 1 && (
                    <div className="volt-chest-air__item-quantity">
                        <ChestText background={0xffffff} color={0x2f6982} text={String(group.quantity)} textStyle="regular" />
                    </div>
                )}
                {isLtd && (
                    <div className="volt-chest-air__item-ltd">
                        <LayoutLimitedEditionStyledNumberView value={stuff?.uniqueNumber ?? 0} />
                    </div>
                )}
                {isRarity && <LayoutRarityLevelView className="volt-chest-air__item-rarity" level={stuff?.rarityLevel ?? 0} position="absolute" />}
            </div>
            {selected && <div aria-hidden className="volt-chest-air__item-selected" />}
        </div>
    );
};
