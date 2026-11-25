interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** `ios-browser` is Chrome, Edge or Firefox on iOS; `ios-in-app` is an app's built-in browser, which cannot install. */
export type InstallPlatform = 'android' | 'ios-safari' | 'ios-browser' | 'ios-in-app';

const DISMISS_KEY = 'volt.install.dismissed';
const DISMISS_DAYS = 14;

const listeners = new Set<() => void>();
let installEvent: BeforeInstallPromptEvent | null = null;
let installed = false;

const notify = () => listeners.forEach((listener) => listener());

export const IsTopLevelWindow = () => {
    try {
        return window.top === window.self;
    } catch {
        return false;
    }
};

// Chrome fires the install event once, often before the hotel view mounts.
if (typeof window !== 'undefined' && IsTopLevelWindow()) {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        installEvent = event as BeforeInstallPromptEvent;
        notify();
    });

    window.addEventListener('appinstalled', () => {
        installed = true;
        installEvent = null;
        notify();
    });
}

export const SubscribeInstallState = (listener: () => void) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
};

export const GetInstallState = () => (installed ? 'installed' : installEvent ? 'ready' : 'waiting');

export const PromptInstall = async () => {
    const event = installEvent;

    if (!event) return 'dismissed';

    installEvent = null;
    notify();

    await event.prompt();

    return (await event.userChoice).outcome;
};

export const RunsInstalled = () =>
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const IsIPad = () => /iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

export const DetectInstallPlatform = (): InstallPlatform | null => {
    const agent = navigator.userAgent;

    if (/Android/i.test(agent)) return 'android';

    if (!/iPhone|iPod/.test(agent) && !IsIPad()) return null;

    if (/CriOS|FxiOS|EdgiOS/.test(agent)) return 'ios-browser';

    if (!/Safari\//.test(agent) || /FBAN|FBAV|Instagram|Line\/|GSA\//.test(agent)) return 'ios-in-app';

    return 'ios-safari';
};

/** Safari 26 moved Share behind the ••• button. */
export const ShareIsInMoreMenu = () => Number(navigator.userAgent.match(/Version\/(\d+)/)?.[1] || 0) >= 26;

export const WasDismissedRecently = () => {
    try {
        return Number(window.localStorage.getItem(DISMISS_KEY)) > Date.now() - DISMISS_DAYS * 86_400_000;
    } catch {
        return false;
    }
};

export const RememberDismissal = () => {
    try {
        window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
        // Without storage the prompt returns on the next visit.
    }
};
