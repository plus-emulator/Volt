import {
    AddLinkEventTracker,
    BadgePointLimitsEvent,
    GetLocalizationManager,
    ILinkEventTracker,
    IRoomSession,
    RemoveLinkEventTracker,
    RoomEngineObjectEvent,
    RoomEngineObjectPlacedEvent,
    RoomSessionEvent
} from '@volt/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { isObjectMoverRequested, setObjectMoverRequested } from '../../api';
import { PLACING_HIDE_CODE } from './views/hideSheetForPlacement';
import { lazyWindow } from '../../common/lazyWindow';
import { useInventoryTrade, useMessageEvent, useVoltEvent, useWiredTrading } from '../../hooks';

const TAB_FURNITURE = 'inventory.furni';
const TAB_BOTS = 'inventory.bots';
const TAB_PETS = 'inventory.furni.tab.pets';
const TAB_BADGES = 'inventory.badges';

const TAB_BY_CODE: Record<string, string> = {
    furni: TAB_FURNITURE,
    furniture: TAB_FURNITURE,
    pets: TAB_PETS,
    badges: TAB_BADGES,
    bots: TAB_BOTS
};

const LazyInventoryWindow = lazyWindow(
    () => import('./InventoryWindow').then((module) => ({ default: module.InventoryWindow })),
    'Inventory'
);

export const InventoryView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentTab, setCurrentTab] = useState<string>(TAB_FURNITURE);
    const [roomSession, setRoomSession] = useState<IRoomSession>(null);
    const { isTrading = false, stopTrading = null } = useInventoryTrade();
    const { isOpen: isWiredTrading = false } = useWiredTrading();
    const reopenAfterPlacementRef = useRef(false);

    const onClose = useCallback(() => {
        if (isTrading) stopTrading();
        setIsVisible(false);
    }, [isTrading, stopTrading]);

    useVoltEvent<RoomEngineObjectPlacedEvent>(RoomEngineObjectEvent.PLACED, (event) => {
        if (!isObjectMoverRequested()) return;
        setObjectMoverRequested(false);
        if (!event.placedInRoom || reopenAfterPlacementRef.current) setIsVisible(true);
        reopenAfterPlacementRef.current = false;
    });

    useVoltEvent<RoomSessionEvent>([RoomSessionEvent.CREATED, RoomSessionEvent.ENDED], (event) => {
        switch (event.type) {
            case RoomSessionEvent.CREATED:
                setRoomSession(event.session);
                return;
            case RoomSessionEvent.ENDED:
                setRoomSession(null);
                setIsVisible(false);
                return;
        }
    });

    useMessageEvent<BadgePointLimitsEvent>(BadgePointLimitsEvent, (event) => {
        const parser = event.getParser();
        for (const data of parser.data) GetLocalizationManager().setBadgePointLimit(data.badgeId, data.limit);
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');
                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        if (parts[2] && TAB_BY_CODE[parts[2]]) setCurrentTab(TAB_BY_CODE[parts[2]]);
                        return;
                    case 'hide':
                        reopenAfterPlacementRef.current = parts[2] === PLACING_HIDE_CODE;
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => !prevValue);
                        if (parts[2] && TAB_BY_CODE[parts[2]]) setCurrentTab(TAB_BY_CODE[parts[2]]);
                        return;
                }
            },
            eventUrlPrefix: 'inventory/'
        };

        AddLinkEventTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        if (!isVisible && (isTrading || isWiredTrading)) setIsVisible(true);
    }, [isVisible, isTrading, isWiredTrading]);

    const [wasTrading, setWasTrading] = useState(false);

    if (wasTrading !== isTrading) {
        setWasTrading(isTrading);
        if (isTrading) setCurrentTab(TAB_FURNITURE);
    }

    if (!isVisible) return null;

    return <LazyInventoryWindow currentTab={currentTab} onChunkError={onClose} onClose={onClose} roomSession={roomSession} setCurrentTab={setCurrentTab} />;
};
