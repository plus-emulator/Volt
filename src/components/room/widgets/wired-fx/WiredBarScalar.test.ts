import { describe, expect, it } from 'vitest';
import { WiredBarScalar } from './WiredBarScalar';

describe('AIR single-heart fill scalar', () => {
    it('accelerates from rest using AIR units, rather than jumping to the target', () => {
        const value = new WiredBarScalar(); value.snap(0, 0); value.setTarget(1, 0); value.update(100);
        expect(value.value).toBeCloseTo(.05, 8); expect(value.needsUpdate(19)).toBe(true);
        value.update(200); expect(value.value).toBeCloseTo(.2, 8);
        value.update(1000); expect(value.value).toBe(1); expect(value.needsUpdate(19)).toBe(false);
    });
    it('keeps the current position on interruption and reverses with preserved speed', () => {
        const value = new WiredBarScalar(); value.snap(0, 0); value.setTarget(1, 0); value.update(200);
        const previous = value.value; value.setTarget(0, 200); expect(value.value).toBe(previous);
        value.update(208); expect(value.value).toBeLessThan(previous); expect(value.value).toBeGreaterThan(0);
        value.update(1000); expect(value.value).toBe(0); expect(value.needsUpdate(19)).toBe(false);
    });
    it('integrates long frame gaps in the same8ms steps without overshooting', () => {
        const delayed = new WiredBarScalar(), stepped = new WiredBarScalar();
        for (const value of [delayed, stepped]) { value.snap(.25, 0); value.setTarget(.75, 0); }
        delayed.update(400); for (let now = 8; now <= 400; now += 8) stepped.update(now);
        expect(delayed.value).toBe(stepped.value); expect(delayed.value).toBeLessThanOrEqual(.75);
        delayed.update(10000); expect(delayed.value).toBe(.75);
    });
    it('snaps initialization directly and uses truncated native pixel boundaries', () => {
        const value = new WiredBarScalar(); value.snap(.5, 100);
        expect(Math.trunc(value.value * 19)).toBe(9); expect(value.needsUpdate(19)).toBe(false);
    });
});
