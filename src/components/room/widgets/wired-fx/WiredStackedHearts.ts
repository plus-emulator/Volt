/** AIR StackedHealthPointsRenderer: each point is one heart, capped at twenty rows. */
export const stackedHeartCount = (value: bigint | number, min: bigint | number, max: bigint | number, widthId: number) => {
    const delta = typeof value === 'bigint' && typeof min === 'bigint' ? Number(value - min) : Number(value) - Number(min);
    const range = typeof max === 'bigint' && typeof min === 'bigint' ? Number(max - min) : Number(max) - Number(min);
    if (!Number.isFinite(delta) || !Number.isFinite(range)) return 0;
    return Math.min(Math.max(0, Math.trunc(delta)), Math.max(0, Math.trunc(range)), (widthId === 3 ? 5 : 3) * 20);
};

/** AIR class_3989: interruptible ordered heart fades, with a bounded total duration. */
export class WiredHeartFade {
    opacities: number[] = [];
    target = 0;
    private from: number[] = [];
    private to: number[] = [];
    private changed: number[] = [];
    private started = 0;
    private duration = 0;
    private fade = 0;
    private spacing = 0;
    get active() { return this.changed.length > 0; }
    get visibleCount() { return this.opacities.reduce((count, opacity, index) => opacity > .0001 ? index + 1 : count, 0); }
    snap(count: number) { this.target = count; this.opacities = Array(count).fill(1); this.from = [...this.opacities]; this.to = [...this.opacities]; this.changed = []; this.duration = 0; }
    setTarget(count: number, now: number) {
        this.update(now);
        this.target = count;
        const length = Math.max(this.opacities.length, count);
        const growing = count >= this.opacities.reduce((sum, opacity) => sum + opacity, 0);
        this.from = Array.from({ length }, (_, i) => this.opacities[i] ?? 0);
        this.to = Array.from({ length }, (_, i) => i < count ? 1 : 0);
        this.changed = Array.from({ length }, (_, i) => i).filter(i => Math.abs(this.to[i] - this.from[i]) > .0001);
        if (!growing) this.changed.reverse();
        const weight = this.to.reduce((sum, opacity, i) => sum + Math.abs(opacity - this.from[i]), 0);
        this.duration = weight <= .0001 ? 0 : 1400 * (1 - (6 / 7) ** weight);
        if (!this.duration || !this.changed.length) return this.snap(count);
        this.fade = Math.min(this.duration, Math.max(100, Math.round(this.duration / weight * 1.5)));
        this.spacing = this.changed.length > 1 ? (this.duration - this.fade) / (this.changed.length - 1) : 0;
        this.started = now;
    }
    update(now: number) {
        if (!this.active) return;
        const elapsed = Math.max(0, now - this.started);
        if (elapsed >= this.duration) return this.snap(this.target);
        this.opacities = this.to.map((target, i) => {
            const order = this.changed.indexOf(i);
            if (order < 0) return target;
            const progress = Math.max(0, Math.min(1, (elapsed - order * this.spacing) / this.fade));
            return this.from[i] + (target - this.from[i]) * progress;
        });
        while (this.opacities.length > this.target && this.opacities.at(-1) <= .0001) this.opacities.pop();
    }
}
