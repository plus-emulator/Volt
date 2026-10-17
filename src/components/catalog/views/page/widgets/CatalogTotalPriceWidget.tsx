import { FC } from 'react';
import { Column, ColumnProps } from '../../../../../common';
import { useCatalogData } from '../../../../../hooks';
import { CatalogPriceDisplayWidgetView } from './CatalogPriceDisplayWidgetView';

interface CatalogSimplePriceWidgetViewProps extends ColumnProps {}
export const CatalogTotalPriceWidget: FC<CatalogSimplePriceWidgetViewProps> = (props) => {
    const { gap = 1, ...rest } = props;
    const { currentOffer = null } = useCatalogData();

    // TotalPriceWidget hides itself on Builders Club pages.
    if (currentOffer?.page?.isBuilderPage) return null;

    return (
        <Column gap={gap} {...rest}>
            <CatalogPriceDisplayWidgetView bigIcons offer={currentOffer} separator />
        </Column>
    );
};
