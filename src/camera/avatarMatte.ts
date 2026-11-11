// Finds the transparency of an image from two drawings of it, one on black and one on white. A pixel that looks the
// same on both is solid, and the more it differs the more of the backdrop shows through. This also gives a glow
// that is added to the room a soft edge, which a drawing on a transparent backdrop cannot.
export function matteOnTransparent(black: Uint8ClampedArray, white: Uint8ClampedArray): Uint8ClampedArray<ArrayBuffer>
{
    const image = new Uint8ClampedArray(black.length);

    for(let index = 0; index < black.length; index += 4)
    {
        const alpha = 255 - Math.min(white[index] - black[index], white[index + 1] - black[index + 1], white[index + 2] - black[index + 2]);

        if(alpha <= 0) continue;

        image[index] = (black[index] * 255) / alpha;
        image[index + 1] = (black[index + 1] * 255) / alpha;
        image[index + 2] = (black[index + 2] * 255) / alpha;
        image[index + 3] = alpha;
    }

    return image;
}

// The number of empty rows above and below the drawing in an image. An empty image has only rows above.
export function emptyRows(image: Uint8ClampedArray, width: number, height: number): { above: number, below: number }
{
    const shown = (row: number): boolean =>
    {
        const end = (row + 1) * width * 4;

        for(let index = (row * width * 4) + 3; index < end; index += 4) if(image[index]) return true;

        return false;
    };
    let above = 0;
    let below = 0;

    while((above < height) && !shown(above)) above++;

    while((below < (height - above)) && !shown(height - 1 - below)) below++;

    return { above, below };
}
