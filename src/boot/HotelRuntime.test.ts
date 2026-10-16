import { beforeEach, describe, expect, it, vi } from 'vitest';

const boot = vi.hoisted(() => {
    const deferred = () => {
        let resolve: (value?: any) => void;
        let reject: (error: Error) => void;
        const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; });
        return { promise, resolve, reject };
    };
    return { deferred, renderer: vi.fn(), texts: vi.fn(), session: vi.fn(), avatars: vi.fn(), assets: vi.fn(), rooms: vi.fn(), roomSession: vi.fn() };
});

vi.mock('@volt/renderer', () => ({
    GetConfiguration: () => ({ init: async () => {}, getValue: (_key: string, fallback: unknown) => fallback, interpolate: (s: string) => s }),
    GetDesiredResolution: () => 1,
    GetTicker: () => ({}), VoltLogger: {}, PrepareRenderer: boot.renderer,
    GetLocalizationManager: () => ({ init: boot.texts }),
    GetSessionDataManager: () => ({ init: boot.session }),
    GetAvatarRenderManager: () => ({ init: boot.avatars }),
    GetAssetManager: () => ({ downloadAssets: boot.assets }),
    GetRoomSessionManager: () => ({ init: boot.roomSession }),
    GetRoomEngine: () => ({ init: boot.rooms }),
    GetSoundManager: () => ({ init: async () => {} })
}));
vi.mock('../api/catalog/loadMarketplaceTexts', () => ({ loadMarketplaceTexts: async () => {} }));
vi.mock('../api/wired/loadWiredTexts', () => ({ loadWiredTexts: async () => {} }));

describe('hotel boot dependencies', () => {
    beforeEach(() => { vi.resetModules(); vi.resetAllMocks(); });

    it('overlaps independent work but waits for texts, renderer and room handlers before readiness', async () => {
        const renderer = boot.deferred(), texts = boot.deferred(), session = boot.deferred(), avatars = boot.deferred(), rooms = boot.deferred();
        boot.renderer.mockReturnValue(renderer.promise);
        boot.texts.mockReturnValue(texts.promise);
        boot.session.mockImplementation(async (localizationReady: Promise<void>) => { await localizationReady; await session.promise; });
        boot.avatars.mockReturnValue(avatars.promise);
        boot.rooms.mockReturnValue(rooms.promise);
        const { startHotelRuntime } = await import('./HotelRuntime');
        const result = startHotelRuntime(800, 600);
        expect(startHotelRuntime(800, 600)).toBe(result);
        await vi.waitFor(() => expect(boot.texts).toHaveBeenCalledTimes(1));
        expect(boot.renderer).toHaveBeenCalledTimes(1);
        expect(boot.session).toHaveBeenCalledTimes(1);
        expect(boot.avatars).toHaveBeenCalledTimes(1);
        renderer.resolve('renderer');
        await vi.waitFor(() => expect(boot.avatars).toHaveBeenCalledTimes(1));
        texts.resolve();
        await vi.waitFor(() => expect(boot.session).toHaveBeenCalledTimes(1));
        expect(boot.rooms).not.toHaveBeenCalled();
        session.resolve();
        await vi.waitFor(() => expect(boot.rooms).toHaveBeenCalledTimes(1));
        const ready = vi.fn();
        result.then(ready);
        avatars.resolve();
        await Promise.resolve();
        expect(ready).not.toHaveBeenCalled();
        rooms.resolve();
        await expect(result).resolves.toBe('renderer');
        expect(boot.roomSession).toHaveBeenCalledTimes(1);
    });

    it('propagates initialization failure to App without starting dependent managers', async () => {
        boot.renderer.mockResolvedValue('renderer');
        boot.texts.mockRejectedValue(new Error('missing texts'));
        boot.session.mockImplementation((localizationReady: Promise<void>) => localizationReady);
        const { startHotelRuntime } = await import('./HotelRuntime');
        await expect(startHotelRuntime(800, 600)).rejects.toThrow('missing texts');
        expect(boot.session).toHaveBeenCalledTimes(1);
        expect(boot.rooms).not.toHaveBeenCalled();
    });
});
