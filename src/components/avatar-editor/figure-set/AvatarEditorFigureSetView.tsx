import { AvatarFigurePartType } from '@volt/renderer';
import { FC } from 'react';
import { CreateLinkEvent, GetConfigurationValue, IAvatarEditorCategory, IAvatarEditorCategoryPartItem } from '../../../api';
import { useAvatarEditor } from '../../../hooks';
import { InfiniteGrid } from '../../../layout';
import { AvatarEditorFigureSetItemView } from './AvatarEditorFigureSetItemView';

export const AvatarEditorFigureSetView: FC<{
    category: IAvatarEditorCategory;
    columnCount: number;
    estimateSize?: number;
}> = (props) => {
    const { category = null, columnCount = 3, estimateSize = 50 } = props;
    const { selectedParts = null, selectEditorPart } = useAvatarEditor();

    const isPartItemSelected = (partItem: IAvatarEditorCategoryPartItem) => {
        if (!category || !category.setType || !selectedParts) return false;

        if (!selectedParts[category.setType]) {
            if (partItem.isClear) return true;

            return false;
        }

        const partId = selectedParts[category.setType];

        return partId === partItem.id;
    };

    return (
        <InfiniteGrid<IAvatarEditorCategoryPartItem>
            classicScrollbar
            columnCount={columnCount}
            columnGap={0}
            rowGap={0}
            estimateSize={estimateSize}
            itemRender={(item: IAvatarEditorCategoryPartItem) => {
                if (!item) return null;

                return (
                    <AvatarEditorFigureSetItemView
                        isSelected={isPartItemSelected(item)}
                        partItem={item}
                        setType={category.setType}
                        onClick={() => {
                            if (item.isGetMore) {
                                // AIR AvatarEditorGridView GET_MORE opens catalog.clothes.page; the stock catalogue's Clothing > New Additions.
                                // The pet tab opens Clothing > Companions instead, where the pet companions are sold.
                                const page =
                                    category.setType === AvatarFigurePartType.PET
                                        ? GetConfigurationValue<string>('avatareditor.pets.catalog.page.name', 'clothing_companions')
                                        : GetConfigurationValue<string>('catalog.clothes.page', 'clothing_new');

                                CreateLinkEvent(`catalog/open/${page}`);

                                return;
                            }

                            selectEditorPart(category.setType, item.partSet?.id ?? -1);
                        }}
                    />
                );
            }}
            items={category.partItems}
            overscan={columnCount}
        />
    );
};
