import { FurniturePickupAllComposer, RoomObjectCategory } from '@volt/renderer';
import { FC, useMemo, useState } from 'react';
import { chooserSelectionVisualizer, localizeWithFallback, RoomObjectItem, SendMessageComposer } from '../../../../api';
import { VoltCardHeaderView, VoltCardView } from '../../../../common';
import { HabboDropMenuView } from '../../../../common/dropmenu/HabboDropMenuView';
import { useFurniPickupGuard } from '../../../../hooks';
import { ChooserTableView, chooserItemKey } from './ChooserTableView';
import './ChooserWidgetView.css';

const LIMIT_FURNI_PICKALL = 100;
const USER_TYPES = ['Habbo', 'Pet', 'Bot'] as const;
const userTypeLabel = (type: string) => localizeWithFallback(`new_user_chooser.usertype.${({ Habbo: 1, Pet: 2, Bot: 4 })[type] ?? 0}`, type);

interface ChooserWidgetViewProps {
    title: string;
    items: RoomObjectItem[];
    selectItem: (item: RoomObjectItem) => void;
    onClose: () => void;
    pickallFurni?: boolean;
    type?: 'furni' | 'users';
}

export const ChooserWidgetView: FC<ChooserWidgetViewProps> = ({ title, items = [], selectItem, onClose, pickallFurni = false, type = 'furni' }) => {
    const [searchValue, setSearchValue] = useState('');
    // null means all owners/types; a real owner named "all" remains selectable.
    const [selectedFilter, setSelectedFilter] = useState<string>(null);
    const [selectedKey, setSelectedKey] = useState<string>(null);
    const [bulkMode, setBulkMode] = useState(false);
    const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
    const { confirmIfWebApiBox } = useFurniPickupGuard();
    const isUsers = type === 'users';
    const ownerNames = useMemo(() => [...new Set(items.map(item => item.ownerName))].sort(), [items]);
    const activeFilter = !isUsers && !ownerNames.includes(selectedFilter) ? null : selectedFilter;
    const filteredItems = useMemo(() => items.filter(item =>
        item.name.toLocaleLowerCase().includes(searchValue.toLocaleLowerCase()) &&
        (activeFilter === null || (isUsers ? item.type : item.ownerName) === activeFilter)
    ).sort((a, b) => a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()) || a.id - b.id), [items, searchValue, activeFilter, isUsers]);
    const checkedItems = items.filter(item => checkedKeys.includes(chooserItemKey(item)));
    const allChecked = filteredItems.length > 0 && filteredItems.slice(0, LIMIT_FURNI_PICKALL).every(item => checkedKeys.includes(chooserItemKey(item)));
    const searchLabel = localizeWithFallback('new_chooser.search', 'Search');
    const allLabel = isUsers ? localizeWithFallback('new_user_chooser.usertype.all', 'All types') : localizeWithFallback('new_furni_chooser.owner_selector.default', 'All owners');
    const filterValues: string[] = isUsers ? [...USER_TYPES] : ownerNames;
    // Numeric option values avoid collisions between the "all" choice and room data.
    const filterOptions = [{ value: 0, label: allLabel }, ...filterValues.map((value, index) => ({ value: index + 1, label: isUsers ? userTypeLabel(value) : value }))];
    const columns = isUsers
        ? [localizeWithFallback('new_user_chooser.col.name', 'Name'), localizeWithFallback('new_user_chooser.col.type', 'Type')]
        : [localizeWithFallback('new_furni_chooser.col.name', 'Name'), localizeWithFallback('new_furni_chooser.col.owner', 'Owner'), localizeWithFallback('new_furni_chooser.col.id', 'Id')];

    const updateChecked = (keys: string[]) => {
        setCheckedKeys(keys);
        chooserSelectionVisualizer.clearAll();
        items.filter(item => keys.includes(chooserItemKey(item))).forEach(item => chooserSelectionVisualizer.show(item.id, item.category));
    };
    const choose = (item: RoomObjectItem) => {
        const key = chooserItemKey(item);
        selectItem(item);
        setSelectedKey(key);
        if (bulkMode) {
            updateChecked(checkedKeys.includes(key) ? checkedKeys.filter(value => value !== key) : checkedKeys.length < LIMIT_FURNI_PICKALL ? [...checkedKeys, key] : checkedKeys);
        } else {
            chooserSelectionVisualizer.clearAll();
            chooserSelectionVisualizer.show(item.id, item.category);
        }
    };
    const close = () => {
        chooserSelectionVisualizer.clearAll();
        onClose();
    };
    const pickup = () => {
        const ids = checkedItems.map(item => item.id);
        if (!ids.length) return;
        confirmIfWebApiBox(ids, RoomObjectCategory.FLOOR, () => {
            SendMessageComposer(new FurniturePickupAllComposer(...ids));
            updateChecked([]);
            setSelectedKey(null);
        });
    };

    return (
        <VoltCardView frameStyle={3} resizeAxis="vertical" uniqueKey={`air-chooser-${type}`} className={`air-chooser air-chooser--${type}`} role="dialog" aria-label={title}
            initialPosition={{ x: Math.max(0, window.innerWidth - (isUsers ? 290 : 413) - 10), y: 10 }}>
            <VoltCardHeaderView headerText={title} onCloseClick={close} />
            <div className="air-chooser__content">
                <div className="air-chooser__filters">
                    <div className="air-chooser__search">
                        <input aria-label={searchLabel} placeholder={searchLabel} value={searchValue} onChange={event => setSearchValue(event.target.value)} />
                        {searchValue && <button type="button" className="air-chooser__clear" aria-label={localizeWithFallback('generic.clear', 'Clear')} onClick={() => setSearchValue('')} />}
                    </div>
                    <HabboDropMenuView skinStyle={3} label={columns[1]} options={filterOptions}
                        value={activeFilter === null ? 0 : filterValues.indexOf(activeFilter) + 1} onSelect={value => setSelectedFilter(value === 0 ? null : filterValues[value - 1])} />
                </div>
                <ChooserTableView key={JSON.stringify([searchValue, activeFilter])} items={filteredItems} columns={columns} type={type} selectedKey={selectedKey} checkedKeys={bulkMode ? checkedKeys : null} onSelect={choose} userTypeLabel={userTypeLabel} />
                <div className="air-chooser__footer">
                    <span role="status">{localizeWithFallback(`new_${isUsers ? 'user' : 'furni'}_chooser.amount_indicator`, `${filteredItems.length} ${isUsers ? 'users' : 'items'} found`, ['amount'], [String(filteredItems.length)])}</span>
                    {pickallFurni && !isUsers && <button type="button" className="air-chooser__bulk-toggle" onClick={() => { setBulkMode(!bulkMode); updateChecked([]); }}>
                        {bulkMode ? localizeWithFallback('generic.cancel', 'Cancel') : localizeWithFallback('widget.chooser.btn.pickall', 'Pick up multiple')}
                    </button>}
                </div>
                {bulkMode && <div className="air-chooser__bulk">
                    <label><input type="checkbox" checked={allChecked} onChange={() => updateChecked(allChecked ? [] : filteredItems.slice(0, LIMIT_FURNI_PICKALL).map(chooserItemKey))} />{localizeWithFallback('widget.chooser.checkall', 'Select all')}</label>
                    <button type="button" className="habbo-btn-secondary" disabled={!checkedItems.length} onClick={pickup}>{localizeWithFallback('widget.chooser.btn.pickall', 'Pick up selected')}</button>
                </div>}
            </div>
        </VoltCardView>
    );
};
