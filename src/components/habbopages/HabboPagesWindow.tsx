import DOMPurify from 'dompurify';
import { FC, MouseEvent, useMemo } from 'react';
import { CreateLinkEvent, OpenUrl } from '../../api';
import { ClassicScrollAreaView, VoltCardHeaderView, VoltCardView } from '../../common';
import { NativeText } from '../../common/native-text/NativeText';
import { NativeHabbopageContent } from './NativeHabbopageContent';

const INTERNAL_LINK_PREFIX = '#habbopages/';

export interface HabboPageContent {
    dimensions: { width: number; height: number } | null;
    header: string;
    markup: string;
}

const sanitizePageMarkup = (markup: string) =>
    DOMPurify.sanitize(markup.replaceAll('event:habbopages/', INTERNAL_LINK_PREFIX), {
        ALLOWED_TAGS: ['a', 'b', 'br', 'div', 'em', 'font', 'h1', 'h2', 'h3', 'i', 'img', 'p', 'span', 'strong', 'u'],
        ALLOWED_ATTR: ['align', 'alt', 'class', 'height', 'href', 'hspace', 'rel', 'size', 'src', 'style', 'target', 'vspace', 'width'],
        ALLOW_DATA_ATTR: false
    });

export const HabboPagesWindow: FC<{ page: HabboPageContent; onClose: () => void }> = ({ page, onClose }) => {
    const markup = useMemo(() => sanitizePageMarkup(page.markup), [page]);
    const fieldWidth = Math.max(1, (page.dimensions?.width ?? 418) - 34);

    const handleContentClick = (event: MouseEvent<HTMLDivElement>) => {
        const link = (event.target as HTMLElement).closest('a');

        if (!link || !event.currentTarget.contains(link)) return;

        event.preventDefault();

        const href = link.getAttribute('href') ?? '';

        if (href.startsWith(INTERNAL_LINK_PREFIX)) CreateLinkEvent(href.slice(1));
        else if (href) OpenUrl(link.href);
    };

    const openMarkupLink = (href: string) => {
        if (href.startsWith(INTERNAL_LINK_PREFIX)) CreateLinkEvent(href.slice(1));
        else if (href) OpenUrl(new URL(href, window.location.href).href);
    };

    return (
        <VoltCardView
            className="habbopages"
            frameStyle={3}
            initialPosition={{ x: 23, y: 41 }}
            isResizable={false}
            style={{ height: page.dimensions?.height ?? 398, width: page.dimensions?.width ?? 418 }}
            uniqueKey="habbopages"
            unconstrainedPosition
        >
            <VoltCardHeaderView headerText="" onCloseClick={onClose}>
                <NativeText
                    background={0x578ca5}
                    className="habbopages__native-title"
                    overrides={{ color: 0xffffff }}
                    text={page.header}
                    textStyle="u_frame_title"
                />
            </VoltCardHeaderView>
            <ClassicScrollAreaView className="habbopages__viewport" contentClassName="habbopages__content" minThumbSize={26} scrollStep={42} thumbSizeAdjustment={2}>
                <div className="habbopages__native-container" onClick={handleContentClick}>
                    <NativeHabbopageContent fieldWidth={fieldWidth} markup={markup} onLinkClick={openMarkupLink} />
                </div>
            </ClassicScrollAreaView>
        </VoltCardView>
    );
};
