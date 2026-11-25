import { CreateLinkEvent } from '@volt/renderer';
import { isObjectMoverRequested, IsTouchLayout } from '../../../api';

export const PLACING_HIDE_CODE = 'placing';

/** Pets and bots keep the desktop inventory open while they are placed; on touch the sheet covers the room, so it hides until placement ends. */
export const hideSheetForPlacement = () => {
    if (!IsTouchLayout() || !isObjectMoverRequested()) return;

    CreateLinkEvent(`inventory/hide/${PLACING_HIDE_CODE}`);
};
