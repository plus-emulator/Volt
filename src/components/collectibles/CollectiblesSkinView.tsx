import { CSSProperties, FC, MouseEvent, ReactNode } from 'react';
import borderSix from '../../assets/images/collectibles/border-6-base.png';
import loadingIcon from '../../assets/images/collectibles/loading.png';
import borderColorless from '../../assets/images/habbo-skin/slices/border-colorless-base.png';
import shinyDefault from '../../assets/images/habbo-skin/slices/button-shiny-default.png';
import shinyDisabled from '../../assets/images/habbo-skin/slices/button-shiny-disabled.png';
import shinyHover from '../../assets/images/habbo-skin/slices/button-shiny-hover.png';
import shinyPressed from '../../assets/images/habbo-skin/slices/button-shiny-pressed.png';
import { useTintedSkin } from '../../common';

export const at = (left: number, top: number, width: number, height: number, extra: CSSProperties = null): CSSProperties => ({
    left,
    top,
    width,
    height,
    ...extra
});

// habbo_element_description: border style 2 = border_colorless (6px caps), 6 = border_6 (8px).
const BORDER_SKINS = {
    colorless: { src: borderColorless, slice: 6 },
    six: { src: borderSix, slice: 8 }
} as const;

export const toCssColor = (color: number): string => `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;

interface SkinBorderProps {
    skin: keyof typeof BORDER_SKINS;
    color?: number;
    blend?: number;
    style: CSSProperties;
    className?: string;
    children?: ReactNode;
}

/**
 * A skinned border window coloured like AIR: the skin's RGB is multiplied by the window colour. Every blended window of the hub layouts
 * uses its parent's graphic context (params 16), so the blend fades only the skin, never the children (WindowRendererItem.render).
 */
export const SkinBorder: FC<SkinBorderProps> = ({ skin, color = 0xffffff, blend = 1, style, className = '', children = null }) => {
    const { src, slice } = BORDER_SKINS[skin];
    const image = useTintedSkin(src, color);

    return (
        <div className={`volt-collectibles-abs ${className}`.trim()} style={style}>
            <div
                aria-hidden="true"
                className="volt-collectibles-border"
                style={{ borderWidth: slice, borderImageSlice: `${slice} fill`, borderImageWidth: `${slice}px`, borderImageSource: image ?? 'none', opacity: blend }}
            />
            {children}
        </div>
    );
};

interface SlotBorderProps {
    color: number;
    blend?: number;
    style: CSSProperties;
    className?: string;
    children?: ReactNode;
}

/** border style 3 (border_slot): the white slot skin coloured by the window colour is a flat fill with 2px stepped corners. */
export const SlotBorder: FC<SlotBorderProps> = ({ color, blend = 1, style, className = '', children = null }) => (
    <div className={`volt-collectibles-abs ${className}`.trim()} style={style}>
        <div aria-hidden="true" className="volt-collectibles-slot" style={{ backgroundColor: toCssColor(color), opacity: blend }} />
        {children}
    </div>
);

interface TintedBitmapProps {
    src: string;
    color?: number;
    blend?: number;
    /** stretched_x / stretched_y; when false the bitmap keeps its size, placed by `position`. */
    stretchX?: boolean;
    stretchY?: boolean;
    position?: string;
    style: CSSProperties;
    className?: string;
}

/** static_bitmap: an asset drawn into its rect, optionally coloured and blended. */
export const TintedBitmap: FC<TintedBitmapProps> = ({ src, color = null, blend = 1, stretchX = true, stretchY = true, position = 'left top', style, className = '' }) => {
    const tinted = useTintedSkin(color === null ? null : src, color);
    const image = color === null ? `url("${src}")` : tinted;

    return (
        <div
            aria-hidden="true"
            className={`volt-collectibles-bitmap ${className}`.trim()}
            style={{
                ...style,
                backgroundImage: image ?? 'none',
                backgroundSize: `${stretchX ? '100%' : 'auto'} ${stretchY ? '100%' : 'auto'}`,
                backgroundPosition: position,
                opacity: blend
            }}
        />
    );
};

interface ShinyButtonProps {
    caption: string;
    color?: number;
    disabled?: boolean;
    /** Style 5 uses the button_shiny_black layout (white caption); style 3 keeps the default caption colour. */
    whiteCaption?: boolean;
    style: CSSProperties;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

/** button style 3 / 5: button_shiny in the window colour. */
export const ShinyButton: FC<ShinyButtonProps> = ({ caption, color = 0xffffff, disabled = false, whiteCaption = true, style, onClick }) => {
    const normal = useTintedSkin(shinyDefault, color);
    const hover = useTintedSkin(shinyHover, color);
    const pressed = useTintedSkin(shinyPressed, color);
    const disabledSkin = useTintedSkin(shinyDisabled, color);
    const skin = {
        '--volt-collectibles-button': normal ?? 'none',
        '--volt-collectibles-button-hover': hover ?? normal ?? 'none',
        '--volt-collectibles-button-pressed': pressed ?? normal ?? 'none',
        '--volt-collectibles-button-disabled': disabledSkin ?? normal ?? 'none'
    } as CSSProperties;

    return (
        <button
            className={`volt-collectibles-button ${whiteCaption ? 'is-white' : ''}`.trim()}
            disabled={disabled}
            style={{ ...style, ...skin }}
            type="button"
            onClick={onClick}
        >
            {caption}
        </button>
    );
};

/** loading_contents: a style-2 border with the loading icon turning 90 degrees a second (CollectionsTab.var_2869). */
export const HubLoadingView: FC<{ style: CSSProperties }> = ({ style }) => (
    <div className="volt-collectibles-loading" style={style}>
        <SkinBorder color={0xa4a49f} skin="colorless" style={at(185, 155, 113, 116)} />
        <img alt="" className="volt-collectibles-loading-icon" draggable={false} src={loadingIcon} style={at(205, 175, 75, 75)} />
    </div>
);
