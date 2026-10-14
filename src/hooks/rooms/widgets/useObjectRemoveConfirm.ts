import { FurniturePickupComposer, ObjectRemoveConfirmEvent } from '@volt/renderer';
import { localizeWithFallback, SendMessageComposer } from '../../../api';
import { useMessageEvent } from '../../events';
import { useNotification } from '../../notification';

/** English for the keys the hotel sends today (wiredfurni.variables.pickup.*), in case the texts lack them. */
const REMOVE_CONFIRM_FALLBACKS: Record<string, string> = {
    'wiredfurni.variables.pickup.title': 'Removing a variable',
    'wiredfurni.variables.pickup.body':
        'Are you sure you want to pick up this variable? All references to it will be cleared, as well as all the data it has stored.'
};

const localizeKey = (key: string) => (key ? localizeWithFallback(key, REMOVE_CONFIRM_FALLBACKS[key] ?? key) : '');

/**
 * ObjectRemoveConfirm (in 3498, class_3455 / package_71/class_3609.as:52-62, WIN63-202610131318-860371703): the server
 * holds a pickup, e.g. of a permanent variable that stores data, until the user confirms it. As room/class_1993.as:340-363
 * does, the two keys are shown in a confirm dialog and OK sends the pickup again with the confirmed flag.
 */
export const useObjectRemoveConfirm = () => {
    const { showConfirm = null } = useNotification();

    useMessageEvent<ObjectRemoveConfirmEvent>(ObjectRemoveConfirmEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !parser.id) return;

        const { category, id, confirmTitle, confirmBody } = parser;

        showConfirm?.(
            localizeKey(confirmBody),
            () => SendMessageComposer(new FurniturePickupComposer(category, id, true)),
            null,
            null,
            null,
            localizeKey(confirmTitle)
        );
    });
};
