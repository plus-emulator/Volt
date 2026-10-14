import { FC, useEffect, useRef } from 'react';
import { WiredHeartFade } from './WiredStackedHearts';

const urls = import.meta.glob('../../../../assets/images/wired/fx/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const loaded = new Map<string, Promise<HTMLImageElement>>();
const image = (name: string) => {
    if (!loaded.has(name)) loaded.set(name, new Promise((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = reject;
        img.src = urls[`../../../../assets/images/wired/fx/${name}.png`];
    }));
    return loaded.get(name);
};
const canvas = (width: number, height: number) => { const node = document.createElement('canvas'); node.width = width; node.height = height; return node; };
const tint = (source: HTMLImageElement, color: string) => {
    const node = canvas(source.width, source.height), ctx = node.getContext('2d');
    ctx.drawImage(source, 0, 0);
    const pixels = ctx.getImageData(0, 0, node.width, node.height), rgb = parseInt(color.replace('#', ''), 16);
    for (let i = 0; i < pixels.data.length; i += 4) {
        pixels.data[i] = Math.floor(pixels.data[i] * ((rgb >> 16) & 255) / 255);
        pixels.data[i + 1] = Math.floor(pixels.data[i + 1] * ((rgb >> 8) & 255) / 255);
        pixels.data[i + 2] = Math.floor(pixels.data[i + 2] * (rgb & 255) / 255);
    }
    ctx.putImageData(pixels, 0, 0); return node;
};
const layers = async (prefix: string, metallic: boolean) => {
    const suffix = metallic ? '_metallic' : '';
    const [background, darkening, lighting, metal] = await Promise.all([image(`${prefix}_background`), image(`${prefix}_darkening${suffix}`), image(`${prefix}_lighting${suffix}`), metallic ? image(`${prefix}_metallic`) : null]);
    return { background, darkening, lighting, metal };
};
const overlay = (ctx: CanvasRenderingContext2D, image: CanvasImageSource, blend: GlobalCompositeOperation) => { ctx.globalCompositeOperation = blend; ctx.drawImage(image, 0, 0); ctx.globalCompositeOperation = 'source-over'; };
const composeHeart = async (color: string, metallic: boolean) => {
    const assets = await layers('stacked_health_points', metallic);
    const node = tint(assets.background, color), ctx = node.getContext('2d');
    if (assets.metal) overlay(ctx, assets.metal, 'lighter');
    overlay(ctx, assets.darkening, 'multiply'); overlay(ctx, assets.lighting, 'lighter');
    return node;
};

/** StackedHealthPointsRenderer uses the native 14x12 layers and fills rows from the bottom left. */
export const WiredStackedHeartsView: FC<{ count: number; widthId: number; color: string; metallic: boolean; initialize: boolean }> = ({ count, widthId, color, metallic, initialize }) => {
    const node = useRef<HTMLCanvasElement>(null), fade = useRef(new WiredHeartFade()), initialized = useRef(false);
    useEffect(() => {
        let cancelled = false, timer = 0;
        const model = fade.current;
        if (!initialized.current || initialize) { model.snap(count); initialized.current = true; }
        else model.setTarget(count, performance.now());
        composeHeart(color, metallic).then(heart => {
            if (cancelled) return;
            const draw = (now: number) => {
                model.update(now);
                const perRow = widthId === 3 ? 5 : 3, visible = model.visibleCount;
                const rows = Math.max(1, Math.ceil(Math.max(count, visible) / perRow));
                const columns = Math.ceil(visible / perRow) > 1 ? perRow : Math.max(1, Math.min(perRow, visible));
                const target = node.current;
                if (!target) return;
                target.width = columns * 14 + columns - 1;
                target.height = rows * 12 + (rows - 1) * 3;
                const ctx = target.getContext('2d'); ctx.imageSmoothingEnabled = false;
                for (let i = 0; i < visible; i++) {
                    ctx.globalAlpha = Math.round((model.opacities[i] + 1e-9) * 255) / 255;
                    ctx.drawImage(heart, (i % perRow) * 15, (rows - Math.floor(i / perRow) - 1) * 15);
                }
                if (model.active) timer = requestAnimationFrame(draw);
            };
            draw(performance.now());
        }).catch(() => { /* Missing optional art must not interrupt the room renderer. */ });
        return () => { cancelled = true; cancelAnimationFrame(timer); };
    }, [count, widthId, color, metallic, initialize]);
    return <canvas ref={node} data-testid="fx-stacked-hearts" data-heart-count={count} width={14} height={12} style={{ display: 'block', imageRendering: 'pixelated' }} />;
};

/** MaskedHeartFillFramePrebake: one 23x20 heart, left-to-right fill and masked one-pixel end pointer. */
export const WiredMaskedHeartView: FC<{ progress: number; color: string; metallic: boolean }> = ({ progress, color, metallic }) => {
    const node = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        let cancelled = false;
        Promise.all([layers('masked_heart_fill', metallic), image('masked_heart_fill_bar'), image('masked_heart_fill_end_pointer'), image('masked_heart_fill_mask')]).then(([assets, bar, pointer, mask]) => {
            if (cancelled || !node.current) return;
            const ctx = node.current.getContext('2d');
            ctx.clearRect(0, 0, 23, 20); ctx.drawImage(assets.background, 0, 0);
            const filled = Math.max(0, Math.min(19, Math.round(progress * 19)));
            if (!filled) return;
            ctx.save(); ctx.beginPath(); ctx.rect(2, 0, filled, 20); ctx.clip();
            ctx.drawImage(tint(bar, color), 0, 0);
            const end = canvas(23, 20), endCtx = end.getContext('2d');
            const x = 2 + filled - 1;
            endCtx.drawImage(pointer, x - 1, 0);
            const pixels = endCtx.getImageData(0, 0, 23, 20), maskNode = canvas(23, 20), maskCtx = maskNode.getContext('2d');
            maskCtx.drawImage(mask, 0, 0);
            const maskPixels = maskCtx.getImageData(0, 0, 23, 20).data;
            for (let i = 0; i < pixels.data.length; i += 4) pixels.data[i + 3] = Math.round(pixels.data[i + 3] * maskPixels[i] / 255);
            endCtx.putImageData(pixels, 0, 0);
            ctx.save(); ctx.beginPath(); ctx.rect(x, 2, 1, 16); ctx.clip(); overlay(ctx, end, 'multiply'); ctx.restore();
            if (assets.metal) overlay(ctx, assets.metal, 'lighter');
            overlay(ctx, assets.darkening, 'multiply'); overlay(ctx, assets.lighting, 'lighter'); ctx.restore();
        }).catch(() => { /* Keep an unavailable preview asset local to this canvas. */ });
        return () => { cancelled = true; };
    }, [progress, color, metallic]);
    return <canvas ref={node} data-testid="fx-masked-heart" data-progress={progress} width={23} height={20} style={{ display: 'block', imageRendering: 'pixelated' }} />;
};
