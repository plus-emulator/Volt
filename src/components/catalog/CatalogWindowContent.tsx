import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CatalogType, GetConfigurationValue, ICatalogNode, LocalizeShortNumber, LocalizeText, useVoltLayout } from '../../api';
import { LayoutCurrencyIcon, VoltCardContentView, VoltCardHeaderView, VoltCardTabsItemView, VoltCardTabsView, VoltCardView } from '../../common';
import { NativeCenteredField } from '../../common/native-text/NativeCenteredField';
import { NativeText } from '../../common/native-text/NativeText';
import { useCatalogActions, useCatalogData, useCatalogUiState, usePurse } from '../../hooks';
import { useCatalogPageQuery } from '../../hooks/catalog/useCatalogQueries';
import { getCatalogHeaderDescription, getCatalogPlainText } from './catalogLocalization.helpers';
import { parseCatalogTabLabel } from './catalogTabLabel';
import { CatalogLoadingStateView } from './views/CatalogLoadingStateView';
import { CatalogBuilderHeaderView } from './views/catalog-header/CatalogBuilderHeaderView';
import { CatalogIconView } from './views/catalog-icon/CatalogIconView';
import { CatalogBreadcrumbView } from './views/navigation/CatalogBreadcrumbView';
import { CatalogNavigationView } from './views/navigation/CatalogNavigationView';
import { CatalogTouchBackBar } from './views/navigation/CatalogTouchBackBar';
import { CatalogSearchView } from './views/page/common/CatalogSearchView';
import { GetCatalogLayout } from './views/page/layout/GetCatalogLayout';
import { catalogPageHidesLeftPane, getCatalogLayoutDefinition } from './views/page/layout/catalogLayoutRegistry';

// The Builders Club page icon (LocalizationCatalogWidget: builder pages show icon_193 in the header).
const BUILDER_HEADER_ICON = 193;

/** catalog_ubuntu catalog.header.image: AIR keeps this default until a page sets a header image of its own. */
const DEFAULT_HEADER_IMAGE = 'catalog_header_roombuilder';

/** AIR HabboCatalog.toggleCatalog: the Builders Club catalogue is only there while builders.club.enabled is on. */
const isBuildersClubEnabled = () => GetConfigurationValue<boolean>('builders.club.enabled', true);

/** catalog.header.description is a 475px window; its TextField wraps like a 479px field (the AIR wrap matches from 478 up). */
const HEADER_DESCRIPTION_FIELD_WIDTH = 479;

/** HabboCatalog DEFAULT_VIEW_LOCATION_LARGE: both catalogues open here and share the spot the player last dragged the window to. */
const catalogWindowPosition = { x: 100, y: 5 };

const TAB_WIDTH = 110;
const TAB_STRIP_WIDTH = 560;

type CatalogTouchStep = 'list' | 'page';

const hasVisibleChildren = (node: ICatalogNode) => node.children.some((child) => child.isVisible);

/** The page a tab opens by itself (CatalogNavigator.getPathToNodeWithLayout). */
const getFirstPageNode = (node: ICatalogNode): ICatalogNode | null => {
    for (const child of node.children) {
        if (!child.isVisible) continue;
        if (child.pageId > -1) return child;

        const found = child.isBranch ? getFirstPageNode(child) : null;

        if (found) return found;
    }

    return null;
};

/** The tab caption (u_regular, black), centred on the tab and drawn for the inactive, hovered and selected skins it can sit on. */
const CatalogTabLabel: FC<{ text: string; width: number; isTouch?: boolean }> = ({ text, width, isTouch = false }) => (
    <NativeCenteredField className="volt-catalog-tab-label" width={width}>
        {(
            [
                ['default', 0xc3c2b8],
                ['hover', 0xf6f5f0],
                ['selected', 0xeceae0]
            ] as const
        ).map(([state, background]) => (
            <NativeText
                key={state}
                ariaHidden={state !== 'default'}
                nativeResolution
                transparent={isTouch}
                background={background}
                className={`volt-catalog-tab-label-${state}`}
                text={text}
                textStyle="u_regular"
            />
        ))}
    </NativeCenteredField>
);

export const CatalogWindowContent: FC<{}> = () => {
    const { rootNode = null, currentPage = null, currentOffer = null, searchResult = null, isBusy = false, catalogLoadError = null } = useCatalogData();
    const {
        isVisible = false,
        setIsVisible = null,
        setNavigationHidden = null,
        currentTab = null,
        activeNodes = [],
        setSearchResult = null,
        pageId: openPageId = -1,
        currentType = null
    } = useCatalogUiState();
    const loadedPage = useCatalogPageQuery(currentType || CatalogType.NORMAL, openPageId, isVisible).data?.page ?? null;
    const isBuilder = currentType === CatalogType.BUILDER;
    const { showTab = null, getNodeById = null, retryCurrentPage = null } = useCatalogActions();
    const { purse = null } = usePurse();
    const layout = useVoltLayout();
    const isTouch = layout !== 'desktop';
    // Phone portrait shows the category list and the page as two steps instead of two panes.
    const usesSteps = layout === 'phone-portrait';
    const [touchStep, setTouchStep] = useState<CatalogTouchStep>('list');
    const displayedCurrencies = GetConfigurationValue<number[]>('system.currency.types', []);
    // The header belongs to the open page: a folder (pageId -1) can be active without opening one.
    const pageId = currentPage?.pageId ?? -1;
    // LocalizationCatalogWidget.initLocalizables only replaces catalog.header.image when a page names an image, so a page
    // without one keeps the previous picture of its catalogue window (the XML default until a page names one).
    const lastHeaderImages = useRef<Record<string, string>>({});
    const headerImageKey = isBuilder ? CatalogType.BUILDER : CatalogType.NORMAL;
    const pageHeaderImage = currentPage?.localization?.getImage(0);

    if (pageHeaderImage) lastHeaderImages.current[headerImageKey] = pageHeaderImage;

    const headerImage =
        lastHeaderImages.current[headerImageKey] || GetConfigurationValue<string>('catalog.asset.image.url', '').replace('%name%', DEFAULT_HEADER_IMAGE);
    const activeCatalogNode =
        (pageId > -1 && (activeNodes.findLast((node) => node.pageId === pageId) ?? getNodeById(pageId, rootNode))) || activeNodes.at(-1) || null;
    // Keep technical suffixes and numeric page hints out of the tab captions.
    const stripSwfTabSuffix = (label: string) => (label || '').replace(/\s*\(\D[^)]*\)\s*$/g, '').trim();
    const getSwfTabLabel = (label: string) => stripSwfTabSuffix(parseCatalogTabLabel(label).name);

    const initialPosition = useRef({ ...catalogWindowPosition });

    useEffect(() => {
        if (!isVisible) initialPosition.current = { ...catalogWindowPosition };
    }, [isVisible]);

    const onPositionChange = useCallback((position: { x: number; y: number }) => {
        catalogWindowPosition.x = position.x;
        catalogWindowPosition.y = position.y;
    }, []);

    const hideCatalogNavigation = useCallback(() => setNavigationHidden(true), [setNavigationHidden]);

    const activeLeaf = activeNodes.at(-1) ?? null;
    const tabFirstPage = useMemo(() => (currentTab ? getFirstPageNode(currentTab) : null), [currentTab]);

    const renderer = getCatalogLayoutDefinition(currentPage?.layoutCode)?.renderer;
    const hasOfferDetail = !!currentOffer && (renderer === 'default' || renderer === 'colorGrouping' || renderer === 'recolorableFurniture');

    // Keep the selected product when rotating. A tab's automatic first page still opens at the category list.
    useEffect(() => {
        if (!usesSteps) return;
        if (!hasOfferDetail && (pageId < 0 || !activeLeaf || hasVisibleChildren(activeLeaf) || activeLeaf === tabFirstPage)) return;

        setTouchStep('page');
    }, [usesSteps, pageId, activeLeaf, tabFirstPage, hasOfferDetail]);

    const onNodeActivated = useCallback((node: ICatalogNode) => {
        if (node.pageId > -1 && !hasVisibleChildren(node)) setTouchStep('page');
    }, []);

    const visibleTabs = rootNode?.children.filter((child) => child.isVisible) ?? [];
    // tab_button is 110px; when more tabs than fit the 560px strip they share it on whole pixels.
    const tabWidth = Math.min(TAB_WIDTH, Math.floor(TAB_STRIP_WIDTH / Math.max(1, visibleTabs.length)));

    // Search draws into the page already open. The result page is synthetic, so the pane follows the page that stayed open.
    const searchKeepsOpenPane = !!searchResult && currentPage?.pageId === -1;
    const paneLayoutCode = searchKeepsOpenPane ? loadedPage?.layoutCode : currentPage?.layoutCode;
    const sidebarHidden = catalogPageHidesLeftPane(paneLayoutCode);
    const tabHasNoChildren = !!currentTab && !hasVisibleChildren(currentTab);

    if (!isVisible) return null;

    return (
        <VoltCardView
                    classNames={['volt-catalog-window', ...(isBuilder ? ['is-builder'] : [])]}
                    frameStyle={3}
                    touchPresentation="full"
                    initialPosition={initialPosition.current}
                    isResizable
                    resizeAxis="vertical"
                    uniqueKey="catalog"
                    onPositionChange={onPositionChange}
                >
                    <VoltCardHeaderView headerText="" onCloseClick={() => setIsVisible(false)}>
                        {/* header_3 caption: u_frame_title in white, centred over the title bar (frame_3 leaves 6px left and 8px right: 556px). */}
                        <NativeCenteredField className="volt-catalog-title" width={556}>
                            <NativeText
                                nativeResolution
                                background={isBuilder ? 0xd79b34 : 0x377998}
                                overrides={{ color: 0xffffff }}
                                text={isBusy ? LocalizeText('generic.loading') || 'Loading...' : LocalizeText(isBuilder ? 'builder.catalog.title' : 'catalog.title')}
                                textStyle="u_frame_title"
                            />
                        </NativeCenteredField>
                    </VoltCardHeaderView>
                    <div className="volt-catalog-mobile-header">
                        <div className="volt-catalog-mobile-currency">
                            <div className="volt-catalog-coin">
                                <span>{LocalizeShortNumber(purse?.credits ?? 0)}</span>
                                <LayoutCurrencyIcon type={-1} />
                            </div>
                            {displayedCurrencies.map((type) => (
                                <div key={type} className="volt-catalog-coin">
                                    <span>{LocalizeShortNumber(purse?.activityPoints?.get(type) ?? 0)}</span>
                                    <LayoutCurrencyIcon type={type} />
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* HabboCatalog.useNonTabbedCatalog: the Builders Club catalogue (catalog_ubuntu) has no tabs. */}
                    {!isBuilder && (
                        <VoltCardTabsView classNames={['volt-catalog-tabs-shell']} justifyContent="start">
                            {visibleTabs.map((child) => (
                                <VoltCardTabsItemView
                                    key={child.id}
                                    isActive={child === currentTab}
                                    style={isTouch ? undefined : { width: tabWidth, flexBasis: tabWidth }}
                                    title={child.localization}
                                    onClick={() => {
                                        if (searchResult) setSearchResult(null);

                                        setTouchStep('list');

                                        showTab(child);
                                    }}
                                >
                                    <CatalogTabLabel isTouch={isTouch} text={getSwfTabLabel(child.localization)} width={tabWidth} />
                                </VoltCardTabsItemView>
                            ))}
                        </VoltCardTabsView>
                    )}
                    <div className={`volt-catalog-standard-header ${isBuilder ? 'is-builder' : ''}`}>
                        <div
                            className="volt-catalog-standard-header-bg"
                            style={headerImage ? { backgroundImage: `url(${headerImage})` } : undefined}
                        />
                        <div className="volt-catalog-standard-header-icon">
                            <CatalogIconView icon={isBuilder ? BUILDER_HEADER_ICON : (activeCatalogNode?.iconId ?? rootNode?.iconId ?? 1)} />
                        </div>
                        <div className="volt-catalog-standard-header-copy">
                            {isBuilder ? (
                                <CatalogBuilderHeaderView />
                            ) : (
                                <>
                                    {/* catalog.header.title (80, 11) u_headline_big and catalog.header.description (80, 34), white over the header picture. */}
                                    <NativeText
                                        nativeResolution
                                        transparent
                                        background={0x0e3f52}
                                        className="volt-catalog-standard-header-title"
                                        overrides={{ color: 0xffffff }}
                                        text={
                                            searchResult
                                                ? LocalizeText('catalog.search.header')
                                                : getSwfTabLabel(activeCatalogNode?.localization ?? LocalizeText('catalog.title'))
                                        }
                                        textStyle="u_headline_big"
                                    />
                                    <NativeText
                                        nativeResolution
                                        transparent
                                        background={0x0e3f52}
                                        className="volt-catalog-standard-header-description"
                                        maxWidth={HEADER_DESCRIPTION_FIELD_WIDTH}
                                        overrides={{ color: 0xffffff }}
                                        text={getCatalogPlainText(
                                            searchResult
                                                ? LocalizeText('catalog.search.results', ['count', 'needle'], [String(searchResult.offers.length), searchResult.searchValue])
                                                : getCatalogHeaderDescription(currentPage?.layoutCode, currentPage?.localization)
                                        )}
                                        textStyle="u_regular"
                                    />
                                </>
                            )}
                        </div>
                    </div>
                    <VoltCardContentView classNames={['volt-catalog-content-shell']}>
                        <div
                            className={`volt-catalog-stage ${sidebarHidden ? 'is-navigation-hidden' : ''}`}
                            data-touch-step={usesSteps ? (sidebarHidden || tabHasNoChildren ? 'page' : touchStep) : undefined}
                        >
                            {!sidebarHidden && (
                                <div className="volt-catalog-sidebar">
                                    <div className="volt-catalog-search-shell">
                                        <CatalogSearchView onSearchSubmit={usesSteps ? () => setTouchStep('page') : undefined} />
                                    </div>
                                    {usesSteps && searchResult && (
                                        <button className="volt-catalog-touch-results" type="button" onClick={() => setTouchStep('page')}>
                                            {LocalizeText('catalog.search.results', ['count', 'needle'], [String(searchResult.offers.length), searchResult.searchValue])}
                                        </button>
                                    )}
                                    <div className="volt-catalog-navigation-shell">
                                        {currentTab && (
                                            <CatalogNavigationView isBuilder={isBuilder} node={currentTab} onActivate={usesSteps ? onNodeActivated : undefined} />
                                        )}
                                    </div>
                                </div>
                            )}
                            <div aria-busy={isBusy} className="volt-catalog-layout-shell">
                                <div className="volt-catalog-layout-header-shell">
                                    {usesSteps && !sidebarHidden ? (
                                        <CatalogTouchBackBar
                                            backLabel={getSwfTabLabel((activeNodes.at(-2) ?? currentTab)?.localization ?? LocalizeText('catalog.title'))}
                                            title={
                                                searchResult
                                                    ? LocalizeText('catalog.search.header')
                                                    : getSwfTabLabel(activeCatalogNode?.localization ?? LocalizeText('catalog.title'))
                                            }
                                            onBack={() => setTouchStep('list')}
                                        />
                                    ) : (
                                        <CatalogBreadcrumbView />
                                    )}
                                    <div className="volt-catalog-layout-hero">
                                        {!!currentPage?.localization?.getImage(0) && <img alt="" src={currentPage.localization.getImage(0)} />}
                                    </div>
                                </div>
                                <div className="volt-catalog-layout-container">{GetCatalogLayout(currentPage, hideCatalogNavigation)}</div>
                            </div>
                        </div>
                    </VoltCardContentView>
                    {(isBusy || catalogLoadError) && <CatalogLoadingStateView error={catalogLoadError} onRetry={retryCurrentPage} />}
                </VoltCardView>
    );
};
