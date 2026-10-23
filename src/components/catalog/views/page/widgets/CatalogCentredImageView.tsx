import { FC, SyntheticEvent, useState } from 'react';

/**
 * LocalizationCatalogWidget.setElementImage on a bitmap window: the image keeps its own size, centred on whole pixels
 * ((window - image) / 2, truncated) and clipped by the window. The parent element is the window.
 */
export const CatalogCentredImageView: FC<{ src: string; className?: string }> = ({ src, className }) => {
    const [offset, setOffset] = useState<{ left: number; top: number }>(null);

    const onLoad = (event: SyntheticEvent<HTMLImageElement>) => {
        const image = event.currentTarget;
        const view = image.parentElement;

        setOffset({
            left: Math.trunc((view.clientWidth - image.naturalWidth) / 2),
            top: Math.trunc((view.clientHeight - image.naturalHeight) / 2)
        });
    };

    return (
        <img
            alt=""
            className={className}
            src={src}
            style={{ position: 'absolute', maxWidth: 'none', ...(offset ? { left: offset.left, top: offset.top } : { visibility: 'hidden' }) }}
            onLoad={onLoad}
        />
    );
};
