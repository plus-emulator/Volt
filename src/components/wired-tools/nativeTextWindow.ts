import { useEffect, useState } from 'react';
import { loadNativeFont, measureNativeText } from '../../common/native-text/NativeFont';
import { NativeTextStyleName, nativeTextStyles } from '../../common/native-text/NativeTextStyles';

export interface TextWindowField {
    text: string;
    textStyle: NativeTextStyleName;
}

/** The widths of auto sized text windows, floor(textWidth + 4) each, or null until the fonts are loaded. */
export const useTextWindowWidths = (fields: TextWindowField[]): number[] | null => {
    const [widths, setWidths] = useState<number[]>(null);
    const key = JSON.stringify(fields);

    useEffect(() => {
        let disposed = false;
        const measured = (JSON.parse(key) as TextWindowField[]).map(async ({ text, textStyle }) => {
            const style = nativeTextStyles[textStyle];
            const { font } = await loadNativeFont(style);
            return Math.floor(measureNativeText(font, text, style) + 4);
        });
        Promise.all(measured)
            .then((result) => !disposed && setWidths(result))
            .catch(() => !disposed && setWidths(null));

        return () => {
            disposed = true;
        };
    }, [key]);

    return widths;
};

/** A window kept centred while it resizes. */
export interface CentredWindow {
    left: number;
    width: number;
    /** The odd pixel of the last resize, carried to the next one. */
    rest: number;
}

export const startCentred = (left: number, width: number): CentredWindow => ({ left, width, rest: 0 });

/**
 * WindowController.setRectangle with "on resize align center": each resize moves the window by half the width change, truncated
 * toward zero, and carries the odd pixel to the next resize.
 */
export const resizeCentred = (window: CentredWindow, width: number): void => {
    const change = window.rest - (width - window.width);
    const step = Math.trunc(change / 2);
    window.left += step;
    window.rest = change - step * 2;
    window.width = width;
};
