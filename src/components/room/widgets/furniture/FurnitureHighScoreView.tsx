import { FC, useEffect, useRef } from 'react';
import { AddAnimationTickerCallback, GetRoomObjectScreenLocation, LocalizeText } from '../../../../api';
import { useFurnitureHighScoreWidget } from '../../../../hooks';

// The bubble sits at this offset from the board's screen location and follows it.
const OFFSET_X = -138;
const OFFSET_Y = -400;

export const FurnitureHighScoreView: FC<{}> = () => {
    const { display = null, getScoreType = null, getClearType = null, isConfigured = null, isTimeScore = null, formatScore = null } = useFurnitureHighScoreWidget();
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!display) return;

        const updatePosition = () => {
            const element = elementRef.current;
            const location = GetRoomObjectScreenLocation(display.roomId, display.objectId, display.category);

            if (!element || !location) return;

            element.style.left = `${ location.x + OFFSET_X }px`;
            element.style.top = `${ location.y + OFFSET_Y }px`;
        };

        updatePosition();

        return AddAnimationTickerCallback(updatePosition);
    }, [ display ]);

    if (!display) return null;

    const { stuffData } = display;
    const configured = isConfigured(stuffData.scoreType, stuffData.clearType);
    const timeScore = configured && isTimeScore(stuffData.scoreType);
    const caption = configured
        ? LocalizeText('high.score.display.caption', [ 'scoretype', 'cleartype' ], [
            LocalizeText(`high.score.display.scoretype.${ getScoreType(stuffData.scoreType) }`),
            LocalizeText(`high.score.display.cleartype.${ getClearType(stuffData.clearType) }`)
        ])
        : LocalizeText('high.score.display.caption');

    return (
        <div ref={ elementRef } className="volt-high-score">
            <div className="volt-high-score__skin" />
            <div className="volt-high-score__pointer" />
            <div className="volt-high-score__title">{ caption }</div>
            <div className="volt-high-score__header">
                <div className="volt-high-score__header-users">{ LocalizeText('high.score.display.users.header') }</div>
                <div className="volt-high-score__header-score">{ LocalizeText(timeScore ? 'high.score.display.time.header' : 'high.score.display.score.header') }</div>
            </div>
            <div className="volt-high-score__list" />
            <div className="volt-high-score__entries">
                { stuffData.entries.map((entry, index) => (
                    <div key={ index } className="volt-high-score__entry">
                        <span className="volt-high-score__users">{ entry.users.join(', ') }</span>
                        <span className="volt-high-score__score">{ formatScore(entry.score, stuffData.scoreType) }</span>
                    </div>
                )) }
            </div>
            <div className="volt-high-score__footer">{ LocalizeText('high.score.display.congratulations.footer') }</div>
            <div className="volt-high-score__cup" />
        </div>
    );
};
