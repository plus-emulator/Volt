import { CSSProperties, FC, useLayoutEffect, useRef, useState } from 'react';
import { NativeCenteredField } from '../../../../../common/native-text/NativeCenteredField';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { NativeTextStyleName } from '../../../../../common/native-text/NativeTextStyles';
import { CatalogAirShinyButton } from '../../../../catalog/views/page/layout/CatalogAirShinyButton';

interface ChestTextProps {
    text: string;
    /** Surface colour under the text, for the retained glyph edges. */
    background: number;
    textStyle?: NativeTextStyleName;
    bold?: boolean;
    color?: number;
    /** The window's font_size variable. */
    size?: number;
    /** Window blend: AIR draws the whole text window at this alpha. */
    blend?: number;
    maxWidth?: number;
    className?: string;
    style?: CSSProperties;
    /** Told the drawn text field height. */
    onHeight?: (height: number) => void;
    /**
     * An auto-sized window in an item list is int(size + 4) wide and high, the raster field ceil(size) + 4: one pixel larger for
     * Ubuntu's fractional advances and line heights, so the next item moves back by one.
     */
    truncate?: boolean;
}

/** A layout text window: Ubuntu themed windows default to u_regular; `bold` is the window's bold variable. */
export const ChestText: FC<ChestTextProps> = ({ text, background, textStyle = 'u_regular', bold = false, color, size, blend = 1, maxWidth, className, style, onHeight, truncate = false }) => (
    <NativeText
        nativeResolution
        transparent
        background={background}
        className={className}
        maxWidth={maxWidth}
        onRaster={onHeight ? (raster) => raster && onHeight(raster.canvas.height) : undefined}
        overrides={{ ...(bold ? { bold: true } : {}), ...(color !== undefined ? { color } : {}), ...(size !== undefined ? { size } : {}) }}
        style={{ ...(blend < 1 ? { opacity: blend } : {}), ...(truncate ? { marginRight: -1, marginBottom: -1 } : {}), ...style }}
        text={text}
        textStyle={textStyle}
    />
);

interface ChestButtonProps {
    caption: string;
    /** x, y, width and height inside the parent, from the layout XML. */
    rect: [number, number, number, number];
    airName: string;
    disabled?: boolean;
    title?: string;
    onClick?: () => void;
}

/** Button style 3 (button_shiny) with its caption, named like the AIR window. */
export const ChestShinyButton: FC<ChestButtonProps> = ({ caption, rect, airName, disabled = false, title, onClick }) => (
    <span className="volt-chest-air__button" data-air-name={airName} title={title} style={{ left: rect[0], top: rect[1], width: rect[2], height: rect[3] }}>
        <CatalogAirShinyButton caption={caption} disabled={disabled} rect={[0, 0, rect[2], rect[3]]} onClick={onClick} />
    </span>
);

interface ChestIconButtonProps {
    airName: string;
    icon: string;
    /** Icon offset inside the 24x24 button. */
    iconAt: [number, number];
    title: string;
    disabled?: boolean;
    style?: CSSProperties;
    onClick: () => void;
}

/** container_button style 7: the 24px shiny skin with a static bitmap child. */
export const ChestIconButton: FC<ChestIconButtonProps> = ({ airName, icon, iconAt, title, disabled = false, style, onClick }) => (
    <button
        aria-label={title}
        className="volt-catalog-air-shiny is-h24 volt-chest-air__icon-button"
        data-air-name={airName}
        disabled={disabled}
        style={style}
        title={title}
        type="button"
        onClick={onClick}
    >
        <img alt="" draggable={false} src={icon} style={{ left: iconAt[0], top: iconAt[1] }} />
    </button>
);

interface ChestCheckboxProps {
    airName: string;
    checked: boolean;
    disabled?: boolean;
    label: string;
    onToggle: (checked: boolean) => void;
    style?: CSSProperties;
}

/** A checkbox (habbo_skin_button_checkbox, 15x15) and its label 20px to the right, as one itemlist row. */
export const ChestCheckbox: FC<ChestCheckboxProps> = ({ airName, checked, disabled = false, label, onToggle, style }) => (
    <label className={`volt-chest-air__checkbox-row${disabled ? ' is-disabled' : ''}`} style={style}>
        <input
            checked={checked}
            className="volt-chest-air__checkbox"
            data-air-name={airName}
            disabled={disabled}
            type="checkbox"
            onChange={(event) => onToggle(event.target.checked)}
        />
        <ChestText background={0xdadada} className="volt-chest-air__checkbox-label" text={label} />
    </label>
);

/** The frame caption: u_frame_title in white, centred in the title bar on a whole pixel (floor), following the window width. */
export const ChestTitle: FC<{ text: string }> = ({ text }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const [width, setWidth] = useState(0);

    useLayoutEffect(() => {
        const bar = ref.current;
        if (!bar) return;

        const observer = new ResizeObserver(() => setWidth(bar.clientWidth));
        setWidth(bar.clientWidth);
        observer.observe(bar);

        return () => observer.disconnect();
    }, []);

    return (
        <span ref={ref} className="volt-chest-air__title">
            <NativeCenteredField width={width}>
                <NativeText nativeResolution transparent background={0x377998} overrides={{ color: 0xffffff }} text={text} textStyle="u_frame_title" />
            </NativeCenteredField>
        </span>
    );
};

/** button_thick style 5 with the 0x00aa00 colour: the thick green skin and a white bold caption. */
export const ChestBuyButton: FC<{ caption: string; rect: [number, number, number, number]; disabled?: boolean; onClick: () => void }> = ({ caption, rect, disabled = false, onClick }) => (
    <button className="volt-chest-air__buy" data-air-name="buy_button" disabled={disabled} style={{ left: rect[0], top: rect[1], width: rect[2], height: rect[3] }} type="button" onClick={onClick}>
        <span className="volt-chest-air__buy-caption">
            <NativeCenteredField width={rect[2]}>
                <NativeText nativeResolution transparent background={0x00aa00} overrides={{ color: 0xffffff }} text={caption} textStyle="button_shiny_bold" />
            </NativeCenteredField>
        </span>
    </button>
);
