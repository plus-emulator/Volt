import { FC } from 'react';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { CatalogLayoutInformationView } from './CatalogLayoutInformationView';

/** layout_info_loyalty has the info_duckets structure (html text and illustration), so it shares that view. */
export const CatalogLayoutInfoLoyaltyView: FC<CatalogLayoutProps> = (props) => <CatalogLayoutInformationView {...props} />;
