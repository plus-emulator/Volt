import { FC } from 'react';
import { CollectiblesPurchase, GetCollectibleProductName, LocalizeText } from '../../api';
import stampSmall from '../../assets/images/collectibles/collectables-icon-curator-stamp-small.png';
import emeraldTiny from '../../assets/images/collectibles/pursearea-tiny-emerald-icon.png';
import { LayoutActivityPointIcon } from '../../common/layout/LayoutActivityPointIcon';
import { useCollectiblesShop } from '../../hooks/collectibles/useCollectiblesShop';
import { usePurse } from '../../hooks/purse';
import { CollectibleGridItemView } from './CollectibleGridItemView';
import { CollectibleProductPreviewView } from './CollectibleProductImageView';
import { CollectiblesNavigationNodeView, CollectiblesPreviewBackground } from './CollectiblesSharedView';
import { at, HubLoadingView, ShinyButton, SkinBorder } from './CollectiblesSkinView';

const EMERALD = 1001;

interface CollectiblesShopTabViewProps {
    visible: boolean;
    activeWallet: string;
    onPurchase: (purchase: CollectiblesPurchase) => void;
    onNotEnoughEmeralds: (type: number) => void;
}

/** ShopTab in shopContainer (-5,125 490x428). */
export const CollectiblesShopTabView: FC<CollectiblesShopTabViewProps> = ({ visible, activeWallet, onPurchase, onNotEnoughEmeralds }) => {
    const { ready, categories, activeCategory, activateCategory, offers, selectedIndex, setSelectedIndex, selected } = useCollectiblesShop();
    const { getCurrencyAmount } = usePurse();
    const canBuy = selected ? selected.mintedCount < selected.mintLimit || selected.mintLimit === -1 : false;

    // ShopTab.onClickBuy
    const buy = () => {
        if (!selected) return;

        if (getCurrencyAmount(EMERALD) < selected.emeraldPrice) {
            onNotEnoughEmeralds(EMERALD);

            return;
        }

        onPurchase({ kind: 'nft_store', offer: selected, wallet: activeWallet });
    };

    return (
        <div className="volt-collectibles-abs" style={at(-5, 125, 490, 428, { display: visible ? undefined : 'none' })}>
            <div className="volt-collectibles-abs" style={at(0, 0, 490, 428, { display: ready ? undefined : 'none' })}>
                <div className="volt-collectibles-abs" style={at(8, 3, 184, 425)}>
                    <SkinBorder blend={0.5} skin="six" style={at(0, 0, 184, 425)} />
                    <div className="volt-collectibles-list" style={at(3, 5, 178, 415)}>
                        {categories.map((category, index) => (
                            <CollectiblesNavigationNodeView
                                key={category.name}
                                active={activeCategory === index}
                                blueHighlight={false}
                                title={category.name}
                                onClick={() => activateCategory(index)}
                            />
                        ))}
                    </div>
                </div>
                {categories.length > 0 && (
                    <div className="volt-collectibles-abs" style={at(200, 3, 290, 425)}>
                        <div className="volt-collectibles-abs" style={at(0, 0, 290, 260)}>
                            <CollectiblesPreviewBackground width={296}>
                                <CollectibleProductPreviewView product={selected ? selected.productInfo : null} />
                                <div className="volt-collectibles-shade-d6" style={at(0, 0, 290, 26)}>
                                    <div className="volt-collectibles-text is-center is-white" style={at(0, 5, 290, 17)}>
                                        {selected ? GetCollectibleProductName(selected.productInfo) : ''}
                                    </div>
                                </div>
                                <div className="volt-collectibles-abs" style={at(114, 226, 172, 30)}>
                                    <div className="volt-collectibles-text is-price is-right is-white" style={at(0, 5, 50, 25)}>{selected ? String(selected.emeraldPrice) : ''}</div>
                                    <div className="volt-collectibles-centered" style={at(54, 6, 26, 20)}>
                                        <LayoutActivityPointIcon big type={EMERALD} />
                                    </div>
                                    <ShinyButton caption={LocalizeText('generic.buy')} color={0x01a101} disabled={!canBuy} style={at(84, 0, 88, 30)} onClick={buy} />
                                </div>
                                {selected && selected.mintLimit > 0 && (
                                    <div className="volt-collectibles-abs" style={at(184, 196, 102, 30)}>
                                        <div className="volt-collectibles-text is-price is-right is-white" style={at(0, 5, 80, 25)}>{`${selected.mintedCount}/${selected.mintLimit}`}</div>
                                        <img alt="" className="volt-collectibles-abs" draggable={false} src={stampSmall} style={at(84, 6, 18, 18)} />
                                    </div>
                                )}
                            </CollectiblesPreviewBackground>
                        </div>
                        <div className="volt-collectibles-grid" style={at(0, 270, 290, 153)}>
                            {offers.map((offer, index) => (
                                <CollectibleGridItemView
                                    key={`${offer.productCode}-${index}`}
                                    active={selectedIndex === index}
                                    complete={false}
                                    height={62}
                                    product={offer.productInfo}
                                    onClick={() => setSelectedIndex(index)}
                                >
                                    <div className="volt-collectibles-abs" style={at(0, 40, 50, 20)}>
                                        <div className="volt-collectibles-text is-bold is-right" style={at(0, 0, 34, 17)}>{String(offer.emeraldPrice)}</div>
                                        <img alt="" className="volt-collectibles-abs" draggable={false} src={emeraldTiny} style={at(34, 3, 12, 12)} />
                                    </div>
                                </CollectibleGridItemView>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {!ready && <HubLoadingView style={at(5, 0, 485, 429)} />}
        </div>
    );
};
