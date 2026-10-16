import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import type { RoomObjectItem } from '../../../../api/room/widgets/RoomObjectItem';
import { IsBuildersClubFurniId, IsTemporaryFurniId } from '../../../../api/utils/FurniIdBand';
import { localizeWithFallback } from '../../../../api/utils/localizeWithFallback';
import { ClassicScrollAreaView } from '../../../../common/scroll-area/ClassicScrollAreaView';

export const chooserItemKey = (item: RoomObjectItem) => `${item.category}:${item.id}`;

/** AIR TableView: fixed 20px rows, a 23px heading, and category-aware row identity. */
export const ChooserTableView = ({ items, columns, type, selectedKey, checkedKeys, onSelect, userTypeLabel }: {
    items: RoomObjectItem[];
    columns: string[];
    type: 'users' | 'furni';
    selectedKey: string;
    checkedKeys: string[] | null;
    onSelect: (item: RoomObjectItem) => void;
    userTypeLabel: (type: string) => string;
}) => {
    const viewportRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => viewportRef.current,
        getItemKey: index => chooserItemKey(items[index]),
        estimateSize: () => 20,
        overscan: 5
    });
    return <div className="air-chooser__table" role="table" aria-rowcount={items.length + 1} aria-colcount={columns.length}>
        <div className="air-chooser__heading" role="row">
            {columns.map(column => <div role="columnheader" key={column}>{column}</div>)}
        </div>
        <ClassicScrollAreaView className="air-chooser__scroll" viewportRef={viewportRef} scrollStep={20} contentStyle={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map(virtualRow => {
                const item = items[virtualRow.index];
                const key = chooserItemKey(item);
                const selected = checkedKeys ? checkedKeys.includes(key) : selectedKey === key;
                // FurniChooserTableObject.as:36-39: Builders Club and temporary furni show "-" as the owner.
                const owner = IsBuildersClubFurniId(item.id) || IsTemporaryFurniId(item.id) ? '-' : item.ownerName;
                const values = type === 'users' ? [item.name, userTypeLabel(item.type)] : [item.name, owner, String(item.id)];
                return <div role="row" aria-rowindex={virtualRow.index + 2} aria-selected={selected} key={key}
                    className={`air-chooser__row${selected ? ' is-selected' : ''}`} style={{ top: virtualRow.start, backgroundColor: virtualRow.index % 2 ? '#f9f9f9' : '#eaeaea' }}>
                    {values.map((value, index) => <div role="cell" key={index} title={value}>
                        {index === 0 ? <button type="button" onClick={() => onSelect(item)}>
                            {checkedKeys && <span aria-hidden="true" className={`air-chooser__check${selected ? ' is-checked' : ''}`} />}{value}
                        </button> : <button type="button" tabIndex={-1} onClick={() => onSelect(item)}>{value}</button>}
                    </div>)}
                </div>;
            })}
        </ClassicScrollAreaView>
        {!items.length && <div className="air-chooser__empty">{localizeWithFallback('wiredmenu.table.empty', 'Nothing to display')}</div>}
    </div>;
};
