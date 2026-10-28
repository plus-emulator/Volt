import { CSSProperties, FC, useEffect, useState } from 'react';
import { NativeText } from '../../common/native-text/NativeText';
import { loadNativeFont, measureNativeText } from '../../common/native-text/NativeFont';
import { NativeTextStyleName, nativeTextStyles } from '../../common/native-text/NativeTextStyles';

const OVERFLOW = '...';

interface Fitted {
    text: string;
    width: number;
}

/**
 * The text as the TextField shows it and its width. With overflow_replace (TextController.refreshTextImage) a text wider than
 * the limit loses characters from the end until the shortened text and "..." fit.
 */
const useFittedText = (text: string, textStyle: NativeTextStyleName, limit?: number): Fitted | null => {
    const [fitted, setFitted] = useState<Fitted | null>(null);

    useEffect(() => {
        let disposed = false;
        const style = nativeTextStyles[textStyle];
        loadNativeFont(style)
            .then(({ font }) => {
                if (disposed) return;
                const measure = (value: string) => measureNativeText(font, value, style);
                let shown = text;
                if (limit !== undefined && measure(text) > limit) {
                    let length = text.length - 1;
                    while (length > 0 && measure(text.slice(0, length) + OVERFLOW) > limit) length--;
                    shown = text.slice(0, length) + OVERFLOW;
                }
                setFitted({ text: shown, width: measure(shown) });
            })
            .catch(() => setFitted({ text, width: 0 }));
        return () => {
            disposed = true;
        };
    }, [text, textStyle, limit]);

    return fitted;
};

interface WiredMenuLabelProps {
    text: string;
    bold?: boolean;
    /** Another text style than u_regular / u_bold, such as the frame caption. */
    textStyle?: NativeTextStyleName;
    color?: number;
    /** overflow_replace: the widest text that is shown whole; a wider one is cut and ends with "...". */
    overflowWidth?: number;
    /** `button` centres like a button caption, which rounds a half pixel down instead of up. */
    align?: 'left' | 'center' | 'button' | 'right';
    /** The width the text window aligns in, for centred and right aligned text. */
    width?: number;
    className?: string;
    style?: CSSProperties;
}

/**
 * Where the TextField sits in a window `width` wide: an auto sized field is floor(textWidth + 4) wide and centred with rounding;
 * a right aligned field ends at the window's right edge and its pen lands on floor(width - 2 - textWidth).
 */
const fieldLeft = (align: WiredMenuLabelProps['align'], width: number, textWidth: number) => {
    if (align === 'center') return Math.round((width - Math.floor(textWidth + 4)) / 2);
    if (align === 'button') return Math.floor((width - Math.floor(textWidth + 4)) / 2);
    if (align === 'right') return Math.floor(width - 2 - textWidth) - 2;
    return 0;
};

/** A pixel-mode AIR TextField (Ubuntu 12, 2px gutter) drawn by the native glyph renderer. */
export const WiredMenuLabel: FC<WiredMenuLabelProps> = ({ text, bold = false, textStyle, color = 0, overflowWidth, align = 'left', width, className, style }) => {
    const styleName = textStyle ?? (bold ? 'u_bold' : 'u_regular');
    const fitted = useFittedText(text, styleName, overflowWidth);
    const left = width === undefined || !fitted ? 0 : fieldLeft(align, width, fitted.width);

    return (
        <NativeText
            nativeResolution
            transparent
            background={0xffffff}
            className={className}
            overrides={{ color }}
            style={{ ...style, marginLeft: left, visibility: fitted ? undefined : 'hidden' }}
            text={fitted?.text ?? text}
            textStyle={styleName}
        />
    );
};
