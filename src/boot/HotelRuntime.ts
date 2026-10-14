import {
    GetAssetManager, GetAvatarRenderManager, GetConfiguration, GetDesiredResolution,
    GetLocalizationManager, GetRoomEngine, GetRoomSessionManager, GetSessionDataManager,
    GetSoundManager, GetTicker, PrepareRenderer, VoltLogger
} from '@volt/renderer';
import { loadMarketplaceTexts } from '../api/catalog/loadMarketplaceTexts';

let runtime: ReturnType<typeof prepareHotelRuntime> | undefined;

const phase = async <T>(name: string, task: () => Promise<T>): Promise<T> => {
    performance.mark(`volt:${name}:start`);
    const result = await task();
    performance.mark(`volt:${name}:end`);
    return result;
};

const prepareHotelRuntime = async (width: number, height: number) => {
    await GetConfiguration().init();
    const config = GetConfiguration();
    GetTicker().maxFPS = config.getValue<number>('system.fps.max', 0);
    VoltLogger.LOG_DEBUG = config.getValue<boolean>('system.log.debug', true);
    VoltLogger.LOG_WARN = config.getValue<boolean>('system.log.warn', false);
    VoltLogger.LOG_ERROR = config.getValue<boolean>('system.log.error', false);
    VoltLogger.LOG_EVENTS = config.getValue<boolean>('system.log.events', false);
    VoltLogger.LOG_PACKETS = config.getValue<boolean>('system.log.packets', false);

    const rawUseBackBuffer = window.VoltConfig?.['renderer.useBackBuffer'];
    const renderer = phase('renderer', () => PrepareRenderer({
        width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)),
        resolution: GetDesiredResolution(), autoDensity: true, backgroundAlpha: 0,
        preference: 'webgl', eventMode: 'none', failIfMajorPerformanceCaveat: false,
        roundPixels: true,
        useBackBuffer: rawUseBackBuffer === undefined || rawUseBackBuffer === true || rawUseBackBuffer === 'true'
    }));
    const configuredAssets = config.getValue<unknown>('preload.assets.urls');
    const assetUrls = (Array.isArray(configuredAssets) ? configuredAssets : [configuredAssets])
        .filter((value): value is string => typeof value === 'string' && !!value)
        .map(value => config.interpolate(value));

    const localization = phase('localization', () => GetLocalizationManager().init().then(loadMarketplaceTexts));
    // Furnidata supplies localization overrides, so apply it after base texts.
    const session = phase('session-data', () => GetSessionDataManager().init(localization));
    const avatars = phase('avatars', () => GetAvatarRenderManager().init());
    const assets = renderer.then(() => phase('assets', () => GetAssetManager().downloadAssets(assetUrls)));
    const rooms = Promise.all([renderer, session]).then(() => phase('rooms', async () => {
        await GetRoomSessionManager().init();
        await GetRoomEngine().init();
    }));

    // All handlers and mandatory assets must exist before App mounts MainView,
    // which releases the connection's queued login packets.
    const [readyRenderer] = await Promise.all([renderer, localization, session, avatars, assets, rooms, GetSoundManager().init()]);
    performance.mark('volt:runtime-ready');
    return readyRenderer;
};

/** Bootstrap and React (including StrictMode) share one engine initialization. */
export const startHotelRuntime = (width: number, height: number) =>
    runtime ??= prepareHotelRuntime(width, height);
