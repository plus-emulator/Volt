import { NftCollectionData } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import {
    FormatCollectiblesDate,
    FriendlyTime,
    GetCollectibleProductName,
    GetCollectibleProductType,
    GetCollectionProgressColor,
    localizeWithFallback,
    LocalizeText
} from '../../api';
import searchClearIcon from '../../assets/images/collectibles/icons-close.png';
import checkmarkIcon from '../../assets/images/collectibles/icon-checkmark-small.png';
import { AirInputSurface } from '../../common/air/AirWindow';
import { HabboDropMenuView } from '../../common/dropmenu/HabboDropMenuView';
import { CollectionPreview, COLLECTION_SORTS, useCollectiblesCollections } from '../../hooks/collectibles/useCollectiblesCollections';
import { CollectiblesWalletActivation, CollectiblesWallets, STARDUST_WALLET_DISPLAY_NAME } from '../../hooks/collectibles/useCollectiblesHub';
import { CollectibleGridItemView } from './CollectibleGridItemView';
import { CollectibleProductPreviewView } from './CollectibleProductImageView';
import { CollectiblesHtmlText, CollectiblesNavigationNodeView, CollectiblesPreviewBackground } from './CollectiblesSharedView';
import { at, HubLoadingView, ShinyButton, SkinBorder, SlotBorder, toCssColor } from './CollectiblesSkinView';

// CollectionView bonus timer colours.
const BONUS_ACTIVE = { top: 0x00910a, bottom: 0x037c00 };
const BONUS_EXPIRED = { top: 0xff2d2d, bottom: 0xb00000 };
const PROGRESS_BAR_WIDTH = 280;

const collectionTitle = (collection: NftCollectionData) => localizeWithFallback(`collectibles.set.${collection.collectionId}`, collection.collectionName);

/** CollectionView.updateBonusProgressBar: null hides the bar (no claim window). */
const getBonusProgress = (collection: NftCollectionData, now: number) => {
    const released = collection.releasedTime;
    const snapshot = collection.snapshotTime;

    if (released === -1 || snapshot === -1) return null;

    if (now >= snapshot) {
        return {
            colors: BONUS_EXPIRED,
            width: PROGRESS_BAR_WIDTH,
            text: localizeWithFallback('collectibles.preview.bonus_claim_ended', 'Bonus item claim period ended - %date%', ['date'], [FormatCollectiblesDate(snapshot)])
        };
    }

    const remaining = Math.max(0, snapshot - now);
    const duration = snapshot - released;
    const fraction = duration <= 0 ? 1 : Math.min(1, Math.max(0, remaining / duration));

    return {
        colors: BONUS_ACTIVE,
        width: Math.trunc(PROGRESS_BAR_WIDTH * fraction),
        text: `${LocalizeText('collectibles.preview.time_left')}: ${FriendlyTime.format(remaining / 1000)}`
    };
};

interface CompletionHeaderProps {
    collection: NftCollectionData;
    preview: Extract<CollectionPreview, { status: 'bonus' | 'reward' }>;
    onClaim: () => void;
}

/** bonus_or_reward_container: the bonus or reward item, the bonus timer and the claim button. */
const CompletionHeader: FC<CompletionHeaderProps> = ({ collection, preview, onClaim }) => {
    const [now, setNow] = useState(() => Date.now());
    const isBonus = preview.status === 'bonus';

    // PROGRESS_BAR_UPDATE_THRESHOLD: the bonus timer refreshes once a second.
    useEffect(() => {
        if (!isBonus) return;

        const interval = setInterval(() => setNow(Date.now()), 1000);

        return () => clearInterval(interval);
    }, [isBonus]);

    const progress = isBonus ? getBonusProgress(collection, now) : null;

    return (
        <div className="volt-collectibles-abs" style={at(0, 0, 290, 200)}>
            <div className="volt-collectibles-shade-d6" style={at(0, 0, 290, progress ? 60 : 38)}>
                <div className="volt-collectibles-abs" style={at(4, 4, 282, 52)}>
                    <div className="volt-collectibles-text is-small is-center is-gold" style={at(0, 0, 282, 16)}>
                        {LocalizeText('collectibles.preview.completion_bonus')}
                    </div>
                    <div className="volt-collectibles-text is-center is-white" style={at(0, 14, 282, 17)}>
                        {GetCollectibleProductName(preview.item)}
                    </div>
                    {progress && (
                        <div className="volt-collectibles-progress-bar" style={at(0, 34, 282, 18)}>
                            <div className="volt-collectibles-abs" style={at(1, 1, 280, 16)}>
                                <div className="volt-collectibles-abs" style={at(0, 0, progress.width, 8, { backgroundColor: toCssColor(progress.colors.top) })} />
                                <div className="volt-collectibles-abs" style={at(0, 8, progress.width, 8, { backgroundColor: toCssColor(progress.colors.bottom) })} />
                            </div>
                            <div className="volt-collectibles-text is-small is-center is-white" style={at(0, 1, 282, 16)}>
                                {progress.text}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {preview.claimVisible && <ShinyButton caption={LocalizeText('collectibles.claim')} color={0x01a101} disabled={!preview.claimEnabled} style={at(186, 166, 97, 30)} onClick={onClaim} />}
        </div>
    );
};

interface CollectiblesCollectionsTabViewProps {
    visible: boolean;
    wallets: CollectiblesWallets;
    activation: CollectiblesWalletActivation;
    onSelectWallet: (index: number) => void;
}

/** CollectionsTab in collectionsContainer (0,125 485x429). */
export const CollectiblesCollectionsTabView: FC<CollectiblesCollectionsTabViewProps> = ({ visible, wallets, activation, onSelectWallet }) => {
    const { ready, navigation, navigationSeq, sort, selectSort, search, setSearch, activeNodeId, activateCollection, shownCollection, preview, selectItem, claim } = useCollectiblesCollections(activation);
    const [productInfoVisible, setProductInfoVisible] = useState(false);
    const walletLabels = wallets ? wallets.addresses.map((address) => (address === wallets.stardust ? STARDUST_WALLET_DISPLAY_NAME : address)) : [];
    const walletIndex = wallets ? wallets.addresses.indexOf(activation.wallet) : -1;
    const walletLabel = walletIndex >= 0 ? walletLabels[walletIndex] : null;
    const collection = shownCollection;
    const selectedItem = collection && preview.status === 'item' ? collection.items[preview.index] : null;
    const isComplete = collection ? collection.collectedItemCount === collection.totalItemCount : false;

    return (
        <div className="volt-collectibles-abs" style={at(0, 125, 485, 429, { display: visible ? undefined : 'none' })}>
            <div className="volt-collectibles-abs" style={at(0, 0, 485, 429, { display: ready ? undefined : 'none' })}>
                <HabboDropMenuView
                    caption={STARDUST_WALLET_DISPLAY_NAME}
                    className="volt-collectibles-dropmenu"
                    disabled={!walletLabels.length}
                    displayCaption={walletLabel && walletLabel.length > 19 ? `${walletLabel.substring(0, 19)}...` : undefined}
                    label={STARDUST_WALLET_DISPLAY_NAME}
                    options={walletLabels.map((label, index) => ({ value: index, label }))}
                    skinStyle={3}
                    style={at(4, 4, 184, 24)}
                    value={walletIndex >= 0 ? walletIndex : null}
                    onSelect={onSelectWallet}
                />
                <HabboDropMenuView
                    caption="Sort"
                    className="volt-collectibles-dropmenu"
                    label="Sort"
                    options={COLLECTION_SORTS.map((key, index) => ({ value: index, label: localizeWithFallback(key, [ 'Default', 'Progress', 'Score' ][index]) }))}
                    skinStyle={3}
                    style={at(4, 32, 184, 24)}
                    value={sort}
                    onSelect={selectSort}
                />
                <AirInputSurface className="volt-collectibles-search" style={at(4, 60, 184, 24)}>
                    <div className="volt-collectibles-abs" style={at(160, 0, 24, 24)}>
                        {search.length > 0 && <img alt="" className="volt-collectibles-centered-image" draggable={false} src={searchClearIcon} style={at(2, 2, 20, 20)} />}
                        <button aria-label="clear" className="volt-collectibles-search-clear" title="clear" type="button" style={at(0, 0, 24, 24)} onClick={() => setSearch('')} />
                    </div>
                    <input className="volt-collectibles-search-input" style={at(4, 4, 156, 20)} type="text" value={search} onChange={(event) => setSearch(event.target.value)} />
                    {!search.length && <div className="volt-collectibles-search-placeholder" style={at(4, 4, 156, 20)}>{LocalizeText('generic.search')}</div>}
                </AirInputSurface>
                <div className="volt-collectibles-abs" style={at(4, 88, 184, 341)}>
                    <SkinBorder blend={0.5} skin="six" style={at(0, 0, 184, 341)} />
                    <div className="volt-collectibles-list" style={at(3, 5, 178, 331)}>
                        {navigation.map((entry) => {
                            // CollectionsTab.filterSearchResults compares the lower-cased name with the typed text as it is.
                            if (search.length > 0 && !entry.collectionName.toLowerCase().includes(search)) return null;

                            return (
                                <CollectiblesNavigationNodeView
                                    key={`${navigationSeq}-${entry.collectionId}`}
                                    active={activeNodeId === entry.collectionId}
                                    blueHighlight
                                    progress={{
                                        started: entry.collectedItemCount > 0,
                                        color: GetCollectionProgressColor(entry.collectedItemCount, entry.totalItemCount),
                                        percent: Math.trunc((entry.collectedItemCount * 100) / entry.totalItemCount)
                                    }}
                                    title={collectionTitle(entry)}
                                    onClick={() => activateCollection(entry)}
                                />
                            );
                        })}
                    </div>
                </div>
                {collection && navigation.length > 0 && (
                    <div className="volt-collectibles-abs" style={at(195, 3, 290, 425)}>
                        <SlotBorder color={0xcbd1d8} style={at(0, 0, 290, 30)}>
                            <div className="volt-collectibles-text is-large" style={at(4, 4, 240, 21)}>{collectionTitle(collection)}</div>
                            <div className="volt-collectibles-abs" style={at(248, 2, 40, 26)}>
                                <SlotBorder color={GetCollectionProgressColor(collection.collectedItemCount, collection.totalItemCount)} style={at(0, 0, 40, 26)} />
                                <div className="volt-collectibles-text is-center is-white" style={at(2, 4, 36, 17)}>{`${collection.collectedItemCount}/${collection.totalItemCount}`}</div>
                            </div>
                        </SlotBorder>
                        <div className="volt-collectibles-abs" style={at(0, 34, 290, 260)}>
                            <CollectiblesPreviewBackground>
                                <CollectibleProductPreviewView product={selectedItem ?? (preview.status === 'bonus' || preview.status === 'reward' ? preview.item : null)} />
                                {selectedItem && (
                                    <>
                                        <div
                                            className="volt-collectibles-shade-d6"
                                            style={at(0, 0, 290, 26)}
                                            onMouseEnter={() => setProductInfoVisible(true)}
                                            onMouseLeave={() => setProductInfoVisible(false)}
                                        >
                                            <div className="volt-collectibles-text is-center is-white" style={at(0, 5, 290, 17)}>{GetCollectibleProductName(selectedItem)}</div>
                                        </div>
                                        {productInfoVisible && (
                                            <div className="volt-collectibles-product-info" style={at(0, 26, 290, 194)}>
                                                <div className="volt-collectibles-product-info-list" style={at(24, 24, 242, 140)}>
                                                    {[
                                                        [ LocalizeText('collectibles.item.type'), GetCollectibleProductType(selectedItem) ],
                                                        [ LocalizeText('collectibles.item.rarity'), selectedItem.rarity ],
                                                        [ LocalizeText('collectibles.item.xp'), String(selectedItem.score) ]
                                                    ].map(([ key, value ]) => (
                                                        <div key={key} className="volt-collectibles-product-info-entry">
                                                            <div className="volt-collectibles-text is-right is-orange" style={at(0, 1, 136, 17)}>{key}</div>
                                                            <div className="volt-collectibles-text is-white" style={at(140, 1, 102, 20, { opacity: 0.8 })}>{value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="volt-collectibles-shade-aa" style={at(0, 220, 290, 40)}>
                                            <SlotBorder color={0x5a1003} style={at(4, 4, 282, 32)}>
                                                <CollectiblesHtmlText
                                                    className="is-small is-center is-white"
                                                    html={LocalizeText(selectedItem.amount > 0 ? 'collectibles.preview.product.complete' : 'collectibles.preview.product.incomplete', ['amount'], [`<font color="#FFC800">${selectedItem.score}</font>`])}
                                                    style={at(4, 8, 274, 16)}
                                                />
                                            </SlotBorder>
                                        </div>
                                    </>
                                )}
                                {!selectedItem && (preview.status === 'bonus' || preview.status === 'reward') && (
                                    <CompletionHeader collection={collection} preview={preview} onClaim={claim} />
                                )}
                                {!selectedItem && (
                                    <div className="volt-collectibles-shade-aa" style={at(0, 200, 290, 60)}>
                                        <CollectiblesHtmlText
                                            className="is-center is-white"
                                            html={LocalizeText('collectibles.preview.score', ['progress', 'goal'], [`<font color="#00FF12">${collection.collectionScore}</font>`, String(collection.collectionTotalScore)])}
                                            style={at(0, 3, 290, 17)}
                                        />
                                        <SlotBorder color={0x5a1003} style={at(4, 24, 282, 32)}>
                                            <CollectiblesHtmlText
                                                className="is-small is-center is-white"
                                                html={LocalizeText(isComplete ? 'collectibles.preview.reward_collected' : 'collectibles.preview.reward', ['amount'], [`<font color="#FFC800">${collection.collectionBoostScore}</font>`])}
                                                style={at(4, 2, 274, 28)}
                                            />
                                        </SlotBorder>
                                    </div>
                                )}
                            </CollectiblesPreviewBackground>
                        </div>
                        <div className="volt-collectibles-grid" style={at(0, 300, 290, 123)}>
                            {collection.items.map((item, index) => (
                                <CollectibleGridItemView
                                    key={`${item.productCode}-${index}`}
                                    active={preview.status === 'item' && preview.index === index}
                                    complete={item.amount > 0}
                                    height={61}
                                    product={item}
                                    onClick={() => selectItem(index)}
                                >
                                    <div className="volt-collectibles-abs" style={at(0, 45, 50, 16)}>
                                        <SlotBorder color={item.amount > 0 ? 0x337c00 : 0x718daa} style={at(3, 1, 44, 12)} />
                                        <div className="volt-collectibles-text is-tiny is-center is-white" style={at(0, 0, 50, 15)}>{`x${item.amount}`}</div>
                                    </div>
                                    {item.amount > 0 && <img alt="" className="volt-collectibles-abs" draggable={false} src={checkmarkIcon} style={at(31, 3, 16, 16)} />}
                                </CollectibleGridItemView>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {!ready && <HubLoadingView style={at(0, 0, 485, 429)} />}
        </div>
    );
};
