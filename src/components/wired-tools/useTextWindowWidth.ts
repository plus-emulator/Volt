import { useEffect, useState } from 'react';
import { loadNativeFont, measureNativeText } from '../../common/native-text/NativeFont';
import { NativeTextStyleName, nativeTextStyles } from '../../common/native-text/NativeTextStyles';

/** The width of an auto sized text window, floor(textWidth + 4), or null until the font is loaded. */
export const useTextWindowWidth = (text: string, textStyle: NativeTextStyleName): number | null => {
    const [width, setWidth] = useState<number>(null);

    useEffect(() => {
        let disposed = false;
        const style = nativeTextStyles[textStyle];
        loadNativeFont(style)
            .then(({ font }) => !disposed && setWidth(Math.floor(measureNativeText(font, text, style) + 4)))
            .catch(() => undefined);

        return () => {
            disposed = true;
        };
    }, [text, textStyle]);

    return width;
};

