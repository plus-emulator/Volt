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
