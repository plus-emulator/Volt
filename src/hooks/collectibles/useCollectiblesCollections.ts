import {
    ClaimNftCollectionBonusMessageComposer,
    ClaimNftCollectionRewardMessageComposer,
    GetNftCollectionsMessageComposer,
    NftCollectionBonusClaimResultMessageEvent,
    NftCollectionData,
    NftCollectionItemData,
    NftCollectionRewardClaimResultMessageEvent,
    NftCollectionsMessageEvent
} from '@volt/renderer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText, NotificationBubbleType, SendMessageComposer } from '../../api';
import stampLarge from '../../assets/images/collectibles/collectables-icon-curator-stamp-large.png';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';
import { CollectiblesWalletActivation } from './useCollectiblesHub';

/** CollectionView's preview: a claimable bonus or reward item, the plain collection, or one selected item. */
export type CollectionPreview =
    | { status: 'bonus' | 'reward'; item: NftCollectionItemData; claimVisible: boolean; claimEnabled: boolean }
    | { status: 'collection' }
    | { status: 'item'; index: number };

export const COLLECTION_SORTS = ['collectibles.sort.default', 'collectibles.sort.progress', 'collectibles.sort.score'] as const;

// CollectionsTab.sortCollectionsByBonus: claimable bonuses, then bonuses still in their claim window, then the rest.
const sortByBonus = (collections: NftCollectionData[]) => {
    const groups: NftCollectionData[][] = [ [], [], [] ];

    for (const collection of collections) {
        if (collection.canClaimBonus) groups[0].push(collection);
        else if (collection.hasBonusItem && !collection.isBonusSnapshotPassed()) groups[1].push(collection);
        else groups[2].push(collection);
    }

    return groups.flat();
};

// sortCollectionsByProgress / sortCollectionsByScore: the ones above zero first, highest first, then the rest in order.
const sortByValue = (collections: NftCollectionData[], value: (collection: NftCollectionData) => number) => [
    ...collections.filter((collection) => value(collection) > 0).sort((a, b) => value(b) - value(a)),
    ...collections.filter((collection) => value(collection) <= 0)
];

const SORTERS = [
    sortByBonus,
    (collections: NftCollectionData[]) => sortByValue(collections, (collection) => collection.progressPercentage),
    (collections: NftCollectionData[]) => sortByValue(collections, (collection) => collection.collectionScore)
];

// CollectionView.initRewardClaim
const getCollectionPreview = (collection: NftCollectionData): CollectionPreview => {
    const claimable = (status: 'bonus' | 'reward', item: NftCollectionItemData, claimVisible: boolean): CollectionPreview => ({
        status,
        item,
        claimVisible,
        claimEnabled: (status === 'bonus' ? collection.claimingBonusStatus : collection.claimingRewardStatus) === NftCollectionData.CLAIMING_IDLE
    });

    if (collection.canClaimBonus) return claimable('bonus', collection.bonusItem, true);
    if (collection.canClaimReward) return claimable('reward', collection.rewardItem, true);
    if (collection.hasBonusItem && !collection.bonusClaimed) return claimable('bonus', collection.bonusItem, false);
    if (collection.hasRewardItem && !collection.rewardClaimed) return claimable('reward', collection.rewardItem, false);

    return { status: 'collection' };
};

/** CollectionsTab + CollectionView: the wallet's collections, sorting, search and the claim flow. */
export const useCollectiblesCollections = (activation: CollectiblesWalletActivation) => {
    const [ready, setReady] = useState(false);
    const [collections, setCollections] = useState<NftCollectionData[]>([]);
    const [sort, setSort] = useState(0);
    // Picking a sort rebuilds the navigation list, so it also re-reads the bonus windows (sortSeq) and drops the active node.
    const [sortSeq, setSortSeq] = useState(0);
    const [search, setSearch] = useState('');
    const [activeNodeId, setActiveNodeId] = useState<string>(null);
    const [shownCollection, setShownCollection] = useState<NftCollectionData>(null);
    const [preview, setPreview] = useState<CollectionPreview>({ status: 'collection' });
    const awaitingRef = useRef(false);
    const { showSingleBubble = null } = useNotification();

    const showCollection = useCallback((collection: NftCollectionData) => {
        setActiveNodeId(collection.collectionId);
        setShownCollection(collection);
        setPreview(getCollectionPreview(collection));
    }, []);

    // CollectionsTab.activeWallet setter: show the loader and ask for the wallet's collections.
    useEffect(() => {
        if (!activation.seq) return;

        setReady(false);
        setActiveNodeId(null);
        awaitingRef.current = true;
        SendMessageComposer(new GetNftCollectionsMessageComposer(activation.wallet ?? ''));
    }, [activation]);

    const navigation = useMemo(() => {
        void sortSeq;

        return SORTERS[sort](collections);
    }, [collections, sort, sortSeq]);

    useMessageEvent<NftCollectionsMessageEvent>(NftCollectionsMessageEvent, (event) => {
        if (!awaitingRef.current) return;

        awaitingRef.current = false;

        const received = event.getParser().nftCollections;
        const first = SORTERS[0](received)[0];

        setCollections(received);
        setSort(0);
        setSortSeq((value) => value + 1);
        setActiveNodeId(null);
        if (first) showCollection(first);
        setReady(true);
    });

    const selectSort = (index: number) => {
        setSort(index);
        setSortSeq((value) => value + 1);
        setActiveNodeId(null);
    };

    // CollectionsTab.sendClaimNotification / HabboNotifications.onCollectiblesClaim*
    const notifyClaim = (key: string) => showSingleBubble?.(LocalizeText(key), NotificationBubbleType.INFO, stampLarge);

    const onClaimResult = (collectionId: string, walletAddress: string, success: boolean, isBonus: boolean) => {
        notifyClaim(success ? 'collectibles.claiming.success' : 'collectibles.claiming.failed');

        if (activation.wallet !== walletAddress) return;

        const collection = collections.find((entry) => entry.collectionId === collectionId);

        if (!collection) return;

        if (isBonus) collection.claimBonusFinished(success);
        else collection.claimRewardFinished(success);

        // CollectionView.claimingFinished re-reads the claim state when it shows a bonus or reward.
        if (shownCollection?.collectionId === collectionId) setPreview((current) => (current.status === 'bonus' || current.status === 'reward' ? getCollectionPreview(collection) : current));
    };

    useMessageEvent<NftCollectionBonusClaimResultMessageEvent>(NftCollectionBonusClaimResultMessageEvent, (event) => {
        const parser = event.getParser();

        onClaimResult(parser.collectionId, parser.walletAddress, parser.success, true);
    });

    useMessageEvent<NftCollectionRewardClaimResultMessageEvent>(NftCollectionRewardClaimResultMessageEvent, (event) => {
        const parser = event.getParser();

        onClaimResult(parser.collectionId, parser.walletAddress, parser.success, false);
    });

    const activateCollection = (collection: NftCollectionData) => {
        if (activeNodeId === collection.collectionId) return;

        showCollection(collection);
    };

    // CollectionView.selectItem: clicking the selected item again goes back to the collection preview.
    const selectItem = (index: number) => {
        if (!shownCollection) return;

        if (preview.status === 'item' && preview.index === index) setPreview(getCollectionPreview(shownCollection));
        else setPreview({ status: 'item', index });
    };

    // CollectionView.onClickClaim
    const claim = () => {
        if (!shownCollection || activation.wallet === null || (preview.status !== 'bonus' && preview.status !== 'reward')) return;

        if (preview.status === 'bonus') {
            shownCollection.claimBonusAwaiting();
            SendMessageComposer(new ClaimNftCollectionBonusMessageComposer(shownCollection.collectionId, activation.wallet));
        } else {
            shownCollection.claimRewardAwaiting();
            SendMessageComposer(new ClaimNftCollectionRewardMessageComposer(shownCollection.collectionId, activation.wallet));
        }

        notifyClaim('collectibles.claiming.wait');
        setPreview({ ...preview, claimEnabled: false });
    };

    return { ready, navigation, navigationSeq: sortSeq, sort, selectSort, search, setSearch, activeNodeId, activateCollection, shownCollection, preview, selectItem, claim };
};
