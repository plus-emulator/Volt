import {
    ClaimProductResultMessageEvent,
    GetSecondsUntilMessageComposer,
    HasClaimedProductMessageComposer,
    HasClaimedProductResponseMessageEvent,
    SecondsUntilMessageEvent
} from '@volt/renderer';
import { FC, MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { CreateLinkEvent, GetOptionalConfigurationValue, LocalizeText, OpenUrl, SendMessageComposer } from '../../api';
import borderNine from '../../assets/images/habbo-skin/slices/border-ubuntu-9-base.png';
import cursedDragonAdoptionIcon from '../../assets/images/cursed-dragon-adoption/icon.png';
import commonCloseX from '../../assets/images/new-feature/common_close_x.png';
import { useTintedSkin } from '../../common';
import { useMessageEvent, useRoom } from '../../hooks';

// NewFeatureNotification.as:46-48 (AIR WIN63-202610151745-318700621, com/sulake/habbo/notifications/singular).
const AUTO_OPEN_DELAY_MS = 5000;
const BG_COLOR_NORMAL = 0x686661;

// The client's own bitmaps that notifications.new_feature.image.<key> can name; anything else is read as a url.
const NEW_FEATURE_IMAGES: Record<string, string> = {
    cursed_dragon_adoption_icon: cursedDragonAdoptionIcon
};

const getString = (key: string): string =>
{
    const value = GetOptionalConfigurationValue<unknown>(key, '');

    return value === null || value === undefined ? '' : String(value);
};

// ColorConverter.hexToUint: "#8b5fa6" or "0x8b5fa6".
const parseColor = (value: string): number =>
{
    const color = parseInt(value.replace(/^#|^0x/i, ''), 16);

    return isNaN(color) ? BG_COLOR_NORMAL : color;
};

const getImageUrl = (value: string): string =>
{
    if (!value) return null;

    if (NEW_FEATURE_IMAGES[value]) return NEW_FEATURE_IMAGES[value];

    return /^(https?:)?\/\//.test(value) || value.includes('/') ? value : null;
};

/**
 * One new-feature bar in the toolbar extension column (NewFeatureNotification.as). The bar waits for SecondsUntil on its expiry before it is shown
 * and goes away when the expiry has passed (:115-162). With auto_open_condition not_claimed:<claim id> it asks HasClaimedProduct and opens its
 * link after 5 s in the hotel view while the product is unclaimed (:222-292).
 */
export const NewFeatureNotificationView: FC<{ featureKey: string; onDispose: (featureKey: string) => void }> = ({ featureKey, onDispose }) =>
{
    const [type] = useState(() => getString(`notifications.new_feature.type.${ featureKey }`) || 'normal');
    const [expiry] = useState(() => getString(`notifications.new_feature.expiry.${ featureKey }`));
    const [isReady, setIsReady] = useState(!expiry);
    const [isCancelVisible, setIsCancelVisible] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [autoOpenClaimId, setAutoOpenClaimId] = useState<string>(null);
    const [isAutoOpenPending, setIsAutoOpenPending] = useState(false);
    const { roomSession = null } = useRoom();
    const isDisposedRef = useRef(false);
    const color = parseColor(getString(`notifications.new_feature.color.${ featureKey }`) || '#686661');
    const borderImage = useTintedSkin(borderNine, color);

    const dispose = useCallback(() =>
    {
        if (isDisposedRef.current) return;

        isDisposedRef.current = true;
        onDispose(featureKey);
    }, [featureKey, onDispose]);

    const stopAutoOpen = useCallback(() =>
    {
        setAutoOpenClaimId(null);
        setIsAutoOpenPending(false);
    }, []);

    // :412-431
    const openConfiguredLink = useCallback(() =>
    {
        stopAutoOpen();
        setIsCancelVisible(true);

        const internalLink = getString(`notifications.new_feature.internal_link.${ featureKey }`);

        if (internalLink !== '')
        {
            CreateLinkEvent(internalLink);

            return;
        }

        const externalLink = getString(`notifications.new_feature.external_link.${ featureKey }`);

        if (externalLink !== '') OpenUrl(externalLink);
    }, [featureKey, stopAutoOpen]);

    useEffect(() =>
    {
        if (expiry) SendMessageComposer(new GetSecondsUntilMessageComposer(expiry));
    }, [expiry]);

    // :139-162
    useMessageEvent<SecondsUntilMessageEvent>(SecondsUntilMessageEvent, (event) =>
    {
        const parser = event.getParser();

        if (isReady || !expiry || parser.timeStr !== expiry) return;

        if (parser.secondsUntil <= 0)
        {
            dispose();

            return;
        }

        setIsReady(true);
    });

    // :222-244
    useEffect(() =>
    {
        if (!isReady) return;

        const parts = getString(`notifications.new_feature.auto_open_condition.${ featureKey }`).split(':');

        if (parts.length !== 2 || parts[0] !== 'not_claimed' || !parts[1].length) return;

        setAutoOpenClaimId(parts[1]);
        SendMessageComposer(new HasClaimedProductMessageComposer(parts[1]));
    }, [featureKey, isReady]);

    // :246-269
    useMessageEvent<HasClaimedProductResponseMessageEvent>(HasClaimedProductResponseMessageEvent, (event) =>
    {
        const parser = event.getParser();

        if (!autoOpenClaimId || parser.claimId !== autoOpenClaimId) return;

        if (parser.hasClaimed) stopAutoOpen();
        else setIsAutoOpenPending(true);
    });

    useMessageEvent<ClaimProductResultMessageEvent>(ClaimProductResultMessageEvent, (event) =>
    {
        const parser = event.getParser();

        if (autoOpenClaimId && parser.claimId === autoOpenClaimId && (parser.result === 0 || parser.result === 1)) stopAutoOpen();
    });

    // :271-292: the timer only runs in the hotel view and starts over when the user comes back to it.
    useEffect(() =>
    {
        if (!isAutoOpenPending || roomSession) return;

        const timeout = setTimeout(openConfiguredLink, AUTO_OPEN_DELAY_MS);

        return () => clearTimeout(timeout);
    }, [isAutoOpenPending, roomSession, openConfiguredLink]);

    // Only the promo layout (new_feature_notification_promo_xml) is drawn so far.
    if (!isReady || type !== 'promo') return null;

    const imageUrl = getImageUrl(getString(`notifications.new_feature.image.${ featureKey }`));

    const onCancel = (event: MouseEvent) =>
    {
        event.stopPropagation();
        dispose();
    };

    return (
        <div
            className={`volt-new-feature-promo${ isHovering ? ' is-hovering' : '' }`}
            role="button"
            style={borderImage ? undefined : { visibility: 'hidden' }}
            onClick={openConfiguredLink}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <svg aria-hidden="true" className="volt-new-feature-promo-filters">
                <filter colorInterpolationFilters="sRGB" id="volt-new-feature-hover">
                    <feComponentTransfer>
                        <feFuncR intercept={30 / 255} slope={1.1} type="linear" />
                        <feFuncG intercept={30 / 255} slope={1.1} type="linear" />
                        <feFuncB intercept={30 / 255} slope={1.1} type="linear" />
                    </feComponentTransfer>
                </filter>
                <filter colorInterpolationFilters="sRGB" id="volt-new-feature-pressed">
                    <feComponentTransfer>
                        <feFuncR slope={0.8} type="linear" />
                        <feFuncG slope={0.8} type="linear" />
                        <feFuncB slope={0.8} type="linear" />
                    </feComponentTransfer>
                </filter>
            </svg>
            <div aria-hidden="true" className="volt-new-feature-promo-border" style={borderImage ? { borderImageSource: borderImage } : undefined} />
            {imageUrl && (
                <div className="volt-new-feature-promo-icon">
                    <img alt="" draggable={false} src={imageUrl} />
                </div>
            )}
            <div className="volt-new-feature-promo-desc">{LocalizeText(`notifications.new_feature.${ featureKey }.desc`)}</div>
            {isCancelVisible && (
                <button aria-label="close" className="volt-new-feature-promo-cancel" type="button" onClick={onCancel}>
                    <img alt="" draggable={false} src={commonCloseX} />
                </button>
            )}
        </div>
    );
};
