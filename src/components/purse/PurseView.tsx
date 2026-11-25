import { CreateLinkEvent } from '@volt/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FriendlyTime, GetConfigurationValue, IsPhoneLayout, LogOut, LocalizeShortNumber, localizeWithFallback, useVoltLayout } from '../../api';
import creditsIcon from '../../assets/images/purse/air/credits.png';
import diamondIcon from '../../assets/images/purse/air/diamond.png';
import ducketsIcon from '../../assets/images/purse/air/duckets.png';
import earningsIcon from '../../assets/images/purse-swf/icons/1747_icon_earnings_png$5e39e03f65fbbb9a85bedd0d577dc12d307477063.png';
import hcIcon from '../../assets/images/purse-swf/icons/1801_hc_icon_png$2f8b554609e9c5cbbdc46bcbe5764be5-210881771.png';
import logoutIcon from '../../assets/images/purse-swf/icons/2093_logout_icon_png.png';
import settingsIcon from '../../assets/images/purse-swf/icons/2291_settings_icon_png$c9dcf215bb7a7e35a3f128c7c60151bc1008066621.png';
import { Column } from '../../common';
import { loadNativeFont, measureNativeText } from '../../common/native-text/NativeFont';
import { NativeText } from '../../common/native-text/NativeText';
import { nativeTextStyles } from '../../common/native-text/NativeTextStyles';
import { usePurse } from '../../hooks';
import { CurrencyView } from './views/CurrencyView';
import { SeasonalView } from './views/SeasonalView';

/** The help label is floor(textWidth + 4) wide, measured on the shared normal-mode text field. */
const useHelpLabelWidth = (text: string) => {
    const [width, setWidth] = useState<number>(null);

    useEffect(() => {
        let disposed = false;
        const style = nativeTextStyles.u_regular;

        loadNativeFont(style)
            .then(({ font }) => !disposed && setWidth(Math.floor(measureNativeText(font, text, { ...style, antiAliasType: 'normal' }) + 4)))
            .catch(() => !disposed && setWidth(null));

        return () => {
            disposed = true;
        };
    }, [text]);

    return width;
};

export const PurseView: FC<{}> = (props) => {
    const { purse = null, hcDisabled = false } = usePurse();
    const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
    const isPhone = IsPhoneLayout(useVoltLayout());
    const [isCompactOpen, setIsCompactOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isPhone || !isCompactOpen) return;

        const onPointerDown = (event: PointerEvent) => {
            if (containerRef.current?.contains(event.target as Node)) return;

            setIsCompactOpen(false);
            setSettingsMenuOpen(false);
        };

        document.addEventListener('pointerdown', onPointerDown);

        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [isPhone, isCompactOpen]);

    const openSettingsSection = useCallback((section: string) => {
        CreateLinkEvent('user-settings/show/' + section);
        setSettingsMenuOpen(false);
    }, []);

    const displayedCurrencies = useMemo(() => GetConfigurationValue<number[]>('system.currency.types', []), []);
    const currencyDisplayNumberShort = useMemo(() => GetConfigurationValue<boolean>('currency.display.number.short', false), []);

    const currencyTypes = useMemo(() => {
        if (!purse || !purse.activityPoints || !purse.activityPoints.size) return [];

        const types = Array.from(purse.activityPoints.keys()).filter((type) => displayedCurrencies.indexOf(type) >= 0);
        types.sort((a, b) => {
            if (a === 0) return -1;
            if (b === 0) return 1;
            if (a === 5) return -1;
            if (b === 5) return 1;
            return a - b;
        });

        return types;
    }, [displayedCurrencies, purse]);

    const hasDiamonds = currencyTypes.indexOf(5) >= 0;
    const hasDuckets = currencyTypes.indexOf(0) >= 0;
    // Seasonal indicators follow seasonalcurrencyindicator.enabled/.active, one per listed type even at a zero balance.
    const seasonalCurrencies = useMemo(() => {
        if (!GetConfigurationValue<boolean>('seasonalcurrencyindicator.enabled', false)) return [];

        const types: number[] = [];

        for (const part of String(GetConfigurationValue<string>('seasonalcurrencyindicator.active', '') ?? '').split(',')) {
            const value = part.trim();

            if (value === '' || Number.isNaN(Number(value))) continue;

            const type = Math.trunc(Number(value));

            if (!types.includes(type)) types.push(type);
        }

        return types;
    }, []);

    const joinLabel = useMemo(() => localizeWithFallback('purse.clubdays.zero.amount.text', 'Get'), []);

    // Purse club indicator (DMe): "Join" while periods * 31 + days is below one, else the minutes left under a day or the days.
    const clubDaysLeft = purse ? (purse.clubPeriods * 31) + purse.clubDays : 0;
    const clubLabel = useMemo(() => {
        if (!purse || clubDaysLeft < 1) return joinLabel;
        if (purse.minutesUntilExpiration > -1 && purse.minutesUntilExpiration < 60 * 24) {
            return FriendlyTime.shortFormat(purse.minutesUntilExpiration * 60);
        }
        return FriendlyTime.shortFormat(clubDaysLeft * 86400);
    }, [purse, clubDaysLeft, joinLabel]);

    const earningsLabel = useMemo(() => localizeWithFallback('earnings.title', 'Earnings'), []);
    const helpLabel = useMemo(() => localizeWithFallback('toolbar.help', 'Help'), []);
    const helpLabelWidth = useHelpLabelWidth(helpLabel);
    const logoutLabel = useMemo(() => localizeWithFallback('toolbar.logout', 'Log out'), []);
    const settingsLabel = useMemo(() => localizeWithFallback('widget.memenu.settings', 'Settings'), []);
    const clubTitle = useMemo(() => localizeWithFallback('catalog.club.hc', 'Habbo Club'), []);
    const hasClubTime = clubDaysLeft >= 1;

    const openClub = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        CreateLinkEvent('habboUI/open/hccenter');
    }, []);

    const openEarnings = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        CreateLinkEvent('habboUI/open/vault');
    }, []);

    if (!purse) return null;

    const compactAmount = (amount: number) => (currencyDisplayNumberShort ? LocalizeShortNumber(amount).toLowerCase() : amount.toLocaleString());
    const showFullPurse = !isPhone || isCompactOpen;

    return (
        <Column alignItems="end" className="volt-purse-container" gap={0} innerRef={containerRef}>
            {isPhone && (
                <button
                    type="button"
                    className="volt-purse-compact"
                    aria-expanded={isCompactOpen}
                    aria-label={localizeWithFallback('purse_coins', 'Credits')}
                    onClick={() => {
                        setIsCompactOpen((value) => !value);
                        setSettingsMenuOpen(false);
                    }}
                >
                    <span className="volt-purse-compact__currency volt-purse-compact__currency--credits">
                        <span className="volt-purse-compact__amount">{compactAmount(purse.credits)}</span>
                        <img src={creditsIcon} alt="" />
                    </span>
                    {hasDuckets && (
                        <span className="volt-purse-compact__currency volt-purse-compact__currency--duckets">
                            <span className="volt-purse-compact__amount">{compactAmount(purse.activityPoints.get(0) || 0)}</span>
                            <img src={ducketsIcon} alt="" />
                        </span>
                    )}
                    {hasDiamonds && (
                        <span className="volt-purse-compact__currency volt-purse-compact__currency--diamonds">
                            <span className="volt-purse-compact__amount">{compactAmount(purse.activityPoints.get(5) || 0)}</span>
                            <img src={diamondIcon} alt="" />
                        </span>
                    )}
                </button>
            )}
            <div className={showFullPurse ? 'volt-purse' : 'volt-purse hidden'}>
                <div className="volt-purse__chrome" aria-hidden="true" />
                <div className="volt-purse__body">
                    <div className="volt-purse__currencies">
                        {hasDiamonds && <CurrencyView type={5} amount={purse.activityPoints.get(5) || 0} short={currencyDisplayNumberShort} />}
                        <CurrencyView type={-1} amount={purse.credits} short={currencyDisplayNumberShort} />
                        {hasDuckets && <CurrencyView type={0} amount={purse.activityPoints.get(0) || 0} short={currencyDisplayNumberShort} />}
                    </div>
                    <div className="volt-purse__col volt-purse__col--primary subscription-container">
                        {!hcDisabled && (
                            <button
                                type="button"
                                className="volt-purse__btn volt-purse__btn--join volt-purse-subscription club-text"
                                onClick={openClub}
                                aria-label={clubTitle}
                            >
                                <img src={hcIcon} alt="" className="volt-purse__btn-img" />
                                <span className={hasClubTime ? 'volt-purse__btn-days' : 'volt-purse__btn-join'}>{clubLabel}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            className="volt-purse__btn volt-purse__btn--earnings volt-purse-subscription club-text"
                            onClick={openEarnings}
                            aria-label={earningsLabel}
                        >
                            <img src={earningsIcon} alt="" className="volt-purse__btn-img" />
                            <span className="volt-purse__btn-earnings">{earningsLabel}</span>
                        </button>
                    </div>
                    <div className="volt-purse__divider" aria-hidden="true" />
                    <div className="volt-purse__col volt-purse__col--actions">
                        <button
                            type="button"
                            className="volt-purse__btn volt-purse__btn--help volt-purse-right-button help"
                            onClick={(event) => {
                                event.stopPropagation();
                                CreateLinkEvent('help/show');
                            }}
                            aria-label={helpLabel}
                        >
                            <span className="volt-purse__help-label" style={{ left: 22 - Math.floor((helpLabelWidth ?? 0) / 2) }}>
                                <NativeText background={0x2f7db5} overrides={{ color: 0xffffff }} text={helpLabel} textStyle="u_regular" transparent />
                            </span>
                        </button>
                        <button
                            type="button"
                            className="volt-purse__btn volt-purse__btn--icon volt-purse__btn--logout volt-purse-right-button logout"
                            onClick={(event) => {
                                event.stopPropagation();
                                LogOut();
                            }}
                            aria-label={logoutLabel}
                        >
                            <img src={logoutIcon} alt="" className="volt-purse__btn-img" />
                        </button>
                        <button
                            type="button"
                            className="volt-purse__btn volt-purse__btn--icon volt-purse__btn--settings volt-purse-right-button settings"
                            onClick={(event) => {
                                event.stopPropagation();
                                setSettingsMenuOpen((value) => !value);
                            }}
                            aria-label={settingsLabel}
                        >
                            <img src={settingsIcon} alt="" className="volt-purse__btn-img" />
                        </button>
                    </div>
                </div>
            </div>
            {showFullPurse && settingsMenuOpen && (
                <div className="volt-purse-menu">
                    <button type="button" className="volt-purse-menu__item" onClick={() => openSettingsSection('audio')}>
                        {localizeWithFallback('widget.memenu.settings.audio', 'Sound settings')}
                    </button>
                    <button type="button" className="volt-purse-menu__item" onClick={() => openSettingsSection('chat')}>
                        {localizeWithFallback('widget.memenu.settings.chat', 'Chat settings')}
                    </button>
                    <button type="button" className="volt-purse-menu__item" onClick={() => openSettingsSection('other')}>
                        {localizeWithFallback('widget.memenu.settings.other', 'Other settings')}
                    </button>
                    {GetConfigurationValue<boolean>('user.custom.filter.enabled', false) && (
                        <button type="button" className="volt-purse-menu__item" onClick={() => openSettingsSection('wordfilter')}>
                            {localizeWithFallback('word_filter.settings.title', 'Word filter')}
                        </button>
                    )}
                </div>
            )}
            {seasonalCurrencies.length > 0 && (
                <div className="volt-purse__other">
                    {seasonalCurrencies.map((type) => (
                        <SeasonalView key={type} type={type} amount={purse.activityPoints.get(type) || 0} />
                    ))}
                </div>
            )}
        </Column>
    );
};
