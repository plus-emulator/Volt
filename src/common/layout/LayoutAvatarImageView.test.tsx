import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutAvatarImageView } from './LayoutAvatarImageView';

const mocks = vi.hoisted(() => ({ listeners: [] as any[], create: vi.fn() }));
vi.mock('@volt/renderer', () => ({
    AvatarScaleType: { LARGE: 'h' }, AvatarSetType: { FULL: 'full', HEAD: 'head' },
    GetAvatarRenderManager: () => ({ createAvatarImage: mocks.create })
}));
beforeEach(() => {
    mocks.listeners.length = 0;
    mocks.create.mockReset().mockImplementation((_figure, _scale, _gender, listener) => {
        mocks.listeners.push(listener);
        return null;
    });
});
afterEach(cleanup);

describe('avatar image download listeners', () => {
    it('retires old listeners on prop changes and unmount, including late download callbacks', () => {
        const view = render(<LayoutAvatarImageView figure="hd-1-1" />);
        const first = mocks.listeners[0];
        view.rerender(<LayoutAvatarImageView figure="hd-2-2" />);
        expect(first.disposed).toBe(true);
        expect(mocks.create).toHaveBeenCalledTimes(2);
        first.resetFigure('hd-1-1');
        expect(mocks.create).toHaveBeenCalledTimes(2);
        const latest = mocks.listeners[1];
        view.unmount();
        expect(latest.disposed).toBe(true);
        latest.resetFigure('hd-2-2');
        expect(mocks.create).toHaveBeenCalledTimes(2);
    });
});
