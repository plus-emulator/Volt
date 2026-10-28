import { WiredMenuErrorEvent, WiredMenuErrorParser } from '@volt/renderer';
import { localizeWithFallback, NotificationBubbleType } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

/** Tells the user when the server refuses a Wired menu action that only the variable owner may do. */
export const useWiredMenuErrors = () => {
    const { showSingleBubble = null } = useNotification();

    useMessageEvent<WiredMenuErrorEvent>(WiredMenuErrorEvent, (event) => {
        if (event.getParser().errorCode !== WiredMenuErrorParser.OWNER_ONLY) return;

        showSingleBubble?.(
            localizeWithFallback('wiredmenu.error_message.7', 'Only the owner of this variable can perform this action.'),
            NotificationBubbleType.INFO
        );
    });
};
