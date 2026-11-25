import { FC } from 'react';
import { IsTouchLayout, useVoltLayout } from '../../../api';
import { AirSkinButton, AirSkinButtonProps } from '../../../common/air/AirSkinButton';

/** The AIR button on desktop; a 44 px touch button on phones and tablets. */
export const InventoryActionButton: FC<AirSkinButtonProps & { touchGreen?: boolean }> = ({ touchGreen = false, ...props }) => {
    const isTouch = IsTouchLayout(useVoltLayout());

    if (!isTouch) return <AirSkinButton {...props} />;

    const { caption, className = '', disabled, onClick } = props;

    return (
        <button type="button" className={`volt-inventory-touch-button ${touchGreen ? 'is-green' : ''} ${className}`} disabled={disabled} onClick={onClick}>
            {caption}
        </button>
    );
};
