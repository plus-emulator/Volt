import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WiredProjectileDirectionGrid } from './WiredProjectileDirectionGrid';

describe('AIR projectile directional system bitmaps', () => {
    afterEach(cleanup);
    it('switches the exact indexed bitmap at native size without scaling the diagram geometry', () => {
        const { container, rerender } = render(<WiredProjectileDirectionGrid system={0} />);
        for (let system = 0; system < 4; system++) {
            rerender(<WiredProjectileDirectionGrid system={system} />);
            const image = container.querySelector('img')!;
            expect(image.src).toContain(`directional_system_${system}.png`);
            expect([image.width, image.height]).toEqual([192, 97]);
            expect(container.querySelector('svg')).toBeNull();
        }
    });
});
