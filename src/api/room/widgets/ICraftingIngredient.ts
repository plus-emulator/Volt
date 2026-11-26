import { ICraftingFurni } from './ICraftingFurni';

export interface ICraftingIngredient {
    furni: ICraftingFurni;
    /** Non-rented inventory item ids of this furni that are not in the mixer. */
    itemIds: number[];
}

/** A mixer slot; itemId 0 is an ingredient the user does not have. */
export interface ICraftingMixerItem {
    furni: ICraftingFurni;
    itemId: number;
}
