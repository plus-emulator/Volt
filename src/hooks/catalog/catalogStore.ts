import { CreateLinkEvent, FrontPageItem, GetRoomEngine, RoomObjectPlacementSource, RoomObjectType, RoomObjectVariable, RoomPreviewer } from '@volt/renderer';
import {
    BuilderFurniPlaceableStatus,
    CatalogType,
    CreateRecolorableStuffData,
    GetConfigurationValue,
    GetRoomSession,
    ICatalogNode,
    ICatalogPage,
    IPurchasableOffer,
    IPurchaseOptions,
    IsRecolorableFurniturePage,
    Offer,
    PlacedObjectPurchaseData,
    ProductTypeEnum,
    SearchResult
} from '../../api';
import { getBuildersClubSecondsLeft, useBuildersClubStore } from '../../state/buildersClubStore';
import { createVoltStore } from '../../state/createVoltStore';
import {
    findNodeById,
    findNodeByName,
    getCatalogNodePath,
    getNodesByOfferIdFromMap,
    normalizeCatalogType,
    replaceCatalogPageOffers,
    RoomControllerLevel,
    RoomObjectCategory
} from './useCatalog.helpers';
import { invalidateCatalogIndex, invalidateCatalogPage, readCatalogIndex, refetchCatalogPage } from './useCatalogQueries';

const DRAG_AND_DROP_ENABLED = true;

export type CatalogPendingRequest = { kind: 'id'; id: number } | { kind: 'name'; name: string } | { kind: 'offer'; offerId: number };

const DEFAULT_PURCHASE_OPTIONS: IPurchaseOptions = { quantity: 1, extraData: null, extraParamRequired: false, previewStuffData: null };

export interface CatalogUiState {
    isVisible: boolean;
    currentType: string;
    pageId: number;
    previousPageId: number;
    /** Top-level node whose tree the navigation list shows. */
    currentTab: ICatalogNode | null;
    /** Path from the current tab down to the single active node. */
    activeNodes: ICatalogNode[];
    /** Expanded branches: the ancestors of the active node, plus the node itself when it is an open branch. */
    openNodes: ICatalogNode[];
    pendingRequest: CatalogPendingRequest | null;
    pendingOfferId: number;
    pageOverride: ICatalogPage | null;
    currentOffer: IPurchasableOffer | null;
    searchResult: SearchResult | null;
    frontPageItems: FrontPageItem[];
    navigationHidden: boolean;
    purchaseOptions: IPurchaseOptions;
    giftReceiver: string | null;
    catalogPlaceMultipleObjects: boolean;
    catalogLocalizationVersion: number;
    roomPreviewer: RoomPreviewer | null;
    objectMoverRequested: boolean;
    purchasableOffer: IPurchasableOffer | null;
    /** AIR HabboCatalog var_5235: a Builders Club offer goes back to the mover after each placement ("Place multiple"). */
    builderPlaceMultiple: boolean;
    placedObjectPurchaseData: PlacedObjectPurchaseData | null;
    placedObjectPurchaseSent: boolean;
    placedObjectPurchaseBought: boolean;
}

export interface CatalogActions {
    setIsVisible: (visible: boolean | ((previous: boolean) => boolean)) => void;
    openCatalogByType: (type?: string) => void;
    toggleCatalogByType: (type?: string) => void;
    activateNode: (node: ICatalogNode, offerId?: number) => void;
    showTab: (tab: ICatalogNode) => void;
    openNavigatorAtNode: (node: ICatalogNode, offerId?: number) => void;
    openPageById: (id: number) => void;
    openPageByName: (name: string) => void;
    openPageByOfferId: (offerId: number) => void;
    resolvePendingRequest: () => void;
    getNodeById: (id: number, node: ICatalogNode) => ICatalogNode | null;
    getNodeByName: (name: string, node: ICatalogNode) => ICatalogNode | null;
    getNodesByOfferId: (offerId: number, onlyVisible?: boolean) => ICatalogNode[] | null;
    setCurrentPage: (page: ICatalogPage | null) => void;
    setCurrentOffer: (offer: IPurchasableOffer | null) => void;
    selectCatalogOffer: (offer: IPurchasableOffer) => void;
    consumePendingOffer: (page: ICatalogPage) => void;
    setSearchResult: (result: SearchResult | null) => void;
    setFrontPageItems: (items: FrontPageItem[]) => void;
    setNavigationHidden: (hidden: boolean) => void;
    setPurchaseOptions: (options: IPurchaseOptions | ((previous: IPurchaseOptions) => IPurchaseOptions)) => void;
    setGiftReceiver: (receiver: string | null) => void;
    setCatalogPlaceMultipleObjects: (flag: boolean) => void;
    bumpLocalizationVersion: () => void;
    setRoomPreviewer: (previewer: RoomPreviewer | null) => void;
    getBuilderFurniPlaceableStatus: (offer: IPurchasableOffer | null) => number;
    isDraggable: (offer: IPurchasableOffer) => boolean;
    requestOfferToMover: (offer: IPurchasableOffer, placeMultiple?: boolean) => void;
    cancelObjectMover: () => void;
    resetObjectMover: (flag?: boolean) => void;
    setPlacedObjectPurchaseData: (data: PlacedObjectPurchaseData | null) => void;
    setPlacedObjectPurchaseSent: (sent: boolean) => void;
    setPlacedObjectPurchaseBought: (bought: boolean) => void;
    resetPlacedOfferData: (flag?: boolean) => void;
    resetRoomPaint: (planeType: string, type: string) => void;
    refreshIndex: () => void;
    refreshCurrentPage: () => void;
    retryCurrentPage: () => void;
    resetVisibleCatalogState: (type?: string) => void;
}

export type CatalogStoreState = CatalogUiState & CatalogActions;

export const INITIAL_CATALOG_UI_STATE: CatalogUiState = {
    isVisible: false,
    currentType: CatalogType.NORMAL,
    pageId: -1,
    previousPageId: -1,
    currentTab: null,
    activeNodes: [],
    openNodes: [],
    pendingRequest: null,
    pendingOfferId: -1,
    pageOverride: null,
    currentOffer: null,
    searchResult: null,
    frontPageItems: [],
    navigationHidden: false,
    purchaseOptions: DEFAULT_PURCHASE_OPTIONS,
    giftReceiver: null,
    catalogPlaceMultipleObjects: false,
    catalogLocalizationVersion: 0,
    roomPreviewer: null,
    objectMoverRequested: false,
    purchasableOffer: null,
    builderPlaceMultiple: false,
    placedObjectPurchaseData: null,
    placedObjectPurchaseSent: false,
    placedObjectPurchaseBought: false
};

const openedPage = (pageId: number, offerId: number) => ({
    pageId,
    previousPageId: pageId,
    pendingOfferId: offerId,
    pageOverride: null,
    currentOffer: null
});

/** AIR CatalogNavigator.getPathToNodeWithLayout: the first visible descendant that is a page, through folders. */
const getPathToNodeWithLayout = (node: ICatalogNode): ICatalogNode[] => {
    for (const child of node.children) {
        if (!child.isVisible) continue;

        if (child.pageId > -1) return [child];

        if (child.isBranch) {
            const path = getPathToNodeWithLayout(child);

            if (path.length) return [child, ...path];
        }
    }

    return [];
};

export const useCatalogStore = createVoltStore<CatalogStoreState>((set, get) => ({
    ...INITIAL_CATALOG_UI_STATE,

    setIsVisible: (visible) => set((state) => ({ isVisible: typeof visible === 'function' ? visible(state.isVisible) : visible })),

    resetVisibleCatalogState: (type) =>
        set({
            pageId: -1,
            previousPageId: -1,
            currentTab: null,
            activeNodes: [],
            openNodes: [],
            pendingRequest: null,
            pendingOfferId: -1,
            pageOverride: null,
            currentOffer: null,
            searchResult: null,
            frontPageItems: [],
            navigationHidden: false,
            currentType: normalizeCatalogType(type)
        }),

    openCatalogByType: (type) => {
        const catalogType = normalizeCatalogType(type);

        if (get().currentType !== catalogType) get().resetVisibleCatalogState(catalogType);

        set({ isVisible: true });
    },

    toggleCatalogByType: (type) => {
        const catalogType = normalizeCatalogType(type);
        const { isVisible, currentType } = get();

        if (isVisible && currentType === catalogType) {
            set({ isVisible: false });

            return;
        }

        if (currentType !== catalogType) get().resetVisibleCatalogState(catalogType);

        set({ isVisible: true });
    },

    // Mirrors AIR CatalogNavigator.activateNode. Nodes are identified by
    // reference: folder headings all carry pageId -1, and captions repeat
    // across tabs. Exactly one node is active; only its ancestors stay open,
    // and a folder toggles without opening a page.
    activateNode: (targetNode, offerId = -1) => {
        if (!targetNode?.parent) return;

        if (!targetNode.parent.parent) {
            get().showTab(targetNode);

            return;
        }

        get().cancelObjectMover();

        const { activeNodes, openNodes } = get();
        const path = getCatalogNodePath(targetNode);
        const nextOpen = path.slice(1, -1);
        const closing = activeNodes.includes(targetNode) && openNodes.includes(targetNode);

        if (targetNode.isBranch && !closing) nextOpen.push(targetNode);

        set({ currentTab: path[0], activeNodes: path, openNodes: nextOpen, navigationHidden: false });

        if (targetNode.pageId > -1) set(openedPage(targetNode.pageId, offerId));
    },

    // Mirrors AIR CatalogNavigator.showNodeContent for a top tab: the list
    // shows only that tab's tree, and the first page under it opens.
    showTab: (tab) => {
        if (!tab?.isVisible) return;

        get().cancelObjectMover();

        set({ currentTab: tab, activeNodes: [tab], openNodes: [], navigationHidden: false });

        const path = tab.isBranch ? getPathToNodeWithLayout(tab) : [];

        if (path.length) {
            get().activateNode(path[path.length - 1]);

            return;
        }

        if (tab.pageId > -1) set(openedPage(tab.pageId, -1));
    },

    // Mirrors AIR CatalogNavigator.openNavigatorAtNode: used by links and
    // offer lookups, it selects the node's tab and the node itself.
    openNavigatorAtNode: (node, offerId = -1) => {
        if (!node?.parent) return;

        const tab = getCatalogNodePath(node)[0];

        if (node !== tab) {
            set({ currentTab: tab, activeNodes: [], openNodes: [] });
            get().activateNode(node, offerId);

            return;
        }

        // A link to the tab's own page opens that page, not its first child.
        get().cancelObjectMover();
        set({ currentTab: tab, activeNodes: [tab], openNodes: [], navigationHidden: false });

        if (tab.pageId > -1) set(openedPage(tab.pageId, offerId));
    },

    getNodeById: (id, node) => findNodeById(id, node, readCatalogIndex(get().currentType)?.rootNode ?? null),

    getNodeByName: (name, node) => findNodeByName(name, node, readCatalogIndex(get().currentType)?.rootNode ?? null),

    getNodesByOfferId: (offerId, onlyVisible = false) => getNodesByOfferIdFromMap(offerId, readCatalogIndex(get().currentType)?.offersToNodes, onlyVisible),

    openPageById: (id) => {
        if (id !== -1) set({ searchResult: null });

        const index = readCatalogIndex(get().currentType);

        if (!get().isVisible || !index) {
            set({ pendingRequest: { kind: 'id', id }, isVisible: true });

            return;
        }

        // Every folder heading has pageId -1, so -1 never names a page.
        const node = id > -1 ? findNodeById(id, index.rootNode, index.rootNode) : null;

        if (node) get().openNavigatorAtNode(node);
    },

    openPageByName: (name) => {
        set({ searchResult: null });

        const index = readCatalogIndex(get().currentType);

        if (!get().isVisible || !index) {
            set({ pendingRequest: { kind: 'name', name }, isVisible: true });

            return;
        }

        const node = findNodeByName(name, index.rootNode, index.rootNode);

        if (node) get().openNavigatorAtNode(node);
    },

    openPageByOfferId: (offerId) => {
        set({ searchResult: null });

        const index = readCatalogIndex(get().currentType);

        if (!get().isVisible || !index) {
            set({ pendingRequest: { kind: 'offer', offerId }, isVisible: true });

            return;
        }

        const nodes = getNodesByOfferIdFromMap(offerId, index.offersToNodes);

        if (!nodes || !nodes.length) return;

        get().openNavigatorAtNode(nodes[0], offerId);
    },

    resolvePendingRequest: () => {
        const { isVisible, pendingRequest, pageId, pageOverride, currentType } = get();
        const index = readCatalogIndex(currentType);

        if (!isVisible || !index) return;

        if (pendingRequest) {
            set({ pendingRequest: null });

            switch (pendingRequest.kind) {
                case 'id':
                    get().openPageById(pendingRequest.id);
                    return;
                case 'name':
                    get().openPageByName(pendingRequest.name);
                    return;
                case 'offer':
                    get().openPageByOfferId(pendingRequest.offerId);
                    return;
            }
        }

        if (pageId > -1 || pageOverride) return;

        // AIR CatalogNavigator.showIndex: the Builders Club catalogue has no tab strip, but it still lists the first node's
        // children and opens that node's first page, like a tab (CatalogNavigator.as:161-240, WIN63-202610151745-318700621).
        if (index.rootNode.isBranch) {
            for (const child of index.rootNode.children) {
                if (child && child.isVisible) {
                    get().showTab(child);

                    return;
                }
            }
        }
    },

    // A page override (the search results) is a new page: AIR CatalogViewer.showSearchResults builds a fresh product view.
    setCurrentPage: (page) => set({ pageOverride: page, currentOffer: null }),

    setCurrentOffer: (offer) => set({ currentOffer: offer, purchaseOptions: offer ? { ...DEFAULT_PURCHASE_OPTIONS } : get().purchaseOptions }),

    selectCatalogOffer: (offer) => {
        if (!offer) return;

        // Matches the old hook's effective behaviour: it used to set
        // purchaseOptions.extraData from the WALL product's extraParam here,
        // but the reset effect that ran right after always overwrote it back
        // to the defaults before the purchase payload was ever read - so the
        // wire-visible value was always null. Keep that outcome explicitly
        // rather than reintroducing the now-dead assignment.
        const purchaseOptions: IPurchaseOptions = { ...DEFAULT_PURCHASE_OPTIONS };

        set({ currentOffer: offer, purchaseOptions });

        if (offer.isLazy && offer.offerId > -1) offer.activate();
    },

    consumePendingOffer: (page) => {
        const { pendingOfferId } = get();

        if (pendingOfferId <= -1) return;

        set({ pendingOfferId: -1 });

        for (const offer of page.offers) {
            if (offer.offerId !== pendingOfferId) continue;

            get().selectCatalogOffer(offer);
            break;
        }
    },

    setSearchResult: (result) => {
        const { pageOverride, previousPageId } = get();

        set({ searchResult: result });

        if (!result && pageOverride && pageOverride.pageId === -1) {
            set({ pageOverride: null });
            get().openPageById(previousPageId);
        }
    },

    setFrontPageItems: (items) => set({ frontPageItems: items }),
    setNavigationHidden: (navigationHidden) => set({ navigationHidden }),
    setPurchaseOptions: (options) => set((state) => ({ purchaseOptions: typeof options === 'function' ? options(state.purchaseOptions) : options })),
    setGiftReceiver: (giftReceiver) => set({ giftReceiver }),
    setCatalogPlaceMultipleObjects: (catalogPlaceMultipleObjects) => set({ catalogPlaceMultipleObjects }),
    bumpLocalizationVersion: () =>
        set((state) => ({
            catalogLocalizationVersion: state.catalogLocalizationVersion + 1,
            currentOffer: state.currentOffer?.clone ? state.currentOffer.clone() : state.currentOffer,
            pageOverride: state.pageOverride
                ? replaceCatalogPageOffers(
                      state.pageOverride,
                      state.pageOverride.offers.map((offer) => (offer?.clone ? offer.clone() : offer))
                  )
                : state.pageOverride
        })),
    setRoomPreviewer: (roomPreviewer) => set({ roomPreviewer }),

    // AIR HabboCatalog.getBuilderFurniPlaceableStatusForOffer / getBuilderFurniPlaceableStatus (HabboCatalog.as:2842-2889).
    getBuilderFurniPlaceableStatus: (offer) => {
        if (!offer) return BuilderFurniPlaceableStatus.MISSING_OFFER;

        const { furniCount, furniLimit } = useBuildersClubStore.getState();

        if (furniCount < 0 || furniCount >= furniLimit) return BuilderFurniPlaceableStatus.FURNI_LIMIT_REACHED;

        const roomSession = GetRoomSession();

        if (!roomSession) return BuilderFurniPlaceableStatus.NOT_IN_ROOM;

        if (!roomSession.isRoomOwner && roomSession.isGuildRoom && !GetConfigurationValue<boolean>('builders.club.furniture.placement.group.room.enabled', true))
            return BuilderFurniPlaceableStatus.GUILD_ROOM;

        // BuilderCatalogWidget.onYouAreOwner lifts status 4 for the owner before the controller level arrives.
        if (roomSession.controllerLevel < RoomControllerLevel.GUILD_ADMIN && !roomSession.isRoomOwner) return BuilderFurniPlaceableStatus.NOT_ROOM_OWNER_OR_GROUP_ADMIN;

        // Without a membership (the trial) nobody but the placer and moderators may be in the room.
        if (getBuildersClubSecondsLeft() <= 0) {
            const userDataManager = roomSession.userDataManager;

            for (const roomObject of GetRoomEngine().getRoomObjects(roomSession.roomId, RoomObjectCategory.UNIT) ?? []) {
                const userData = userDataManager?.getUserDataByIndex(roomObject.id);

                if (userData && userData.type === RoomObjectType.USER && userData.roomIndex !== roomSession.ownRoomIndex && !userData.isModerator)
                    return BuilderFurniPlaceableStatus.VISITORS_IN_ROOM;
            }
        }

        return BuilderFurniPlaceableStatus.OKAY;
    },

    // AIR HabboCatalog.isDraggable (HabboCatalog.as:2838).
    isDraggable: (offer) => {
        const roomSession = GetRoomSession();
        const { currentType } = get();

        if (!offer?.product) return false;

        const mayPlace =
            currentType === CatalogType.BUILDER
                ? get().getBuilderFurniPlaceableStatus(offer) === BuilderFurniPlaceableStatus.OKAY
                : currentType === CatalogType.NORMAL &&
                  !!roomSession &&
                  (roomSession.isRoomOwner || (roomSession.isGuildRoom && roomSession.controllerLevel >= RoomControllerLevel.GUILD_MEMBER));

        return (
            DRAG_AND_DROP_ENABLED &&
            !!roomSession &&
            !!offer.page &&
            offer.page.layoutCode !== 'sold_ltd_items' &&
            mayPlace &&
            offer.pricingModel !== Offer.PRICING_MODEL_BUNDLE &&
            offer.pricingModel !== Offer.PRICING_MODEL_MULTI &&
            offer.product.productType !== ProductTypeEnum.EFFECT &&
            offer.product.productType !== ProductTypeEnum.HABBO_CLUB
        );
    },

    // AIR HabboCatalog.requestSelectedItemToMover (HabboCatalog.as:2920); placeMultiple is the Builders Club "Place multiple".
    requestOfferToMover: (offer, placeMultiple = false) => {
        if (!get().isDraggable(offer)) return;

        const product = offer.product;

        if (!product) return;

        let category = 0;

        switch (product.productType) {
            case ProductTypeEnum.FLOOR:
                category = RoomObjectCategory.FLOOR;
                break;
            case ProductTypeEnum.WALL:
                category = RoomObjectCategory.WALL;
                break;
        }

        // HabboCatalog.requestSelectedItemToMover (AIR HabboCatalog.as:2935): recolorable pages place with MapData {state, r, g, b}.
        const stuffData = IsRecolorableFurniturePage(offer.page) && product.extraParam ? CreateRecolorableStuffData(product.extraParam) : null;

        if (GetRoomEngine().processRoomObjectPlacement(RoomObjectPlacementSource.CATALOG, -offer.offerId, category, product.productClassId, product.extraParam, stuffData)) {
            set({ purchasableOffer: offer, objectMoverRequested: true, isVisible: false, builderPlaceMultiple: placeMultiple });
        }
    },

    cancelObjectMover: () => {
        if (!get().purchasableOffer) return;

        GetRoomEngine().cancelRoomObjectInsert();

        set({ objectMoverRequested: false, purchasableOffer: null });
    },

    resetObjectMover: (flag = true) => {
        if (get().objectMoverRequested && flag) CreateLinkEvent('catalog/open');

        set({ objectMoverRequested: false });
    },

    setPlacedObjectPurchaseData: (placedObjectPurchaseData) => set({ placedObjectPurchaseData, placedObjectPurchaseSent: false, placedObjectPurchaseBought: false }),

    setPlacedObjectPurchaseSent: (placedObjectPurchaseSent) => set({ placedObjectPurchaseSent, placedObjectPurchaseBought: false }),

    setPlacedObjectPurchaseBought: (placedObjectPurchaseBought) => set({ placedObjectPurchaseBought }),

    resetRoomPaint: (planeType, type) => {
        const roomEngine = GetRoomEngine();

        let wallType = roomEngine.getRoomInstanceVariable<string>(roomEngine.activeRoomId, RoomObjectVariable.ROOM_WALL_TYPE);
        let floorType = roomEngine.getRoomInstanceVariable<string>(roomEngine.activeRoomId, RoomObjectVariable.ROOM_FLOOR_TYPE);
        let landscapeType = roomEngine.getRoomInstanceVariable<string>(roomEngine.activeRoomId, RoomObjectVariable.ROOM_LANDSCAPE_TYPE);

        wallType = wallType && wallType.length ? wallType : '101';
        floorType = floorType && floorType.length ? floorType : '101';
        landscapeType = landscapeType && landscapeType.length ? landscapeType : '1.1';

        switch (planeType) {
            case 'floor':
                roomEngine.updateRoomInstancePlaneType(roomEngine.activeRoomId, type, wallType, landscapeType, true);
                return;
            case 'wallpaper':
                roomEngine.updateRoomInstancePlaneType(roomEngine.activeRoomId, floorType, type, landscapeType, true);
                return;
            case 'landscape':
                roomEngine.updateRoomInstancePlaneType(roomEngine.activeRoomId, floorType, wallType, type, true);
                return;
            default:
                roomEngine.updateRoomInstancePlaneType(roomEngine.activeRoomId, floorType, wallType, landscapeType, true);
                return;
        }
    },

    resetPlacedOfferData: (flag = false) => {
        if (!flag) get().resetObjectMover();

        const previous = get().placedObjectPurchaseData;

        if (previous) {
            switch (previous.category) {
                case RoomObjectCategory.FLOOR:
                    GetRoomEngine().removeRoomObjectFloor(previous.roomId, previous.objectId);
                    break;
                case RoomObjectCategory.WALL:
                    switch (previous.furniData.className) {
                        case 'floor':
                        case 'wallpaper':
                        case 'landscape':
                            get().resetRoomPaint('reset', '');
                            break;
                        default:
                            GetRoomEngine().removeRoomObjectWall(previous.roomId, previous.objectId);
                            break;
                    }
                    break;
                default:
                    GetRoomEngine().deleteRoomObject(previous.objectId, previous.category);
                    break;
            }
        }

        set({ placedObjectPurchaseData: null, placedObjectPurchaseSent: false, placedObjectPurchaseBought: false });
    },

    refreshIndex: () => invalidateCatalogIndex(get().currentType),

    refreshCurrentPage: () => {
        const { currentType, pageId } = get();

        if (pageId > -1) invalidateCatalogPage(currentType, pageId);
    },

    retryCurrentPage: () => {
        const { currentType, pageId } = get();

        if (pageId > -1) refetchCatalogPage(currentType, pageId);
    }
}));
