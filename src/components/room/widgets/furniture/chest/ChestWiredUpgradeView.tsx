import { FurnitureType } from '@volt/renderer';
import { FC, useState } from 'react';
import { GetConfigurationValue, LocalizeText, SanitizeHtml } from '../../../../../api';
import { LayoutFurniImageView, VoltCardHeaderView, VoltCardView } from '../../../../../common';
import { ChestBuyButton, ChestShinyButton, ChestText, ChestTitle } from './ChestAirParts';
import { UPGRADE_BUTTONS_TOP } from './ChestUpgradeView';

interface ChestWiredUpgradeViewProps {
    chestTypeId: number;
    starter: boolean;
    buying: boolean;
    onBuy: () => void;
    onClose: () => void;
}

/** chest_wired_upgrade (WiredChestWiredUpdateConfirmationView): the chest_upgrade frame with the Wired icon, the warning and no price. */
export const ChestWiredUpgradeView: FC<ChestWiredUpgradeViewProps> = ({ chestTypeId, starter, buying, onBuy, onClose }) => {
    const [errorHeight, setErrorHeight] = useState(0);
    const buttonsTop = UPGRADE_BUTTONS_TOP + (starter ? errorHeight + 10 : 0);

    return (
    <VoltCardView className="volt-chest-upgrade-air" frameStyle={3} isResizable={false} style={{ width: 353, height: buttonsTop + 27 + 12 }} unconstrainedPosition>
        <VoltCardHeaderView headerText="" onCloseClick={onClose}>
            <ChestTitle text={LocalizeText('wiredchests.upgrade.title')} />
        </VoltCardHeaderView>
        <div className="volt-chest-upgrade-air__image">
            {chestTypeId > 0 && <LayoutFurniImageView direction={2} productClassId={chestTypeId} productType={FurnitureType.FLOOR} />}
            <img alt="" className="volt-chest-upgrade-air__wired-icon" draggable={false} src={`${GetConfigurationValue<string>('image.library.url', '')}catalogue/icon_80.png`} />
        </div>
        <div className="volt-chest-upgrade-air__properties">
            <ChestText truncate background={0xe9e9e1} maxWidth={197} size={14} text={LocalizeText('wiredchests.upgrade.wired.info')} textStyle="u_bold" />
            <div className="volt-chest-upgrade-air__warning" dangerouslySetInnerHTML={{ __html: SanitizeHtml(LocalizeText('wiredchests.big_fat_warning')) }} />
        </div>
        <div className="volt-chest-upgrade-air__price">
            <ChestText truncate background={0xe9e9e1} size={14} text={LocalizeText('catalog.purchase.confirmation.dialog.cost')} />
            <ChestText bold background={0xe9e9e1} size={14} text={LocalizeText('wiredchests.upgrade.wired.cost')} />
        </div>
        {starter && (
            <ChestText
                background={0xe9e9e1}
                className="volt-chest-upgrade-air__error"
                color={0xc42f3d}
                maxWidth={327}
                text={LocalizeText('wiredchests.upgrade.wired.error', ['reason'], [LocalizeText('wiredchests.upgrade.wired.error.reason.rookie_chest')])}
                onHeight={setErrorHeight}
            />
        )}
        <ChestShinyButton airName="cancel_button" caption={LocalizeText('catalog.purchase_confirmation.cancel')} rect={[14, buttonsTop, 110, 27]} onClick={onClose} />
        <ChestBuyButton caption={LocalizeText('catalog.purchase_confirmation.buy')} disabled={starter || buying} rect={[229, buttonsTop, 110, 27]} onClick={onBuy} />
    </VoltCardView>
    );
};
