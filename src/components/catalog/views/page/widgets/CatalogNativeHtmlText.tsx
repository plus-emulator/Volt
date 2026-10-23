import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { compositeAir32RetainedToOpaque, resolveLineMetrics, roundTiesEven } from '../../../../../common/native-text/Air32NativeTextRenderer';
import { loadNativeFont, measureNativeText, NativeFontStyle, supportsNativeText } from '../../../../../common/native-text/NativeFont';
import { useNativeTextScale } from '../../../../../common/native-text/NativeTextScale';
import { nativeTextStyles } from '../../../../../common/native-text/NativeTextStyles';

interface CatalogNativeHtmlTextProps {
    /** The page text, as the html window's htmlText. */
    html: string;
    /** The html window's width; lines wrap inside its 2px gutters. */
    width: number;
    /** The surface colour under the text. */
    background: number;
    className?: string;
}

type Run = { text: string; style: NativeFontStyle };

// LocalizationCatalogWidget.setLinkStyle: a:link is underlined #333333.
const LINK_COLOR = 0x333333;

const parseRuns = (html: string, base: NativeFontStyle): Run[] => {
    const root = new DOMParser().parseFromString(`<div>${html.replace(/\r\n?/g, '\n')}</div>`, 'text/html').body.firstElementChild;
    const runs: Run[] = [];
    const visit = (node: Node, style: NativeFontStyle) => {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent) runs.push({ text: node.textContent, style });
            return;
        }
        if (!(node instanceof HTMLElement)) return;
        if (node.tagName === 'BR') {
            runs.push({ text: '\n', style });
            return;
        }
        const next = { ...style };
        if (node.matches('B, STRONG')) next.bold = true;
        if (node.matches('I, EM')) next.italic = true;
        if (node.matches('U')) next.underline = true;
        if (node.tagName === 'A') {
            next.underline = true;
            next.color = LINK_COLOR;
        }
        node.childNodes.forEach((child) => visit(child, next));
        if (node.tagName === 'P') runs.push({ text: '\n', style });
    };
    root?.childNodes.forEach((child) => visit(child, base));
    return runs;
};

/**
 * AIR html window text (u_regular, word wrap, not scrollable) drawn natively: bold, italic and link runs share one TextField
 * layout, so lines wrap across runs and every baseline sits on round(2 + ascent + index * lineHeight).
 */
export const CatalogNativeHtmlText: FC<CatalogNativeHtmlTextProps> = ({ html, width, background, className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [height, setHeight] = useState<number>(null);
    const scale = useNativeTextScale();
    const plainText = useMemo(() => new DOMParser().parseFromString(html ?? '', 'text/html').body.textContent ?? '', [html]);

    useEffect(() => {
        let disposed = false;

        const render = async () => {
            const base: NativeFontStyle = { ...nativeTextStyles.u_regular, color: 0 };
            const runs = parseRuns(html ?? '', base);
            const loadedRuns = await Promise.all(runs.map(async (run) => ({ ...run, loaded: await loadNativeFont(run.style) })));
            if (disposed || loadedRuns.some((run) => !supportsNativeText(run.loaded.font, run.text.replace(/\n/g, '')))) return;

            type Piece = (typeof loadedRuns)[number] & { x: number };
            const limit = width - 4;
            const lines: Piece[][] = [[]];
            let lineWidth = 0;
            // A line is drawn per style run, like one TextField line: same-style tokens join so their advances stay unrounded.
            const push = (run: (typeof loadedRuns)[number], text: string) => {
                const line = lines[lines.length - 1];
                const previous = line[line.length - 1];
                if (previous && previous.style === run.style) {
                    previous.text += text;
                    lineWidth = previous.x + measureNativeText(run.loaded.font, previous.text, run.style);
                    return;
                }
                line.push({ ...run, text, x: lineWidth });
                lineWidth += measureNativeText(run.loaded.font, text, run.style);
            };
            const newLine = () => {
                lines.push([]);
                lineWidth = 0;
            };

            // TextField.wrapText: whitespace hangs at the end of its line, a word that does not fit starts the next one.
            for (const run of loadedRuns) {
                for (const token of run.text.split(/(\n|[^\S\n]+)/).filter(Boolean)) {
                    if (token === '\n') {
                        newLine();
                        continue;
                    }
                    const tokenWidth = measureNativeText(run.loaded.font, token, run.style);
                    if (/^\s+$/.test(token) || lineWidth + tokenWidth <= limit || lineWidth === 0) {
                        push(run, token);
                        continue;
                    }
                    newLine();
                    push(run, token);
                }
            }

            const baseLoaded = await loadNativeFont(base);
            if (disposed || !canvasRef.current) return;
            const metrics = resolveLineMetrics(baseLoaded.font.swfFont, base.size, false);
            const lineOffset = (index: number) => roundTiesEven(2 + metrics.ascent + index * metrics.textHeight) - roundTiesEven(2 + metrics.ascent);
            const fieldHeight = Math.ceil(lines.length * metrics.textHeight) + 4;
            const pixelWidth = width * scale;
            const pixelHeight = fieldHeight * scale;
            const pixels = new Uint8ClampedArray(pixelWidth * pixelHeight * 4);

            lines.forEach((line, index) =>
                line.forEach((piece) => {
                    if (!piece.text.trim() && !piece.style.underline) return;
                    piece.loaded.renderer.render(piece.text, {
                        size: piece.style.size * scale,
                        color: piece.style.color ?? 0,
                        antiAliasType: piece.style.antiAliasType ?? 'advanced',
                        gridFitType: 'pixel',
                        thickness: piece.style.thickness ?? 0,
                        sharpness: piece.style.sharpness ?? 0,
                        kerning: piece.style.kerning ?? true,
                        fontStyle: piece.style.italic ? 'italic' : 'normal',
                        stageQuality: 'high',
                        renderingPipeline: 'habbo-retained',
                        textDecoration: piece.style.underline ? 'underline' : null,
                        target: {
                            pixels: pixels.subarray(lineOffset(index) * scale * pixelWidth * 4),
                            width: pixelWidth,
                            height: pixelHeight - lineOffset(index) * scale,
                            offsetX: Math.round(piece.x * scale)
                        }
                    });
                })
            );

            const canvas = canvasRef.current;
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
            const composited = compositeAir32RetainedToOpaque(pixels, [(background >>> 16) & 255, (background >>> 8) & 255, background & 255, 255]);
            canvas.getContext('2d').putImageData(new ImageData(composited, pixelWidth, pixelHeight), 0, 0);
            setHeight(fieldHeight);
        };

        render().catch((error) => {
            if (!disposed) console.warn('Native html text rendering failed', error);
        });

        return () => {
            disposed = true;
        };
    }, [html, width, background, scale]);

    return (
        <div className={className}>
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                style={{ display: height ? 'block' : 'none', width, height: height ?? undefined, imageRendering: scale > 1 ? 'auto' : 'pixelated' }}
            />
            <span
                style={
                    height
                        ? { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'pre-wrap' }
                        : { whiteSpace: 'pre-wrap' }
                }
            >
                {plainText}
            </span>
        </div>
    );
};
