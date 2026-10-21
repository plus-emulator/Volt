import { ClaimNftRewardsMessageComposer, GetNftClaimsMessageComposer, NftClaimData, NftClaimResultMessageEvent, NftClaimsMessageEvent } from '@volt/renderer';
import { useEffect, useRef, useState } from 'react';
import { LocalizeText, NotificationBubbleType, SendMessageComposer } from '../../api';
import stampLarge from '../../assets/images/collectibles/collectables-icon-curator-stamp-large.png';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

// RewardClaimsTab: one claims request per wallet, sent from a 600 ms timer while no request is in flight.
const REQUEST_INTERVAL_MS = 600;

/** RewardClaimsTab: the monthly collector reward claims of every wallet and Claim all. */
export const useCollectiblesRewardClaims = (walletAddresses: string[]) => {
    const [ready, setReady] = useState(false);
    const [claims, setClaims] = useState<NftClaimData[]>([]);
    const [isClaiming, setIsClaiming] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);
    const queueRef = useRef<string[]>([]);
    const requestingRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval>>(null);
    const { showSingleBubble = null } = useNotification();

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = null;
    };

    // processNextRequest
    const processNextRequest = () => {
        if (requestingRef.current || !queueRef.current.length) return;

        requestingRef.current = true;
        setIsRequesting(true);
        SendMessageComposer(new GetNftClaimsMessageComposer(queueRef.current.shift()));
    };

    // onWalletsAddressesUpdated -> requestRewardClaims
    useEffect(() => {
        if (!walletAddresses) return;

        queueRef.current.push(...walletAddresses);

        if (!timerRef.current && queueRef.current.length) timerRef.current = setInterval(processNextRequest, REQUEST_INTERVAL_MS);
    }, [walletAddresses]);

    useEffect(() => stopTimer, []);

    useMessageEvent<NftClaimsMessageEvent>(NftClaimsMessageEvent, (event) => {
        const received = event.getParser().nftClaims.filter((claim) => claim.claimedAmount < claim.claimLimit);

        if (received.length) setClaims((current) => [ ...current, ...received ]);

        requestingRef.current = false;
        setIsRequesting(false);

        if (!queueRef.current.length) {
            stopTimer();
            setReady(true);
        }
    });

    useMessageEvent<NftClaimResultMessageEvent>(NftClaimResultMessageEvent, (event) => {
        const parser = event.getParser();
        const text = parser.success ? LocalizeText('collectibles.claiming.success') : LocalizeText('collectibles.claiming.failed', ['id'], [String(parser.resultCode)]);

        showSingleBubble?.(text, NotificationBubbleType.INFO, stampLarge);

        if (parser.success) setClaims([]);

        setIsClaiming(false);
        setReady(true);
    });

    // onClaimClicked
    const claimAll = () => {
        setIsClaiming(true);
        SendMessageComposer(new ClaimNftRewardsMessageComposer());
        setReady(false);
    };

    const canClaim = claims.length > 0 && !isClaiming && !isRequesting;

    return { ready, claims, canClaim, claimAll };
};
