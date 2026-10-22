import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, useCallback, useEffect } from 'react';
import { CatalogType, GetConfigurationValue, LocalizeShortNumber, LocalizeText } from '../../api';
import { LayoutCurrencyIcon, VoltCardContentView, VoltCardHeaderView, VoltCardTabsItemView, VoltCardTabsView, VoltCardView } from '../../common';
import { NativeCenteredField } from '../../common/native-text/NativeCenteredField';
import { NativeText } from '../../common/native-text/NativeText';
import { CatalogEffectsHost, useCatalogActions, useCatalogData, useCatalogUiState, usePurse } from '../../hooks';
import { useCatalogPageQuery } from '../../hooks/catalog/useCatalogQueries';
import { getCatalogHeaderDescription, getCatalogPlainText } from './catalogLocalization.helpers';
import { parseCatalogTabLabel } from './catalogTabLabel';
import { CatalogLoadingStateView } from './views/CatalogLoadingStateView';
import { CatalogBuilderHeaderView } from './views/catalog-header/CatalogBuilderHeaderView';
import { CatalogIconView } from './views/catalog-icon/CatalogIconView';
import { CatalogGiftView } from './views/gift/CatalogGiftView';
import { CatalogPlacedOfferConfirmView } from './views/CatalogPlacedOfferConfirmView';
import { CatalogBreadcrumbView } from './views/navigation/CatalogBreadcrumbView';
import { CatalogNavigationView } from './views/navigation/CatalogNavigationView';
import { CatalogSearchView } from './views/page/common/CatalogSearchView';
import { GetCatalogLayout } from './views/page/layout/GetCatalogLayout';
import { catalogPageHidesLeftPane } from './views/page/layout/catalogLayoutRegistry';
import { MarketplacePostOfferView } from './views/page/layout/marketplace/MarketplacePostOfferView';

// The Builders Club page icon (LocalizationCatalogWidget: builder pages show icon_193 in the header).
const BUILDER_HEADER_ICON = 193;

/** catalog_ubuntu catalog.header.image: AIR keeps this default while a Builders Club page sets no header image of its own. */
const BUILDER_HEADER_IMAGE = 'catalog_header_roombuilder';

/** AIR HabboCatalog.toggleCatalog: the Builders Club catalogue is only there while builders.club.enabled is on. */
const isBuildersClubEnabled = () => GetConfigurationValue<boolean>('builders.club.enabled', true);

/** catalog.header.description is a 475px window; its TextField wraps like a 479px field (the AIR wrap matches from 478 up). */
const HEADER_DESCRIPTION_FIELD_WIDTH = 479;

const TAB_WIDTH = 110;
const TAB_STRIP_WIDTH = 560;

/** The tab caption (u_regular, black), centred on the tab and drawn for the inactive, hovered and selected skins it can sit on. */
const CatalogTabLabel: FC<{ text: string; width: number }> = ({ text, width }) => (
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
                background={background}
                className={`volt-catalog-tab-label-${state}`}
                text={text}
                textStyle="u_regular"
            />
        ))}
    </NativeCenteredField>
);

const getCatalogTypeFromLink = (type?: string) => {
    switch ((type || '').toLowerCase()) {
        case 'bc':
        case 'builder':
        case 'buildersclub':
        case 'builders_club':
        case 'warehouse':
            return isBuildersClubEnabled() ? CatalogType.BUILDER : CatalogType.NORMAL;
        default:
            return CatalogType.NORMAL;
    }
};

const CatalogViewInner: FC<{}> = () => {
    const { rootNode = null, currentPage = null, searchResult = null, isBusy = false, catalogLoadError = null } = useCatalogData();
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
    const {
        openPageById = null,
        openPageByName = null,
        openPageByOfferId = null,
        showTab = null,
        getNodeById = null,
        openCatalogByType = null,
        toggleCatalogByType = null,
        retryCurrentPage = null
    } = useCatalogActions();
    const { purse = null } = usePurse();
    const displayedCurrencies = GetConfigurationValue<number[]>('system.currency.types', []);
    // The header belongs to the open page: a folder (pageId -1) can be active without opening one.
    const pageId = currentPage?.pageId ?? -1;
    const headerImage =
        currentPage?.localization?.getImage(0) ||
        (isBuilder ? GetConfigurationValue<string>('catalog.asset.image.url', '').replace('%name%', BUILDER_HEADER_IMAGE) : '');
    const activeCatalogNode =
        (pageId > -1 && (activeNodes.findLast((node) => node.pageId === pageId) ?? getNodeById(pageId, rootNode))) || activeNodes.at(-1) || null;
    // Keep technical suffixes and numeric page hints out of the tab captions.
    const stripSwfTabSuffix = (label: string) => (label || '').replace(/\s*\(\D[^)]*\)\s*$/g, '').trim();
    const getSwfTabLabel = (label: string) => stripSwfTabSuffix(parseCatalogTabLabel(label).name);

    const hideCatalogNavigation = useCallback(() => setNavigationHidden(true), [setNavigationHidden]);

    const visibleTabs = rootNode?.children.filter((child) => child.isVisible) ?? [];
    // tab_button is 110px; when more tabs than fit the 560px strip they share it on whole pixels.
    const tabWidth = Math.min(TAB_WIDTH, Math.floor(TAB_STRIP_WIDTH / Math.max(1, visibleTabs.length)));

    // Search draws into the page already open. The result page is synthetic, so the pane follows the page that stayed open.
    const searchKeepsOpenPane = !!searchResult && currentPage?.pageId === -1;
    const paneLayoutCode = searchKeepsOpenPane ? loadedPage?.layoutCode : currentPage?.layoutCode;
    const sidebarHidden = catalogPageHidesLeftPane(paneLayoutCode);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        if (parts.length > 2) {
                            openCatalogByType(getCatalogTypeFromLink(parts[2]));

                            return;
                        }

                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        if (parts.length > 2) {
                            toggleCatalogByType(getCatalogTypeFromLink(parts[2]));

                            return;
                        }

                        setIsVisible((prevValue) => !prevValue);
                        return;
                    // HabboCatalog.linkReceived: catalog/warehouse opens the Builders Club catalogue, at a page when one is named.
                    case 'warehouse':
                        openCatalogByType(getCatalogTypeFromLink('warehouse'));

                        if (parts.length === 4 && parts[2] === 'offerId') {
                            openPageByOfferId(parseInt(parts[3]));

                            return;
                        }

                        if (parts.length > 2 && parts[2]) {
                            const pageId = Number(parts[2]);

                            if (Number.isInteger(pageId) && pageId > 0) openPageById(pageId);
                            else openPageByName(parts[2]);
                        }

                        return;
                    case 'open':
                        // catalog/open names a page of the normal catalogue.
                        if (parts.length > 2) openCatalogByType(CatalogType.NORMAL);

                        if (parts.length > 2) {
                            if (parts.length === 4) {
                                switch (parts[2]) {
                                    case 'offerId':
                                        openPageByOfferId(parseInt(parts[3]));
                                        return;
                                }
                            } else {
                                const pageId = Number(parts[2]);

                                if (Number.isInteger(pageId) && pageId > 0) openPageById(pageId);
                                else openPageByName(parts[2]);
                            }
                        } else {
                            setIsVisible(true);
                        }

                        return;
                }
            },
            eventUrlPrefix: 'catalog/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [setIsVisible, openPageById, openPageByOfferId, openPageByName, openCatalogByType, toggleCatalogByType]);

    return (
        <>
            {isVisible && (
                <VoltCardView
                    classNames={['volt-catalog-window', ...(isBuilder ? ['is-builder'] : [])]}
                    frameStyle={3}
                    isResizable
                    resizeAxis="vertical"
                    uniqueKey="catalog"
                >
                    <VoltCardHeaderView headerText="" onCloseClick={() => setIsVisible(false)}>
                        {/* header_3 caption: u_frame_title in white, centred over the title bar (frame_3 leaves 6px left and 8px right: 556px). */}
                        <NativeCenteredField className="volt-catalog-title" width={556}>
                            <NativeText
                                nativeResolution
                                background={isBuilder ? 0xd79c34 : 0x377998}
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
                                    style={{ width: tabWidth, flexBasis: tabWidth }}
                                    title={child.localization}
                                    onClick={() => {
                                        if (searchResult) setSearchResult(null);

                                        showTab(child);
                                    }}
                                >
                                    <CatalogTabLabel text={getSwfTabLabel(child.localization)} width={tabWidth} />
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
                        <div className={`volt-catalog-stage ${sidebarHidden ? 'is-navigation-hidden' : ''}`}>
                            {!sidebarHidden && (
                                <div className="volt-catalog-sidebar">
                                    <div className="volt-catalog-search-shell">
                                        <CatalogSearchView />
                                    </div>
                                    <div className="volt-catalog-navigation-shell">
                                        {currentTab && <CatalogNavigationView isBuilder={isBuilder} node={currentTab} />}
                                    </div>
                                </div>
                            )}
                            <div aria-busy={isBusy} className="volt-catalog-layout-shell">
                                <div className="volt-catalog-layout-header-shell">
                                    <CatalogBreadcrumbView />
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
            )}
            <CatalogGiftView />
            <CatalogPlacedOfferConfirmView />
            <MarketplacePostOfferView />
        </>
    );
};

export const CatalogView: FC<{}> = () => {
    const { catalogLocalizationVersion = 0 } = useCatalogData();

    return (
        <>
            <CatalogEffectsHost />
            <div className="hidden" data-catalog-localization-version={catalogLocalizationVersion} />
            <CatalogViewInner />
        </>
    );
};
