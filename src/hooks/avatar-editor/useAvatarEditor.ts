import {
    AvatarEditorFigureCategory,
    AvatarEffectActivatedComposer,
    AvatarEffectActivatedEvent,
    AvatarEffectExpiredEvent,
    AvatarEffectSelectedComposer,
    AvatarEffectSelectedEvent,
    AvatarFigureContainer,
    AvatarFigurePartType,
    FigureSetIdsMessageEvent,
    GetAvatarRenderManager,
    GetHotLooksComposer,
    GetRoomEngine,
    GetSelectedNftWardrobeOutfitMessageComposer,
    GetUserNftWardrobeMessageComposer,
    GetWardrobeMessageComposer,
    HotLooksEvent,
    IHotLookInfo,
    IAvatarFigureContainer,
    IFigurePartSet,
    INftWardrobeItem,
    IPalette,
    IPartColor,
    RoomObjectCategory,
    RoomObjectVariable,
    RoomUnitEffectEvent,
    SaveUserNftWardrobeMessageComposer,
    SelectedNftWardrobeOutfitMessageEvent,
    SetType,
    UserFigureComposer,
    UserNftWardrobeMessageEvent,
    UserWardrobePageEvent
} from '@volt/renderer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    AvatarEditorColorSorter,
    AvatarEditorPartSorter,
    CreateLinkEvent,
    GetClubMemberLevel,
    GetConfigurationValue,
    GetRoomSession,
    IAvatarEditorCategory,
    IAvatarEditorCategoryPartItem,
    Randomizer,
    SendMessageComposer
} from '../../api';
import { useMessageEvent } from '../events';
import { useUserDataSnapshot } from '../session';
import { useFigureData } from './useFigureData';
import { useAvatarEditorEffects } from './useAvatarEditorEffects';

const MAX_PALETTES: number = 2;
const NO_HOT_LOOKS: IHotLookInfo[] = [];
const NO_GENDER_EFFECTS: Record<string, number> = {};
const NO_NFT_AVATARS: INftWardrobeItem[] = [];
const DEFAULT_MALE_FIGURE = 'hr-100.hd-180-7.ch-215-66.lg-270-79.sh-305-62.ha-1002-70.wa-2007';
const DEFAULT_FEMALE_FIGURE = 'hr-515-33.hd-600-1.ch-635-70.lg-716-66-62.sh-735-68';

// AIR WIN63-202610151745-318700621 FurnitureClothingChangeWidgetHandler.as:100-115: the gate's stored look for the chosen gender,
// or these looks when the gate has none, opened in the normal editor limited to the torso and legs tabs.
const DEFAULT_MALE_FOOTBALL_GATE: string = 'hd-99999-99999.lg-270-62';
const DEFAULT_FEMALE_FOOTBALL_GATE: string = 'hd-99999-99999.ch-630-62.lg-695-62';
const TORSO_SET_TYPES: string[] = [
    AvatarFigurePartType.CHEST,
    AvatarFigurePartType.CHEST_PRINT,
    AvatarFigurePartType.COAT_CHEST,
    AvatarFigurePartType.CHEST_ACCESSORY
];
const LEGS_SET_TYPES: string[] = [AvatarFigurePartType.LEGS, AvatarFigurePartType.SHOES, AvatarFigurePartType.WAIST_ACCESSORY];

const getFootballGateLook = (objectId: number, gender: string): string => {
    const roomObject = GetRoomEngine().getRoomObject(GetRoomEngine().activeRoomId, objectId, RoomObjectCategory.FLOOR);
    const look = roomObject?.model.getValue<string>(
        gender === AvatarFigurePartType.FEMALE ? RoomObjectVariable.FURNITURE_CLOTHING_GIRL : RoomObjectVariable.FURNITURE_CLOTHING_BOY
    );

    if (look) return look;

    return gender === AvatarFigurePartType.FEMALE ? DEFAULT_FEMALE_FOOTBALL_GATE : DEFAULT_MALE_FOOTBALL_GATE;
};

export interface IClothingChangeData {
    objectId: number;
    gender: string;
}

const useAvatarEditorState = () => {
    const [isVisible, setIsVisibleState] = useState<boolean>(false);
    const [clothingChangeData, setClothingChangeData] = useState<IClothingChangeData>(null);
    const [avatarModels, setAvatarModels] = useState<{ [index: string]: IAvatarEditorCategory[] }>({});
    const [activeModelKey, setActiveModelKey] = useState<string>('');
    const [figureSetIds, setFigureSetIds] = useState<number[]>([]);
    const [boundFurnitureNames, setBoundFurnitureNames] = useState<string[]>([]);
    const [savedFigures, setSavedFigures] = useState<[IAvatarFigureContainer, string][]>(null);
    // Hot looks, staged effects and the preview direction belong to the signed-in user they were made for; another user starts from nothing.
    const [hotLooksState, setHotLooksState] = useState<{ userId: number; looks: IHotLookInfo[] }>({ userId: 0, looks: [] });
    const hotLooksUser = useRef(0);
    const userData = useUserDataSnapshot();
    const { effects, wornEffect, setWornEffect } = useAvatarEditorEffects();
    const [genderEffectsState, setGenderEffectsState] = useState<{ userId: number; effects: Record<string, number> }>({ userId: 0, effects: {} });
    const [previewDirectionState, setPreviewDirectionState] = useState<{ userId: number; direction: number }>({ userId: 0, direction: 4 });
    const hotLooks = userData.userId && hotLooksState.userId === userData.userId ? hotLooksState.looks : NO_HOT_LOOKS;
    const genderEffects = genderEffectsState.userId === userData.userId ? genderEffectsState.effects : NO_GENDER_EFFECTS;
    const previewDirection = previewDirectionState.userId === userData.userId ? previewDirectionState.direction : 4;
    // The staged effect per gender as the editor model holds it (HabboAvatarEditor figureData), mirrored synchronously: several server messages can arrive
    // before React renders again, and each one must see the selection the previous one left, as the native FigureData mutation does.
    const stagedEffects = useRef<{ userId: number; effects: Record<string, number> }>({ userId: 0, effects: {} });
    const setGenderEffects = useCallback((update: (current: Record<string, number>) => Record<string, number>) =>
    {
        const owned = stagedEffects.current.userId === userData.userId;
        const current = owned ? stagedEffects.current.effects : {};
        const next = update(current);

        if (owned && next === current) return;

        stagedEffects.current = { userId: userData.userId, effects: next };
        setGenderEffectsState(stagedEffects.current);
    }, [userData.userId]);
    const stagedEffectFor = (forGender: string) => (stagedEffects.current.userId === userData.userId ? stagedEffects.current.effects[forGender] : undefined) ?? -1;
    const setPreviewDirection = (next: number | ((current: number) => number)) =>
        setPreviewDirectionState((current) =>
        {
            const direction = current.userId === userData.userId ? current.direction : 4;

            return { userId: userData.userId, direction: typeof next === 'function' ? next(direction) : next };
        });
    // Per signed-in user (the user id they were set for, 0 for none), so an identity change never needs an effect to clear them:
    // - the effect choice still to save (HabboAvatarEditor var_3918);
    // - HabboAvatarEditorManager.getEditor(0): the native editor exists once it has been opened, and only then do the effect messages reach it.
    const effectChangedFor = useRef(0);
    const editorOpenedFor = useRef(0);
    // EffectsModel's view belongs to the editor, not to a user: created the first time the Effects tab is shown (CategoryBaseModel.getWindowContainer)
    // and kept from then on (CategoryBaseModel.var_18), whichever tab is open and whoever is signed in.
    const effectsViewCreated = useRef(false);
    const genderFigures = useRef<{ userId: number; figures: Record<string, string> }>({ userId: 0, figures: {} });
    const { selectedColors, gender, loadAvatarData, selectPart, selectColor, getFigureString, getFigureStringWithFace, selectedParts } =
        useFigureData();
    // Avatar collectibles, per signed-in user (AIR HabboAvatarEditor.as:179-187 and 856-910, nft/NftAvatarsModel.as):
    // - the collectibles the server listed (NftAvatarsModel._nftAvatars);
    // - the worn collectible and the look shown outside the collectibles tab (HabboAvatarEditor var_2324 / var_4122 / var_5641);
    // - the collectible picked in the editor and the look it replaced (HabboAvatarEditor _setNftOutfit / var_5154 / var_4808).
    const [nftAvatarsState, setNftAvatarsState] = useState<{ userId: number; avatars: INftWardrobeItem[] }>({ userId: 0, avatars: [] });
    const nftAvatars = nftAvatarsState.userId === userData.userId ? nftAvatarsState.avatars : NO_NFT_AVATARS;
    const nftRequestedFor = useRef(0);
    const wornNft = useRef<{ userId: number; tokenId: string; figure: string; gender: string }>(null);
    const stagedNft = useRef<{ userId: number; outfit: INftWardrobeItem; figure: string; gender: string }>(null);
    // NftAvatarsModel._selectedNftOutfit (the highlighted grid item) and whether NftWardrobeParamView shows its name.
    const [selectedNftState, setSelectedNftState] = useState<{ userId: number; id: string; infoVisible: boolean }>(null);
    const selectedNft = selectedNftState?.userId === userData.userId ? selectedNftState : null;
    const activeModelKeyRef = useRef('');
    activeModelKeyRef.current = activeModelKey;
    const hasWornNft = () => !!userData.userId && wornNft.current?.userId === userData.userId && wornNft.current.tokenId !== null;
    const stagedNftOutfit = () => (userData.userId && stagedNft.current?.userId === userData.userId ? stagedNft.current : null);
    const loadEditorFigure = (figure: string, figureGender: string) =>
        loadAvatarData(figure, figureGender?.toUpperCase() === AvatarFigurePartType.FEMALE ? AvatarFigurePartType.FEMALE : AvatarFigurePartType.MALE);
    // HabboAvatarEditor.setNftOutfit keeps the look the collectible replaces.
    const stageNftOutfit = (outfit: INftWardrobeItem) =>
    {
        stagedNft.current = { userId: userData.userId, outfit, figure: getFigureString, gender };
    };
    const loadNftFigure = () =>
    {
        const staged = stagedNftOutfit();

        if (staged)
        {
            loadEditorFigure(staged.outfit.figureString, staged.outfit.gender);

            return;
        }

        if (!hasWornNft()) return;

        const outfit = nftAvatars.find((avatar) => avatar.tokenId === wornNft.current.tokenId);

        if (!outfit) return;

        stageNftOutfit(outfit);
        loadEditorFigure(outfit.figureString, outfit.gender);
    };
    const loadRollbackFigure = () =>
    {
        const staged = stagedNftOutfit();

        if (staged) loadEditorFigure(staged.figure, staged.gender);
    };
    const loadFallbackFigure = () =>
    {
        if (wornNft.current?.userId === userData.userId && wornNft.current.figure) loadEditorFigure(wornNft.current.figure, wornNft.current.gender);
    };

    // Showing the Effects tab creates the native EffectsModel view (it then stays for that editor).
    // AvatarEditorView.windowEventProc (WE_SELECTED): leaving or entering the collectibles tab swaps between the collectible and the normal look.
    const selectModelKey = (key: string) =>
    {
        if (key === AvatarEditorFigureCategory.EFFECTS) effectsViewCreated.current = true;

        if (key === activeModelKeyRef.current) return;

        const isNft = key === AvatarEditorFigureCategory.NFT;
        const wearsNft = hasWornNft();
        let fallback = false;
        let rollback = false;
        let nft = false;

        if (key !== AvatarEditorFigureCategory.EFFECTS && key !== AvatarEditorFigureCategory.HOTLOOKS)
        {
            if (wearsNft && isNft) nft = true;
            else if (wearsNft) fallback = true;
            else if (stagedNftOutfit() && !isNft) rollback = true;
        }

        if (wearsNft && key === AvatarEditorFigureCategory.EFFECTS) nft = true;

        activeModelKeyRef.current = key;
        setActiveModelKey(key);
        // AvatarEditorView.setViewToCategory hides the collectible name on every tab change.
        setSelectedNftState((current) => (current?.infoVisible ? { ...current, infoVisible: false } : current));

        if (fallback) loadFallbackFigure();
        else if (rollback) loadRollbackFigure();
        else if (nft) loadNftFigure();
    };

    // NftAvatarsModel.selectNftAvatar: a collectible without a look is ignored.
    const selectNftAvatar = (outfit: INftWardrobeItem) =>
    {
        if (!outfit || outfit.figureString === '') return;

        stageNftOutfit(outfit);
        loadEditorFigure(outfit.figureString, outfit.gender);
        setSelectedNftState({ userId: userData.userId, id: outfit.id, infoVisible: true });
    };

    // HabboAvatarEditor.saveCurrentSelection: a picked collectible is worn by its id, anything else saves the figure.
    const saveEditorFigure = () =>
    {
        const staged = stagedNftOutfit();

        if (staged)
        {
            SendMessageComposer(new SaveUserNftWardrobeMessageComposer(staged.outfit.id));
            SendMessageComposer(new GetSelectedNftWardrobeOutfitMessageComposer());
            stagedNft.current = null;
        }
        else
        {
            SendMessageComposer(new UserFigureComposer(gender, getFigureString));
        }

        if (hasWornNft()) wornNft.current = { ...wornNft.current, tokenId: null };
    };
    // A closed editor shows the worn effect for the current gender again: an effect picked but not saved is dropped.
    const setIsVisible = useCallback((value: boolean) =>
    {
        if (!value)
        {
            setGenderEffects((staged) => (staged[gender] === wornEffect ? staged : { ...staged, [gender]: wornEffect }));
        }
        else editorOpenedFor.current = userData.userId;

        setIsVisibleState(value);
    }, [gender, wornEffect, userData.userId, setGenderEffects]);

    const setGender = useCallback((nextGender: string) => {
        if (nextGender === gender) return;

        genderFigures.current.figures[gender] = getFigureString;
        const figure = genderFigures.current.figures[nextGender] ??
            (nextGender === AvatarFigurePartType.MALE ? DEFAULT_MALE_FIGURE : DEFAULT_FEMALE_FIGURE);

        loadAvatarData(figure, nextGender);
    }, [gender, getFigureString, loadAvatarData]);

    const activeModel = useMemo(() => avatarModels[activeModelKey] ?? [], [activeModelKey, avatarModels]);
    const selectedEffect = genderEffects[gender] ?? -1;
    const selectEditorEffect = (type: number) =>
    {
        effectChangedFor.current = userData.userId;
        setGenderEffects(current => ({ ...current, [gender]: type }));
    };
    const saveEditorEffect = () =>
    {
        if (!userData.userId || effectChangedFor.current !== userData.userId) return;

        if (selectedEffect !== -1)
        {
            const effect = effects.find(effect => effect.type === selectedEffect);

            if (effect)
            {
                if (!effect.active) SendMessageComposer(new AvatarEffectActivatedComposer(selectedEffect));
                SendMessageComposer(new AvatarEffectSelectedComposer(selectedEffect));
                setWornEffect(selectedEffect);
            }
        }
        else
        {
            SendMessageComposer(new AvatarEffectSelectedComposer(-1));
            setWornEffect(-1);
        }

        effectChangedFor.current = 0;
    };

    const selectedColorParts = useMemo(() => {
        const colorSets: { [index: string]: IPartColor[] } = {};

        for (const setType of Object.keys(selectedColors)) {
            if (!selectedColors[setType]) continue;

            const parts: IPartColor[] = [];

            for (const paletteId of Object.keys(selectedColors[setType])) {
                const partColor = activeModel
                    .find((category) => category.setType === setType)
                    ?.colorItems[paletteId]?.find((partColor) => partColor.id === selectedColors[setType][paletteId]);

                if (partColor) parts.push(partColor);
            }

            colorSets[setType] = parts;
        }

        return colorSets;
    }, [activeModel, selectedColors]);

    const selectEditorPart = useCallback(
        (setType: string, partId: number) => {
            if (!setType || !setType.length) return;

            const category = activeModel.find((category) => category.setType === setType);

            if (!category || !category.partItems || !category.partItems.length) return;

            const partItem = category.partItems.find((partItem) => partItem.id === partId);

            if (!partItem) return;

            if (partItem.isClear) {
                selectPart(setType, -1);

                return;
            }

            if (GetClubMemberLevel() < partItem.partSet.clubLevel) {
                CreateLinkEvent('habboUI/open/hccenter');

                return;
            }

            if (partItem.isSellableNotOwned) return;

            selectPart(setType, partId);
        },
        [activeModel, selectPart]
    );

    const selectEditorColor = useCallback(
        (setType: string, paletteId: number, colorId: number) => {
            if (!setType || !setType.length) return;

            const category = activeModel.find((category) => category.setType === setType);

            if (!category || !category.colorItems || !category.colorItems.length) return;

            const palette = category.colorItems[paletteId];

            if (!palette || !palette.length) return;

            const partColor = palette.find((partColor) => partColor.id === colorId);

            if (!partColor) return;

            if (GetClubMemberLevel() < partColor.clubLevel) {
                CreateLinkEvent('habboUI/open/hccenter');

                return;
            }

            selectColor(setType, paletteId, colorId);
        },
        [activeModel, selectColor]
    );

    const getFirstSelectableColor = useCallback((setType: string) => {
        const set = GetAvatarRenderManager().structureData.getSetType(setType);

        if (!setType) return -1;

        const palette = GetAvatarRenderManager().structureData.getPalette(set.paletteID);

        if (!palette) return -1;

        for (const color of palette.colors.getValues()) {
            if (!color.isSelectable || GetClubMemberLevel() < color.clubLevel) continue;

            return color.id;
        }

        return -1;
    }, []);

    const randomizeCurrentFigure = useCallback(
        (ignoredSets: string[] = []) => {
            const structure = GetAvatarRenderManager().structure;
            const figureContainer = new AvatarFigureContainer('');

            const getRandomSetTypes = (requiredSets: string[], options: string[]) => {
                options = options.filter((option) => requiredSets.indexOf(option) === -1);

                return [...requiredSets, ...Randomizer.getRandomElements(options, Randomizer.getRandomNumber(options.length) + 1)];
            };

            const requiredSets = getRandomSetTypes(structure.getMandatorySetTypeIds(gender, GetClubMemberLevel()), AvatarFigurePartType.FIGURE_SETS);

            const getRandomPartSet = (setType: SetType, gender: string, clubLevel: number, figureSetIds: number[]) => {
                const options = setType.partSets.getValues().filter((option) => {
                    if (
                        !option.isSelectable ||
                        (option.gender !== 'U' && option.gender !== gender) ||
                        option.clubLevel > clubLevel ||
                        (option.isSellable && figureSetIds.indexOf(option.id) === -1)
                    )
                        return null;

                    return option;
                });

                if (!options || !options.length) return null;

                return Randomizer.getRandomElement(options);
            };

            const getRandomColors = (palette: IPalette, partSet: IFigurePartSet, clubLevel: number) => {
                const options = palette.colors.getValues().filter((option) => {
                    if (!option.isSelectable || option.clubLevel > clubLevel) return null;

                    return option;
                });

                if (!options || !options.length) return null;

                const getTotalColors = (partSet: IFigurePartSet) => {
                    const parts = partSet.parts;

                    let totalColors = 0;

                    for (const part of parts) totalColors = Math.max(totalColors, part.colorLayerIndex);

                    return totalColors;
                };

                return Randomizer.getRandomElements(options, getTotalColors(partSet));
            };

            for (const setType of ignoredSets) {
                const partSetId = selectedParts[setType];
                const colors = selectedColors[setType];

                figureContainer.updatePart(setType, partSetId, colors);
            }

            for (const type of requiredSets) {
                if (figureContainer.hasPartType(type)) continue;

                const setType = structure.figureData.getSetType(type) as SetType;
                const selectedSet = getRandomPartSet(setType, gender, GetClubMemberLevel(), figureSetIds);

                if (!selectedSet) continue;

                let selectedColors: number[] = [];

                if (selectedSet.isColorable) {
                    selectedColors = getRandomColors(structure.figureData.getPalette(setType.paletteID), selectedSet, GetClubMemberLevel()).map(
                        (color) => color.id
                    );
                }

                figureContainer.updatePart(setType.type, selectedSet.id, selectedColors);
            }

            loadAvatarData(figureContainer.getFigureString(), gender);
        },
        [figureSetIds, gender, loadAvatarData, selectedColors, selectedParts]
    );

    useMessageEvent<FigureSetIdsMessageEvent>(FigureSetIdsMessageEvent, (event) => {
        const parser = event.getParser();

        setFigureSetIds(parser.figureSetIds);
        setBoundFurnitureNames(parser.boundsFurnitureNames);
    });

    useMessageEvent<UserWardrobePageEvent>(UserWardrobePageEvent, (event) => {
        const parser = event.getParser();
        const savedFigures: [IAvatarFigureContainer, string][] = [];

        let i = 0;

        while (i < GetConfigurationValue<number>('avatar.wardrobe.max.slots', 10)) {
            savedFigures.push([null, null]);

            i++;
        }

        for (let [index, [look, gender]] of parser.looks.entries()) {
            const container = GetAvatarRenderManager().createFigureContainer(look);

            savedFigures[index - 1] = [container, gender];
        }

        setSavedFigures(savedFigures);
    });

    // AvatarEditorMessageHandler: once the editor exists, the effect the server activates, selects or puts on the own room user becomes the current gender's
    // selection, and an expiring effect clears it only when it is the selected one. None of them is the worn effect. Only the activated and expired
    // handlers first call effects.reset(): once the Effects view exists that re-selects the current effect (EffectsView.reset -> selectPart(-1)), and with
    // no effect selected EffectsModel.selectPart calls setAvatarEffectType(-1), which marks the editor changed.
    const followServerEffect = (type: number, onlyIfSelected: number = null, resetsView: boolean = false) =>
    {
        if (!userData.userId || editorOpenedFor.current !== userData.userId) return;

        const selected = stagedEffectFor(gender);

        if (resetsView && effectsViewCreated.current && selected === -1) effectChangedFor.current = userData.userId;

        if (onlyIfSelected !== null && selected !== onlyIfSelected) return;

        setGenderEffects((staged) => ({ ...staged, [gender]: type }));
    };

    useMessageEvent<AvatarEffectActivatedEvent>(AvatarEffectActivatedEvent, (event) => followServerEffect(event.getParser().type, null, true));
    useMessageEvent<AvatarEffectSelectedEvent>(AvatarEffectSelectedEvent, (event) => followServerEffect(event.getParser().type));
    useMessageEvent<AvatarEffectExpiredEvent>(AvatarEffectExpiredEvent, (event) => followServerEffect(-1, event.getParser().type, true));
    useMessageEvent<RoomUnitEffectEvent>(RoomUnitEffectEvent, (event) =>
    {
        const parser = event.getParser();
        const session = GetRoomSession();

        if (!session || parser.unitId !== session.ownRoomIndex) return;

        followServerEffect(parser.effectId);
    });

    // NftAvatarsModel.onUserNftWardrobeMessage adds every listed collectible.
    useMessageEvent<UserNftWardrobeMessageEvent>(UserNftWardrobeMessageEvent, (event) =>
    {
        const listed = event.getParser().nftAvatars;

        setNftAvatarsState((current) => ({ userId: userData.userId, avatars: [...(current.userId === userData.userId ? current.avatars : []), ...listed] }));
    });

    // HabboAvatarEditor.onUserNftWardrobeMessage: outside the collectibles tab a worn collectible shows the fallback look.
    useMessageEvent<SelectedNftWardrobeOutfitMessageEvent>(SelectedNftWardrobeOutfitMessageEvent, (event) =>
    {
        const parser = event.getParser();

        if (!userData.userId) return;

        wornNft.current = { userId: userData.userId, tokenId: parser.currentTokenId, figure: parser.fallbackFigureString, gender: parser.fallbackFigureGender };

        if (hasWornNft() && activeModelKeyRef.current !== AvatarEditorFigureCategory.NFT) loadFallbackFigure();
    });

    // HabboAvatarEditor.init asks for the worn collectible, then NftAvatarsModel asks for the list, once per editor.
    useEffect(() =>
    {
        if (!isVisible || !userData.userId || nftRequestedFor.current === userData.userId) return;

        nftRequestedFor.current = userData.userId;
        SendMessageComposer(new GetSelectedNftWardrobeOutfitMessageComposer());
        SendMessageComposer(new GetUserNftWardrobeMessageComposer());
    }, [isVisible, userData.userId]);

    useMessageEvent<HotLooksEvent>(HotLooksEvent, (event) => setHotLooksState({ userId: userData.userId, looks: event.getParser().hotLooks }));

    useEffect(() =>
    {
        if (!userData.userId)
        {
            hotLooksUser.current = 0;
            return;
        }

        if (!isVisible || hotLooksUser.current === userData.userId) return;

        hotLooksUser.current = userData.userId;
        SendMessageComposer(new GetHotLooksComposer(20));
    }, [isVisible, userData.userId]);

    // The editor opens on its default tab (HabboAvatarEditor.selectDefaultCategory); a later rebuild (gender, owned sets) keeps the open tab,
    // as HabboAvatarEditor.loadAvatarInEditor only resets the categories in place.
    const openedModelsFor = useRef<IClothingChangeData | false>(false);

    useEffect(() => {
        if (!isVisible) {
            openedModelsFor.current = false;

            return;
        }

        const keepActiveModel = (models: { [index: string]: IAvatarEditorCategory[] }, defaultKey: string) => {
            const keep = openedModelsFor.current !== false && openedModelsFor.current === clothingChangeData && !!models[activeModelKeyRef.current];

            openedModelsFor.current = clothingChangeData;
            setActiveModelKey(keep ? activeModelKeyRef.current : defaultKey);
        };

        const newAvatarModels: { [index: string]: IAvatarEditorCategory[] } = {};
        const buildCategory = (setType: string) => {
            const partItems: IAvatarEditorCategoryPartItem[] = [];
            const colorItems: IPartColor[][] = [];

            for (let i = 0; i < MAX_PALETTES; i++) colorItems.push([]);

            const set = GetAvatarRenderManager().structureData.getSetType(setType);

            if (!set) return null;

            const palette = GetAvatarRenderManager().structureData.getPalette(set.paletteID);

            if (!palette) return null;

            for (const partColor of palette.colors.getValues()) {
                if (!partColor || !partColor.isSelectable) continue;

                for (let i = 0; i < MAX_PALETTES; i++) colorItems[i].push(partColor);
            }

            let mandatorySetIds: string[] = GetAvatarRenderManager().getMandatoryAvatarPartSetIds(gender, GetClubMemberLevel());

            const isntMandatorySet = mandatorySetIds.indexOf(setType) === -1;

            if (isntMandatorySet) partItems.push({ id: -1, isClear: true });

            const usesColor = setType !== AvatarFigurePartType.HEAD;
            const partSets = set.partSets;

            for (let i = partSets.length; i >= 0; i--) {
                const partSet = partSets.getWithIndex(i);

                if (!partSet || !partSet.isSelectable || (partSet.gender !== gender && partSet.gender !== AvatarFigurePartType.UNISEX)) continue;

                const isSellableNotOwned = partSet.isSellable && figureSetIds.indexOf(partSet.id) === -1;

                const showUnownedSellables = GetConfigurationValue<boolean>('avatareditor.show.unowned.sellables', false);

                // HabboAvatarEditor.generateDataContent: a sellable set is only listed once it is in the inventory.
                if (isSellableNotOwned && !showUnownedSellables) continue;

                let maxPaletteCount = 0;

                for (const part of partSet.parts) maxPaletteCount = Math.max(maxPaletteCount, part.colorLayerIndex);

                partItems.push({ id: partSet.id, partSet, usesColor, maxPaletteCount, isSellableNotOwned });
            }

            partItems.sort(AvatarEditorPartSorter(GetConfigurationValue<boolean>('avatareditor.show.clubitems.first', true)));

            if (GetConfigurationValue<boolean>('avatareditor.support.sellablefurni', true)) partItems.push({ id: -1, isGetMore: true });

            for (let i = 0; i < MAX_PALETTES; i++) colorItems[i].sort(AvatarEditorColorSorter);

            return { setType, partItems, colorItems };
        };

        if (clothingChangeData) {
            newAvatarModels[AvatarEditorFigureCategory.TORSO] = TORSO_SET_TYPES.map((setType) => buildCategory(setType)).filter(Boolean);
            newAvatarModels[AvatarEditorFigureCategory.LEGS] = LEGS_SET_TYPES.map((setType) => buildCategory(setType)).filter(Boolean);

            setAvatarModels(newAvatarModels);
            keepActiveModel(newAvatarModels, AvatarEditorFigureCategory.TORSO);

            return;
        }

        newAvatarModels[AvatarEditorFigureCategory.GENERIC] = [AvatarFigurePartType.HEAD].map((setType) => buildCategory(setType));
        newAvatarModels[AvatarEditorFigureCategory.HEAD] = [
            AvatarFigurePartType.HAIR,
            AvatarFigurePartType.HEAD_ACCESSORY,
            AvatarFigurePartType.HEAD_ACCESSORY_EXTRA,
            AvatarFigurePartType.EYE_ACCESSORY,
            AvatarFigurePartType.FACE_ACCESSORY
        ].map((setType) => buildCategory(setType));
        newAvatarModels[AvatarEditorFigureCategory.TORSO] = TORSO_SET_TYPES.map((setType) => buildCategory(setType));
        newAvatarModels[AvatarEditorFigureCategory.LEGS] = LEGS_SET_TYPES.map((setType) => buildCategory(setType));
        newAvatarModels[AvatarEditorFigureCategory.HOTLOOKS] = [];
        if (GetConfigurationValue<boolean>('effects.in.avatar.editor', true)) newAvatarModels[AvatarEditorFigureCategory.EFFECTS] = [];
        // AIR AvatarEditorView.as:76 shows the misc tab when clothing.misc.tab.enabled is set, as Habbo's external variables do.
        // MiscModel.init: pets ("pt") and misc ("mc"), each kept as an empty category when the figure data has no such set type.
        if (GetConfigurationValue<boolean>('clothing.misc.tab.enabled', true))
        {
            newAvatarModels[AvatarEditorFigureCategory.MISC] = [AvatarFigurePartType.PET, AvatarFigurePartType.MISC].map(
                (setType) => buildCategory(setType) ?? { setType, partItems: [], colorItems: [[], []] }
            );
        }
        // NftAvatarsModel lists collectible avatars, not figure parts.
        newAvatarModels[AvatarEditorFigureCategory.NFT] = [];
        newAvatarModels[AvatarEditorFigureCategory.WARDROBE] = [];

        setAvatarModels(newAvatarModels);
        keepActiveModel(newAvatarModels, AvatarEditorFigureCategory.GENERIC);
    }, [isVisible, gender, figureSetIds, clothingChangeData]);

    useEffect(() => {
        genderFigures.current = { userId: 0, figures: {} };
    }, [userData.userId]);

    useEffect(() => {
        if (clothingChangeData) {
            if (!isVisible) return;

            loadAvatarData(getFootballGateLook(clothingChangeData.objectId, clothingChangeData.gender), clothingChangeData.gender);

            return;
        }

        if (!isVisible) {
            if (userData.userId && genderFigures.current.userId === userData.userId) {
                genderFigures.current.figures[gender] = getFigureString;
            }

            return;
        }

        // Native reloads the current gender on opening; later acknowledgements leave staged edits intact.
        genderFigures.current.userId = userData.userId;
        genderFigures.current.figures[userData.gender] = userData.figure;
        loadAvatarData(userData.figure, userData.gender);
    }, [isVisible, loadAvatarData, clothingChangeData, userData.userId]);

    useEffect(() => {
        if (!isVisible || savedFigures) return;

        setSavedFigures(new Array(GetConfigurationValue<number>('avatar.wardrobe.max.slots', 10)));
        SendMessageComposer(new GetWardrobeMessageComposer());
    }, [isVisible, savedFigures]);

    return {
        isVisible,
        setIsVisible,
        clothingChangeData,
        setClothingChangeData,
        avatarModels,
        activeModelKey,
        setActiveModelKey: selectModelKey,
        selectedColorParts,
        selectEditorColor,
        selectEditorPart,
        loadAvatarData,
        getFigureString,
        getFigureStringWithFace,
        selectedParts,
        gender,
        setGender,
        figureSetIds,
        randomizeCurrentFigure,
        savedFigures,
        setSavedFigures,
        hotLooks,
        effects,
        selectedEffect,
        selectEditorEffect,
        saveEditorEffect,
        saveEditorFigure,
        nftAvatars,
        selectedNft,
        selectNftAvatar,
        previewDirection,
        setPreviewDirection,
        getFirstSelectableColor
    };
};

export const useAvatarEditor = () => useSharedHook(useAvatarEditorState);

registerSharedHook(useAvatarEditorState);
