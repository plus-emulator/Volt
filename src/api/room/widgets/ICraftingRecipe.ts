import { ICraftingFurni } from './ICraftingFurni';

export interface ICraftingRecipe {
    recipeName: string;
    productCode: string;
    furni: ICraftingFurni;
}
