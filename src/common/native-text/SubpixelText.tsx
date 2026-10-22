import { CSSProperties, FC, useEffect, useRef, useState } from 'react';
import { NativeText } from './NativeText';

/**
 * AIR draws a TextField with gridFitType "subpixel" (and every centred or right-aligned advanced field, where "pixel" falls back to it):
 * glyphs sit on 1/20 px pens and each pen phase has its own raster. These styles carry AIR's own rasters per phase
 * (WIN63-202610201032, rendered by the AIR runtime); characters without one are drawn by NativeText.
 */
export type SubpixelTextStyle = 'u_regular' | 'u_bold' | 'u_headline_small';

type FontAsset = { metrics: string; atlas: string };

// The advanced rasterizer thickens light text (Air32 color type): light colours have their own rasters.
const fontAssets: Record<SubpixelTextStyle, { dark: FontAsset; light?: FontAsset }> = {
    u_regular: {
        dark: {
            metrics: new URL('../../assets/native-fonts/subpixel/u_regular.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/u_regular.png', import.meta.url).href
        },
        light: {
            metrics: new URL('../../assets/native-fonts/subpixel/u_regular_light.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/u_regular_light.png', import.meta.url).href
        }
    },
    u_bold: {
        dark: {
            metrics: new URL('../../assets/native-fonts/subpixel/u_bold.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/u_bold.png', import.meta.url).href
        },
        light: {
            metrics: new URL('../../assets/native-fonts/subpixel/u_bold_light.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/u_bold_light.png', import.meta.url).href
        }
    },
    u_headline_small: {
        dark: {
            metrics: new URL('../../assets/native-fonts/subpixel/u_headline_small.json', import.meta.url).href,
            atlas: new URL('../../assets/native-fonts/subpixel/u_headline_small.png', import.meta.url).href
        }
    }
};

const isLightColor = (color: number) => 30 * ((color >>> 16) & 255) + 59 * ((color >>> 8) & 255) + 11 * (color & 255) > 20000;

interface SubpixelFont {
    size: number;
    emSquare: number;
    ascent: number;
    descent: number;
    /** DefineFont3 advance per character code, in 1/20480 em. */
    advance: Record<string, number>;
    /** Per character code, the tile of each pen phase: [atlasX, atlasY, width, height, x from the pen's pixel, y from the field top]. */
    glyphs: Record<string, number[][]>;
    coverage: Uint8ClampedArray;
    atlasWidth: number;
}

const loadingFonts = new Map<string, Promise<SubpixelFont>>();

const loadSubpixelFont = (style: SubpixelTextStyle, light: boolean) => {
    const variant = light && fontAssets[style].light ? 'light' : 'dark';
    const key = `${style}:${variant}`;
    if (!loadingFonts.has(key)) {
        const asset = fontAssets[style][variant];
        const loading = (async () => {
            const [metrics, image] = await Promise.all([
                fetch(asset.metrics).then((response) => response.json()),
                new Promise<HTMLImageElement>((resolve, reject) => {
                    const element = new Image();
                    element.onload = () => resolve(element);
                    element.onerror = reject;
                    element.src = asset.atlas;
                })
            ]);
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0);
            const rgba = context.getImageData(0, 0, image.width, image.height).data;
            const coverage = new Uint8ClampedArray(image.width * image.height);
            for (let index = 0; index < coverage.length; index++) coverage[index] = rgba[index * 4];
            return { ...metrics, coverage, atlasWidth: image.width } as SubpixelFont;
        })();
        loadingFonts.set(key, loading);
        loading.catch(() => loadingFonts.delete(key));
    }
    return loadingFonts.get(key);
};

const floorToTwips = (value: number) => Math.floor(value * 20) / 20;

interface SubpixelTextProps {
    text: string;
    textStyle: SubpixelTextStyle;
    color?: number;
    /** The surface colour the coverage is blended onto; ignored when transparent. */
    background: number;
    transparent?: boolean;
    align?: 'left' | 'center';
    /** A fixed text field width (gutters included); by default the field fits the text. */
    width?: number;
    className?: string;
    style?: CSSProperties;
    /** Hide the text from assistive technology, for an extra copy drawn for another state of the same label. */
    ariaHidden?: boolean;
}

export const SubpixelText: FC<SubpixelTextProps> = ({ text, textStyle, color = 0, background, transparent = false, align = 'left', width, className, style, ariaHidden = false }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [size, setSize] = useState<{ width: number; height: number }>(null);
    const [fallback, setFallback] = useState(false);

    useEffect(() => {
        let disposed = false;
        setSize(null);
        loadSubpixelFont(textStyle, isLightColor(color))
            .then((font) => {
                if (disposed || !canvasRef.current) return;
                if ([...text].some((character) => character !== ' ' && !font.glyphs[character.charCodeAt(0)])) {
                    setFallback(true);
                    return;
                }
                setFallback(false);
                const twips = (character: string) => ((font.advance[character.charCodeAt(0)] ?? 0) * font.size * 20) / font.emSquare;
                const exact = [...text].reduce((sum, character) => sum + twips(character), 0);
                const textWidth = Math.floor(exact / 20);
                const fieldWidth = width ?? textWidth + 4;
                const textHeight = floorToTwips((font.ascent * font.size) / font.emSquare) + floorToTwips((font.descent * font.size) / font.emSquare);
                const fieldHeight = Math.ceil(textHeight) + 4;
                // The line starts at the 2px gutter, or centred on the field's own width.
                const origin = align === 'center' ? Math.round(((fieldWidth - textWidth) / 2) * 20) : 40;
                const coverage = new Uint8ClampedArray(fieldWidth * fieldHeight);
                let cumulative = 0;
                for (const character of text) {
                    const pen = origin + Math.floor(cumulative + 0.5);
                    const tile = font.glyphs[character.charCodeAt(0)]?.[pen % 20];
                    if (tile) {
                        const [atlasX, atlasY, tileWidth, tileHeight, offsetX, offsetY] = tile;
                        const left = Math.floor(pen / 20) + offsetX;
                        for (let y = 0; y < tileHeight; y++) {
                            const targetY = offsetY + y;
                            if (targetY < 0 || targetY >= fieldHeight) continue;
                            for (let x = 0; x < tileWidth; x++) {
                                const targetX = left + x;
                                if (targetX < 0 || targetX >= fieldWidth) continue;
                                const value = font.coverage[(atlasY + y) * font.atlasWidth + atlasX + x];
                                const index = targetY * fieldWidth + targetX;
                                if (value > coverage[index]) coverage[index] = value;
                            }
                        }
                    }
                    cumulative += twips(character);
                }
                const pixels = new Uint8ClampedArray(fieldWidth * fieldHeight * 4);
                const foreground = [(color >>> 16) & 255, (color >>> 8) & 255, color & 255];
                const surface = [(background >>> 16) & 255, (background >>> 8) & 255, background & 255];
                for (let index = 0; index < coverage.length; index++) {
                    const alpha = coverage[index];
                    for (let channel = 0; channel < 3; channel++)
                        pixels[index * 4 + channel] = transparent
                            ? foreground[channel]
                            : Math.round(surface[channel] + (alpha * (foreground[channel] - surface[channel])) / 255);
                    pixels[index * 4 + 3] = transparent ? alpha : 255;
                }
                const canvas = canvasRef.current;
                canvas.width = fieldWidth;
                canvas.height = fieldHeight;
                canvas.getContext('2d').putImageData(new ImageData(pixels, fieldWidth, fieldHeight), 0, 0);
                setSize({ width: fieldWidth, height: fieldHeight });
            })
            .catch(() => !disposed && setFallback(true));
        return () => {
            disposed = true;
        };
    }, [text, textStyle, color, background, transparent, align, width]);

    if (fallback)
        return (
            <NativeText
                nativeResolution
                align={align}
                ariaHidden={ariaHidden}
                background={background}
                className={className}
                overrides={{ color }}
                style={style}
                text={text}
                textStyle={textStyle}
                transparent={transparent}
                width={width}
            />
        );

    return (
        <span aria-hidden={ariaHidden || undefined} className={className} style={{ display: 'inline-block', verticalAlign: 'top', position: 'relative', ...size, ...style }}>
            <canvas ref={canvasRef} aria-hidden="true" style={{ display: size ? 'block' : 'none', width: size?.width, height: size?.height, imageRendering: 'pixelated' }} />
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'pre' }}>{text}</span>
        </span>
    );
};
