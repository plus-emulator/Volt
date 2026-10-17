import { FC, ReactNode, useEffect, useState } from 'react';
import { FriendlyTime, LocalizeText } from '../../../../api';
import { getBuildersClubSecondsLeft, getBuildersClubSecondsLeftWithGrace, useBuildersClubStore } from '../../../../state/buildersClubStore';

const VALUE_START = '\u0001';
const VALUE_END = '\u0002';

// AIR registers each value as <font color="#ff8d00"><b>value</b></font> inside the localized line.
const highlight = (value: string) => `${VALUE_START}${value}${VALUE_END}`;

const renderLine = (text: string): ReactNode[] =>
    text.split(VALUE_START).map((part, index) => {
        if (!index) return part;

        const [value, rest = ''] = part.split(VALUE_END);

        return (
            <span key={index}>
                <b className="volt-catalog-builder-header-value">{value}</b>
                {rest}
            </span>
        );
    });

/**
 * The Builders Club warehouse header (catalog_ubuntu builder.mode.header), filled the way AIR HabboCatalog.refreshBuilderStatus
 * does (WIN63-202610151745-318700621, HabboCatalog.as:3730-3758): builder.header.title with the member, grace or trial status,
 * builder.header.status.membership with the time left (the status itself on the trial) and builder.header.status.limit with the
 * borrowed count and the furni limit.
 */
export const CatalogBuilderHeaderView: FC = () => {
    const status = useBuildersClubStore((state) => state);
    const [now, setNow] = useState(() => performance.now());

    useEffect(() => {
        const interval = window.setInterval(() => setNow(performance.now()), 1000);

        return () => window.clearInterval(interval);
    }, []);

    const secondsLeft = getBuildersClubSecondsLeft(status, now);
    const secondsLeftWithGrace = getBuildersClubSecondsLeftWithGrace(status, now);
    const isMember = secondsLeft > 0;
    const inGrace = !isMember && secondsLeftWithGrace > 0;
    const statusText = LocalizeText(`builder.header.status.${isMember ? 'member' : inGrace ? 'grace' : 'trial'}`);
    const duration = isMember ? FriendlyTime.format(secondsLeft) : inGrace ? FriendlyTime.format(secondsLeftWithGrace) : statusText;

    return (
        <>
            <div className="volt-catalog-builder-header-title">{LocalizeText('builder.header.title', ['bcstatus'], [statusText])}</div>
            <div className="volt-catalog-builder-header-line is-membership">
                {renderLine(LocalizeText('builder.header.status.membership', ['duration'], [highlight(duration)]))}
            </div>
            <div className="volt-catalog-builder-header-line is-limit">
                {renderLine(
                    LocalizeText(
                        'builder.header.status.limit',
                        ['count', 'limit'],
                        [highlight(status.furniCount.toString()), highlight(status.furniLimit.toString())]
                    )
                )}
            </div>
        </>
    );
};
