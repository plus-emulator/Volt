import { FC, useMemo } from 'react';
import { NotificationAlertItem, NotificationAlertType } from '../../../../api';
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

export const VoltSystemAlertView: FC<NotificationDefaultAlertViewProps> = (props) => {
    const { title = 'Volt', ...rest } = props;

    const aboutItem = useMemo(() => new NotificationAlertItem([VOLT_ABOUT_TEXT], NotificationAlertType.DEFAULT, null, null, title), [title]);

    return <NotificationDefaultAlertView {...rest} item={aboutItem} title={title} />;
};
