import { RoomObjectType } from '@volt/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText, TryVisitRoom } from '../../../../api';
import { localizeWithFallback } from '../../../../api/utils/localizeWithFallback';
import { useNavigatorData, useNavigatorFavourite, useRoomUserListSnapshot } from '../../../../hooks';
import { classNames } from '../../../../layout';
import { IVoltPlugin } from '../../../plugins/VoltPluginApi';

export interface RoomToolsTouchTool {
    action: string;
    icon: string;
    label: string;
    disabled?: boolean;
}

interface RoomToolsTouchViewProps {
    showColumn: boolean;
    tools: RoomToolsTouchTool[];
    plugins: IVoltPlugin[];
    zoomText: string;
    canZoomIn: boolean;
    canZoomOut: boolean;
    canGoBack: boolean;
    canGoNext: boolean;
    hasHistory: boolean;
    isHistoryOpen: boolean;
    roomHistory: { roomId: number; roomName: string }[];
    onTool: (action: string) => void;
}

const COLUMN_ACTIONS = ['settings', 'chat_history', 'like_room', 'toggle_room_link'];

export const RoomToolsTouchView: FC<RoomToolsTouchViewProps> = (props) => {
    const { showColumn, tools, plugins, zoomText, canZoomIn, canZoomOut, canGoBack, canGoNext, hasHistory, isHistoryOpen, roomHistory, onTool } = props;
    const [isOpen, setIsOpen] = useState(false);
    const chipRef = useRef<HTMLDivElement>(null);
    const { navigatorData } = useNavigatorData();
    const users = useRoomUserListSnapshot();
    const room = navigatorData.enteredGuestRoom;
    const { isFavourite, toggle: toggleFavourite } = useNavigatorFavourite(room?.roomId ?? 0);
    const userCount = users.filter((user) => user.type === RoomObjectType.USER).length || room?.userCount || 0;
    const favouriteLabel = LocalizeText(isFavourite ? 'navigator.favourite.tooltip' : 'navigator.makefavourite.tooltip');

    useEffect(() => {
        if (!isOpen) return;

        const onPointerDown = (event: PointerEvent) => {
            if (chipRef.current?.contains(event.target as Node)) return;

            setIsOpen(false);
        };

        document.addEventListener('pointerdown', onPointerDown);

        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [isOpen]);

    const runTool = (action: string, close = true) => {
        onTool(action);

        if (close) setIsOpen(false);
    };

    const zoomButtons = (
        <>
            <button
                type="button"
                className="volt-room-touch-btn volt-room-touch-btn--zoom-out"
                aria-label={LocalizeText('room.zoom.zoom_out.tooltip')}
                disabled={!canZoomOut}
                onClick={() => onTool('zoom_out')}
            />
            <button
                type="button"
                className="volt-room-touch-btn volt-room-touch-btn--zoom-in"
                aria-label={LocalizeText('room.zoom.zoom_in.tooltip')}
                disabled={!canZoomIn}
                onClick={() => onTool('zoom_in')}
            />
        </>
    );

    return (
        <div className={classNames('volt-room-hud', showColumn && 'has-column')}>
            {showColumn && (
                <div className="volt-room-tools-column">
                    {tools
                        .filter((tool) => COLUMN_ACTIONS.includes(tool.action))
                        .map((tool) => (
                            <button
                                key={tool.action}
                                type="button"
                                className="volt-room-touch-btn"
                                aria-label={tool.label}
                                disabled={tool.disabled}
                                onClick={() => onTool(tool.action)}
                            >
                                <span className={classNames('volt-icon', tool.icon)} />
                            </button>
                        ))}
                    <button
                        type="button"
                        className={classNames('volt-room-touch-btn', canZoomIn ? 'volt-room-touch-btn--zoom-in' : 'volt-room-touch-btn--zoom-out')}
                        aria-label={LocalizeText(canZoomIn ? 'room.zoom.zoom_in.tooltip' : 'room.zoom.zoom_out.tooltip')}
                        onClick={() => onTool(canZoomIn ? 'zoom_in' : 'zoom_out')}
                    />
                </div>
            )}
            <div className="volt-room-chip-wrap" ref={chipRef}>
                <button
                    type="button"
                    className={classNames('volt-room-chip', isOpen && 'is-open')}
                    aria-expanded={isOpen}
                    onClick={() => setIsOpen((value) => !value)}
                >
                    <span className="volt-room-chip__icon" aria-hidden="true" />
                    <span className="volt-room-chip__text">
                        <span className="volt-room-chip__name">{room?.roomName ?? ''}</span>
                        <span className="volt-room-chip__meta">
                            <span className="volt-room-chip__users" aria-hidden="true" />
                            {userCount}
                            <span className={classNames('volt-room-chip__fav', isFavourite && 'is-favourite')} title={favouriteLabel} />
                        </span>
                    </span>
                    <span className="volt-room-chip__chevron" aria-hidden="true" />
                </button>
                {isOpen && (
                    <div className="volt-room-chip-menu" role="group" aria-label={localizeWithFallback('room.tools.touch.menu', 'Room tools')}>
                        <div className="volt-room-chip-menu__row volt-room-chip-menu__row--zoom">
                            <span className="volt-room-chip-menu__label">{zoomText}</span>
                            {zoomButtons}
                        </div>
                        {tools.map((tool) => (
                            <button
                                key={tool.action}
                                type="button"
                                className="volt-room-chip-menu__row"
                                disabled={tool.disabled}
                                onClick={() => runTool(tool.action)}
                            >
                                <span className="volt-room-chip-menu__icon">
                                    <span className={classNames('volt-icon', tool.icon)} />
                                </span>
                                <span className="volt-room-chip-menu__label">{tool.label}</span>
                            </button>
                        ))}
                        {room && (
                            <button type="button" className="volt-room-chip-menu__row" onClick={toggleFavourite}>
                                <span className="volt-room-chip-menu__icon">
                                    <span className={classNames('volt-room-chip__fav', isFavourite && 'is-favourite')} />
                                </span>
                                <span className="volt-room-chip-menu__label">{favouriteLabel}</span>
                            </button>
                        )}
                        {plugins.map((plugin) => (
                            <button
                                key={plugin.name}
                                type="button"
                                className="volt-room-chip-menu__row"
                                onClick={() => {
                                    plugin.onOpen();
                                    setIsOpen(false);
                                }}
                            >
                                <span className="volt-room-chip-menu__icon">
                                    <span className={classNames('volt-icon', plugin.icon || 'icon-cog')} />
                                </span>
                                <span className="volt-room-chip-menu__label">{plugin.label}</span>
                            </button>
                        ))}
                        <div className="volt-room-chip-menu__row volt-room-chip-menu__row--history">
                            <button
                                type="button"
                                className={classNames(
                                    'volt-room-touch-btn',
                                    'volt-icon',
                                    canGoBack ? 'icon-room-history-back-enabled' : 'icon-room-history-back-disabled'
                                )}
                                aria-label={LocalizeText('room.history.button.back.tooltip')}
                                disabled={!canGoBack}
                                onClick={() => runTool('room_history_back')}
                            />
                            <button
                                type="button"
                                className={classNames(
                                    'volt-room-touch-btn',
                                    'volt-icon',
                                    hasHistory ? 'icon-room-history-enabled' : 'icon-room-history-disabled'
                                )}
                                aria-label={LocalizeText('room.history.button.tooltip')}
                                disabled={!hasHistory}
                                onClick={() => onTool('room_history')}
                            />
                            <button
                                type="button"
                                className={classNames(
                                    'volt-room-touch-btn',
                                    'volt-icon',
                                    canGoNext ? 'icon-room-history-next-enabled' : 'icon-room-history-next-disabled'
                                )}
                                aria-label={LocalizeText('room.history.button.forward.tooltip')}
                                disabled={!canGoNext}
                                onClick={() => runTool('room_history_next')}
                            />
                        </div>
                        {isHistoryOpen &&
                            roomHistory.map((history) => (
                                <button
                                    key={history.roomId}
                                    type="button"
                                    className="volt-room-chip-menu__row volt-room-chip-menu__row--room"
                                    onClick={() => {
                                        TryVisitRoom(history.roomId);
                                        setIsOpen(false);
                                    }}
                                >
                                    <span className="volt-room-chip-menu__label">{history.roomName}</span>
                                </button>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
};
