import { describe, expect, it } from 'vitest';
import { defaultWiredVariableFxParams, WIRED_FX_CATEGORY } from '../../../../api/wired/WiredVariableFx';
import { sampleWiredFxPreview } from './WiredVariableFxPreviewView';
const initial = { value: 50, ratio: .5, min: null, max: null, color: '#ffffff', previous: null };
describe('AIR preview sampling', () => {
    it('changes the preview by at least 20% without modifying configured range', () => {
        const params = defaultWiredVariableFxParams(WIRED_FX_CATEGORY.PROGRESS_BAR);
        const result = sampleWiredFxPreview(initial, params, WIRED_FX_CATEGORY.PROGRESS_BAR, () => .9);
        expect(result).toMatchObject({ value: 90, ratio: .9, previous: 50 });
        expect([params.minValue, params.maxValue]).toEqual([0, 100]);
    });
    it('uses the stacked-heart preview capacity rather than the default 100 range', () => {
        const params = { ...defaultWiredVariableFxParams(WIRED_FX_CATEGORY.HEALTH_POINTS), rendererId: 12, widthId: 2 };
        expect(sampleWiredFxPreview(initial, params, WIRED_FX_CATEGORY.HEALTH_POINTS, () => 1)).toMatchObject({ min: 0, max: 9, value: 9 });
    });
    it('bounds repeated identical random samples and falls back for an invalid draft range', () => {
        const params = { ...defaultWiredVariableFxParams(WIRED_FX_CATEGORY.PROGRESS_BAR), minValue: 100, maxValue: 10 };
        let calls = 0;
        const sample = sampleWiredFxPreview(initial, params, WIRED_FX_CATEGORY.PROGRESS_BAR, () => { calls++; return .5; });
        expect(sample.value).toBe(50);
        expect(calls).toBe(50);
    });
});
