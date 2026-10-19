import { useEffect, useState } from 'react';

const tintedSkins = new Map<string, Promise<string>>();

/**
 * A skin bitmap coloured the way AIR colours a skinned window (core/window/graphics/renderer/BitmapSkinRenderer.as:65-75): every RGB channel is
 * multiplied by the window colour, alpha is kept. `rows` limits the colouring to the top rows (frame_3 only colours its 33px title).
 */
export const TintSkinImage = (src: string, color: number, rows: number = -1): Promise<string> =>
{
    const key = `${ src }|${ color }|${ rows }`;
    let tinted = tintedSkins.get(key);

    if (tinted) return tinted;

    tinted = new Promise<string>((resolve, reject) =>
    {
        const image = new Image();

        image.onload = () =>
        {
            const canvas = document.createElement('canvas');

            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const context = canvas.getContext('2d');

            if (!context) return reject(new Error('no 2d context'));

            context.drawImage(image, 0, 0);

            const data = context.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = data.data;
            const red = (color >> 16) & 0xff;
            const green = (color >> 8) & 0xff;
            const blue = color & 0xff;
            const lastRow = rows < 0 ? canvas.height : Math.min(rows, canvas.height);

            for (let index = 0; index < lastRow * canvas.width * 4; index += 4)
            {
                pixels[index] = Math.floor((pixels[index] * red) / 255);
                pixels[index + 1] = Math.floor((pixels[index + 1] * green) / 255);
                pixels[index + 2] = Math.floor((pixels[index + 2] * blue) / 255);
            }

            context.putImageData(data, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        image.onerror = () => reject(new Error(`could not load ${ src }`));
        image.src = src;
    });

    tinted.catch(() => tintedSkins.delete(key));
    tintedSkins.set(key, tinted);

    return tinted;
};

/** The CSS url() of a tinted skin bitmap, or null until it is ready. */
export const useTintedSkin = (src: string, color: number, rows: number = -1): string =>
{
    const [url, setUrl] = useState<string>(null);

    useEffect(() =>
    {
        let current = true;

        setUrl(null);

        if (!src || color === null || color === undefined || isNaN(color)) return;

        TintSkinImage(src, color & 0xffffff, rows)
            .then((dataUrl) => current && setUrl(`url("${ dataUrl }")`))
            .catch(() => current && setUrl(null));

        return () =>
        {
            current = false;
        };
    }, [src, color, rows]);

    return url;
};
