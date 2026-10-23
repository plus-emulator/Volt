import { describe, expect, it } from 'vitest';
import { FurniCategory } from '../../../../../api';
import { buildPetCustomizationPreview } from './petCustomization.helpers';

const noShampooPalette = () => null;

describe('standard pet customization catalog preview', () => {
    it('builds a complete default-pet figure for saddle custom parts', () => {
        const furniture = {
            specialType: FurniCategory.PET_SADDLE,
            customParams: '15 1,2 3,4 5,6'
        } as any;

        expect(buildPetCustomizationPreview(furniture, noShampooPalette)).toEqual({
            typeId: 15,
            paletteId: 2,
            parts: [
                [1, 3, 5],
                [2, 4, 6]
            ]
        });
    });

    it('builds palette-only previews for shampoo offers', () => {
        const furniture = {
            specialType: FurniCategory.PET_SHAMPOO,
            customParams: '15 hair'
        } as any;

        expect(buildPetCustomizationPreview(furniture, () => 7)).toEqual({ typeId: 15, paletteId: 7, parts: [] });
    });

    it('rejects malformed customization parameters instead of rendering a broken pet', () => {
        expect(buildPetCustomizationPreview({ specialType: FurniCategory.PET_SADDLE, customParams: '15 1,2' } as any, noShampooPalette)).toBeNull();
    });
});
