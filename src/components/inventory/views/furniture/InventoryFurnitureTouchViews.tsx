import type { RoomPreviewer } from '@volt/renderer';
import { LayoutRoomPreviewerView } from '../../../../common';
import { FC, SyntheticEvent, useEffect, useRef } from 'react';
import { GroupItem, LocalizeText } from '../../../../api';

const SLOT_SIZE = 56;

// Draw the icon at 2x only when the doubled pixels still fit the slot; never at a fractional scale.
const fitIcon = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const scale = image.naturalWidth * 2 <= SLOT_SIZE && image.naturalHeight * 2 <= SLOT_SIZE ? 2 : 1;

    image.style.width = `${image.naturalWidth * scale}px`;
    image.style.height = `${image.naturalHeight * scale}px`;
};

export interface InventoryTouchAction {
    key: string;
    caption: string;
    disabled?: boolean;
    onClick: () => void;
}

export const InventoryFurnitureTouchBarView: FC<{
    groupItem: GroupItem;
    tradeableCount: number;
    recyclableCount: number;
    action: InventoryTouchAction;
    roomPreviewer: RoomPreviewer | null;
    offerCount?: string;
    onOfferCountChange?: (value: string) => void;
}> = ({ groupItem, tradeableCount, recyclableCount, action, roomPreviewer, offerCount = null, onOfferCountChange = null }) => (
    <div className="volt-inventory-touch-bar">
        {roomPreviewer ? (
            <div className="volt-inventory-touch-room-preview">
                <LayoutRoomPreviewerView fitParent roomPreviewer={roomPreviewer} />
            </div>
        ) : (
            <div className="volt-inventory-touch-bar-icon">
                <img key={groupItem.iconUrl} src={groupItem.iconUrl} alt="" draggable={false} onLoad={fitIcon} />
            </div>
        )}
        <div className="volt-inventory-touch-bar-text">
            <div className="volt-inventory-touch-bar-name">{groupItem.name}</div>
            <div className="volt-inventory-touch-bar-meta">
                {tradeableCount > 0
                    ? LocalizeText('inventory.furni.trading.is_tradable', ['amount'], [String(tradeableCount)])
                    : LocalizeText('inventory.furni.trading.is_not_tradable')}
                {recyclableCount > 0 && ` · ${LocalizeText('inventory.furni.recycling.is_recyclable', ['amount'], [String(recyclableCount)])}`}
            </div>
        </div>
        {onOfferCountChange && (
            <input
                className="volt-inventory-touch-bar-count"
                aria-label={LocalizeText('inventory.trading.offer')}
                inputMode="numeric"
                value={offerCount}
                onChange={(event) => onOfferCountChange(event.target.value)}
            />
        )}
        <button type="button" className="volt-inventory-touch-button is-green" data-action={action.key} disabled={action.disabled} onClick={action.onClick}>
            {action.caption}
        </button>
    </div>
);

export const InventoryFurnitureTouchMenuView: FC<{
    title: string;
    actions: InventoryTouchAction[];
    position: { left: number; top?: number; bottom?: number };
    onClose: () => void;
}> = ({ title, actions, position, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) onClose();
        };

        document.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('resize', onClose);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('resize', onClose);
        };
    }, [onClose]);

    return (
        <div ref={menuRef} className="volt-inventory-touch-menu" role="menu" aria-label={title} style={position}>
            <div className="volt-inventory-touch-menu-title">{title}</div>
            {actions.map((action) => (
                <button
                    key={action.key}
                    type="button"
                    role="menuitem"
                    className="volt-inventory-touch-button"
                    disabled={action.disabled}
                    onClick={() => {
                        onClose();
                        action.onClick();
                    }}
                >
                    {action.caption}
                </button>
            ))}
        </div>
    );
};
