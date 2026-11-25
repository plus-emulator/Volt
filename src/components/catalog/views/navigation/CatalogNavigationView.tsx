import { FC, useMemo } from 'react';
import { ICatalogNode } from '../../../../api';
import { ClassicScrollAreaView } from '../../../../common';
import { useCatalogActions, useCatalogData } from '../../../../hooks';
import { CatalogNavigationItemView } from './CatalogNavigationItemView';
import { CatalogNavigationRuntime } from './CatalogNavigationRuntime';
import { CatalogNavigationSetView } from './CatalogNavigationSetView';

export interface CatalogNavigationViewProps {
    node: ICatalogNode;
    /** The Builders Club list: orange selection and sub-item colours (builders_club_*_template). */
    isBuilder?: boolean;
    /** Called after a row is activated, so touch layouts can move from the list to the page. */
    onActivate?: (node: ICatalogNode) => void;
}

export const CatalogNavigationView: FC<CatalogNavigationViewProps> = (props) => {
    const { node = null, isBuilder = false, onActivate = null } = props;
    const { searchResult = null } = useCatalogData();
    const { activateNode = null } = useCatalogActions();

    const runtime = useMemo<CatalogNavigationRuntime>(
        () => ({
            activateNode: (target: ICatalogNode) => {
                activateNode(target);
                onActivate?.(target);
            }
        }),
        [activateNode, onActivate]
    );

    return (
        <ClassicScrollAreaView
            aria-label="Catalog categories"
            className="volt-catalog-navigation-scroll-area"
            contentClassName={`volt-catalog-navigation-list ${isBuilder ? 'is-builders-club' : 'is-normal'}`}
            role="tree"
        >
            {/* CatalogNavigator.addSearchNodesToList: the filtered rows, sub-item templates from depth 3. */}
            {searchResult &&
                searchResult.filteredNodes.map(({ node: n, depth }) => (
                    <CatalogNavigationItemView key={n.id} child={depth > 2} node={n} runtime={runtime} searchDepth={depth} />
                ))}
            {!searchResult && <CatalogNavigationSetView node={node} runtime={runtime} />}
        </ClassicScrollAreaView>
    );
};
