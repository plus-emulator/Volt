import { CSSProperties, FC } from 'react';
import { GetCollectibleProductName, GetCollectibleRarityColor, LocalizeText } from '../../api';
import bgStar from '../../assets/images/collectibles/bg-star-300x300.png';
import rarityFlag from '../../assets/images/collectibles/collectables-reward-rarity-flag.png';
import scoreBackgroundGradient from '../../assets/images/collectibles/collectables-score-background-gradient.png';
import frameBase from '../../assets/images/habbo-skin/slices/frame-ubuntu-3-base.png';
import { useTintedSkin, VoltCardHeaderView, VoltCardView } from '../../common';
import { useCollectiblesRewardBox } from '../../hooks/collectibles/useCollectiblesRewardBox';
import { CollectibleProductPreviewView } from './CollectibleProductImageView';
import { at, ShinyButton, SlotBorder, TintedBitmap } from './CollectiblesSkinView';

/** CollectiblesRewardBoxView (collectible_reward_xml, 424x570): the reward of a box the user opened, coloured by its rarity. */
export const CollectiblesRewardBoxView: FC<{}> = () => {
    const { reward, showNext } = useCollectiblesRewardBox();
    const rarityColor = GetCollectibleRarityColor(reward?.rarity);
    const frameImage = useTintedSkin(reward ? frameBase : null, rarityColor, 33);
    const starImage = useTintedSkin(bgStar, 0xffecac);

    if (!reward) return null;

    return (
        <VoltCardView
            className="volt-collectibles-reward-box"
            frameStyle={3}
            isResizable={false}
            nativeShadow
            style={frameImage ? ({ '--volt-card-frame-3': frameImage } as CSSProperties) : undefined}
            uniqueKey="collectibles-reward-box"
        >
            <VoltCardHeaderView headerText={LocalizeText('collectibles.reward_box.notif.title')} onCloseClick={showNext} />
            <div className="volt-collectibles-reward-box-content">
                <SlotBorder color={rarityColor} style={at(0, 0, 424, 537)} />
                <div className="volt-collectibles-abs" style={at(0, 0, 424, 350)}>
                    <div className="volt-collectibles-abs" style={at(-2, 0, 428, 565)}>
                        <TintedBitmap blend={0.5} color={0x000000} src={scoreBackgroundGradient} style={at(0, 0, 428, 348)} />
                        <SlotBorder blend={0.5} color={0x000000} style={at(0, 0, 428, 348)} />
                    </div>
                    <div className="volt-collectibles-abs" style={at(0, 0, 424, 58)}>
                        <div className="volt-collectibles-text is-center is-white is-reward-title" style={at(0, 4, 424, 24)}>{LocalizeText('collectibles.reward_box.contains')}</div>
                        <div className="volt-collectibles-text is-center is-reward-name" style={at(0, 32, 424, 26)}>{GetCollectibleProductName(reward)}</div>
                    </div>
                    <div className="volt-collectibles-abs" style={at(62, 25, 300, 300)}>
                        <div aria-hidden="true" className="volt-collectibles-bg-star" style={at(0, 0, 300, 300, { backgroundImage: starImage ?? 'none', opacity: 0.75 })} />
                        <div className="volt-collectibles-abs" style={at(5, 20, 290, 260)}>
                            <CollectibleProductPreviewView product={reward} />
                        </div>
                    </div>
                </div>
                <div className="volt-collectibles-abs" style={at(0, 348, 424, 187)}>
                    <SlotBorder blend={0.1} color={0x000fff} style={at(0, -2, 424, 50)} />
                    <div className="volt-collectibles-text is-center is-white is-reward-info" style={at(0, 80, 424, 19)}>{LocalizeText('collectibles.reward_box.info')}</div>
                    <ShinyButton caption={LocalizeText('generic.ok')} style={at(152, 124, 120, 30)} whiteCaption={false} onClick={showNext} />
                </div>
                <div className="volt-collectibles-abs" style={at(0, 300, 424, 96)}>
                    <TintedBitmap position="center" src={rarityFlag} stretchX={false} stretchY={false} style={at(0, 0, 424, 86)} />
                    <div className="volt-collectibles-text is-center is-rarity-title" style={at(0, 30, 424, 19)}>{LocalizeText('collectibles.item.rarity')}</div>
                    <div className="volt-collectibles-text is-center is-rarity" style={at(0, 50, 424, 24)}>{(reward.rarity ?? '').toUpperCase()}</div>
                </div>
            </div>
        </VoltCardView>
    );
};
