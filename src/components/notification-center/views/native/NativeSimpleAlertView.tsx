import { FC, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { localizeWithFallback, SanitizeHtml } from '../../../../api';
import frankNeutral from '../../../../assets/images/notifications/frank-neutral.png';
import { NativeText } from '../../../../common/native-text/NativeText';
import { NativeModalView } from './NativeModalView';
import { openNativeNotificationLink } from './openNativeNotificationLink';

export interface NativeSimpleAlertViewProps {
    /** Frame caption (simple_alert_xml caption). */
    caption: string;
    /** Red heading above the message (il_heading_1); omitted when empty. */
    subtitle?: string;
    message: string;
    linkTitle?: string;
    linkUrl?: string;
    imageUrl?: string;
    onClose: () => void;
}

// simple_alert_xml (HabboWindowManagerCom): 310 wide modal frame, no header close button, Close button below an etched separator.
// SimpleAlertDialog.resizeWindow: the message list is cut to the desktop height minus a 10px margin above and below, the
// 40px of frame around the list, the bottom list, the 3px list spacing and the subtitle, but stays at least 1px high.
const DESKTOP_MARGIN = 20 + 40;
const LIST_SPACING = 3;

export const NativeSimpleAlertView: FC<NativeSimpleAlertViewProps> = (props) => {
    const { caption, subtitle = '', message, linkTitle = '', linkUrl = '', imageUrl = frankNeutral, onClose } = props;
    const [imageFailed, setImageFailed] = useState(false);
    const [imageWidth, setImageWidth] = useState(32);
    const closeRef = useRef<HTMLButtonElement>(null);
    const subtitleRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [messageMaxHeight, setMessageMaxHeight] = useState<number>(null);
    const hasImage = !!imageUrl && !imageFailed;
    const hasLink = !!linkTitle && !!linkUrl;
    const messageMarkup = useMemo(() => SanitizeHtml(message.replace(/\r\n|\r|\n/g, '<br />')), [message]);
    const plainMessage = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const template = document.createElement('template');
        template.innerHTML = messageMarkup;
        let text = '';
        for (const node of template.content.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
            else if (node.nodeName === 'BR') text += '\n';
            else return null;
        }
        return text;
    }, [messageMarkup]);

    useEffect(() => {
        closeRef.current?.focus({ preventScroll: true });
    }, []);

    useLayoutEffect(() => {
        const fit = () => {
            const reserved = DESKTOP_MARGIN + (bottomRef.current?.offsetHeight ?? 0) + LIST_SPACING + (subtitleRef.current?.offsetHeight ?? 0);

            setMessageMaxHeight(Math.max(1, window.innerHeight - reserved));
        };

        fit();
        window.addEventListener('resize', fit);

        return () => window.removeEventListener('resize', fit);
    }, []);

    const openLink = () => {
        openNativeNotificationLink(linkUrl);
        if (linkUrl.startsWith('event:')) onClose();
    };

    return (
        <NativeModalView>
            <section
                aria-label={caption}
                aria-modal="true"
                className={`volt-alert volt-card-shell volt-card-frame-3 volt-native-alert is-simple${hasImage ? ' has-image' : ''}`}
                role="alertdialog"
                style={{ width: hasImage ? imageWidth + 320 : 310 }}
            >
                <div className="volt-card-header-shell">
                    <span className="volt-card-title">{caption}</span>
                </div>
                <div className="volt-native-alert-list">
                    <div className="volt-native-alert-row">
                        {hasImage && (
                            <img
                                alt=""
                                className="volt-native-alert-illustration"
                                src={imageUrl}
                                onError={() => setImageFailed(true)}
                                onLoad={(event) => setImageWidth(event.currentTarget.naturalWidth)}
                            />
                        )}
                        <div className="volt-native-alert-top">
                            {!!subtitle && (
                                <div ref={subtitleRef} className="volt-native-alert-subtitle">
                                    {subtitle}
                                </div>
                            )}
                            <div className="volt-native-alert-message-list" style={{ maxHeight: messageMaxHeight ?? undefined }}>
                                {plainMessage !== null ? (
                                    <div className="volt-native-alert-message uses-native-text">
                                        <NativeText text={plainMessage} textStyle="il_regular" background={0xe9e9e1} maxWidth={282} />
                                    </div>
                                ) : (
                                    <div className="volt-native-alert-message" dangerouslySetInnerHTML={{ __html: messageMarkup }} />
                                )}
                            </div>
                        </div>
                    </div>
                    <div ref={bottomRef} className="volt-native-alert-bottom">
                        <div aria-hidden="true" className="volt-native-alert-separator" />
                        <button ref={closeRef} className="volt-native-button is-thick" type="button" onClick={onClose}>
                            {localizeWithFallback('alert.close.button', 'Close')}
                        </button>
                        {hasLink && (
                            <button className="volt-native-link" type="button" onClick={openLink}>
                                {linkTitle}
                            </button>
                        )}
                    </div>
                </div>
            </section>
        </NativeModalView>
    );
};
