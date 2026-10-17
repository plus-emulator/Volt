import { RoomWidgetUpdateEvent } from './RoomWidgetUpdateEvent';

/** AIR InfoStandFurniView.as:480 `RWFAM_RECOLOR`: the infostand asks the recolour window to open for a furni. */
export class RoomWidgetFurnitureRecolorEvent extends RoomWidgetUpdateEvent
{
    public static OPEN: string = 'RWFAM_RECOLOR';

    private _objectId: number;
    private _category: number;

    constructor(type: string, objectId: number, category: number)
    {
        super(type);

        this._objectId = objectId;
        this._category = category;
    }

    public get objectId(): number
    {
        return this._objectId;
    }

    public get category(): number
    {
        return this._category;
    }
}
