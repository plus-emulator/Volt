import { FC, SyntheticEvent } from 'react';

// v75 centres a bitmap in the thumb (40x40 on desktop) by flooring the odd pixel, where flex centring would round it up.
const centerIcon = (event: SyntheticEvent<HTMLImageElement>) =>
{
    const image = event.currentTarget;
    const size = (image.closest<HTMLElement>('.volt-inventory-thumb')?.clientWidth || 42) - 2;

    image.style.left = `${Math.floor((size - image.naturalWidth) / 2)}px`;
    image.style.top = `${Math.floor((size - image.naturalHeight) / 2)}px`;
};

export const InventoryThumbIconView: FC<{ iconUrl: string }> = ({ iconUrl }) => (
    <div className="volt-inventory-thumb-image">
        <img src={iconUrl} alt="" draggable={false} onLoad={centerIcon} />
    </div>
);
