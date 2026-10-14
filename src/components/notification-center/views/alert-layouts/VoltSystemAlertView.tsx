import { FC, useMemo } from 'react';
import { NotificationAlertItem, NotificationAlertType } from '../../../../api';
import { LayoutNotificationAlertViewProps } from '../../../../common';
import { NotificationDefaultAlertView } from './NotificationDefaultAlertView';

interface NotificationDefaultAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

const VOLT_ABOUT_TEXT = [
    '<b>Volt</b>',
    '<b>About</b>',
    'Volt is a fork of Octane, with any custom logic stripped out and only its best parts kept.',
    '<b>Credits</b>',
    'Thanks to Billsonnn and the Nitro team for the Nitro React and Nitro Renderer work that Octane is built on.'
].join('\n');

export const VoltSystemAlertView: FC<NotificationDefaultAlertViewProps> = (props) => {
    const { title = 'Volt', ...rest } = props;

    const aboutItem = useMemo(() => new NotificationAlertItem([VOLT_ABOUT_TEXT], NotificationAlertType.DEFAULT, null, null, title), [title]);

    return <NotificationDefaultAlertView {...rest} item={aboutItem} title={title} />;
};
