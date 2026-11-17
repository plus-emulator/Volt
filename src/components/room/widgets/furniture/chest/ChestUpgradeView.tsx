import { FurnitureType } from '@volt/renderer';
import { FC, useState } from 'react';
import { LocalizeText } from '../../../../../api';
import creditIcon from '../../../../../assets/images/chest/air-icon-credit-big.png';
import diamondIcon from '../../../../../assets/images/chest/air-icon-diamond-big.png';
import { LayoutFurniImageView, VoltCardHeaderView, VoltCardView } from '../../../../../common';
import { HabboDropMenuView } from '../../../../../common/dropmenu/HabboDropMenuView';
import { ChestBuyButton, ChestShinyButton, ChestText, ChestTitle } from './ChestAirParts';

interface ChestUpgradeViewProps {
    chestTypeId: number;
    step: number;
    currentCapacity: number;
    quantity: number;
    options: number[];
    costCredits: number;
    costDiamonds: number;
    /** A localized reason the purchase is not possible, or an empty string. */
    error: string;
    onQuantityChange: (quantity: number) => void;
    onBuy: () => void;
    onClose: () => void;
}

/** The content itemlist (spacing 10) puts the buttons under the 164px product row, or under the error text when there is one. */
export const UPGRADE_BUTTONS_TOP = 33 + 164 + 10;

/**
 * chest_upgrade (WiredChestUpgradeConfirmationView): the frame's content starts at (1,25) and the itemlist "content" 8px lower,
 * so a layout child at (x, y) is drawn at (x + 1, y + 33). The frame ends 12px under the buttons.
 */
export const ChestUpgradeView: FC<ChestUpgradeViewProps> = ({ chestTypeId, step, currentCapacity, quantity, options, costCredits, costDiamonds, error, onQuantityChange, onBuy, onClose }) => {
    const [errorHeight, setErrorHeight] = useState(0);
    const buttonsTop = UPGRADE_BUTTONS_TOP + (error ? errorHeight + 10 : 0);

    return (
    <VoltCardView className="volt-chest-upgrade-air" frameStyle={3} isResizable={false} style={{ width: 353, height: buttonsTop + 27 + 12 }} unconstrainedPosition>
        <VoltCardHeaderView headerText="" onCloseClick={onClose}>
            <ChestTitle text={LocalizeText('wiredchests.upgrade.title')} />
        </VoltCardHeaderView>
        <div className="volt-chest-upgrade-air__image">{chestTypeId > 0 && <LayoutFurniImageView direction={2} productClassId={chestTypeId} productType={FurnitureType.FLOOR} />}</div>
        <div className="volt-chest-upgrade-air__properties">
            <ChestText truncate background={0xe9e9e1} maxWidth={197} size={14} text={LocalizeText('wiredchests.upgrade.capacity.extra', ['purchase_capacity'], [String(step * quantity)])} textStyle="u_bold" />
            <ChestText truncate background={0xe9e9e1} maxWidth={197} text={LocalizeText('wiredchests.upgrade.capacity.current', ['current_capacity'], [String(currentCapacity)])} />
            <ChestText truncate background={0xe9e9e1} maxWidth={197} text={LocalizeText('wiredchests.upgrade.capacity.new', ['new_capacity'], [String(currentCapacity + step * quantity)])} />
            <div className="volt-chest-upgrade-air__amount">
                <ChestText truncate background={0xe9e9e1} text={LocalizeText('wiredchests.upgrade.capacity.amount')} />
                <HabboDropMenuView<number>
                    label={LocalizeText('wiredchests.upgrade.capacity.amount')}
                    options={options.map((value) => ({ value, label: String(value) }))}
                    skinStyle={3}
                    style={{ width: 58 }}
                    value={quantity}
                    onSelect={onQuantityChange}
                />
            </div>
        </div>
        <div className="volt-chest-upgrade-air__price">
            <ChestText truncate background={0xe9e9e1} size={14} text={LocalizeText('catalog.purchase.confirmation.dialog.cost')} />
            <span className="volt-chest-upgrade-air__cost">
                <ChestText truncate bold background={0xe9e9e1} size={14} text={String(costCredits * quantity)} />
                <img alt="" draggable={false} src={creditIcon} />
                <ChestText truncate bold background={0xe9e9e1} size={14} text="+" />
                <ChestText truncate bold background={0xe9e9e1} size={14} text={String(costDiamonds * quantity)} />
                <img alt="" draggable={false} src={diamondIcon} />
            </span>
        </div>
        {error && <ChestText bold background={0xe9e9e1} className="volt-chest-upgrade-air__error" color={0xc42f3d} maxWidth={327} text={error} onHeight={setErrorHeight} />}
        <ChestShinyButton airName="cancel_button" caption={LocalizeText('catalog.purchase_confirmation.cancel')} rect={[14, buttonsTop, 110, 27]} onClick={onClose} />
        <ChestBuyButton caption={LocalizeText('catalog.purchase_confirmation.buy')} disabled={!!error} rect={[229, buttonsTop, 110, 27]} onClick={onBuy} />
    </VoltCardView>
    );
};
