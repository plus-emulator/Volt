import { FC } from 'react';
import { LocalizeText } from '../../api';
import silverIcon from '../../assets/images/collectibles/pursearea-mid-silver-icon.png';
import transferSafe from '../../assets/images/collectibles/collectables-transfer-safe.png';
import { HabboDropMenuView } from '../../common/dropmenu/HabboDropMenuView';
import { useCollectiblesTransfer } from '../../hooks/collectibles/useCollectiblesTransfer';
import { at, HubLoadingView, ShinyButton, SlotBorder } from './CollectiblesSkinView';

interface CollectiblesTransferTabViewProps {
    visible: boolean;
    transferWallets: string[];
    stardustWallet: string;
}

/** TransferNftsTab in transferContainer (0,125 485x429). */
export const CollectiblesTransferTabView: FC<CollectiblesTransferTabViewProps> = ({ visible, transferWallets, stardustWallet }) => {
    const { ready, fee, selectedIndex, setSelectedIndex, canTransfer, transfer } = useCollectiblesTransfer(transferWallets, stardustWallet);
    const wallets = transferWallets ?? [];
    const selectedLabel = selectedIndex >= 0 ? wallets[selectedIndex] : null;

    return (
        <div className="volt-collectibles-abs" style={at(0, 125, 485, 429, { display: visible ? undefined : 'none' })}>
            <div className="volt-collectibles-abs" style={at(0, 0, 485, 429, { display: ready ? undefined : 'none' })}>
                <div className="volt-collectibles-text is-center is-wrap" style={at(19, 10, 450, 30)}>{LocalizeText('collectibles.transfer.description')}</div>
                <img alt="" className="volt-collectibles-abs" draggable={false} src={transferSafe} style={at(42, 120, 400, 180)} />
                <SlotBorder color={0xbac3cd} style={at(0, 380, 488, 50)}>
                    <HabboDropMenuView
                        className="volt-collectibles-dropmenu"
                        disabled={!wallets.length}
                        displayCaption={selectedLabel && selectedLabel.length > 32 ? `${selectedLabel.substring(0, 32)}...` : undefined}
                        label={LocalizeText('collectibles.transfer')}
                        options={wallets.map((wallet, index) => ({ value: index, label: wallet }))}
                        skinStyle={3}
                        style={at(10, 13, 260, 24)}
                        value={selectedIndex >= 0 ? selectedIndex : null}
                        onSelect={(index: number) => setSelectedIndex(index)}
                    />
                    <div className="volt-collectibles-token-cost" style={at(326, 10, 146, 30)}>
                        {fee > 0 && <div className="volt-collectibles-text is-cost is-bold">{String(fee)}</div>}
                        <span className="volt-collectibles-spacer" style={{ width: 4 }} />
                        {fee > 0 && <img alt="" className="volt-collectibles-row-icon" draggable={false} src={silverIcon} />}
                        <span className="volt-collectibles-spacer" style={{ width: 6 }} />
                        <ShinyButton caption={LocalizeText('collectibles.transfer')} color={0x2095d4} disabled={!canTransfer} style={{ position: 'relative', width: 100, height: 30 }} onClick={transfer} />
                    </div>
                </SlotBorder>
            </div>
            {!ready && <HubLoadingView style={at(0, 0, 485, 429)} />}
        </div>
    );
};
