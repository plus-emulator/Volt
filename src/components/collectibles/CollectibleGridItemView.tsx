import { FC, ReactNode, useState } from 'react';
import { ICollectibleProduct } from '../../api';
import { CollectibleProductIconView } from './CollectibleProductImageView';
import { at, SlotBorder } from './CollectiblesSkinView';

// AbstractCollectibleItemRenderer.incompleteColoring / completeColoring: outline and background per state.
const COLORINGS = {
    incomplete: {
        active: { outline: 0xffffff, background: 0xe6e6e6 },
        hovered: { outline: 0xf5f6f8, background: 0xdbdddf },
        normal: { outline: 0x8f9db1, background: 0xc8cdd3 }
    },
    complete: {
        active: { outline: 0xffffff, background: 0xe2ede0 },
        hovered: { outline: 0xf5f6f8, background: 0xdae7d8 },
        normal: { outline: 0x86a182, background: 0xd2e2cf }
    }
} as const;

interface CollectibleGridItemViewProps {
    product: ICollectibleProduct;
    complete: boolean;
    active: boolean;
    height: number;
    onClick: () => void;
    children: ReactNode;
}

/** The 52-wide item_template of the hub's item grids: a style-3 outline around a style-3 background, the product icon and a caption row. */
export const CollectibleGridItemView: FC<CollectibleGridItemViewProps> = ({ product, complete, active, height, onClick, children }) => {
    const [hovered, setHovered] = useState(false);
    const colors = COLORINGS[complete ? 'complete' : 'incomplete'][hovered ? 'hovered' : active ? 'active' : 'normal'];

    return (
        <div className="volt-collectibles-grid-item" style={{ height }} onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            <SlotBorder color={colors.outline} style={at(0, 0, 50, 60)}>
                <SlotBorder color={colors.background} style={at(1, 1, 48, 58)} />
            </SlotBorder>
            <CollectibleProductIconView product={product} variant="grid" />
            {children}
        </div>
    );
};
