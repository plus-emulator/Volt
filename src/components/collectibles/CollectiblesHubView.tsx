import { HabboWebTools } from '@volt/renderer';
import { CSSProperties, FC, useMemo, useState } from 'react';
import { CreateCollectiblesPurchaseOffer, GetCollectorLevelColor, GetConfigurationValue, LocalizeText } from '../../api';
import cabinetElement from '../../assets/images/collectibles/collectables-cabinet-element.png';
import collectionDefault from '../../assets/images/collectibles/collectables-collection-default.png';
import levelBackground from '../../assets/images/collectibles/collectables-level-bg.png';
import scoreBackground from '../../assets/images/collectibles/collectables-score-background.png';
import scoreBackgroundGradient from '../../assets/images/collectibles/collectables-score-background-gradient.png';
import scoreBackgroundRight from '../../assets/images/collectibles/collectables-score-background-right.png';
import scoreElement from '../../assets/images/collectibles/collectables-score-element.png';
import scoreElement2 from '../../assets/images/collectibles/collectables-score-element2.png';
import mintingTokenLarge from '../../assets/images/collectibles/minting-token-large.png';
import emeraldIcon from '../../assets/images/collectibles/pursearea-mid-emerald-icon.png';
import silverIcon from '../../assets/images/collectibles/pursearea-mid-silver-icon.png';
import frameBase from '../../assets/images/habbo-skin/slices/frame-ubuntu-3-base.png';
import { useTintedSkin, VoltCardHeaderView, VoltCardView } from '../../common';
import { GetNonStardustWallets, useCollectiblesHub } from '../../hooks/collectibles/useCollectiblesHub';
import { usePurse } from '../../hooks/purse';
import { CatalogPurchaseConfirmView } from '../catalog/views/CatalogPurchaseConfirmView';
import { CollectibleProductPreviewView } from './CollectibleProductImageView';
import { CollectiblesCollectionsTabView } from './CollectiblesCollectionsTabView';
import { CollectiblesMintingTabView } from './CollectiblesMintingTabView';
import { CollectiblesRewardsTabView } from './CollectiblesRewardsTabView';
import { CollectiblesHtmlText } from './CollectiblesSharedView';
import { CollectiblesShopTabView } from './CollectiblesShopTabView';
import { at, SlotBorder, TintedBitmap } from './CollectiblesSkinView';
import { CollectiblesTransferTabView } from './CollectiblesTransferTabView';

type CollectiblesTab = 'rewards' | 'collections' | 'shop' | 'minting' | 'transfer' | 'info';

// top_view_select_tab_context: the tab buttons in layout order with their widths and captions (CollectiblesView constructor).
const TABS: { tab: CollectiblesTab; width: number; caption: string; flag?: string }[] = [
    { tab: 'rewards', width: 72, caption: 'collectibles.claim.title' },
    { tab: 'collections', width: 87, caption: 'collectibles.collections.title' },
    { tab: 'shop', width: 52, caption: 'collectibles.shop.title', flag: 'nft.shop.enabled' },
    { tab: 'minting', width: 66, caption: 'shop.minting.title', flag: 'nft.minting.enabled' },
    { tab: 'transfer', width: 70, caption: 'collectibles.transfer', flag: 'collectibles.transfer.enabled' },
    { tab: 'info', width: 46, caption: 'collectibles.info.title' }
];

const FRAME_COLOR = 0x2a2a2a;
const WINDOW_WIDTH = 500;

const openWebPage = (url: string) => {
    if (url) HabboWebTools.openWebPage(url);
};

/** CollectiblesController + CollectiblesView: the Collectibles hub (collectible_view_xml, 500x600), opened by collectibles/open. */
export const CollectiblesHubView: FC<{}> = () => {
    const { hubWindow, hide, wallets, activation, score, selectWallet, purchase, isPurchasing, showPurchase, closePurchase, confirmPurchase, alertNotEnoughActivityPoints } =
        useCollectiblesHub();
    const [currentTab, setCurrentTab] = useState<CollectiblesTab>('rewards');
    const { getCurrencyAmount } = usePurse();
    const frameImage = useTintedSkin(frameBase, FRAME_COLOR, 33);
    const levelColor = GetCollectorLevelColor(score.level);
    const transferWallets = useMemo(() => GetNonStardustWallets(wallets), [wallets]);
    const walletAddresses = wallets ? wallets.addresses : null;
    const purchaseOffer = useMemo(() => (purchase ? CreateCollectiblesPurchaseOffer(purchase) : null), [purchase]);

    // centerTabLayout: hidden tabs take no width and the visible ones are centred in the window.
    const visibleTabs = TABS.filter((entry) => !entry.flag || GetConfigurationValue<boolean>(entry.flag, false) === true);
    const tabsWidth = visibleTabs.reduce((total, entry) => total + entry.width, 0);
    const tabLefts = visibleTabs.map((_, index) => WINDOW_WIDTH / 2 - tabsWidth / 2 + visibleTabs.slice(0, index).reduce((total, entry) => total + entry.width, 0));

    if (hubWindow === 'none') return null;

    return (
        <>
            <VoltCardView
                className="volt-collectibles-hub"
                frameStyle={3}
                isResizable={false}
                nativeShadow
                style={{ display: hubWindow === 'shown' ? undefined : 'none', ...(frameImage ? ({ '--volt-card-frame-3': frameImage } as CSSProperties) : {}) }}
                uniqueKey="collectibles-hub"
            >
                <VoltCardHeaderView headerText={LocalizeText('collectibles.title')} onCloseClick={hide} />
                <div className="volt-collectibles-hub-content">
                    <div className="volt-collectibles-abs is-clipped" style={at(-5, -2, 500, 122)}>
                        <SlotBorder color={0x2c1d29} style={at(0, 0, 498, 125)}>
                            <TintedBitmap color={0x804138} src={scoreBackgroundGradient} stretchY={false} style={at(0, 0, 498, 122)} />
                            <TintedBitmap blend={0.25} color={0xfc7c5a} src={scoreBackground} stretchX={false} stretchY={false} style={at(0, 0, 166, 121)} />
                            <TintedBitmap blend={0.25} color={0xfc7c5a} src={scoreBackgroundRight} stretchX={false} stretchY={false} style={at(332, -160, 166, 286)} />
                            <TintedBitmap color={levelColor} src={scoreElement2} style={at(0, 17, 300, 54)} />
                            <TintedBitmap color={levelColor} src={scoreElement} stretchX={false} stretchY={false} style={at(299, 17, 92, 72)} />
                            <TintedBitmap position="center" src={cabinetElement} stretchX={false} stretchY={false} style={at(-2, -1, 130, 128)} />
                            <div className="volt-collectibles-abs" style={at(116, 21, 220, 45)}>
                                <div className="volt-collectibles-text is-score is-right" style={at(0, 0, 158, 18)}>{LocalizeText('collectibles.score')}</div>
                                <div className="volt-collectibles-text is-score is-nowrap" style={at(158, 0, 62, 18)}>{String(score.score)}</div>
                                <div className="volt-collectibles-text is-score is-right" style={at(0, 26, 158, 18)}>{LocalizeText('collectibles.high_score')}</div>
                                <div className="volt-collectibles-text is-score is-nowrap" style={at(158, 26, 62, 18)}>{String(score.highestScore)}</div>
                            </div>
                            <img alt="" className="volt-collectibles-abs" draggable={false} src={levelBackground} style={at(335, 2, 64, 68)} />
                            <div className="volt-collectibles-abs" style={at(344, 16, 45, 35)}>
                                <div className="volt-collectibles-text is-level is-center" style={at(2, 0, 40, 26)}>{String(score.level)}</div>
                                <div className="volt-collectibles-text is-level-title is-center" style={at(3, 22, 41, 14)}>{LocalizeText('collectibles.level').toUpperCase()}</div>
                            </div>
                            <SlotBorder color={0xa99490} style={at(419, 18, 70, 22)}>
                                <SlotBorder color={0x3a2f29} style={at(1, 1, 68, 20)}>
                                    <div className="volt-collectibles-text is-center is-white" style={at(2, 1, 45, 17)}>{String(getCurrencyAmount(1000))}</div>
                                </SlotBorder>
                            </SlotBorder>
                            <img alt="" className="volt-collectibles-abs" draggable={false} src={silverIcon} style={at(466, 17, 24, 24)} />
                            <SlotBorder color={0xa99490} style={at(419, 48, 70, 22)}>
                                <SlotBorder color={0x3a2f29} style={at(1, 1, 68, 20)}>
                                    <div className="volt-collectibles-text is-center is-white" style={at(2, 1, 45, 17)}>{String(getCurrencyAmount(1001))}</div>
                                </SlotBorder>
                            </SlotBorder>
                            <img alt="" className="volt-collectibles-abs" draggable={false} src={emeraldIcon} style={at(466, 47, 24, 24)} />
                        </SlotBorder>
                        {/* tab_bg is a child of the 122px header container, so the header clips its bottom 8px. */}
                        {tabsWidth > 350 && <SlotBorder blend={0.4} color={0x000000} style={at(-2, 91, 502, 39)} />}
                    </div>
                    <div className="volt-collectibles-abs" style={at(-5, 89, 498, 34)}>
                        {visibleTabs.map((entry, index) => (
                            <button
                                key={entry.tab}
                                className={`volt-collectibles-tab ${currentTab === entry.tab ? 'is-selected' : ''}`}
                                style={at(tabLefts[index], 0, entry.width, 32)}
                                type="button"
                                onClick={() => setCurrentTab(entry.tab)}
                            >
                                {LocalizeText(entry.caption)}
                            </button>
                        ))}
                    </div>
                    <CollectiblesRewardsTabView visible={currentTab === 'rewards'} walletAddresses={walletAddresses} />
                    <CollectiblesCollectionsTabView activation={activation} visible={currentTab === 'collections'} wallets={wallets} onSelectWallet={selectWallet} />
                    {/* Mount order follows CollectiblesView.initWidgets, so the tabs send their first requests in AIR's order. */}
                    <CollectiblesMintingTabView activation={activation} visible={currentTab === 'minting'} onPurchase={showPurchase} />
                    <CollectiblesTransferTabView stardustWallet={wallets?.stardust ?? null} transferWallets={transferWallets} visible={currentTab === 'transfer'} />
                    <CollectiblesShopTabView activeWallet={activation.wallet} visible={currentTab === 'shop'} onNotEnoughEmeralds={alertNotEnoughActivityPoints} onPurchase={showPurchase} />
                    <div className="volt-collectibles-abs" style={at(0, 125, 390, 419, { display: currentTab === 'info' ? undefined : 'none' })}>
                        <div className="volt-collectibles-text is-bold" style={at(0, 4, 480, 17)}>{LocalizeText('collectibles.info.title')}</div>
                        <CollectiblesHtmlText html={LocalizeText('collectibles.info.description')} style={at(0, 22, 480, 50)} onLinkClick={openWebPage} />
                        <CollectiblesHtmlText html={LocalizeText('collectibles.info.trading')} style={at(0, 75, 480, 60)} onLinkClick={openWebPage} />
                        <img alt="" className="volt-collectibles-abs" draggable={false} src={collectionDefault} style={at(128, 155, 216, 264)} />
                    </div>
                </div>
            </VoltCardView>
            {purchase && purchaseOffer && (
                <CatalogPurchaseConfirmView
                    frameColor={FRAME_COLOR}
                    isSubmitting={isPurchasing}
                    offer={purchaseOffer}
                    preview={
                        purchase.kind === 'mint_tokens' ? (
                            <img alt="" draggable={false} src={mintingTokenLarge} />
                        ) : (
                            <div className="volt-collectibles-confirm-preview">
                                <CollectibleProductPreviewView product={purchase.offer.productInfo} />
                            </div>
                        )
                    }
                    quantity={1}
                    onCancel={closePurchase}
                    onConfirm={confirmPurchase}
                />
            )}
        </>
    );
};
