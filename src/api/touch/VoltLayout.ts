import { useSyncExternalStore } from 'react';

export type VoltLayout = 'desktop' | 'tablet-landscape' | 'tablet-portrait' | 'phone-portrait' | 'phone-landscape';

export const VOLT_LAYOUTS: readonly VoltLayout[] = ['desktop', 'tablet-landscape', 'tablet-portrait', 'phone-portrait', 'phone-landscape'];

const OVERRIDE_PARAM = 'volt-layout';
const OVERRIDE_KEY = 'volt.layout.override';
const PHONE_MAX_SHORT_SIDE = 600;
const TABLET_MAX_SHORT_SIDE = 1100;

const listeners = new Set<() => void>();
let current: VoltLayout = 'desktop';
let started = false;

const readOverride = (): VoltLayout | null => {
    try {
        const fromUrl = new URLSearchParams(window.location.search).get(OVERRIDE_PARAM);

        if (fromUrl === 'auto') {
            window.localStorage.removeItem(OVERRIDE_KEY);
            return null;
        }

        if (fromUrl && (VOLT_LAYOUTS as string[]).includes(fromUrl)) {
            window.localStorage.setItem(OVERRIDE_KEY, fromUrl);
            return fromUrl as VoltLayout;
        }

        const stored = window.localStorage.getItem(OVERRIDE_KEY);

        return stored && (VOLT_LAYOUTS as string[]).includes(stored) ? (stored as VoltLayout) : null;
    } catch {
        return null;
    }
};

const detect = (): VoltLayout => {
    const override = readOverride();

    if (override) return override;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const shortSide = Math.min(width, height);
    const isLandscape = width > height;
    const isCoarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;

    if (shortSide < PHONE_MAX_SHORT_SIDE || (!isCoarse && width < PHONE_MAX_SHORT_SIDE)) return isLandscape ? 'phone-landscape' : 'phone-portrait';

    if (isCoarse && shortSide <= TABLET_MAX_SHORT_SIDE) return isLandscape ? 'tablet-landscape' : 'tablet-portrait';

    return 'desktop';
};

const applyKeyboardInset = () => {
    const viewport = window.visualViewport;
    const root = document.documentElement;

    if (!viewport) return;

    const inset = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));

    root.style.setProperty('--volt-keyboard-inset', `${inset}px`);
    root.style.setProperty('--volt-visual-height', `${Math.round(viewport.height)}px`);
    root.dataset.voltKeyboard = inset > 80 ? 'open' : 'closed';
};

const update = () => {
    const next = detect();
    const root = document.documentElement;

    root.dataset.voltLayout = next;
    root.dataset.voltTouch = next === 'desktop' ? 'off' : 'on';
    root.dataset.voltDevice = next.startsWith('phone') ? 'phone' : next.startsWith('tablet') ? 'tablet' : 'desktop';
    applyKeyboardInset();

    if (next === current) return;

    current = next;
    listeners.forEach((listener) => listener());
};

export const StartVoltLayout = () => {
    if (started || typeof window === 'undefined') return;

    started = true;
    current = detect();
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', applyKeyboardInset);
    window.visualViewport?.addEventListener('scroll', applyKeyboardInset);
    window.matchMedia?.('(pointer: coarse)').addEventListener?.('change', update);
};

export const GetVoltLayout = (): VoltLayout => {
    if (!started) StartVoltLayout();

    return current;
};

export const IsPhoneLayout = (layout: VoltLayout = GetVoltLayout()) => layout === 'phone-portrait' || layout === 'phone-landscape';

export const IsTabletLayout = (layout: VoltLayout = GetVoltLayout()) => layout === 'tablet-portrait' || layout === 'tablet-landscape';

export const IsTouchLayout = (layout: VoltLayout = GetVoltLayout()) => layout !== 'desktop';

const subscribe = (listener: () => void) => {
    StartVoltLayout();
    listeners.add(listener);

    return () => listeners.delete(listener);
};

export const useVoltLayout = (): VoltLayout => useSyncExternalStore(subscribe, GetVoltLayout, () => 'desktop');
