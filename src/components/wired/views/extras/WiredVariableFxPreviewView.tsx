import { IWiredVariableFxConfig } from '@volt/renderer';
import { FC, useLayoutEffect, useRef, useState } from 'react';
import { IWiredVariableFxParams, localizeWithFallback, WIRED_FX_CATEGORY, WIRED_FX_COLOR_DYNAMIC_TEAM, WIRED_FX_NUMBER_ALIGNMENTS, WIRED_FX_STATUS_BAR_THEMES } from '../../../../api';
import randomizeIcon from '../../../../assets/images/wired/native/variablefx_randomize.png';
import { WiredVariableFxStatusView } from '../../../room/widgets/wired-fx/WiredVariableFxStatusView';
import { WiredText } from '../WiredText';

const TEAM_COLORS = ['#df291e', '#36b24a', '#3b7de3', '#ffd83d'];
type PreviewState = { value: number; ratio: number; min: number | null; max: number | null; color: string; previous: number | null };
const initialState: PreviewState = { value: 50, ratio: .5, min: null, max: null, color: '#ffffff', previous: null };
const level = (value: number) => Math.min(25, Math.max(1, Math.floor(value / 100) + 1));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** AIR VariableFxPreviewStatus: previews use their own value, never mutate the saved range. */
export const sampleWiredFxPreview = (state: PreviewState, params: IWiredVariableFxParams, category: number, random = Math.random): PreviewState => {
    const next = { ...state, previous: state.value };
    if (params.colorId === WIRED_FX_COLOR_DYNAMIC_TEAM) next.color = TEAM_COLORS[Math.floor(random() * 4)];
    if (category === WIRED_FX_CATEGORY.HEALTH_POINTS) {
        next.min = params.rendererId === 12 ? 0 : null;
        next.max = params.rendererId === 12 ? clamp(params.widthId === 2 ? 9 : 15, 1, Number(params.maxValue) - Number(params.minValue)) : null;
    }
    if (category === WIRED_FX_CATEGORY.LEVELLING_PROGRESS) {
        const choice = random(), current = level(next.value);
        if (choice >= .25 && choice < .65) {
            const upward = random();
            const change = current < 25 && (current <= 1 || upward < .5) ? 1 : -1;
            next.value += change * 100;
            next.min = (current + change - 1) * 100;
            next.max = (Math.min(25, current + change + 1) - 1) * 100;
        } else if (choice >= .65) {
            let jump = Math.trunc(-25 + random() * 50), tries = 0;
            while ((current + jump < 1 || current + jump > 25) && tries++ < 50) jump = Math.trunc(-25 + random() * 50);
            next.value += clamp(jump * 100, 0, 2600);
            if (current + jump === 25) return { ...next, min: next.value, max: next.value, ratio: 1 };
            next.min = (current + jump - 1) * 100;
            next.max = (current + jump) * 100;
        }
    }
    let min = next.min ?? Number(params.minValue), max = next.max ?? Number(params.maxValue);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) { min = 0; max = 100; }
    const previousValue = next.value, previousRatio = next.ratio;
    let ratio = previousRatio, attempts = 0;
    while ((next.value === previousValue || Math.abs(ratio - previousRatio) < .2) && attempts++ < 50) {
        next.value = min + Math.round(random() * (max - min));
        ratio = (next.value - min) / (max - min);
    }
    return { ...next, ratio };
};

export const WiredVariableFxPreviewView: FC<{ params: IWiredVariableFxParams; category: number; icon: string }> = ({ params, category, icon }) => {
    const [sample, setSample] = useState(initialState);
    const [zoom, setZoom] = useState(1);
    const frame = useRef<HTMLDivElement>(null);
    const extra: Record<string, string> = { segments: String(params.segments), sub_renderer: String(params.categoryExtra), icon, icon_alignment: WIRED_FX_NUMBER_ALIGNMENTS[params.categoryExtra] ?? 'left' };
    if (category === WIRED_FX_CATEGORY.STATUS_BAR) {
        const theme = WIRED_FX_STATUS_BAR_THEMES[params.styleId];
        if (theme) Object.assign(extra, { icon: theme.icon, color: theme.color ?? '', metallic: String(theme.metallic) });
    }
    if (category === WIRED_FX_CATEGORY.BOSS_BAR) extra.icon = params.styleId === 0 ? 'skull' : '';
    if (category === WIRED_FX_CATEGORY.NUMBER_DISPLAY) extra.design = ['freeze_style', 'shalimar', 'blocky'][params.styleId] ?? 'freeze_style';
    const config: IWiredVariableFxConfig = { configId: 0, userFx: params.source === 1, showMode: 0, updateMask: 15, showOnMouseHover: false, showDurationMs: 0,
        category, styleId: params.styleId, colorId: params.colorId, widthId: params.widthId, rendererId: params.rendererId,
        defaultMinValue: Number(params.minValue), defaultMaxValue: Number(params.maxValue), extra };
    const stacked = category === WIRED_FX_CATEGORY.HEALTH_POINTS && params.rendererId === 12;
    const status = { configId: 0, variableId: '', initialize: sample.previous === null, userEntity: true, entityId: 0, value: sample.value,
        overrideMinValue: stacked ? 0 : category === WIRED_FX_CATEGORY.HEALTH_POINTS ? null : sample.min,
        overrideMaxValue: stacked ? clamp(params.widthId === 2 ? 9 : 15, 1, Number(params.maxValue) - Number(params.minValue)) : category === WIRED_FX_CATEGORY.HEALTH_POINTS ? null : sample.max,
        extra: { current_level: String(level(sample.value)), max_level: '25', is_maxed: String(level(sample.value) === 25), delegated_color: params.colorId === WIRED_FX_COLOR_DYNAMIC_TEAM && sample.color === '#ffffff' ? TEAM_COLORS[0] : sample.color } };
    useLayoutEffect(() => {
        const update = () => { const node = frame.current; if (node) setZoom(node.offsetWidth * 2 <= 280 && node.offsetHeight * 2 <= 96 ? 2 : 1); };
        update();
        const observer = new ResizeObserver(update);
        if (frame.current) observer.observe(frame.current);
        return () => observer.disconnect();
    }, []);
    return <div className="volt-wired-fx-preview">
        <div className="volt-wired-fx-preview__label"><WiredText bold text={localizeWithFallback('wiredfurni.params.variablefx.preview', 'Preview')} /></div>
        <div className="volt-wired-fx-preview__zoom"><WiredText text={localizeWithFallback('wiredfurni.params.variablefx.preview.zoom', 'zoom: %level%').replace('%level%', String(zoom))} /></div>
        <div className="volt-wired-fx-preview__viewport"><div ref={frame} style={{ transform: `scale(${zoom})` }}>
            <WiredVariableFxStatusView config={config} entry={{ key: 'preview', status, changedAt: 0, previousValue: sample.previous }} />
        </div></div>
        <button type="button" className="volt-wired-fx-preview__randomize" title={localizeWithFallback('wiredfurni.params.variablefx.preview.randomize', 'Randomize preview')} onClick={() => setSample(previous => sampleWiredFxPreview(previous, params, category))}><img src={randomizeIcon} alt="" /></button>
    </div>;
};
