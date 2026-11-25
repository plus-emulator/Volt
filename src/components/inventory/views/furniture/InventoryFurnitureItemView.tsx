import { MouseEventType } from '@volt/renderer';
import { FC, MouseEvent, PointerEvent, useEffect, useRef, useState } from 'react';
import { attemptItemPlacement, GroupItem } from '../../../../api';
import { classNames, InfiniteGrid } from '../../../../layout';
import { useRecyclerStore } from '../../../../state/recyclerStore';
import { InventoryThumbIconView } from '../InventoryThumbIconView';

const LONG_PRESS_MS = 450;
const LONG_PRESS_SLOP = 10;

export const InventoryFurnitureItemView: FC<{
    groupItem: GroupItem;
    isActive: boolean;
    onSelect: (groupItem: GroupItem) => void;
    // Set while a trade is open: v75 offers the item on double click and never drags it into the room.
    onOffer?: (groupItem: GroupItem) => void;
    onLongPress?: (groupItem: GroupItem, element: HTMLElement) => void;
}> = (props) => {
    const { groupItem = null, isActive = false, onSelect = null, onOffer = null, onLongPress = null } = props;
    const [isMouseDown, setMouseDown] = useState(false);
    const pressRef = useRef<{ timer: number; x: number; y: number } | null>(null);

    const cancelPress = () => {
        if (pressRef.current) window.clearTimeout(pressRef.current.timer);
        pressRef.current = null;
    };

    useEffect(() => cancelPress, []);

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (!onLongPress || event.pointerType === 'mouse') return;

        cancelPress();

        const element = event.currentTarget;
        const timer = window.setTimeout(() => {
            pressRef.current = null;
            onSelect?.(groupItem);
            onLongPress(groupItem, element);
        }, LONG_PRESS_MS);

        pressRef.current = { timer, x: event.clientX, y: event.clientY };
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const press = pressRef.current;

        if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > LONG_PRESS_SLOP) cancelPress();
    };

    const onMouseEvent = (event: MouseEvent) => {
        switch (event.type) {
            case MouseEventType.MOUSE_DOWN:
                onSelect?.(groupItem);
                setMouseDown(true);
                return;
            case MouseEventType.MOUSE_UP:
                setMouseDown(false);
                return;
            case MouseEventType.ROLL_OUT:
                if (onOffer || !isMouseDown || !isActive) return;

                attemptItemPlacement(groupItem);
                return;
            case 'dblclick':
                if (onOffer) onOffer(groupItem);
                else attemptItemPlacement(groupItem);
                return;
        }
    };

    const recyclerActive = useRecyclerStore((state) => state.active);
    const slotItemIds = useRecyclerStore((state) => state.slotItemIds);
    // FurnitureItem locks: furni waiting in the recycler slots are not counted.
    const inSlots = groupItem.items.filter((item) => !item.locked && slotItemIds.includes(item.id)).length;
    const count = groupItem.getUnlockedCount() - inSlots;
    // GroupItem.updateRecycleStatusVisual: recyclable_container while the recycler is open.
    const recyclable = recyclerActive && groupItem.items.some((item) => item.recyclable && !item.locked && !slotItemIds.includes(item.id));

    return (
        <InfiniteGrid.Item
            className={classNames('volt-inventory-thumb', isActive && 'is-selected', groupItem.hasUnseenItems && 'is-unseen', !count && 'opacity-50')}
            itemActive={isActive}
            itemCount={count}
            itemImage={groupItem.stuffData.uniqueNumber > 0 ? groupItem.iconUrl : undefined}
            itemUniqueNumber={groupItem.stuffData.uniqueNumber}
            itemUnseen={groupItem.hasUnseenItems}
            onDoubleClick={onMouseEvent}
            onMouseDown={onMouseEvent}
            onMouseOut={onMouseEvent}
            onMouseUp={onMouseEvent}
            onContextMenu={onLongPress ? (event) => event.preventDefault() : undefined}
            onPointerCancel={cancelPress}
            onPointerDown={onPointerDown}
            onPointerLeave={cancelPress}
            onPointerMove={onPointerMove}
            onPointerUp={cancelPress}
        >
            {groupItem.stuffData.uniqueNumber <= 0 && <InventoryThumbIconView iconUrl={groupItem.iconUrl} />}
            {recyclable && <span className="volt-inventory-thumb-recyclable" />}
        </InfiniteGrid.Item>
    );
};
