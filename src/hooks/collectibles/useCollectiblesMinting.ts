import {
    CollectibleMintableItemData,
    CollectibleMintableItemTypesMessageEvent,
    CollectibleMintingEnabledMessageEvent,
    CollectibleMintTokensMessageEvent,
    GetCollectibleMintableItemTypesMessageComposer,
    GetCollectibleMintingEnabledMessageComposer,
    GetCollectibleMintTokensMessageComposer,
    GetMintTokenOffersMessageComposer,
    MintCollectibleMessageComposer,
    MintCollectibleResultMessageEvent,
    MintTokenOfferData,
    MintTokenOffersMessageEvent
} from '@volt/renderer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CollectibleProductType, GroupItem, ICollectibleProduct, LocalizeText, NotificationBubbleType, SendMessageComposer } from '../../api';
import stampLarge from '../../assets/images/collectibles/collectables-icon-curator-stamp-large.png';
import { useMessageEvent } from '../events';
import { useInventoryFurni } from '../inventory';
import { useNotification } from '../notification';
import { usePurse } from '../purse';
import { CollectiblesWalletActivation } from './useCollectiblesHub';

/** What MintInventoryListTab still waits for before it shows its content (var_3781, var_3452, var_3473, var_3284, var_3551). */
type MintingRequest = 'wallet' | 'tokens' | 'types' | 'enabled' | 'inventory';

// MintCollectibleResult: 1 is success (class_4045.name_6), 0 and 2 are failures.
const MINT_RESULT_SUCCESS = 1;

// MintableItemWrapper.productTypeId
const PRODUCT_TYPES = { i: CollectibleProductType.WALL, s: CollectibleProductType.FLOOR, cl: CollectibleProductType.CLOTHING } as const;

export const GetMintableProduct = (item: CollectibleMintableItemData): ICollectibleProduct => ({
    productTypeId: PRODUCT_TYPES[item.itemType] ?? CollectibleProductType.UNKNOWN,
    itemTypeId: String(item.itemTypeId),
    petFigureString: '',
    figureSetIds: []
});

// HabboInventory.getNonRentedInventoryIds: the first furni group of that sprite and kind; clothing has none.
const getIdsInInventory = (groupItems: GroupItem[], item: CollectibleMintableItemData): number[] => {
    if (item.itemType !== 'i' && item.itemType !== 's') return [];

    const isWall = item.itemType === 'i';
    const group = groupItems.find((entry) => entry.type === item.itemTypeId && entry.isWallItem === isWall);

    return group ? group.items.filter((furni) => !furni.rentable).map((furni) => furni.id) : [];
};

/** MintInventoryListTab: mintable furni with the user's own counts, mint tokens and their offers, and the mint flow. */
export const useCollectiblesMinting = (activation: CollectiblesWalletActivation) => {
    const { groupItems = [], isInitialized = false, requestInitialization = null } = useInventoryFurni();
    const [pending, setPending] = useState<ReadonlySet<MintingRequest>>(() => new Set<MintingRequest>([ 'wallet', 'types', 'enabled' ]));
    const [tokens, setTokens] = useState(0);
    const [productItems, setProductItems] = useState<CollectibleMintableItemData[]>([]);
    const [mintingEnabled, setMintingEnabled] = useState(false);
    const [tokenOffers, setTokenOffers] = useState<MintTokenOfferData[]>([]);
    const [selectedOffer, setSelectedOffer] = useState(-1);
    // populateItems runs once, the first time every request has answered (var_3624).
    const [items, setItems] = useState<CollectibleMintableItemData[]>(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isMinting, setIsMinting] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const requestedRef = useRef(false);
    const { showSingleBubble = null, showConfirm = null } = useNotification();
    const { getCurrencyAmount } = usePurse();

    const settle = (request: MintingRequest) => setPending((current) => {
        if (!current.has(request)) return current;

        const next = new Set(current);

        next.delete(request);

        return next;
    });

    // initializeData
    useEffect(() => {
        if (requestedRef.current) return;

        requestedRef.current = true;
        SendMessageComposer(new GetCollectibleMintableItemTypesMessageComposer());
        SendMessageComposer(new GetCollectibleMintingEnabledMessageComposer());
        if (!isInitialized) {
            setPending((current) => new Set(current).add('inventory'));
            requestInitialization?.();
        }
        SendMessageComposer(new GetMintTokenOffersMessageComposer());
    }, [isInitialized, requestInitialization]);

    useEffect(() => {
        if (isInitialized) settle('inventory');
    }, [isInitialized]);

    // activeWallet setter
    useEffect(() => {
        if (!activation.seq) return;

        settle('wallet');

        if (activation.wallet !== null) {
            setPending((current) => new Set(current).add('tokens'));
            SendMessageComposer(new GetCollectibleMintTokensMessageComposer(activation.wallet));
        }
    }, [activation]);

    const ready = pending.size === 0;

    useEffect(() => {
        if (!ready || items !== null) return;

        setItems(productItems);
        setSelectedIndex(productItems.length > 0 ? 0 : -1);
    }, [ready, items, productItems]);

    useMessageEvent<CollectibleMintTokensMessageEvent>(CollectibleMintTokensMessageEvent, (event) => {
        setTokens(event.getParser().totalTokens);
        settle('tokens');
    });

    useMessageEvent<CollectibleMintingEnabledMessageEvent>(CollectibleMintingEnabledMessageEvent, (event) => {
        setMintingEnabled(event.getParser().enabled);
        settle('enabled');
    });

    useMessageEvent<CollectibleMintableItemTypesMessageEvent>(CollectibleMintableItemTypesMessageEvent, (event) => {
        setProductItems(event.getParser().collectibleProductItems);
        settle('types');
    });

    useMessageEvent<MintTokenOffersMessageEvent>(MintTokenOffersMessageEvent, (event) => {
        const offers = event.getParser().tokenOffers;

        setTokenOffers(offers);
        setSelectedOffer(offers.length > 0 ? 0 : -1);
    });

    // onMintItemResult: CatalogEvent COLLECTIBLES_MINT_SUCCESS / _FAIL, shown by HabboNotifications.
    useMessageEvent<MintCollectibleResultMessageEvent>(MintCollectibleResultMessageEvent, (event) => {
        const success = event.getParser().mintResult === MINT_RESULT_SUCCESS;

        showSingleBubble?.(LocalizeText(success ? 'shop.minting.success' : 'shop.minting.failed'), NotificationBubbleType.INFO, stampLarge);
        setIsMinting(false);
    });

    // onSelectTokenOffer: the offer's silver price against the purse; read on every render so a balance that arrives later counts.
    const canBuyTokens = selectedOffer >= 0 && tokenOffers[selectedOffer].silverPrice <= getCurrencyAmount(1000);
    const amounts = useMemo(() => (items ?? []).map((item) => getIdsInInventory(groupItems, item).length), [groupItems, items]);
    const selected = selectedIndex >= 0 && items ? items[selectedIndex] : null;

    // The confirm is not modal, so onCollectConfirmDialogConfirm reads the selection, inventory and wallet when OK is pressed.
    const latestRef = useRef({ selected, groupItems, wallet: activation.wallet });

    useEffect(() => {
        latestRef.current = { selected, groupItems, wallet: activation.wallet };
    });

    // onCollectClicked + onCollectConfirmDialogConfirm: mint the first matching furni of the inventory.
    const mint = () => {
        if (!selected) return;

        setIsConfirming(true);
        showConfirm?.(
            LocalizeText('shop.minting.confirm.description'),
            () => {
                setIsConfirming(false);

                const latest = latestRef.current;

                if (!latest.selected || latest.wallet === null) return;

                const ids = getIdsInInventory(latest.groupItems, latest.selected);

                if (!ids.length) return;

                setIsMinting(true);
                SendMessageComposer(new MintCollectibleMessageComposer(ids[0], latest.wallet));
            },
            () => setIsConfirming(false),
            null,
            null,
            LocalizeText('shop.minting.confirm.title')
        );
    };

    return {
        ready,
        tokens,
        mintingEnabled,
        tokenOffers,
        selectedOffer,
        selectOffer: setSelectedOffer,
        canBuyTokens,
        items: items ?? [],
        amounts,
        selectedIndex,
        setSelectedIndex,
        selected,
        isMinting,
        isConfirming,
        mint
    };
};
