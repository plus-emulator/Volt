import { NftClaimData } from '@volt/renderer';
import { FC, useState } from 'react';
import { FormatCollectiblesDate, GetCollectibleProductName, LocalizeText } from '../../api';
import frankDontKnow from '../../assets/images/collectibles/image-frank-dont-know.png';
import { useCollectiblesRewardClaims } from '../../hooks/collectibles/useCollectiblesRewardClaims';
import { CollectibleProductIconView } from './CollectibleProductImageView';
import { CollectiblesHtmlText } from './CollectiblesSharedView';
import { at, HubLoadingView, ShinyButton, SlotBorder } from './CollectiblesSkinView';

/** RewardCollectibleItemRenderer in the 466x50 item_template; it uses the incomplete colouring (BaseItemWrapper.amount is 0). */
const RewardRow: FC<{ claim: NftClaimData }> = ({ claim }) => {
    const [hovered, setHovered] = useState(false);
    const colors = hovered ? { outline: 0xf5f6f8, background: 0xdbdddf } : { outline: 0x8f9db1, background: 0xc8cdd3 };

    return (
        <div className="volt-collectibles-reward-row" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            <SlotBorder color={colors.outline} style={at(0, 0, 466, 50)}>
                <SlotBorder color={colors.background} style={at(1, 1, 464, 48)} />
            </SlotBorder>
            <SlotBorder color={0x8f9db1} style={at(0, 0, 50, 50)}>
                <SlotBorder color={0xc8cdd3} style={at(1, 1, 48, 48)} />
            </SlotBorder>
            <SlotBorder color={0x8f9db1} style={at(54, 4, 408, 16)}>
                <div className="volt-collectibles-text is-bold is-white is-nowrap" style={at(1, 0, 405, 14)}>{GetCollectibleProductName(claim.claimItem)}</div>
            </SlotBorder>
            <CollectibleProductIconView product={claim.claimItem} variant="reward" />
            <div className="volt-collectibles-text is-tiny is-right is-wallet" style={at(204, 34, 260, 15)}>{claim.wallet}</div>
            <CollectiblesHtmlText
                className="is-tiny"
                html={`<b>${LocalizeText('collectibles.claim.collection')}</b> ${LocalizeText(`collectibles.set.${claim.claimItem.setId}`)}`}
                style={at(52, 20, 340, 14)}
            />
            <CollectiblesHtmlText className="is-tiny" html={`<b>${LocalizeText('collectibles.claim.expiration')}</b> ${FormatCollectiblesDate(claim.validTo)}`} style={at(52, 33, 340, 14)} />
            <div className="volt-collectibles-abs" style={at(27, 34, 20, 16)}>
                <SlotBorder color={0x8f9db1} style={at(0, 0, 20, 14)} />
                <div className="volt-collectibles-text is-tiny is-center is-white" style={at(0, 0, 20, 15)}>{`x${claim.claimLimit - claim.claimedAmount}`}</div>
            </div>
        </div>
    );
};

interface CollectiblesRewardsTabViewProps {
    visible: boolean;
    walletAddresses: string[];
}

/** RewardClaimsTab in rewardsContainer (0,125 485x429). */
export const CollectiblesRewardsTabView: FC<CollectiblesRewardsTabViewProps> = ({ visible, walletAddresses }) => {
    const { ready, claims, canClaim, claimAll } = useCollectiblesRewardClaims(walletAddresses);
    const hasClaims = claims.length > 0;

    return (
        <div className="volt-collectibles-abs" style={at(0, 125, 485, 429, { display: visible ? undefined : 'none' })}>
            {ready && hasClaims && (
                <div className="volt-collectibles-abs" style={at(0, 0, 485, 429)}>
                    <div className="volt-collectibles-list is-spaced" style={at(0, 0, 485, 374)}>
                        {claims.map((claim, index) => <RewardRow key={`${claim.claimId}-${claim.wallet}-${index}`} claim={claim} />)}
                    </div>
                    <SlotBorder color={0xbac3cd} style={at(0, 380, 486, 50)}>
                        <ShinyButton caption={LocalizeText('collectibles.claim_all')} color={0x2095d4} disabled={!canClaim} style={at(180, 10, 137, 30)} onClick={claimAll} />
                    </SlotBorder>
                </div>
            )}
            {ready && !hasClaims && (
                <div className="volt-collectibles-abs" style={at(0, 0, 485, 429)}>
                    <div className="volt-collectibles-text is-center is-wrap" style={at(19, 28, 450, 17)}>{LocalizeText('collectibles.no_claims')}</div>
                    <div className="volt-collectibles-centered" style={at(0, 150, 485, 176)}>
                        <img alt="" draggable={false} src={frankDontKnow} />
                    </div>
                </div>
            )}
            {!ready && <HubLoadingView style={at(0, 0, 485, 429)} />}
        </div>
    );
};
