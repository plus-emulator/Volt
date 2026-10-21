import {
    AddLinkEventTracker,
    CollectibleWalletAddressesMessageEvent,
    CollectorScoreMessageEvent,
    GetCollectibleWalletAddressesMessageComposer,
    GetCollectorScoreMessageComposer,
    ILinkEventTracker,
    NftStorePurchaseResultMessageEvent,
    PurchaseNftStoreOfferMessageComposer,
    RemoveLinkEventTracker
} from '@volt/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CollectiblesPurchase, GetActivityPointName, GetCollectibleProductName, LocalizeText, NotificationBubbleType, SendMessageComposer } from '../../api';
import stampLarge from '../../assets/images/collectibles/collectables-icon-curator-stamp-large.png';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

/** The window's lifetime: CollectiblesController builds the view on the first open and only hides it on close. */
export type CollectiblesHubWindow = 'none' | 'shown' | 'hidden';

/** CollectibleWalletAddresses: the Collector (stardust) wallet and every wallet in order. */
export interface CollectiblesWallets {
    addresses: string[];
    stardust: string;
}

/** Every setActiveWalletIndex call that changes the wallet. `seq` lets tabs react to each one, like the AS setters. */
export interface CollectiblesWalletActivation {
    wallet: string;
    seq: number;
}

export interface CollectorScore {
    score: number;
    highestScore: number;
    level: number | null;
}

export const STARDUST_WALLET_DISPLAY_NAME = 'Collector Wallet';

/** CollectiblesController + CollectiblesView: the link, the wallets, the active wallet and the collector score. */
export const useCollectiblesHub = () => {
    const [hubWindow, setHubWindow] = useState<CollectiblesHubWindow>('none');
    const [wallets, setWallets] = useState<CollectiblesWallets>(null);
    const [activation, setActivation] = useState<CollectiblesWalletActivation>({ wallet: null, seq: 0 });
    const [score, setScore] = useState<CollectorScore>({ score: 0, highestScore: 0, level: null });
    // HabboCatalog's purchase confirmation for an NftStorePurchaseOffer (var_70).
    const [purchase, setPurchase] = useState<CollectiblesPurchase>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const { simpleAlert = null, showSingleBubble = null } = useNotification();
    const hubWindowRef = useRef<CollectiblesHubWindow>('none');
    const requestingWalletsRef = useRef(false);
    const activeWalletRef = useRef<string>(null);

    const updateWindow = useCallback((next: CollectiblesHubWindow) => {
        hubWindowRef.current = next;
        setHubWindow(next);
    }, []);

    const open = useCallback(() => {
        // CollectiblesView constructor: requestWalletAddresses.
        if (hubWindowRef.current === 'none' && !requestingWalletsRef.current) {
            requestingWalletsRef.current = true;
            SendMessageComposer(new GetCollectibleWalletAddressesMessageComposer());
        }

        updateWindow('shown');
    }, [updateWindow]);

    const hide = useCallback(() => {
        if (hubWindowRef.current !== 'none') updateWindow('hidden');
    }, [updateWindow]);

    // CollectiblesView.setActiveWalletIndex
    const setActiveWalletIndex = useCallback((addresses: string[], index: number) => {
        if (addresses.length > 0 && (index < 0 || index >= addresses.length || addresses[index] === activeWalletRef.current)) return;

        const wallet = addresses.length > 0 ? addresses[index] : null;

        activeWalletRef.current = wallet;
        setActivation((current) => ({ wallet, seq: current.seq + 1 }));
    }, []);

    // setActiveWalletIndex asks for the score after the tabs got the new wallet; this effect runs after theirs.
    useEffect(() => {
        if (activation.seq && activation.wallet !== null) SendMessageComposer(new GetCollectorScoreMessageComposer(activation.wallet));
    }, [activation]);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length >= 2 && parts[1] === 'open') open();
            },
            eventUrlPrefix: 'collectibles/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [open]);

    useMessageEvent<CollectibleWalletAddressesMessageEvent>(CollectibleWalletAddressesMessageEvent, (event) => {
        if (hubWindowRef.current === 'none') return;

        const parser = event.getParser();
        const next: CollectiblesWallets = { addresses: parser.walletAddresses, stardust: parser.stardustWalletAddress };

        requestingWalletsRef.current = false;
        setWallets(next);
        setActiveWalletIndex(next.addresses, 0);
    });

    useMessageEvent<CollectorScoreMessageEvent>(CollectorScoreMessageEvent, (event) => {
        if (hubWindowRef.current === 'none') return;

        const parser = event.getParser();

        setScore({ score: parser.score, highestScore: parser.highestScore, level: parser.level });
    });

    const showPurchase = useCallback((next: CollectiblesPurchase) => {
        setIsPurchasing(false);
        setPurchase(next);
    }, []);

    const closePurchase = useCallback(() => {
        setIsPurchasing(false);
        setPurchase(null);
    }, []);

    // PurchaseConfirmationDialog.onBuyButtonClick: the buttons stay disabled until the server answers.
    const confirmPurchase = () => {
        if (!purchase || isPurchasing) return;

        setIsPurchasing(true);

        SendMessageComposer(new PurchaseNftStoreOfferMessageComposer(purchase.offer.productCode, purchase.wallet));
    };

    // HabboCatalog.onNftStorePurchase
    useMessageEvent<NftStorePurchaseResultMessageEvent>(NftStorePurchaseResultMessageEvent, (event) => {
        if (event.getParser().result === 1) {
            simpleAlert?.(LocalizeText('notification.nft.purchase.error'), null, null, null, LocalizeText('catalog.alert.purchaseerror.title'));
        } else if (purchase) {
            const productName = GetCollectibleProductName(purchase.offer.productInfo);

            showSingleBubble?.(LocalizeText('notifications.text.purchase.ok', ['productName'], [productName]), NotificationBubbleType.INFO, stampLarge);
            SendMessageComposer(new GetCollectorScoreMessageComposer(activation.wallet));
        }

        closePurchase();
    });

    // HabboCatalog.showNotEnoughActivityPointsAlert
    const alertNotEnoughActivityPoints = useCallback((type: number) => {
        const currencyName = GetActivityPointName(type);

        simpleAlert?.(
            LocalizeText('catalog.alert.notenough.activitypoints.description', ['currencyname'], [currencyName]),
            null,
            null,
            null,
            LocalizeText('catalog.alert.notenough.activitypoints.title', ['currencyname'], [currencyName])
        );
    }, [simpleAlert]);

    const selectWallet = useCallback((index: number) => {
        if (wallets) setActiveWalletIndex(wallets.addresses, index);
    }, [setActiveWalletIndex, wallets]);

    return { hubWindow, hide, wallets, activation, score, selectWallet, purchase, isPurchasing, showPurchase, closePurchase, confirmPurchase, alertNotEnoughActivityPoints };
};
