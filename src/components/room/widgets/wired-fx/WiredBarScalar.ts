/** AIR variablefx.animation.AnimatedScalar, configured by BarVariableFxRendererBase. */
export class WiredBarScalar {
    value = 0;
    private target = 0;
    private velocity = 0;
    private updatedAt = 0;
    private readonly acceleration = .00001;
    private readonly braking = .000008;
    private readonly maxSpeed = .003;
    private readonly epsilon = .0001;

    snap(value: number, now: number) { this.updatedAt = now; this.value = this.target = value; this.velocity = 0; }
    setTarget(value: number, now: number) {
        this.update(now); this.target = value; this.updatedAt = now;
        const delta = this.target - this.value;
        const direction = Math.abs(delta) <= this.epsilon ? 0 : Math.sign(delta);
        if (!direction) return this.settle();
        this.velocity = direction * Math.min(Math.abs(this.velocity), this.maxSpeed);
    }
    needsUpdate(pixelWidth: number) {
        return (pixelWidth > 0 && Math.trunc(this.target * pixelWidth) !== Math.trunc(this.value * pixelWidth))
            || Math.abs(this.target - this.value) > this.epsilon || Math.abs(this.velocity) > this.epsilon;
    }
    update(now: number) {
        let elapsed = Math.max(0, now - this.updatedAt);
        while (elapsed > 0 && !this.settled) {
            const step = Math.min(elapsed, 8); this.integrate(step); elapsed -= step;
        }
        this.updatedAt = now;
    }
    private get settled() { return Math.abs(this.target - this.value) <= this.epsilon && Math.abs(this.velocity) <= this.epsilon; }
    private settle() { this.value = this.target; this.velocity = 0; }
    private integrate(ms: number) {
        const delta = this.target - this.value, direction = Math.sign(delta);
        if (!direction || Math.abs(delta) <= this.epsilon) return this.settle();
        const towardSpeed = this.velocity * direction;
        const stoppingDistance = towardSpeed * towardSpeed / (2 * this.braking);
        const acceleration = towardSpeed < 0 ? direction * this.acceleration
            : stoppingDistance >= Math.abs(delta) ? -direction * this.braking
            : towardSpeed >= this.maxSpeed ? 0 : direction * this.acceleration;
        const next = this.value + this.velocity * ms + .5 * acceleration * ms * ms;
        let speed = this.velocity + acceleration * ms;
        if (Math.sign(this.target - next) !== direction || Math.abs(this.target - next) <= this.epsilon) return this.settle();
        if (Math.abs(speed) > this.maxSpeed) speed = Math.sign(speed) * this.maxSpeed;
        if (this.velocity !== 0 && Math.sign(speed) !== Math.sign(this.velocity) && Math.sign(acceleration) !== direction) speed = 0;
        this.value = next; this.velocity = speed;
    }
}
