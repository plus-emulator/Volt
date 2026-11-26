import { FC, useState, useSyncExternalStore } from 'react';
import { IsTouchLayout, localizeWithFallback, useVoltLayout } from '../../api';
import {
    DetectInstallPlatform,
    GetInstallState,
    IsIPad,
    IsTopLevelWindow,
    PromptInstall,
    RememberDismissal,
    RunsInstalled,
    ShareIsInMoreMenu,
    SubscribeInstallState,
    WasDismissedRecently
} from './installPlatform';

const ShareIcon: FC = () => (
    <svg
        className="volt-install-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label="Share"
    >
        <path d="M12 3v12M8 7l4-4 4 4" />
        <path d="M8.5 10H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5" />
    </svg>
);

const MenuIcon: FC = () => (
    <svg className="volt-install-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" role="img" aria-label="Menu">
        <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
);

const AddIcon: FC = () => (
    <svg className="volt-install-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <path d="M12 8.5v7M8.5 12h7" />
    </svg>
);

const text = (key: string, fallback: string) => localizeWithFallback(`volt.install.${key}`, fallback);

export const InstallPromptView: FC<{}> = () => {
    const layout = useVoltLayout();
    const installState = useSyncExternalStore(SubscribeInstallState, GetInstallState, GetInstallState);
    const [platform] = useState(() => (IsTopLevelWindow() && !RunsInstalled() ? DetectInstallPlatform() : null));
    const [dismissed, setDismissed] = useState(WasDismissedRecently);
    const [guideOpen, setGuideOpen] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    if (!platform || dismissed || installState === 'installed' || !IsTouchLayout(layout)) return null;

    if (platform === 'android' && installState !== 'ready') return null;

    const iPad = IsIPad();
    const moreMenu = ShareIsInMoreMenu() && !iPad;
    const arrow = platform !== 'ios-safari' ? null : iPad ? 'top' : moreMenu ? 'bottom-left' : 'bottom';

    const dismiss = () => {
        RememberDismissal();
        setDismissed(true);
        setGuideOpen(false);
    };

    const install = async () => {
        if ((await PromptInstall()) === 'dismissed') dismiss();
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setLinkCopied(true);
        } catch {
            setLinkCopied(false);
        }
    };

    if (!guideOpen) {
        return (
            <div className="volt-install-banner" role="region" aria-label={text('title', 'Play as an app')}>
                <div className="volt-install-banner-text">
                    <strong>{text('title', 'Play as an app')}</strong>
                    <span>{text('subtitle', 'Full screen, one tap from your Home Screen.')}</span>
                </div>
                <button type="button" className="volt-install-button" onClick={platform === 'android' ? install : () => setGuideOpen(true)}>
                    {platform === 'android' ? text('install', 'Install') : text('how', 'Show me how')}
                </button>
                <button type="button" className="volt-install-close" aria-label={text('not_now', 'Not now')} onClick={dismiss} />
            </div>
        );
    }

    return (
        <div className="volt-install-overlay" onClick={(event) => event.target === event.currentTarget && setGuideOpen(false)}>
            <section
                className={`volt-install-guide ${iPad ? 'is-ipad' : 'is-iphone'}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="volt-install-guide-title"
            >
                <header className="volt-install-guide-header">
                    <h2 id="volt-install-guide-title">{text('guide_title', 'Add the hotel to your Home Screen')}</h2>
                    <button type="button" className="volt-install-close" aria-label={text('close', 'Close')} onClick={() => setGuideOpen(false)} />
                </header>
                {platform === 'ios-in-app' ? (
                    <div className="volt-install-guide-body">
                        <p>
                            {text('in_app', 'This in-app browser cannot add apps to your Home Screen. Open this page in Safari, then tap Show me how again.')}
                        </p>
                        <button type="button" className="volt-install-button" onClick={copyLink}>
                            {linkCopied ? text('link_copied', 'Link copied') : text('copy_link', 'Copy link')}
                        </button>
                    </div>
                ) : (
                    <ol className="volt-install-guide-body volt-install-steps">
                        <li>
                            {platform === 'ios-browser' && (
                                <span>
                                    {text('step_share', 'Tap the Share button')} <ShareIcon /> {text('step_share_address_bar', 'in the address bar.')}
                                </span>
                            )}
                            {platform === 'ios-safari' && moreMenu && (
                                <span>
                                    {text('step_menu', 'Tap the menu button')} <MenuIcon />{' '}
                                    {text('step_menu_then_share', 'on the left of the address bar, then tap Share')} <ShareIcon />
                                </span>
                            )}
                            {platform === 'ios-safari' && !moreMenu && (
                                <span>
                                    {text('step_share', 'Tap the Share button')} <ShareIcon />{' '}
                                    {iPad
                                        ? text('step_share_top', 'at the top of the screen.')
                                        : text('step_share_bottom', 'in the toolbar at the bottom of the screen.')}
                                </span>
                            )}
                        </li>
                        <li>
                            <span>
                                {text('step_choose', 'Scroll down and choose')}{' '}
                                <strong>
                                    <AddIcon /> {text('step_add_to_home', 'Add to Home Screen')}
                                </strong>
                                .
                            </span>
                        </li>
                        <li>
                            <span>{text('step_confirm', 'Tap Add. The hotel now opens full screen from your Home Screen.')}</span>
                        </li>
                        {platform === 'ios-browser' && (
                            <li className="is-note">
                                {text('browser_note', "Don't see Add to Home Screen? Update iOS to 16.4 or newer, or open this page in Safari.")}
                            </li>
                        )}
                    </ol>
                )}
                <div className="volt-install-guide-footer">
                    <button type="button" className="volt-install-button" onClick={dismiss}>
                        {text('got_it', 'Got it')}
                    </button>
                </div>
            </section>
            {arrow && <div className={`volt-install-arrow is-${arrow}`} aria-hidden="true" />}
        </div>
    );
};
