import { FC, useMemo, useSyncExternalStore } from 'react';
import { IsTouchLayout, NotificationAlertItem, NotificationAlertType, useVoltLayout } from '../../../../api';
import { LayoutNotificationAlertViewProps } from '../../../../common';
import { NotificationDefaultAlertView } from './NotificationDefaultAlertView';

interface NotificationDefaultAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

const VOLT_ABOUT_TEXT = [
    'Volt is the web client for Plus++ Emulator.',
    '',
    '<b>About</b>',
    'Volt is a fork of Octane. Custom logic has been stripped out and only its best parts are kept. We have fixed a lot ourselves and made sure the UI matches the Habbo AIR UI.',
    '',
    '<b>Credits</b>',
    'Thanks to Billsonnn and the Nitro team for the Nitro React and Nitro Renderer work that Volt is built on.'
].join('\n');

const subscribeDisplaySize = (notify: () => void) => {
    window.addEventListener('resize', notify);
    window.visualViewport?.addEventListener('resize', notify);

    return () => {
        window.removeEventListener('resize', notify);
        window.visualViewport?.removeEventListener('resize', notify);
    };
};

const getDisplaySize = () => {
    let pageHeight = window.innerHeight;
    try {
        pageHeight = window.parent.innerHeight;
    } catch {
        // A cross-origin hotel page cannot share its size through the DOM.
        return `Screen ${window.screen.height} · Game ${window.innerHeight} CSS px`;
    }

    return `Screen ${window.screen.height} · Page ${pageHeight} · Game ${window.innerHeight} CSS px`;
};

export const VoltSystemAlertView: FC<NotificationDefaultAlertViewProps> = (props) => {
    const { title = 'Volt', ...rest } = props;

    const isTouch = IsTouchLayout(useVoltLayout());
    const displaySize = useSyncExternalStore(subscribeDisplaySize, getDisplaySize);
    const aboutItem = useMemo(() => new NotificationAlertItem(
        [isTouch ? `${VOLT_ABOUT_TEXT}\n\n<b>Display height</b>\n${displaySize}` : VOLT_ABOUT_TEXT],
        NotificationAlertType.DEFAULT, null, null, title
    ), [displaySize, isTouch, title]);

    return <NotificationDefaultAlertView {...rest} item={aboutItem} title={title} />;
};
