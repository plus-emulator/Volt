import { FC, useEffect, useState } from 'react';
import { BuilderFurniPlaceableStatus, LocalizeText } from '../../../../../api';
import errorFurniLimitIcon from '../../../../../assets/images/catalog/air/builder/error-furnilimit.png';
import errorGroupRoomIcon from '../../../../../assets/images/catalog/air/builder/error-grouproom.png';
import errorNotRoomIcon from '../../../../../assets/images/catalog/air/builder/error-notroom.png';
import errorRoomIcon from '../../../../../assets/images/catalog/air/builder/error-room.png';
import errorUserInRoomIcon from '../../../../../assets/images/catalog/air/builder/error-userinroom.png';
import { useCatalogActions, useCatalogData } from '../../../../../hooks';
import { useBuildersClubStore } from '../../../../../state/buildersClubStore';

// BuilderCatalogWidget.updateButtons: the icon and text for each status that blocks placement.
const getPlacementError = (status: number): { icon: string; text: string } | null => {
    switch (status) {
        case BuilderFurniPlaceableStatus.FURNI_LIMIT_REACHED:
            return { icon: errorFurniLimitIcon, text: 'builder.placement_widget.error.limit_reached' };
        case BuilderFurniPlaceableStatus.NOT_IN_ROOM:
            return { icon: errorNotRoomIcon, text: 'builder.placement_widget.error.not_in_room' };
        case BuilderFurniPlaceableStatus.NOT_ROOM_OWNER_OR_GROUP_ADMIN:
            return { icon: errorRoomIcon, text: 'builder.placement_widget.error.not_group_admin' };
        case BuilderFurniPlaceableStatus.GUILD_ROOM:
            return { icon: errorGroupRoomIcon, text: 'builder.placement_widget.error.group_room' };
        case BuilderFurniPlaceableStatus.VISITORS_IN_ROOM:
            return { icon: errorUserInRoomIcon, text: 'builder.placement_widget.error.visitors' };
        default:
            return null;
    }
};

/**
 * The Builders Club warehouse replaces the purchase widget with AIR's builderWidget (WIN63-202610151745-318700621,
 * BuilderCatalogWidget.as and the builderWidget layout): the drag hint, "Place one item" and "Place multiple", and the reason
 * the selected offer cannot be placed right now.
 */
export const CatalogBuilderWidgetView: FC = () => {
    const { currentOffer = null } = useCatalogData();
    const { requestOfferToMover = null, getBuilderFurniPlaceableStatus = null } = useCatalogActions();
    // The status reads the room and the Builders Club counters; re-read it when they change.
    useBuildersClubStore((state) => state.furniCount + state.furniLimit + state.secondsLeft);
    const [, setTick] = useState(0);

    useEffect(() => {
        const interval = window.setInterval(() => setTick((tick) => tick + 1), 1000);

        return () => window.clearInterval(interval);
    }, []);

    const status = getBuilderFurniPlaceableStatus?.(currentOffer) ?? BuilderFurniPlaceableStatus.MISSING_OFFER;
    const canPlace = status === BuilderFurniPlaceableStatus.OKAY;
    const error = getPlacementError(status);

    return (
        <div className="volt-catalog-builder-widget">
            <span className="volt-catalog-builder-widget-hint">{LocalizeText('builder.placement_widget.hint')}</span>
            {error && (
                <div className="volt-catalog-builder-widget-error" role="status">
                    <img alt="" className="volt-catalog-builder-widget-error-icon" draggable={false} src={error.icon} />
                    <span className="volt-catalog-builder-widget-error-message">{LocalizeText(error.text)}</span>
                </div>
            )}
            <button
                className="volt-catalog-builder-button is-place-one"
                disabled={!canPlace}
                type="button"
                onClick={() => requestOfferToMover?.(currentOffer, false)}
            >
                <span>{LocalizeText('builder.placement_widget.place_one')}</span>
            </button>
            <button
                className="volt-catalog-builder-button is-place-many"
                disabled={!canPlace}
                type="button"
                onClick={() => requestOfferToMover?.(currentOffer, true)}
            >
                <span>{LocalizeText('builder.placement_widget.place_many')}</span>
            </button>
        </div>
    );
};
