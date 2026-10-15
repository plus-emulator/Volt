import { describe, expect, it } from 'vitest';
import { stackedHeartCount, WiredHeartFade } from './WiredStackedHearts';
import { WIRED_FX_CATEGORY, WIRED_FX_RENDERER, wiredVariableFxStyle } from '../../../../api/wired/WiredVariableFx';

describe('AIR health renderer mapping and counts', () => {
    it('maps health styles to the server renderer ids, without the old glyph-heart/medical-cross aliases', () => {
        expect([0, 1, 2, 3].map(id => wiredVariableFxStyle(WIRED_FX_CATEGORY.HEALTH_POINTS, id).defaultRendererId)).toEqual([10, 12, 13, 11]);
        expect([WIRED_FX_RENDERER.HEALTH_BAR, WIRED_FX_RENDERER.MASKED_HEART_FILL, WIRED_FX_RENDERER.STACKED_HEALTH_POINTS]).toEqual([10, 11, 12]);
    });
    it('draws one heart per point above the effective minimum, not a fraction of five hearts', () => {
        expect(stackedHeartCount(17, 10, 30, 2)).toBe(7);
        expect(stackedHeartCount(100, 10, 14, 2)).toBe(4);
        expect(stackedHeartCount(5, 10, 30, 2)).toBe(0);
        expect(stackedHeartCount(5.9, 0, 30, 2)).toBe(5);
    });
    it('caps at twenty rows and subtracts int64 values before converting', () => {
        expect(stackedHeartCount(1000, 0, 1000, 2)).toBe(60);
        expect(stackedHeartCount(1000, 0, 1000, 3)).toBe(100);
        expect(stackedHeartCount(9007199254741007n, 9007199254741000n, 9007199254741020n, 2)).toBe(7);
    });
});

describe('AIR sequential heart fades', () => {
    it('fades a single new heart over200ms and settles without permanent timers', () => {
        const fade = new WiredHeartFade(); fade.snap(1); fade.setTarget(2, 1000); fade.update(1100);
        expect(fade.opacities[1]).toBeCloseTo(.5);
        fade.update(1201); expect(fade.opacities).toEqual([1, 1]); expect(fade.active).toBe(false);
    });
    it('removes the highest hearts first and adds the lowest hearts first', () => {
        const fade = new WiredHeartFade(); fade.snap(3); fade.setTarget(1, 0); fade.update(100);
        expect(fade.opacities[2]).toBeLessThan(fade.opacities[1]);
        fade.snap(1); fade.setTarget(3, 0); fade.update(100);
        expect(fade.opacities[1]).toBeGreaterThan(fade.opacities[2]);
    });
    it('continues interrupted fades from their current opacity and caps long animations', () => {
        const fade = new WiredHeartFade(); fade.snap(0); fade.setTarget(2, 0); fade.update(100);
        const current = [...fade.opacities]; fade.setTarget(0, 100); fade.update(100);
        expect(fade.opacities).toEqual(current);
        fade.setTarget(100, 200); fade.update(1600);
        expect(fade.visibleCount).toBe(100); expect(fade.active).toBe(false);
    });
});
