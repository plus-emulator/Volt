import { ApproveNameMessageComposer, ApproveNameMessageEvent, GetRoomContentLoader, GetRoomEngine, RoomContentLoadedEvent, SellablePetPaletteData } from '@volt/renderer';
import { CSSProperties, FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaLock } from 'react-icons/fa';
import { GetPetAvailableColors, GetPetIndexFromLocalization, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../../../api';
import { ClassicScrollAreaView, LayoutPetImageView } from '../../../../../../common';
import { HabboDropMenuView } from '../../../../../../common/dropmenu/HabboDropMenuView';
import { NativeText } from '../../../../../../common/native-text/NativeText';
import { useCatalogData, useCatalogUiState, useMessageEvent, useNotification, useSellablePetPalette, useUserDataSnapshot, useVoltEvent } from '../../../../../../hooks';
import { CatalogAddOnBadgeWidgetView } from '../../widgets/CatalogAddOnBadgeWidgetView';
import { CatalogPurchaseWidgetView } from '../../widgets/CatalogPurchaseWidgetView';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { buildNewPetPaletteChoices, buildPetPurchaseExtraData, filterPetPalettes, getPetNameMaxLength, isLegacyPetType, PetPaletteLike } from './petCatalog.helpers';
import { CatalogPetPriceDisplayView } from './CatalogPetPriceDisplayView';

/** The catalog page colour behind the AIR text rasters. */
const PAGE_BACKGROUND = 0xe9e9e1;
/** PetsCatalogWidget / NewPetsCatalogWidget.onApproveNameResult: results 1 to 4 name an alert text. */
const NAME_ERROR_KEYS: Record<number, string> = { 1: 'long', 2: 'short', 3: 'chars', 4: 'bobba' };

const toCssColour = (colour: number) => `#${(colour & 0xffffff).toString(16).padStart(6, '0')}`;

/** ColourGridCatalogWidget.createColorContainer: a second colour covers the right half of the swatch from x 13. */
const swatchColour = (colours: number[]): CSSProperties =>
    ({
        '--volt-swatch-colour':
            colours.length > 1 ? `linear-gradient(to right, ${toCssColour(colours[0])} 0 13px, ${toCssColour(colours[1])} 13px)` : toCssColour(colours[0])
    }) as CSSProperties;

/**
 * AIR layout_pets (360x460) holds petsWidget for pet types 0 to 7 and newPetsWidget for the others; the other widget fails to
 * init and is removed. Both put the pet image in ctlg_teaserimg_1 (0, 0, 360x240) with the price at its bottom right,
 * colourGridWidget at 0,245 (360x80), the name input in a border style 4 box and purchaseWidget at 0,429.
 */
export const CatalogLayoutPetView: FC<CatalogLayoutProps> = ({ page = null }) => {
    const [petIndex, setPetIndex] = useState(-1);
    const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(-1);
    const [selectedColorIndex, setSelectedColorIndex] = useState(-1);
    const [petName, setPetName] = useState('');
    const [petAssetRefreshKey, setPetAssetRefreshKey] = useState(0);
    const pendingApprovalRef = useRef<(() => void) | null>(null);
    const { currentOffer = null } = useCatalogData();
    const { setCurrentOffer = null, setPurchaseOptions = null } = useCatalogUiState();
    const { simpleAlert = null } = useNotification();
    const breed = (currentOffer?.product?.productData?.type as unknown as string) ?? '';
    const { data: petPalette = null } = useSellablePetPalette(breed);
    const legacyPet = isLegacyPetType(petIndex);
    const isHc = useUserDataSnapshot().clubLevel > 0;
    // A club_only breed is shown to everyone but only HC members can buy it.
    const isBreedLocked = (palette: { clubOnly?: boolean } | null | undefined) => !!palette?.clubOnly && !isHc;
    const hcOnlyLabel = localizeWithFallback('catalog.pets.breed.hc_only', 'Habbo Club only');
    const petTypeName = petIndex >= 0 ? (GetRoomContentLoader().getPetNameForType(petIndex) ?? null) : null;

    const sellablePalettes = useMemo(() => filterPetPalettes(petIndex, petPalette?.palettes ?? []), [petIndex, petPalette]);

    const legacyBreeds = useMemo(() => {
        if (!legacyPet) return [];

        // Read again once the pet asset has loaded and its palettes are known.
        void petAssetRefreshKey;

        const existing = sellablePalettes.filter((palette) => !!GetRoomEngine().getPetColorResult(petIndex, palette.paletteId));

        return existing.length ? existing : sellablePalettes;
    }, [legacyPet, petAssetRefreshKey, petIndex, sellablePalettes]);

    useEffect(() => {
        if (petTypeName) GetRoomContentLoader().downloadAsset(petTypeName);
    }, [petTypeName]);

    useVoltEvent<RoomContentLoadedEvent>(
        RoomContentLoadedEvent.RCLE_SUCCESS,
        (event) => {
            if (event.contentType === petTypeName) setPetAssetRefreshKey((key) => key + 1);
        },
        !!petTypeName
    );

    const newPetChoices = useMemo(() => {
        if (legacyPet) return [];

        void petAssetRefreshKey;

        let palettes: PetPaletteLike[] = sellablePalettes as unknown as PetPaletteLike[];

        if (!palettes.length) {
            const derived: PetPaletteLike[] = [];

            for (let paletteId = 0; paletteId <= 128; paletteId++) {
                if (GetRoomEngine().getPetColorResult(petIndex, paletteId)) {
                    derived.push({ breedId: paletteId, paletteId, rare: false, sellable: true, type: petIndex, clubOnly: false });
                }
            }

            palettes = derived;
        }

        return buildNewPetPaletteChoices(petIndex, palettes, (type, paletteId) => GetRoomEngine().getPetColorResult(type, paletteId));
    }, [legacyPet, petAssetRefreshKey, petIndex, sellablePalettes]);

    const selectablePalettes = useMemo(
        () => (legacyPet ? legacyBreeds : newPetChoices.map((choice) => choice.palette)),
        [legacyPet, legacyBreeds, newPetChoices]
    );

    const legacyColors = useMemo(
        () => (legacyPet ? GetPetAvailableColors(petIndex, sellablePalettes as SellablePetPaletteData[]) : []),
        [legacyPet, petIndex, sellablePalettes]
    );

    const selectedPalette = selectedPaletteIndex >= 0 ? selectablePalettes[selectedPaletteIndex] : null;
    const selectedColor = legacyPet ? (legacyColors[selectedColorIndex]?.[0] ?? 0xffffff) : 0xffffff;
    const selectedPaletteLocked = isBreedLocked(selectedPalette);

    const purchaseExtraData = useMemo(() => {
        if (!petName || !selectedPalette) return '';
        if (legacyPet && selectedColorIndex < 0) return '';

        return buildPetPurchaseExtraData(petName, petIndex, selectedPalette, selectedColor);
    }, [legacyPet, petIndex, petName, selectedColor, selectedColorIndex, selectedPalette]);

    // The purchase widget sends and gifts with purchaseOptions.extraData.
    useEffect(() => {
        setPurchaseOptions?.((previous) => ({ ...previous, extraData: purchaseExtraData }));
    }, [purchaseExtraData, setPurchaseOptions]);

    const showPurchaseError = useCallback(
        (message: string) => simpleAlert?.(message, null, null, null, LocalizeText('catalog.alert.purchaseerror.title')),
        [simpleAlert]
    );

    /** PURCHASE_OVERRIDE (onPurchase): an empty name alerts, otherwise the name is approved before the confirmation opens. */
    const approveNameThenConfirm = useCallback(
        (_isGift: boolean, openConfirmation: () => void) => {
            if (pendingApprovalRef.current) return;

            if (!petName.length) {
                showPurchaseError(LocalizeText('catalog.alert.petname.empty'));
                return;
            }

            if (!purchaseExtraData) return;

            if (selectedPaletteLocked) {
                showPurchaseError(hcOnlyLabel);
                return;
            }

            pendingApprovalRef.current = openConfirmation;
            SendMessageComposer(new ApproveNameMessageComposer(petName, 1));
        },
        [hcOnlyLabel, petName, purchaseExtraData, selectedPaletteLocked, showPurchaseError]
    );

    useMessageEvent<ApproveNameMessageEvent>(ApproveNameMessageEvent, (event) => {
        const openConfirmation = pendingApprovalRef.current;

        if (!openConfirmation) return;

        pendingApprovalRef.current = null;

        const parser = event.getParser();

        if (parser.result === 0) {
            openConfirmation();
            return;
        }

        // constructErrorMessage: the ".additionalInfo" text, with the server's validation info, when both exist.
        const key = `catalog.alert.petname.${NAME_ERROR_KEYS[parser.result] ?? 'bobba'}`;
        const additional = parser.validationInfo
            ? localizeWithFallback(`${key}.additionalInfo`, '', ['additional_info'], [parser.validationInfo])
            : '';

        showPurchaseError(additional || LocalizeText(key));
    });

    useEffect(() => {
        if (!page?.offers.length) return;

        const offer = page.offers[0];

        setCurrentOffer(offer);
        setPetIndex(GetPetIndexFromLocalization(offer.localizationId));
    }, [page, setCurrentOffer]);

    useEffect(() => {
        pendingApprovalRef.current = null;
        setPetName('');
    }, [page?.pageId]);

    useEffect(() => {
        setSelectedPaletteIndex(selectablePalettes.length ? 0 : -1);
    }, [selectablePalettes]);

    useEffect(() => {
        setSelectedColorIndex(legacyColors.length ? 0 : -1);
    }, [legacyColors]);

    if (!currentOffer) return null;

    // Page texts 1, 2 and 3 fill ctlg_text_1, ctlg_text_2 and ctlg_text_3. petsWidget: name, colour and breed labels.
    // newPetsWidget: the name label is ctlg_text_2 and ctlg_text_3 sits under the colour grid.
    const pageText = (index: number, fallbackKey: string) =>
        (page?.localization?.getText(index) ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '') || LocalizeText(fallbackKey);
    const colorLabel = pageText(legacyPet ? 2 : 3, 'catalog.pets.choose.color');
    const breedLabel = pageText(3, 'catalog.pets.choose.breed');
    const nameLabel = pageText(legacyPet ? 1 : 2, 'widgets.petpackage.name.title');
    const breedOptions = selectablePalettes.map((palette, index) => ({
        value: index,
        label: localizeWithFallback(`pet.breed.${petIndex}.${palette.breedId}`, `pet.breed.${petIndex}.${palette.breedId}`) + (isBreedLocked(palette) ? ` (${hcOnlyLabel})` : '')
    }));

    return (
        <div className={`volt-catalog-pet-layout ${legacyPet ? 'is-legacy' : 'is-new'}`}>
            <div className="volt-catalog-pet-preview">
                {selectedPalette && (
                    <LayoutPetImageView
                        direction={legacyPet || petIndex === 15 ? 2 : 3}
                        paletteId={selectedPalette.paletteId}
                        petColor={selectedColor}
                        scale={petIndex === 15 ? 1 : 2}
                        typeId={petIndex}
                    />
                )}
            </div>
            {!legacyPet && selectedPalette && (
                <NativeText
                    background={PAGE_BACKGROUND}
                    className="volt-catalog-pet-breed-text"
                    text={localizeWithFallback(`pet.breed.${petIndex}.${selectedPalette.breedId}`, `pet.breed.${petIndex}.${selectedPalette.breedId}`)}
                    textStyle="u_bold"
                />
            )}
            <CatalogAddOnBadgeWidgetView className="volt-catalog-pet-badge" />
            <CatalogPetPriceDisplayView className="volt-catalog-pet-layout-price" offer={currentOffer} />

            <NativeText background={PAGE_BACKGROUND} className="volt-catalog-pet-colour-label" text={colorLabel} textStyle="u_small" />
            <div className="volt-catalog-pet-colour-grid-shell">
                <ClassicScrollAreaView className="h-full min-h-0">
                    <div aria-label={colorLabel} className="volt-catalog-colour-grid" role="radiogroup">
                        {legacyPet
                            ? legacyColors.map((colours, index) => (
                                  <button
                                      key={`${colours[0]}-${index}`}
                                      aria-checked={selectedColorIndex === index}
                                      aria-label={`${colorLabel} ${index + 1}`}
                                      className={`volt-catalog-colour-swatch ${selectedColorIndex === index ? 'is-chosen' : ''}`}
                                      role="radio"
                                      style={swatchColour(colours)}
                                      type="button"
                                      onClick={() => setSelectedColorIndex(index)}
                                  />
                              ))
                            : newPetChoices.map((choice, index) => {
                                  const locked = isBreedLocked(choice.palette);

                                  return (
                                      <button
                                          key={choice.palette.paletteId}
                                          aria-checked={selectedPaletteIndex === index}
                                          aria-label={locked ? `${colorLabel} ${index + 1} - ${hcOnlyLabel}` : `${colorLabel} ${index + 1}`}
                                          className={`volt-catalog-colour-swatch ${selectedPaletteIndex === index ? 'is-chosen' : ''} ${locked ? 'is-locked' : ''}`}
                                          disabled={locked}
                                          role="radio"
                                          style={swatchColour(choice.colors)}
                                          title={locked ? hcOnlyLabel : undefined}
                                          type="button"
                                          onClick={() => setSelectedPaletteIndex(index)}
                                      >
                                          {locked && <FaLock className="volt-catalog-pet-swatch-lock" />}
                                      </button>
                                  );
                              })}
                    </div>
                </ClassicScrollAreaView>
            </div>

            {legacyPet && <NativeText background={PAGE_BACKGROUND} className="volt-catalog-pet-breed-label" text={breedLabel} textStyle="u_small" />}
            {legacyPet && breedOptions.length > 1 && (
                <HabboDropMenuView<number>
                    nativeCaption
                    className="volt-catalog-pet-breed-menu"
                    label={breedLabel}
                    options={breedOptions}
                    skinStyle={3}
                    value={selectedPaletteIndex}
                    onSelect={setSelectedPaletteIndex}
                />
            )}

            <NativeText background={PAGE_BACKGROUND} className="volt-catalog-pet-name-label" text={nameLabel} textStyle="u_small" />
            <div className="volt-catalog-pet-name-box">
                <input
                    aria-label={nameLabel}
                    maxLength={getPetNameMaxLength(petIndex)}
                    type="text"
                    value={petName}
                    onChange={(event) => setPetName(event.target.value)}
                />
            </div>

            <div className="volt-catalog-pet-purchase">
                <div className="volt-catalog-offer-actions">
                    <CatalogPurchaseWidgetView purchaseOverride={approveNameThenConfirm} />
                </div>
            </div>
        </div>
    );
};
