import { CSSProperties, FC, KeyboardEvent, useCallback, useEffect, useRef } from 'react';
import { CatalogType, ICatalogNode, IsTouchLayout, useVoltLayout } from '../../../../api';
import { NativeText } from '../../../../common/native-text/NativeText';
import { useCatalogNodeState, useCatalogUiState } from '../../../../hooks';
import { CatalogIconView } from '../catalog-icon/CatalogIconView';
import { CatalogNavigationRuntime } from './CatalogNavigationRuntime';
import { CatalogNavigationSetView } from './CatalogNavigationSetView';

/** border style 6 at blend 0.5 over the frame: the list's surface colour. */
const NAVIGATION_BACKGROUND = 0xd1d0ca;

const HINT_CHILD_COUNT = 4;

/** Phone rows show the names of the visible sub pages as a one line hint. */
const getNodeHint = (node: ICatalogNode) =>
    node.children
        .filter((child) => child.isVisible)
        .slice(0, HINT_CHILD_COUNT)
        .map((child) => child.localization)
        .join(', ');

export interface CatalogNavigationItemViewProps {
    node: ICatalogNode;
    runtime: CatalogNavigationRuntime;
    child?: boolean;
    /** Set while searching: the row is drawn at this depth and lists no children. */
    searchDepth?: number;
}

export const CatalogNavigationItemView: FC<CatalogNavigationItemViewProps> = (props) => {
    const { node = null, runtime, child = false, searchDepth = null } = props;
    const { activateNode } = runtime;
    const { isActive, isOpen } = useCatalogNodeState(node);
    const { currentType = null } = useCatalogUiState();
    const isBuilder = currentType === CatalogType.BUILDER;
    const layout = useVoltLayout();
    const isTouch = IsTouchLayout(layout);
    const hint = layout === 'phone-portrait' && searchDepth === null ? getNodeHint(node) : '';
    const itemRef = useRef<HTMLDivElement>(null);
    // Strip only technical technical suffixes; labels such as
    // "Flags (Wall)" or "Forest (Blue)" are meaningful catalog names.
    const swfLabel = (node?.localization || '').replace(/\s*\((?:BC|Hot)\)\s*$/i, '').trim();

    useEffect(() => {
        if (!isActive || !itemRef.current?.scrollIntoView) return;

        itemRef.current.scrollIntoView({ block: 'nearest' });
    }, [isActive]);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;

            event.preventDefault();
            activateNode(node);
        },
        [activateNode, node]
    );

    // CatalogNodeRenderable.createWindow: below depth 3 the icon and title move 6px right per level.
    const depthIndent = Math.max(0, (searchDepth ?? node.depth) - 3) * 6;

    return (
        <div
            className={`volt-catalog-navigation-node ${child ? 'is-child' : ''}`}
            style={depthIndent ? ({ '--volt-catalog-navigation-indent': `${depthIndent}px` } as CSSProperties) : undefined}
        >
            <div
                ref={itemRef}
                className={`volt-catalog-navigation-item ${isActive ? 'is-active' : ''} ${node.isBranch ? 'is-branch' : 'is-leaf'} ${isOpen ? 'is-open' : ''}`}
                role="treeitem"
                tabIndex={0}
                aria-expanded={node.isBranch ? isOpen : undefined}
                aria-level={(node.depth ?? 0) + 1}
                aria-selected={isActive}
                onClick={() => activateNode(node)}
                onKeyDown={handleKeyDown}
            >
                <div className="volt-catalog-navigation-icon">
                    <CatalogIconView icon={node.iconId} />
                </div>
                <span className="volt-catalog-navigation-label">
                    {layout === 'phone-landscape' ? swfLabel : (
                        <>
                            {/* ITEM_TITLE u_bold (u_bold italic below the top level) on the list, then white with the etching over SELECTION_HILIGHT. */}
                            <NativeText
                                nativeResolution
                                transparent={isTouch}
                                background={NAVIGATION_BACKGROUND}
                                className="volt-catalog-navigation-label-normal"
                                overrides={{ color: child ? (isBuilder ? 0xb77734 : 0x52819a) : 0x666666 }}
                                text={swfLabel}
                                textStyle={child ? 'u_bold_italic' : 'u_bold'}
                            />
                            <NativeText
                                ariaHidden
                                nativeResolution
                                transparent
                                background={isBuilder ? 0xff8d00 : 0x63c5e9}
                                className="volt-catalog-navigation-label-selected"
                                overrides={{ color: 0xffffff, etchingColor: isBuilder ? 0xcf7200 : 0xb4b4ae, etchingPosition: 'top' }}
                                text={swfLabel}
                                textStyle={child ? 'u_bold_italic' : 'u_bold'}
                            />
                        </>
                    )}
                </span>
                {!!hint && <span className="volt-catalog-navigation-hint">{hint}</span>}
                {node.isBranch && <span aria-hidden="true" className="volt-catalog-navigation-caret" />}
            </div>
            {searchDepth === null && isOpen && node.isBranch && <CatalogNavigationSetView child={true} node={node} runtime={runtime} />}
        </div>
    );
};
