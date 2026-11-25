import { InventoryFilterSelect } from '../InventoryFilterSelect';
import { InventoryActionButton } from '../InventoryActionButton';
import { IRoomSession, RoomPreviewer } from '@volt/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { attemptPetPlacement, IsTouchLayout, LocalizeText, UnseenItemCategory, useVoltLayout } from '../../../../api';
import { ClassicScrollAreaView } from '../../../../common/scroll-area/ClassicScrollAreaView';
import { useInventoryPets, useInventoryUnseenTracker } from '../../../../hooks';
import { InventoryCategoryEmptyView } from '../InventoryCategoryEmptyView';
import { InventoryInfoTextView } from '../InventoryInfoTextView';
import { InventoryPetImageView } from './InventoryPetImageView';
import { InventoryPetItemView } from './InventoryPetItemView';
import { hideSheetForPlacement } from '../hideSheetForPlacement';

export const InventoryPetView: FC<{
    roomSession: IRoomSession;
    roomPreviewer: RoomPreviewer;
}> = (props) => {
    const { roomSession = null } = props;
    const [isVisible, setIsVisible] = useState(false);
    const { petItems = null, selectedPet = null, setSelectedPet, activate = null, deactivate = null } = useInventoryPets();
    const { isUnseen = null, removeUnseen = null } = useInventoryUnseenTracker();

    const isTouch = IsTouchLayout(useVoltLayout());
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState(-1);
    const availableTypes = useMemo(() => [...new Set((petItems ?? []).map(({ petData }) => petData.typeId))].sort((a, b) => a - b), [petItems]);
    const activeType = availableTypes.includes(typeFilter) ? typeFilter : -1;
    const visiblePets = useMemo(
        () =>
            (petItems ?? []).filter(
                ({ petData }) =>
                    (activeType === -1 || petData.typeId === activeType) &&
                    (!search || petData.name.toLowerCase().includes(search) || LocalizeText(`pet.type.${petData.typeId}`).toLowerCase().includes(search))
            ),
        [petItems, activeType, search]
    );

    useEffect(() => {
        if (!visiblePets.includes(selectedPet)) setSelectedPet(visiblePets[0] ?? null);
    }, [visiblePets, selectedPet, setSelectedPet]);

    useEffect(() => {
        if (!selectedPet || !isUnseen(UnseenItemCategory.PET, selectedPet.petData.id)) return;
        removeUnseen(UnseenItemCategory.PET, selectedPet.petData.id);
    }, [selectedPet, isUnseen, removeUnseen]);

    useEffect(() => {
        if (!isVisible) return;
        const id = activate();
        return () => deactivate(id);
    }, [isVisible, activate, deactivate]);

    useEffect(() => {
        setIsVisible(true);
        return () => setIsVisible(false);
    }, []);

    if (!petItems || !petItems.length) {
        return <InventoryCategoryEmptyView desc={LocalizeText('inventory.empty.desc')} title={LocalizeText('inventory.empty.title')} />;
    }

    return (
        <div className="volt-inventory-animals is-pets">
            <div className="volt-inventory-filter-bar">
                <div className="volt-inventory-filter-search">
                    <input
                        className="volt-inventory-filter-input"
                        aria-label={LocalizeText('generic.search')}
                        placeholder={isTouch ? LocalizeText('generic.search') : undefined}
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') setSearch(searchInput.toLowerCase());
                            if (event.key === 'Escape') {
                                setSearchInput('');
                                setSearch('');
                            }
                        }}
                    />
                    {searchInput && (
                        <button
                            type="button"
                            className="volt-inventory-filter-clear"
                            aria-label={LocalizeText('generic.clear')}
                            onClick={() => {
                                setSearchInput('');
                                setSearch('');
                            }}
                        />
                    )}
                </div>
                <InventoryFilterSelect
                    aria-label="Pet type"
                    value={activeType}
                    onChange={(value) => {
                        setTypeFilter(Number(value));
                        setSearch(searchInput.toLowerCase());
                    }}
                >
                    <option value={-1}>
                        {LocalizeText('inventory.pets.filter.type.all') === 'inventory.pets.filter.type.all'
                            ? 'All types'
                            : LocalizeText('inventory.pets.filter.type.all')}
                    </option>
                    {availableTypes.map((type) => (
                        <option key={type} value={type}>
                            {LocalizeText(`pet.type.${type}`)}
                        </option>
                    ))}
                </InventoryFilterSelect>
                <InventoryFilterSelect aria-label="Pet rarity" disabled>
                    <option>
                        {LocalizeText('inventory.pets.filter.rarity.all') === 'inventory.pets.filter.rarity.all'
                            ? 'All rarities'
                            : LocalizeText('inventory.pets.filter.rarity.all')}
                    </option>
                </InventoryFilterSelect>
            </div>
            <div className="volt-inventory-animal-grid">
                <ClassicScrollAreaView className="size-full">
                    <div className="volt-inventory-animal-cells">
                        {visiblePets.map((item) => (
                            <InventoryPetItemView key={item.petData.id} petItem={item} />
                        ))}
                    </div>
                </ClassicScrollAreaView>
            </div>
            <div className="volt-inventory-animal-preview">
                <InventoryInfoTextView className="volt-inventory-animal-name" text={selectedPet?.petData.name ?? ''} textStyle="u_headline_small" />
                <div className="volt-inventory-animal-image">{selectedPet && <InventoryPetImageView pet={selectedPet.petData} preview />}</div>
                <InventoryInfoTextView
                    className="volt-inventory-animal-description"
                    text={selectedPet ? LocalizeText(`pet.type.${selectedPet.petData.typeId}`) : ''}
                    width={180}
                />
                <div className="volt-inventory-animal-actions">
                    <InventoryActionButton
                        touchGreen
                        className="volt-inventory-animal-place"
                        disabled={!selectedPet || !(roomSession?.isRoomOwner || roomSession?.allowPets)}
                        onClick={() => {
                            attemptPetPlacement(selectedPet);
                            hideSheetForPlacement();
                        }}
                        height={28}
                        widthMax={158}
                        widthMin={158}
                        caption={LocalizeText('inventory.pets.placetoroom')}
                    />
                </div>
            </div>
        </div>
    );
};
