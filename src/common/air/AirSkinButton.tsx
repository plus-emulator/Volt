import { ButtonHTMLAttributes, CSSProperties, FC, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { resolveLineMetrics, roundTiesEven } from '../native-text/Air32NativeTextRenderer';
import { loadNativeFont, measureNativeText, NativeFontStyle } from '../native-text/NativeFont';
import { NativeText } from '../native-text/NativeText';
import { NativeTextStyleName, nativeTextStyles } from '../native-text/NativeTextStyles';
import './AirSkinButton.css';

type SkinState = 'default' | 'hover' | 'pressed' | 'disabled';
const slice = (name: string) => new URL(`../../assets/images/habbo-skin/slices/${name}.png`, import.meta.url).href;

interface AirButtonKind {
    /** Slice files per state: the AIR skin template with its top and bottom caps and the stretchable middle rows. */
    skin: Record<SkinState, string>;
    cap: number;
    /** The window_layout of the type and style: label size, margins, text style and caption colour. */
    height: number;
    margins: [left: number, top: number, right: number, bottom: number];
    textStyle: NativeTextStyleName;
    color?: number;
}

const skin = (prefix: string): Record<SkinState, string> => ({
    default: slice(`${prefix}-default`),
    hover: slice(`${prefix}-hover`),
    pressed: slice(`${prefix}-pressed`),
    disabled: slice(`${prefix}-disabled`)
});
const plain = { default: slice('button-default'), hover: slice('button-hover'), pressed: slice('button-pressed'), disabled: slice('button-disabled') };

/** AIR habbo_element_description: window type and style to skin and window_layout. */
export const AIR_BUTTONS = {
    /** button style 0: habbo_skin_button_default, habbo_window_layout_button. */
    default: { skin: plain, cap: 3, height: 22, margins: [8, 4, 8, 4], textStyle: 'button_regular' },
    /** button style 1: habbo_skin_button_default_black, habbo_window_layout_button_black. */
    black: { skin: skin('button-black'), cap: 3, height: 22, margins: [8, 4, 8, 4], textStyle: 'button_regular', color: 0xffffff },
    /** button style 3: habbo_skin_button_shiny_default, habbo_window_layout_button_shiny. */
    shiny: { skin: skin('button-shiny'), cap: 5, height: 22, margins: [8, 2, 8, 3], textStyle: 'button_shiny_regular' },
    /** button style 6: the shiny skin coloured 0x00aa00, habbo_window_layout_button_shiny_black. */
    green: { skin: skin('button-shiny-green'), cap: 5, height: 28, margins: [10, 5, 10, 6], textStyle: 'button_shiny_regular', color: 0xffffff },
    /** button_thick style 0: habbo_skin_button_thick, habbo_window_layout_button_thick. */
    thick: { skin: skin('button-thick'), cap: 4, height: 22, margins: [8, 4, 8, 4], textStyle: 'button_bold' },
    /** button_thick style 3: habbo_skin_button_shiny_thick, habbo_window_layout_button_shiny_thick. */
    'shiny-thick': { skin: skin('button-shiny-thick'), cap: 5, height: 22, margins: [10, 2, 10, 3], textStyle: 'button_shiny_bold' },
    /** button_thick style 6: the shiny thick skin coloured 0x00aa00, habbo_window_layout_button_shiny_thick_black. */
    'shiny-thick-green': {
        skin: skin('button-shiny-thick-green'),
        cap: 5,
        height: 28,
        margins: [10, 5, 10, 6],
        textStyle: 'button_shiny_bold',
        color: 0xffffff
    },
    /** Volt only (AIR has no red button): the shiny skin in the purse logout red, laid out like the green button_thick. */
    red: { skin: skin('button-shiny-red'), cap: 5, height: 28, margins: [10, 5, 10, 6], textStyle: 'button_shiny_bold', color: 0xffffff }
} satisfies Record<string, AirButtonKind>;

export type AirButtonKindName = keyof typeof AIR_BUTTONS;

const stretched = new Map<string, Promise<string>>();

/** Stretch the middle rows with the 16.16 fixed-point sampling used by AIR's BitmapData.draw. */
function stretchSkin(url: string, cap: number, height: number): Promise<string> {
    const key = `${url}|${cap}|${height}`;
    if (!stretched.has(key)) {
        stretched.set(
            key,
            new Promise<string>((resolve, reject) => {
                const image = new Image();
                image.crossOrigin = 'anonymous';
                image.onload = () => {
                    try {
                        const middle = image.height - cap * 2;
                        const target = height - cap * 2;
                        if (middle <= 1 || target <= 0 || middle === target) return resolve(url);
                        const canvas = document.createElement('canvas');
                        canvas.width = image.width;
                        canvas.height = height;
                        const context = canvas.getContext('2d');
                        if (!context) return resolve(url);
                        context.drawImage(image, 0, 0, image.width, cap, 0, 0, image.width, cap);
                        const unit = 65536;
                        const step = roundTiesEven(middle * unit / target);
                        const first = roundTiesEven(step / 2);
                        for (let row = 0; row < target; row++) {
                            const source = cap + Math.floor((first + row * step) / unit);
                            context.drawImage(image, 0, source, image.width, 1, 0, cap + row, image.width, 1);
                        }
                        context.drawImage(image, 0, image.height - cap, image.width, cap, 0, height - cap, image.width, cap);
                        canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : url));
                    } catch {
                        resolve(url);
                    }
                };
                image.onerror = reject;
                image.src = url;
            })
        );
    }
    return stretched.get(key);
}

function useStretchedSkin(kind: AirButtonKind, height: number) {
    const [urls, setUrls] = useState<Record<SkinState, string>>(null);

    useEffect(() => {
        let disposed = false;
        const states: SkinState[] = ['default', 'hover', 'pressed', 'disabled'];
        Promise.all(states.map((state) => stretchSkin(kind.skin[state], kind.cap, height)))
            .then((list) => !disposed && setUrls(Object.fromEntries(states.map((state, index) => [state, list[index]])) as Record<SkinState, string>))
            .catch(() => !disposed && setUrls(null));
        return () => {
            disposed = true;
        };
    }, [kind, height]);

    return urls ?? kind.skin;
}

/** An auto-sized label text field: floor(textWidth + 4) by floor(textHeight + 4), the TextField gutters included. */
function useLabelField(text: string, textStyle: NativeTextStyleName) {
    const [field, setField] = useState<{ width: number; height: number }>(null);

    useEffect(() => {
        let disposed = false;
        const style = nativeTextStyles[textStyle];
        loadNativeFont(style)
            .then(({ font }) => {
                if (disposed) return;
                const metrics = resolveLineMetrics(font.swfFont, style.size, style.antiAliasType === 'normal');
                setField({ width: Math.floor(measureNativeText(font, text, style) + 4), height: Math.floor(metrics.textHeight + 4) });
            })
            .catch(() => !disposed && setField(null));
        return () => {
            disposed = true;
        };
    }, [text, textStyle]);

    return field;
}

export interface AirButtonOptions {
    /** The AIR button type and style. */
    kind?: AirButtonKindName;
    caption: string;
    /** The button height from the layout XML; the window_layout height when not given. */
    height?: number;
    /** width_min, width_max and height_max from the layout XML. */
    widthMin?: number;
    widthMax?: number;
    heightMax?: number;
    /** A text_style variable on the button in the layout XML. */
    textStyle?: NativeTextStyleName;
}

/**
 * An AIR button (ButtonController). The caption label is sized to its text plus the layout margins and the button is
 * resized to the label (width = 0, expand_to_accommodate_children), never below width_min. A width or height set by the call
 * site's layout acts like width_min / the layout height. The label sits at floor(button / 2) - floor(label / 2) on both axes.
 * A disabled button draws its caption at half alpha.
 */
export function useAirButton<T extends HTMLElement>({
    kind = 'shiny',
    caption,
    height,
    widthMin = 0,
    widthMax = Infinity,
    heightMax = Infinity,
    textStyle
}: AirButtonOptions) {
    const air: AirButtonKind = AIR_BUTTONS[kind];
    const fontStyle = textStyle ?? air.textStyle;
    const field = useLabelField(caption, fontStyle);
    const [left, top, right, bottom] = air.margins;
    const labelWidth = field ? field.width + left + right : 0;
    // TextLabelController.refresh sets the label to the text field plus margins on both axes once its width changes, so a Volter
    // label (13 + 8) is lower than the window layout's 22.
    const labelHeight = field ? field.height + top + bottom : air.height;
    const ref = useRef<T>(null);
    const [renderedHeight, setRenderedHeight] = useState(height ?? air.height);
    const skins = useStretchedSkin(air, renderedHeight);
    const textStyleDefinition = nativeTextStyles[fontStyle] as NativeFontStyle;
    const color = air.color ?? textStyleDefinition.color;
    // LabelRenderer draws a label with antiAliasType advanced in its own text colour, so a Volter caption sits on whole pixels.
    // The label size still uses the style's normal mode, like the shared text field AIR measures it with.
    const volter = textStyleDefinition.family === 'Volter';
    const overrides: Partial<NativeFontStyle> = {
        ...(volter ? { antiAliasType: 'advanced', kerning: false } : {}),
        ...(color === undefined ? {} : { color })
    };

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        const measure = () => element.offsetHeight && setRenderedHeight(element.offsetHeight);
        const observer = new ResizeObserver(measure);
        measure();
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const style = {
        '--air-skin-cap': `${air.cap}px`,
        '--air-skin-slice': air.cap,
        '--air-skin': `url("${skins.default}")`,
        '--air-skin-hover': `url("${skins.hover}")`,
        '--air-skin-pressed': `url("${skins.pressed}")`,
        '--air-skin-disabled': `url("${skins.disabled}")`,
        '--air-button-height': `${air.height}px`,
        minWidth: Math.min(widthMax, Math.max(widthMin, labelWidth)),
        maxWidth: Number.isFinite(widthMax) ? widthMax : undefined,
        minHeight: Math.min(heightMax, labelHeight),
        maxHeight: Number.isFinite(heightMax) ? heightMax : undefined,
        height
    } as CSSProperties;

    const captionNode = (
        <NativeText
            tinted={!volter}
            transparent
            background={0xf2f2f2}
            className="air-skin-button__caption"
            overrides={overrides}
            style={{
                left: `max(0px, calc(round(down, 50%, 1px) - ${Math.floor(labelWidth / 2) - left}px))`,
                top: `calc(max(0px, round(down, 50%, 1px) - ${Math.floor(labelHeight / 2)}px) + ${top}px)`
            }}
            text={caption}
            textStyle={fontStyle}
        />
    );

    return { ref, style, caption: captionNode, kind };
}

export interface AirSkinButtonProps extends AirButtonOptions, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    /** Drawn after the caption, for a call site that adds an icon. */
    children?: ReactNode;
}

export const AirSkinButton: FC<AirSkinButtonProps> = ({
    kind,
    caption,
    height,
    widthMin,
    widthMax,
    heightMax,
    textStyle,
    className = '',
    style,
    type = 'button',
    children,
    ...rest
}) => {
    const air = useAirButton<HTMLButtonElement>({ kind, caption, height, widthMin, widthMax, heightMax, textStyle });

    return (
        <button
            {...rest}
            ref={air.ref}
            className={`air-skin-button ${className}`.trim()}
            data-air-kind={air.kind}
            style={{ ...air.style, ...style }}
            type={type}
        >
            {air.caption}
            {children}
        </button>
    );
};

/**
 * The x of a button with on_resize_align_center after it went through the given widths. WindowController.setRectangle moves
 * the window by half of each width change and carries the odd pixel into the next change.
 */
export function centredResizeX(x: number, widths: number[]): number {
    let remainder = 0;

    for (let index = 1; index < widths.length; index++) {
        const change = remainder - (widths[index] - widths[index - 1]);
        const half = Math.trunc(change / 2);

        x += half;
        remainder = change - half * 2;
    }

    return x;
}

/** The caption when a button's children are only text, so it can be drawn as an AIR label. */
export function textCaption(children: ReactNode): string | null {
    if (typeof children === 'string' || typeof children === 'number') return String(children);
    if (Array.isArray(children) && children.length && children.every((child) => typeof child === 'string' || typeof child === 'number'))
        return children.join('');
    return null;
}
