import { FC } from 'react';
import wiredErrorIcon from '../../assets/images/wiredtools/icon_wired_error.png';
import wiredWarningIcon from '../../assets/images/wiredtools/icon_wired_warning.png';
import { localizeWithFallback } from '../../api';
import { VoltCardHeaderView, VoltCardView } from '../../common';
import { NativeText } from '../../common/native-text/NativeText';
import { WiredMenuLabel } from '../../common/native-text/WiredMenuLabel';
import { MonitorLog } from './WiredCreatorTools.types';

const TYPE_ICONS: Record<string, string> = { error: wiredErrorIcon, warning: wiredWarningIcon };

const ErrorInfoTexts: FC<{ name: string; text: string }> = ({ name, text }) => (
    <>
        <WiredMenuLabel bold align="resize" className="volt-wired-error-info__name" text={name} width={101} />
        <NativeText nativeResolution transparent background={0xe9e9e1} className="volt-wired-error-info__text" maxWidth={319} text={text} textStyle="u_regular" />
    </>
);

interface WiredErrorInfoViewProps {
    log: MonitorLog;
    onClose: () => void;
}

/** error_info_view: a 337 wide frame-3 window whose height is the contents' height + 48. */
export const WiredErrorInfoView: FC<WiredErrorInfoViewProps> = ({ log, onClose }) => {
    const title = localizeWithFallback('wiredmenu.error_info.title', 'Wired Error Information');
    const icon = TYPE_ICONS[log.category.toLowerCase()];
    // An error id without a text shows an empty body.
    const text = localizeWithFallback(`wiredmenu.error_info.${log.errorId}`, '').replace(/\\n/g, '\n');

    return (
        <VoltCardView
            className="volt-wired-error-info"
            frameStyle={3}
            initialPosition={{ x: 35, y: 30 }}
            isResizable={false}
            theme="primary-slim"
            uniqueKey="wired-monitor-error-info"
        >
            <VoltCardHeaderView headerText="" onCloseClick={onClose}>
                <WiredMenuLabel align="caption" className="volt-wired-error-info__caption" color={0xffffff} text={title} textStyle="u_frame_title" width={323} />
            </VoltCardHeaderView>
            <div className="volt-wired-error-info__contents">
                {!!icon && <img alt="" className="volt-wired-error-info__icon" draggable={false} src={icon} />}
                <ErrorInfoTexts name={log.type} text={text} />
                {/* AIR draws the texts a second time inside the bounds the window had at its layout size (337x148). */}
                <div aria-hidden="true" className="volt-wired-error-info__layout-bounds">
                    <ErrorInfoTexts name={log.type} text={text} />
                </div>
            </div>
        </VoltCardView>
    );
};
