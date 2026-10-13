import { FC, useMemo } from 'react';
import { NotificationAlertItem, NotificationAlertType } from '../../../../api';
import { LayoutNotificationAlertViewProps } from '../../../../common';
import { VoltInfoAlertView } from './VoltInfoAlertView';

interface NotificationDefaultAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

const VOLT_ABOUT_TEXT = [
    '<b>Volt</b>',
    '<b>About</b>',
    'Volt is a fork of Octane, with any custom logic stripped out, keeping only its best parts.',
    '<b>Credits</b>',
    'Bill, for the Nitro React and Nitro Renderer work that Octane is built on'
].join('\n');

export const VoltSystemAlertView: FC<NotificationDefaultAlertViewProps> = (props) => {
    const { title = 'Volt', ...rest } = props;

    const aboutItem = useMemo(() => new NotificationAlertItem([VOLT_ABOUT_TEXT], NotificationAlertType.VOLT_INFO, null, null, title), [title]);

    return <VoltInfoAlertView {...rest} item={aboutItem} title={title} />;
};
