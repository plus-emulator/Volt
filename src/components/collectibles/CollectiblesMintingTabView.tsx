import { CollectibleMintableItemData } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { CollectiblesPurchase, FriendlyTime, GetCollectibleProductName, GetConfigurationValue, LocalizeText, OpenUrl } from '../../api';
import stampLarge from '../../assets/images/collectibles/collectables-icon-curator-stamp-large.png';
import stampSmall from '../../assets/images/collectibles/collectables-icon-curator-stamp-small.png';
import lockClosed from '../../assets/images/collectibles/collectables-lock-closed.png';
import lockOpen from '../../assets/images/collectibles/collectables-lock-open.png';
import connectionProblem from '../../assets/images/collectibles/image-connection-problem.png';
import silverIcon from '../../assets/images/collectibles/pursearea-mid-silver-icon.png';
import { HabboDropMenuView } from '../../common/dropmenu/HabboDropMenuView';
import { CollectiblesWalletActivation } from '../../hooks/collectibles/useCollectiblesHub';
import { GetMintableProduct, useCollectiblesMinting } from '../../hooks/collectibles/useCollectiblesMinting';
import { CollectibleGridItemView } from './CollectibleGridItemView';
import { CollectibleProductPreviewView } from './CollectibleProductImageView';
import { CollectiblesHtmlText, CollectiblesPreviewBackground } from './CollectiblesSharedView';
import { at, HubLoadingView, ShinyButton, SlotBorder } from './CollectiblesSkinView';

const TIME_BAR_WIDTH = 220;

interface TimeBar {
    width: number;
    text: string;
}

/** updateProgressBar: only an item with a mint window changes the bar; otherwise it keeps what it showed. */
const getTimeBar = (item: CollectibleMintableItemData, now: number): TimeBar | null => {
    const start = item.startTime * 1000;
    const end = item.endTime * 1000;

    if (start <= 0 || end <= 0) return null;

    const remaining = Math.max(0, end - now);
    const fraction = Math.max(0, Math.min(1, remaining / (end - start)));

    return {
        width: Math.trunc(TIME_BAR_WIDTH * fraction),
        text: fraction <= 0 ? LocalizeText('shop.minting.time_ended') : `${LocalizeText('shop.minting.time_left')}: ${FriendlyTime.format(remaining / 1000)}`
    };
};

interface CollectiblesMintingTabViewProps {
    visible: boolean;
    activation: CollectiblesWalletActivation;
    onPurchase: (purchase: CollectiblesPurchase) => void;
}

/** MintInventoryListTab in mintingContainer (0,125 490x430). */
export const CollectiblesMintingTabView: FC<CollectiblesMintingTabViewProps> = ({ visible, activation, onPurchase }) => {
    const { ready, tokens, mintingEnabled, tokenOffers, selectedOffer, selectOffer, canBuyTokens, items, amounts, selectedIndex, setSelectedIndex, selected, isMinting, isConfirming, mint } =
        useCollectiblesMinting(activation);
    const [timeBar, setTimeBar] = useState<TimeBar>(() => ({ width: 120, text: LocalizeText('collectibles.preview.time_left') }));
    const [now, setNow] = useState(() => Date.now());
    const hasWallet = activation.wallet !== null;
    const amount = selectedIndex >= 0 ? amounts[selectedIndex] : 0;

    useEffect(() => {
        if (!ready) return;

        const interval = setInterval(() => setNow(Date.now()), 1000);

        return () => clearInterval(interval);
    }, [ready]);

    useEffect(() => {
        if (!selected) return;

        const next = getTimeBar(selected, now);

        if (next) setTimeBar(next);
    }, [selected, now]);

    // isMintPeriodExpired compares endTime * 1000 with now, so an item without an end time never mints.
    const expired = !selected || selected.endTime * 1000 < now;
    const canMint = hasWallet && amount > 0 && tokens >= (selected?.price ?? 0) && !expired && mintingEnabled && !isMinting && !isConfirming;
    const offer = selectedOffer >= 0 ? tokenOffers[selectedOffer] : null;

    return (
        <div className="volt-collectibles-abs" style={at(0, 125, 490, 430, { display: visible ? undefined : 'none' })}>
            <div className="volt-collectibles-abs" style={at(0, 0, 490, 430, { display: ready ? undefined : 'none' })}>
                <div className="volt-collectibles-text is-bold" style={at(0, 4, 480, 17)}>{LocalizeText('shop.minting.info.title')}</div>
                <div className="volt-collectibles-text is-wrap" style={at(0, 22, 480, 35)}>{LocalizeText('shop.minting.info.description')}</div>
                <div className="volt-collectibles-abs" style={at(4, 60, 480, 262)}>
                    <div className="volt-collectibles-grid" style={at(0, 0, 179, 260)}>
                        {items.map((item, index) => (
                            <CollectibleGridItemView
                                key={`${item.itemType}-${item.itemTypeId}-${index}`}
                                active={selectedIndex === index}
                                complete={false}
                                height={61}
                                product={GetMintableProduct(item)}
                                onClick={() => setSelectedIndex(index)}
                            >
                                <div className="volt-collectibles-abs" style={at(0, 45, 50, 16)}>
                                    <SlotBorder color={amounts[index] > 0 ? 0x337c00 : 0x718daa} style={at(3, 1, 44, 12)} />
                                    <div className="volt-collectibles-text is-tiny is-center is-white" style={at(0, 0, 50, 15)}>{amounts[index] > 0 ? `x${amounts[index]}` : '-'}</div>
                                </div>
                            </CollectibleGridItemView>
                        ))}
                    </div>
                    {items.length > 0 && (
                        <div className="volt-collectibles-abs" style={at(191, 0, 290, 260)}>
                            <CollectiblesPreviewBackground>
                                <CollectibleProductPreviewView fullPreviewer={false} product={selected ? GetMintableProduct(selected) : null} />
                                <div className="volt-collectibles-shade-d6" style={at(0, 0, 290, 26)}>
                                    <div className="volt-collectibles-text is-center is-white" style={at(0, 5, 290, 17)}>{selected ? GetCollectibleProductName(GetMintableProduct(selected)) : ''}</div>
                                </div>
                                <div className="volt-collectibles-mint-collect" style={at(182, 180, 100, 30)}>
                                    <div className="volt-collectibles-text is-white">{String(selected?.price ?? 0)}</div>
                                    <span className="volt-collectibles-spacer" style={{ width: 3 }} />
                                    <img alt="" className="volt-collectibles-row-icon" draggable={false} src={stampSmall} />
                                    <span className="volt-collectibles-spacer" style={{ width: 7 }} />
                                    <ShinyButton caption={LocalizeText('collectibles.collect')} color={0x01a101} disabled={!canMint} style={{ position: 'relative', width: 62, height: 30 }} onClick={mint} />
                                </div>
                                {amount === 0 && (
                                    <SlotBorder blend={0.82} color={0x5a1003} style={at(4, 30, 282, 50)}>
                                        <CollectiblesHtmlText className="is-small is-center is-white" html={LocalizeText('shop.minting.no_furni')} style={at(4, 16, 274, 16)} />
                                    </SlotBorder>
                                )}
                                <div className="volt-collectibles-shade-aa" style={at(0, 214, 290, 46)}>
                                    <div className="volt-collectibles-abs" style={at(64, 0, 226, 46)}>
                                        <CollectiblesHtmlText
                                            className="is-small is-white"
                                            html={LocalizeText(selected?.regionLocked ? 'shop.minting.region_locked' : 'shop.minting.region_unlocked')}
                                            style={at(0, 4, 290, 17)}
                                        />
                                        <div className="volt-collectibles-progress-bar" style={at(0, 24, 220, 18)}>
                                            <div className="volt-collectibles-abs" style={at(1, 1, 220, 16)}>
                                                <div className="volt-collectibles-progress-top" style={at(0, 0, timeBar.width, 8)} />
                                                <div className="volt-collectibles-progress-bottom" style={at(0, 8, timeBar.width, 8)} />
                                            </div>
                                            <div className="volt-collectibles-text is-small is-center is-white" style={at(0, 1, 220, 16)}>{timeBar.text}</div>
                                        </div>
                                    </div>
                                </div>
                                <img alt="" className="volt-collectibles-abs" draggable={false} src={selected?.regionLocked ? lockClosed : lockOpen} style={at(7, 208, selected?.regionLocked ? 52 : 51, 46)} />
                            </CollectiblesPreviewBackground>
                        </div>
                    )}
                </div>
                <SlotBorder color={0xbac3cd} style={at(0, 330, 488, 100)}>
                    {hasWallet ? (
                        <>
                            <SlotBorder color={0xd6dbe1} style={at(42, 14, 200, 72)}>
                                <img alt="" className="volt-collectibles-abs" draggable={false} src={stampLarge} style={at(12, 12, 48, 48)} />
                                <div className="volt-collectibles-text is-medium is-bold" style={at(68, 12, 122, 18)}>{LocalizeText('shop.minting.tokens')}</div>
                                <div className="volt-collectibles-text is-huge is-bold" style={at(67, 26, 122, 37)}>{String(tokens)}</div>
                            </SlotBorder>
                            <SlotBorder color={0xd6dbe1} style={at(246, 14, 200, 72)}>
                                <div className="volt-collectibles-text is-bold" style={at(42, 12, 100, 17)}>{LocalizeText('collectibles.buy.mint.tokens')}</div>
                                <HabboDropMenuView
                                    className="volt-collectibles-dropmenu"
                                    label={LocalizeText('collectibles.buy.mint.tokens')}
                                    options={tokenOffers.map((entry, index) => ({ value: index, label: String(entry.amountTokens) }))}
                                    style={at(148, 9, 48, 21)}
                                    value={selectedOffer >= 0 ? selectedOffer : null}
                                    onSelect={(index: number) => selectOffer(index)}
                                />
                                <div className="volt-collectibles-token-cost" style={at(49, 36, 147, 30)}>
                                    <div className="volt-collectibles-text is-cost is-bold">{offer ? String(offer.silverPrice) : '1'}</div>
                                    <span className="volt-collectibles-spacer" style={{ width: 4 }} />
                                    <img alt="" className="volt-collectibles-row-icon" draggable={false} src={silverIcon} />
                                    <span className="volt-collectibles-spacer" style={{ width: 6 }} />
                                    <ShinyButton
                                        caption={LocalizeText('generic.buy')}
                                        color={0x2095d4}
                                        disabled={!canBuyTokens}
                                        style={{ position: 'relative', width: 100, height: 30 }}
                                        onClick={() => offer && onPurchase({ kind: 'mint_tokens', offer, wallet: activation.wallet })}
                                    />
                                </div>
                            </SlotBorder>
                        </>
                    ) : (
                        <>
                            <div className="volt-collectibles-text is-wrap" style={at(10, 0, 360, 60)}>{LocalizeText('shop.minting.no_wallet.description')}</div>
                            <img alt="" className="volt-collectibles-abs" draggable={false} src={connectionProblem} style={at(380, 5, 92, 90)} />
                            <ShinyButton
                                caption={LocalizeText('shop.minting.create.wallet')}
                                color={0x2095d4}
                                style={at(10, 62, 170, 30)}
                                onClick={() => OpenUrl(GetConfigurationValue<string>('nft.wallet.create.url', ''))}
                            />
                            <ShinyButton
                                caption={LocalizeText('shop.minting.link.wallet')}
                                color={0x2095d4}
                                style={at(192, 62, 170, 30)}
                                onClick={() => OpenUrl(GetConfigurationValue<string>('web.settings.wallet.relativeUrl', ''))}
                            />
                        </>
                    )}
                </SlotBorder>
            </div>
            {!ready && <HubLoadingView style={at(0, 0, 485, 429)} />}
        </div>
    );
};
