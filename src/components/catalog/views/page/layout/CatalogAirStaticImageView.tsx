import { CSSProperties, FC, ReactNode, SyntheticEvent, useLayoutEffect, useRef, useState } from 'react';

/**
 * A bitmap window that centres a drawn image the way BitmapData.copyPixels does: at ((width - imageWidth) / 2,
 * (height - imageHeight) / 2) rounded down, so an odd difference never lands on half a pixel.
 */
export const CatalogAirCentredView: FC<{ width: number; height: number; className?: string; children: ReactNode }> = (props) => {
    const { width, height, className = '', children } = props;
    const innerRef = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

    useLayoutEffect(() => {
        const inner = innerRef.current;

        if (!inner) return;

        const update = () => setOffset({ left: Math.floor((width - inner.offsetWidth) / 2), top: Math.floor((height - inner.offsetHeight) / 2) });

        update();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(update);

        observer.observe(inner);

        return () => observer.disconnect();
    }, [width, height]);

    return (
        <div className={`volt-catalog-air-centred ${className}`.trim()} style={{ position: 'absolute', width, height, overflow: 'hidden' }}>
            <div ref={innerRef} style={{ position: 'absolute', left: offset.left, top: offset.top, display: 'flex' }}>
                {children}
            </div>
        </div>
    );
};

export type AirPivotPoint = 'top left' | 'top center' | 'center' | 'bottom center';

interface CatalogAirStaticImageViewProps {
    src: string;
    width: number;
    height: number;
    /** The static_bitmap pivot_point; images are never stretched (stretched_x and stretched_y false). */
    pivot?: AirPivotPoint;
    className?: string;
    style?: CSSProperties;
}

/** An AIR static_bitmap: the image keeps its own size, is placed on whole pixels by its pivot point and is cut at the window edges. */
export const CatalogAirStaticImageView: FC<CatalogAirStaticImageViewProps> = (props) => {
    const { src, width, height, pivot = 'top left', className = '', style } = props;
    const [offset, setOffset] = useState<{ left: number; top: number }>(null);

    const onLoad = (event: SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = event.currentTarget;
        const centreX = Math.floor((width - naturalWidth) / 2);
        const centreY = Math.floor((height - naturalHeight) / 2);

        switch (pivot) {
            case 'top center':
                setOffset({ left: centreX, top: 0 });
                return;
            case 'center':
                setOffset({ left: centreX, top: centreY });
                return;
            case 'bottom center':
                setOffset({ left: centreX, top: height - naturalHeight });
                return;
            default:
                setOffset({ left: 0, top: 0 });
        }
    };

    if (!src) return null;

    return (
        <div className={`volt-catalog-air-static-image ${className}`.trim()} style={{ position: 'absolute', width, height, overflow: 'hidden', ...style }}>
            <img
                key={src}
                alt=""
                draggable={false}
                src={src}
                style={{
                    position: 'absolute',
                    maxWidth: 'none',
                    imageRendering: 'pixelated',
                    ...(offset ? { left: offset.left, top: offset.top } : { visibility: 'hidden' })
                }}
                onLoad={onLoad}
            />
        </div>
    );
};
