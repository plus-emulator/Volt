import { FurnitureType } from '@volt/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../../../api';
import { LayoutCurrencyIcon, LayoutFurniImageView, VoltCardHeaderView, VoltCardView } from '../../../../../common';
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

/**
 * chest_upgrade (WiredChestUpgradeConfirmationView): a 353x287 frame whose content starts at (1,25); the itemlist "content" sits
 * 8px lower, so a layout child at (x, y) is drawn at (x + 1, y + 33) of the frame.
 */
export const ChestUpgradeView: FC<ChestUpgradeViewProps> = ({ chestTypeId, step, currentCapacity, quantity, options, costCredits, costDiamonds, error, onQuantityChange, onBuy, onClose }) => (
    <VoltCardView className="volt-chest-upgrade-air" frameStyle={3} isResizable={false} style={{ width: 353, height: 287 }} unconstrainedPosition>
        <VoltCardHeaderView headerText="" onCloseClick={onClose}>
            <ChestTitle text={LocalizeText('wiredchests.upgrade.title')} />
        </VoltCardHeaderView>
        <div className="volt-chest-upgrade-air__image">{chestTypeId > 0 && <LayoutFurniImageView direction={2} productClassId={chestTypeId} productType={FurnitureType.FLOOR} />}</div>
        <div className="volt-chest-upgrade-air__properties">
            <ChestText background={0xe9e9e1} maxWidth={197} size={14} text={LocalizeText('wiredchests.upgrade.capacity.extra', ['purchase_capacity'], [String(step * quantity)])} textStyle="u_bold" />
            <ChestText background={0xe9e9e1} maxWidth={197} text={LocalizeText('wiredchests.upgrade.capacity.current', ['current_capacity'], [String(currentCapacity)])} />
            <ChestText background={0xe9e9e1} maxWidth={197} text={LocalizeText('wiredchests.upgrade.capacity.new', ['new_capacity'], [String(currentCapacity + step * quantity)])} />
            <div className="volt-chest-upgrade-air__amount">
                <ChestText background={0xe9e9e1} text={LocalizeText('wiredchests.upgrade.capacity.amount')} />
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
            <ChestText background={0xe9e9e1} size={14} text={LocalizeText('catalog.purchase.confirmation.dialog.cost')} />
            <ChestText bold background={0xe9e9e1} size={14} text={String(costCredits * quantity)} />
            <LayoutCurrencyIcon type={-1} />
            <ChestText bold background={0xe9e9e1} size={14} text="+" />
            <ChestText bold background={0xe9e9e1} size={14} text={String(costDiamonds * quantity)} />
            <LayoutCurrencyIcon type={5} />
        </div>
        {error && <ChestText bold background={0xe9e9e1} className="volt-chest-upgrade-air__error" color={0xc42f3d} maxWidth={327} text={error} />}
        <ChestShinyButton airName="cancel_button" caption={LocalizeText('catalog.purchase_confirmation.cancel')} rect={[14, 247, 110, 27]} onClick={onClose} />
        <ChestBuyButton caption={LocalizeText('catalog.purchase_confirmation.buy')} disabled={!!error} rect={[229, 247, 110, 27]} onClick={onBuy} />
    </VoltCardView>
);
