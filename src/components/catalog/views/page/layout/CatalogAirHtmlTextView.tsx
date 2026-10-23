import { CSSProperties, FC } from 'react';
import { SanitizeHtml } from '../../../../../api';
import { NativeFontStyle } from '../../../../../common/native-text/NativeFont';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { NativeTextStyleName } from '../../../../../common/native-text/NativeTextStyles';

interface AirHtmlFormat {
    text: string;
    bold: boolean;
    italic: boolean;
    color: number | null;
    size: number | null;
    /** Links or formatting that only part of the text has: one native raster cannot show it. */
    mixed: boolean;
}

const hasAncestor = (node: Node, root: Node, test: (element: Element) => boolean) => {
    for (let parent = node.parentNode; parent && parent !== root; parent = parent.parentNode) {
        if (parent instanceof Element && test(parent)) return true;
    }

    return false;
};

/** The nearest <font> attribute value of a text node. */
const fontAttribute = (node: Node, root: Node, name: string): string | null => {
    for (let parent = node.parentNode; parent && parent !== root; parent = parent.parentNode) {
        if (!(parent instanceof Element) || parent.tagName !== 'FONT') continue;

        const value = parent.getAttribute(name);

        if (value) return value;
    }

    return null;
};

const fontColor = (node: Node, root: Node): number | null => {
    const value = fontAttribute(node, root, 'color');

    return value && /^#[0-9a-f]{6}$/i.test(value) ? parseInt(value.slice(1), 16) : null;
};

const fontSize = (node: Node, root: Node): number | null => {
    const value = Number.parseInt(fontAttribute(node, root, 'size') ?? '', 10);

    return Number.isFinite(value) && value > 0 ? value : null;
};

const uniform = <T,>(values: T[]): T | null => (new Set(values).size === 1 ? values[0] : null);

/**
 * The text a catalog html field shows, with the bold, italic, font colour and size that the whole text shares. `mixed` tells
 * when part of the text is formatted differently or is a link.
 */
export const getAirHtmlFormat = (html: string): AirHtmlFormat => {
    const source = (html ?? '').replace(/\r\n?/g, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p[^>]*>/gi, '\n');
    const body = new DOMParser().parseFromString(source, 'text/html').body;
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const nodes: Node[] = [];

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.textContent.trim()) nodes.push(node);
    }

    const all = (test: (node: Node) => boolean) => nodes.length > 0 && nodes.every(test);
    const some = (test: (node: Node) => boolean) => nodes.some(test);
    const isBold = (node: Node) => hasAncestor(node, body, (element) => element.tagName === 'B' || element.tagName === 'STRONG');
    const isItalic = (node: Node) => hasAncestor(node, body, (element) => element.tagName === 'I' || element.tagName === 'EM');
    const colors = nodes.map((node) => fontColor(node, body));
    const sizes = nodes.map((node) => fontSize(node, body));
    const bold = all(isBold);
    const italic = all(isItalic);
    const color = uniform(colors);
    const size = uniform(sizes);

    return {
        text: (body.textContent ?? '').replace(/^\n+|\n+$/g, ''),
        bold,
        italic,
        color,
        size,
        mixed:
            !!body.querySelector('a') ||
            (!bold && some(isBold)) ||
            (!italic && some(isItalic)) ||
            (color === null && colors.some((value) => value !== null)) ||
            (size === null && sizes.some((value) => value !== null))
    };
};

/** The sanitizer drops font and list tags: a font colour becomes a span colour and list items become line breaks. */
const toSanitizableHtml = (html: string): string =>
    (html ?? '')
        .replace(/<font\b[^>]*?\bcolor\s*=\s*["']?(#[0-9a-fA-F]{3,8})["']?[^>]*>/gi, '<span style="color:$1">')
        .replace(/<font\b[^>]*>/gi, '<span>')
        .replace(/<\/font>/gi, '</span>')
        .replace(/<li\b[^>]*>/gi, '')
        .replace(/<\/li>/gi, '<br>')
        .replace(/<\/?(ul|ol)\b[^>]*>/gi, '');

interface CatalogAirHtmlTextViewProps {
    html: string;
    /** The field width; the text wraps inside it. */
    width: number;
    /** The field height; text below it is cut off like the AIR field. */
    height?: number;
    background: number;
    textStyle?: NativeTextStyleName;
    bold?: boolean;
    color?: number;
    transparent?: boolean;
    className?: string;
    style?: CSSProperties;
}

/** An AIR html or formatted_text field drawn with the native text raster: the 2px gutter is in the raster, so it goes at the field's x,y. */
export const CatalogAirHtmlTextView: FC<CatalogAirHtmlTextViewProps> = (props) => {
    const { html, width, height, background, textStyle = 'u_regular', bold = false, color = 0x000000, transparent = false, className = '', style } = props;
    const format = getAirHtmlFormat(html);

    if (!format.text.trim()) return null;

    // Mixed formatting and links: the html as DOM text in the field's face (Ubuntu 12), inside the 2px gutter.
    if (format.mixed) {
        return (
            <div
                className={`volt-catalog-air-html is-dom ${className}`.trim()}
                dangerouslySetInnerHTML={{ __html: SanitizeHtml(toSanitizableHtml(html)) }}
                style={{ width, height, color: `#${color.toString(16).padStart(6, '0')}`, fontWeight: bold ? 700 : undefined, ...style }}
            />
        );
    }

    const overrides: Partial<NativeFontStyle> = { color: format.color ?? color };

    if (bold || format.bold) overrides.bold = true;
    if (format.italic) overrides.italic = true;
    if (format.size) overrides.size = format.size;

    return (
        <div className={`volt-catalog-air-html ${className}`.trim()} style={{ width, height, ...style }}>
            <NativeText
                background={background}
                maxWidth={width}
                overrides={overrides}
                text={format.text}
                textStyle={textStyle}
                transparent={transparent}
            />
        </div>
    );
};
