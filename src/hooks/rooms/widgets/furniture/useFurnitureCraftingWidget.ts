import {
    CraftableProductsEvent,
    CraftComposer,
    CraftingRecipeEvent,
    CraftingRecipesAvailableEvent,
    CraftingResultEvent,
    CraftSecretComposer,
    FurnitureListComposer,
    FurnitureListEvent,
    FurnitureListInvalidateEvent,
    GetCraftableProductsComposer,
    GetCraftingRecipeComposer,
    GetCraftingRecipesAvailableComposer,
    GetRoomEngine,
    GetSessionDataManager,
    IProductData,
    RoomEngineTriggerWidgetEvent,
    RoomObjectCategory,
    RoomSessionEvent,
    RoomWidgetEnum
} from '@volt/renderer';
import { useEffect, useRef, useState } from 'react';
import {
    GroupItem,
    ICraftingFurni,
    ICraftingIngredient,
    ICraftingMixerItem,
    ICraftingRecipe,
    IsOwnerOfFurniture,
    LocalizeText,
    SendMessageComposer
} from '../../../../api';
import { useMessageEvent, useVoltEvent } from '../../../events';
import { useInventoryFurni } from '../../../inventory';

const MIXER_MAX_ITEMS = 10;
const PROGRESS_INTERVAL = 70;
const PROGRESS_STEP = 0.02;

export enum CraftingMode {
    NONE = 0,
    SECRET = 1,
    RECIPE = 2
}

export interface ICraftingButtonState {
    visible: boolean;
    enabled: boolean;
    caption: string;
}

interface ICraftingMixerEntry extends ICraftingMixerItem {
    /** The id pool this slot's id goes back to when the mixer is cleared. */
    pool: number[];
}

interface ICraftingModel {
    objectId: number;
    loading: boolean;
    waitingForInventory: boolean;
    visible: boolean;
    mode: CraftingMode;
    header: string;
    infoText1: string;
    infoText2: string;
    icon: ICraftingFurni;
    button: ICraftingButtonState;
    recipes: ICraftingRecipe[];
    ingredients: ICraftingIngredient[];
    mixer: ICraftingMixerEntry[];
    selectedRecipe: ICraftingRecipe;
    recipeName: string;
    recipeProduct: IProductData;
    crafting: boolean;
    progress: number;
    inventoryDirty: boolean;
    awaitingInvalidate: boolean;
}

const createModel = (): ICraftingModel => ({
    objectId: -1,
    loading: false,
    waitingForInventory: false,
    visible: false,
    mode: CraftingMode.NONE,
    header: '',
    infoText1: '',
    infoText2: '',
    icon: null,
    button: { visible: false, enabled: false, caption: '' },
    recipes: [],
    ingredients: [],
    mixer: [],
    selectedRecipe: null,
    recipeName: null,
    recipeProduct: null,
    crafting: false,
    progress: -1,
    inventoryDirty: false,
    awaitingInvalidate: false
});

const findFurni = (className: string): ICraftingFurni => {
    const sessionData = GetSessionDataManager();
    let data = sessionData.getFloorItemDataByName(className);
    let isWallItem = false;

    if (!data) {
        data = sessionData.getWallItemDataByName(className);
        isWallItem = true;

        if (!data) return null;
    }

    const roomEngine = GetRoomEngine();

    return {
        className,
        typeId: data.id,
        isWallItem,
        name: data.name,
        iconUrl: isWallItem ? roomEngine.getFurnitureWallIconUrl(data.id) : roomEngine.getFurnitureFloorIconUrl(data.id)
    };
};

/** HabboInventory.getNonRentedInventoryIds: the non-rented ids of the first group with this furni type. */
const getNonRentedIds = (groupItems: GroupItem[], furni: ICraftingFurni): number[] => {
    const group = groupItems.find((item) => item.type === furni.typeId && item.isWallItem === furni.isWallItem);

    if (!group) return [];

    return group.items.filter((item) => !item.rentable).map((item) => item.id);
};

interface ICraftableProducts {
    active: boolean;
    recipes: { recipeName: string; productCode: string; itemName: string }[];
    ingredients: string[];
}

const useFurnitureCraftingWidgetState = () => {
    const model = useRef<ICraftingModel>(createModel());
    const [version, setVersion] = useState(0);
    const progressTimer = useRef<ReturnType<typeof setInterval>>(null);
    const { groupItems = [], isInitialized = false, requestInitialization = null } = useInventoryFurni();
    const groupItemsRef = useRef(groupItems);
    const [pendingProducts, setPendingProducts] = useState<ICraftableProducts>(null);
    const listGroupItemsRef = useRef<GroupItem[]>(null);

    groupItemsRef.current = groupItems;

    const commit = () => setVersion((value) => value + 1);

    const isOwner = () => {
        const roomEngine = GetRoomEngine();

        return IsOwnerOfFurniture(roomEngine.getRoomObject(roomEngine.activeRoomId, model.current.objectId, RoomObjectCategory.FLOOR));
    };

    const enableButton = () => {
        const owner = isOwner();

        model.current.button = { visible: true, enabled: owner, caption: owner ? 'crafting.btn.craft' : 'crafting.btn.notowner' };
    };

    const disableButtonWith = (caption: string) => {
        model.current.button = { visible: true, enabled: false, caption: isOwner() ? caption : 'crafting.btn.notowner' };
    };

    const setButtonVisible = (visible: boolean) => {
        model.current.button = { ...model.current.button, visible };
    };

    const setInfoState = (state: number, furni: ICraftingFurni = null, count = 0) => {
        const current = model.current;
        let text1 = '';
        let text2 = '';

        switch (state) {
            case 0:
                text1 = LocalizeText('crafting.info.start');
                setButtonVisible(false);
                break;
            case 1:
                current.icon = null;
                text1 = LocalizeText('crafting.info.mixer.empty');
                disableButtonWith('crafting.status.mixer.notavailable');
                break;
            case 2:
                current.icon = null;
                text1 = LocalizeText('crafting.info.mixer.nohit');
                disableButtonWith('crafting.status.mixer.notavailable');
                break;
            case 3:
                current.icon = null;
                text1 = LocalizeText('crafting.info.mixer.hit');
                enableButton();
                break;
            case 4:
                current.icon = null;
                text1 = LocalizeText('crafting.info.mixer.hit.plus.others').replace('%number%', String(count));
                enableButton();
                break;
            case 5:
                current.icon = null;
                text1 = LocalizeText('crafting.info.mixer.others').replace('%number%', String(count));
                disableButtonWith('crafting.status.mixer.notavailable');
                break;
            case 6:
                current.icon = null;
                text1 = LocalizeText('crafting.info.product.empty');
                setButtonVisible(false);
                break;
            case 7:
                if (!furni) return;
                current.icon = furni;
                text1 = LocalizeText('crafting.info.product.incomplete');
                text2 = furni.name;
                disableButtonWith('crafting.status.recipe.incomplete');
                break;
            case 8:
                if (!furni) return;
                current.icon = furni;
                text1 = LocalizeText('crafting.info.product.complete');
                text2 = furni.name;
                enableButton();
                break;
            case 9:
                if (!furni) return;
                current.icon = furni;
                text1 = LocalizeText('crafting.info.mixer.notininventory').replace('%product%', furni.name);
                break;
            case 999:
                if (!furni) return;
                current.icon = furni;
                text1 = LocalizeText('crafting.info.result.ok');
                text2 = furni.name;
                setButtonVisible(false);
                break;
            case 1000:
                text1 = LocalizeText('crafting.info.working');
                setButtonVisible(false);
                break;
        }

        current.infoText1 = text1;
        current.infoText2 = text2;
    };

    const stopProgress = () => {
        if (progressTimer.current) clearInterval(progressTimer.current);

        progressTimer.current = null;
        model.current.progress = -1;
    };

    const removeInventoryUpdateEvent = () => {
        model.current.awaitingInvalidate = false;
    };

    const registerForFurniListInvalidate = () => {
        model.current.inventoryDirty = true;
        model.current.awaitingInvalidate = true;
    };

    const clearMixer = () => {
        for (const entry of model.current.mixer) {
            if (entry.itemId !== 0) entry.pool.push(entry.itemId);
        }

        model.current.mixer = [];
    };

    const cancelCrafting = () => {
        model.current.crafting = false;
        stopProgress();
        setButtonVisible(true);
    };

    const mixerContentChanged = () => {
        const ids = model.current.mixer.map((entry) => entry.itemId);

        if (ids.length > 0) {
            setInfoState(1000);
            SendMessageComposer(new GetCraftingRecipesAvailableComposer(model.current.objectId, ids));
        } else {
            setInfoState(1);
        }
    };

    const showSecretRecipeView = () => {
        if (model.current.mode !== CraftingMode.SECRET) clearMixer();

        model.current.mode = CraftingMode.SECRET;
        model.current.header = '';
        setInfoState(1);
    };

    const showCraftableProductView = () => {
        if (model.current.mode !== CraftingMode.RECIPE) clearMixer();

        model.current.mode = CraftingMode.RECIPE;
        setInfoState(6);
    };

    const hide = () => {
        const current = model.current;

        removeInventoryUpdateEvent();
        clearMixer();
        current.ingredients = [];
        current.recipes = [];

        if (current.crafting) cancelCrafting();

        current.mode = CraftingMode.NONE;
        current.visible = false;
    };

    const doCrafting = () => {
        const current = model.current;

        if (current.mode === CraftingMode.SECRET) {
            setInfoState(1000);
            registerForFurniListInvalidate();
            SendMessageComposer(
                new CraftSecretComposer(
                    current.objectId,
                    current.mixer.map((entry) => entry.itemId)
                )
            );

            return;
        }

        if (current.mode === CraftingMode.RECIPE) {
            if (!current.recipeProduct || !current.recipeName) return;

            setInfoState(1000);
            registerForFurniListInvalidate();
            SendMessageComposer(new CraftComposer(current.objectId, current.recipeName));
        }
    };

    const startCrafting = () => {
        const current = model.current;

        if (!current.visible || current.crafting || !current.button.visible || !current.button.enabled) return;

        current.crafting = true;
        setButtonVisible(false);
        current.progress = 0;

        if (progressTimer.current) clearInterval(progressTimer.current);

        progressTimer.current = setInterval(() => {
            current.progress += PROGRESS_STEP;

            if (current.progress >= 1) {
                stopProgress();
                doCrafting();
            }

            commit();
        }, PROGRESS_INTERVAL);

        commit();
    };

    const cancelProgress = () => {
        if (model.current.progress < 0) return;

        cancelCrafting();
        commit();
    };

    const selectRecipe = (recipe: ICraftingRecipe) => {
        const current = model.current;

        if (current.crafting || !recipe) return;

        current.selectedRecipe = recipe;
        current.header = recipe.furni.name;
        current.recipeProduct = GetSessionDataManager().getProductData(recipe.productCode) ?? null;
        current.recipeName = recipe.recipeName;
        SendMessageComposer(new GetCraftingRecipeComposer(recipe.recipeName));
        commit();
    };

    const selectIngredient = (ingredient: ICraftingIngredient) => {
        const current = model.current;

        if (current.crafting || current.inventoryDirty) return;
        if (current.mixer.length >= MIXER_MAX_ITEMS) return;

        const itemId = ingredient.itemIds.shift() ?? 0;

        if (itemId === 0) return;

        showSecretRecipeView();
        current.mixer = [...current.mixer, { furni: ingredient.furni, itemId, pool: ingredient.itemIds }];

        if (current.mode === CraftingMode.SECRET) mixerContentChanged();

        commit();
    };

    const selectMixerItem = (index: number) => {
        const current = model.current;
        const entry = current.mixer[index];

        if (!entry || current.crafting || current.inventoryDirty) return;

        if (entry.itemId === 0) {
            setInfoState(9, entry.furni);
            commit();

            return;
        }

        if (current.mode !== CraftingMode.SECRET) return;

        current.mixer = current.mixer.filter((_, position) => position !== index);
        entry.pool.push(entry.itemId);
        mixerContentChanged();
        commit();
    };

    const close = () => {
        if (!model.current.visible) return;

        hide();
        commit();
    };

    const requestProducts = () => SendMessageComposer(new GetCraftableProductsComposer(model.current.objectId));

    useVoltEvent<RoomEngineTriggerWidgetEvent>([RoomEngineTriggerWidgetEvent.OPEN_WIDGET, RoomEngineTriggerWidgetEvent.CLOSE_WIDGET], (event) => {
        if (event.widget !== RoomWidgetEnum.CRAFTING) return;

        const current = model.current;

        if (event.type === RoomEngineTriggerWidgetEvent.CLOSE_WIDGET) {
            current.objectId = -1;
            current.waitingForInventory = false;
            hide();
            commit();

            return;
        }

        if (current.visible) return;
        if (!GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category)) return;

        current.objectId = event.objectId;

        if (current.loading) return;

        current.loading = true;

        if (isInitialized) {
            requestProducts();
        } else {
            current.waitingForInventory = true;
            requestInitialization();
        }
    });

    useVoltEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, () => {
        stopProgress();
        model.current = createModel();
        setPendingProducts(null);
        commit();
    });

    useEffect(() => {
        if (!isInitialized || !model.current.waitingForInventory) return;

        model.current.waitingForInventory = false;
        requestProducts();
    }, [isInitialized]);

    useMessageEvent<FurnitureListEvent>(FurnitureListEvent, () => {
        listGroupItemsRef.current = groupItemsRef.current;
    });

    // The event's parser is cleared after this handler, so keep a copy for the effect below.
    useMessageEvent<CraftableProductsEvent>(CraftableProductsEvent, (event) => {
        const parser = event.getParser();

        model.current.loading = false;
        setPendingProducts({
            active: parser.isActive(),
            recipes: parser.recipes.map(({ recipeName, productCode, itemName }) => ({ recipeName, productCode, itemName })),
            ingredients: [...parser.ingredients]
        });
    });

    // The inventory store updates after this hook gets a furni list, so the products wait until that list is in groupItems.
    useEffect(() => {
        if (!pendingProducts) return;
        if (listGroupItemsRef.current && listGroupItemsRef.current === groupItems) return;

        listGroupItemsRef.current = null;
        setPendingProducts(null);

        const parser = pendingProducts;
        const current = model.current;

        if (!parser.active) {
            hide();
            commit();

            return;
        }

        if (!current.visible) {
            current.visible = true;
            current.header = '';
            current.icon = null;
            setInfoState(0);
        }

        const ingredients: ICraftingIngredient[] = [];

        for (const className of parser.ingredients) {
            const furni = findFurni(className);

            if (!furni) continue;

            ingredients.push({ furni, itemIds: getNonRentedIds(groupItems, furni) });
        }

        const recipes: ICraftingRecipe[] = [];

        for (const recipe of parser.recipes) {
            const furni = findFurni(recipe.itemName);

            if (!furni) continue;

            recipes.push({ recipeName: recipe.recipeName, productCode: recipe.productCode, furni });
        }

        current.ingredients = ingredients;
        current.recipes = recipes;
        current.inventoryDirty = false;
        commit();
    }, [pendingProducts, groupItems]);

    useMessageEvent<CraftingRecipeEvent>(CraftingRecipeEvent, (event) => {
        const current = model.current;
        const selected = current.selectedRecipe;

        if (!current.visible || !selected) return;

        showCraftableProductView();
        clearMixer();

        let complete = true;
        const missing: string[] = [];
        const mixer: ICraftingMixerEntry[] = [];

        for (const ingredient of event.getParser().ingredients) {
            const furni = findFurni(ingredient.itemName);

            if (!furni) {
                current.mixer = mixer;
                commit();

                return;
            }

            const ids = getNonRentedIds(groupItemsRef.current, furni);

            if (ids.length < ingredient.count) complete = false;

            for (let index = 0; index < ingredient.count; index++) {
                const itemId = ids.shift() ?? 0;

                if (itemId === 0 && !missing.includes(furni.name)) missing.push(furni.name);

                mixer.push({ furni, itemId, pool: [] });
            }
        }

        current.mixer = mixer;
        setInfoState(complete ? 8 : 7, selected.furni);
        commit();
    });

    useMessageEvent<CraftingRecipesAvailableEvent>(CraftingRecipesAvailableEvent, (event) => {
        if (!model.current.visible) return;

        const { count, hasRecipes } = event.getParser();

        if (hasRecipes) setInfoState(count === 0 ? 3 : 4, null, count);
        else if (count > 0) setInfoState(5, null, count);
        else setInfoState(2);

        commit();
    });

    useMessageEvent<CraftingResultEvent>(CraftingResultEvent, (event) => {
        const current = model.current;
        const parser = event.getParser();

        current.crafting = false;
        clearMixer();

        if (!parser.success) {
            current.inventoryDirty = false;
            removeInventoryUpdateEvent();
            setInfoState(1);
            commit();

            return;
        }

        const furni = parser.result ? findFurni(parser.result.itemName) : null;

        if (furni && !furni.isWallItem) setInfoState(999, furni);

        commit();
    });

    useMessageEvent<FurnitureListInvalidateEvent>(FurnitureListInvalidateEvent, () => {
        if (!model.current.awaitingInvalidate) return;

        SendMessageComposer(new FurnitureListComposer());
        requestProducts();
        removeInventoryUpdateEvent();
    });

    useEffect(() => () => stopProgress(), []);

    const current = model.current;

    return {
        version,
        isOpen: current.visible,
        mode: current.mode,
        header: current.header,
        infoText1: current.infoText1,
        infoText2: current.infoText2,
        icon: current.icon,
        button: current.button,
        progress: current.progress,
        recipes: current.recipes,
        ingredients: current.ingredients,
        mixer: current.mixer as ICraftingMixerItem[],
        close,
        selectRecipe,
        selectIngredient,
        selectMixerItem,
        startCrafting,
        cancelProgress
    };
};

export const useFurnitureCraftingWidget = useFurnitureCraftingWidgetState;
