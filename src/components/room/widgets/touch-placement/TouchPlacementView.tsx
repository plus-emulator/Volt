import { CreateLinkEvent, GetRoomEngine, RoomObjectCategory, RoomObjectOperationType } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    cancelRoomObjectPlacement,
    CommitRoomTouchPlacement,
    getPlacingItemId,
    isObjectMoverRequested,
    IsTouchLayout,
    LocalizeText,
    localizeWithFallback,
    useVoltLayout
} from '../../../../api';
import rotateIcon from '../../../../assets/images/avatareditor/arrow-right-icon.png';
import hintIcon from '../../../../assets/images/navigator/air/select-arrow.png';
import cancelIcon from '../../../../assets/images/room-tools-swf/roomtools_zoom_out.png';
import { useBuildHeight, useRoom } from '../../../../hooks';
import { useCatalogStore } from '../../../../hooks/catalog/catalogStore';

const POLL_MS = 200;

interface PlacementState {
    category: number;
    hasPreview: boolean;
}

const readPlacement = (roomId: number): PlacementState => {
    const roomEngine = GetRoomEngine();
    const selected = roomEngine.getSelectedRoomObjectData(roomId);

    if (!selected || (selected.operation !== RoomObjectOperationType.OBJECT_PLACE && selected.operation !== RoomObjectOperationType.OBJECT_MOVE)) return null;

    return { category: selected.category, hasPreview: !!roomEngine.getRoomObject(roomId, selected.id, selected.category) };
};

const cancelPlacement = () => {
    const catalog = useCatalogStore.getState();

    if (catalog.objectMoverRequested && catalog.purchasableOffer) {
        catalog.cancelObjectMover();
        CreateLinkEvent('catalog/show');
        return;
    }

    if (isObjectMoverRequested() && getPlacingItemId() !== -1) {
        cancelRoomObjectPlacement();
        CreateLinkEvent('inventory/show');
        return;
    }

    GetRoomEngine().cancelRoomObjectPlacement();
};

/**
 * Touch HUD while an item is placed or moved: a hint bar on top and 44 px controls at the
 * bottom. The renderer has no "placement started" event, so the selected object is polled.
 */
export const TouchPlacementView: FC<{}> = () => {
    const isTouch = IsTouchLayout(useVoltLayout());
    const { roomSession = null } = useRoom();
    const { available: heightAvailable = false, toggle: toggleHeight = null } = useBuildHeight();
    const [placement, setPlacement] = useState<PlacementState>(null);

    useEffect(() => {
        if (!isTouch || !roomSession) {
            setPlacement(null);
            return;
        }

        const update = () =>
            setPlacement((previous) => {
                const next = readPlacement(roomSession.roomId);

                if (previous?.category === next?.category && previous?.hasPreview === next?.hasPreview) return previous;

                return next;
            });

        update();

        const interval = window.setInterval(update, POLL_MS);

        return () => window.clearInterval(interval);
    }, [isTouch, roomSession]);

    if (!isTouch || !placement) return null;

    const refresh = () => setPlacement(readPlacement(roomSession.roomId));

    return createPortal(
        <div className="volt-touch-placement">
            <div className="volt-touch-placement__hint">
                <img alt="" draggable={false} src={hintIcon} />
                <span>{localizeWithFallback('volt.touch.placement.hint', 'Drag to move. Tap a tile to drop.')}</span>
            </div>
            <div className="volt-touch-placement__bar">
                <button
                    type="button"
                    className="volt-touch-black-button"
                    onClick={() => {
                        cancelPlacement();
                        refresh();
                    }}
                >
                    <img alt="" draggable={false} src={cancelIcon} />
                    <span>{LocalizeText('generic.cancel')}</span>
                </button>
                {placement.category === RoomObjectCategory.FLOOR && (
                    <button type="button" className="volt-touch-black-button" onClick={() => GetRoomEngine().rotateActiveObjectPreview(true)}>
                        <img alt="" draggable={false} src={rotateIcon} />
                        <span>{LocalizeText('infostand.button.rotate')}</span>
                    </button>
                )}
                {heightAvailable && (
                    <button type="button" className="volt-touch-black-button" onClick={toggleHeight}>
                        <span>{localizeWithFallback('widget.buildheight.title', 'Height')}</span>
                    </button>
                )}
                <button
                    type="button"
                    className="volt-touch-placement__place"
                    disabled={!placement.hasPreview}
                    onClick={() => {
                        CommitRoomTouchPlacement();
                        refresh();
                    }}
                >
                    {localizeWithFallback('volt.touch.placement.place', 'Place')}
                </button>
            </div>
        </div>,
        document.body
    );
};
