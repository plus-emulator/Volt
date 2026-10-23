import { FC } from 'react';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { CatalogPetsInfoLayoutView, PETS2_LAYOUT } from './CatalogLayoutPets3View';

export const CatalogLayoutPets2View: FC<CatalogLayoutProps> = (props) => <CatalogPetsInfoLayoutView {...props} layout={PETS2_LAYOUT} />;
