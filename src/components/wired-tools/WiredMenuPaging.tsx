import { FC, useEffect, useRef, useState } from 'react';
import arrowLeft from '../../assets/images/wired/native/menu_page_arrow_left.png';
import arrowRight from '../../assets/images/wired/native/menu_page_arrow_right.png';
import { loadNativeFont, measureNativeText } from '../../common/native-text/NativeFont';
import { nativeTextStyles } from '../../common/native-text/NativeTextStyles';
import { WiredMenuLabel } from '../../common/native-text/WiredMenuLabel';
import { WiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
import { clampInputPage, NO_PAGE, parseInputPage, restrictPageInput } from './WiredPaging.helpers';

const BUTTON_BORDER = 5;
const PAGE_INPUT_WIDTH = 21;
const LIST_SPACING = 2;
const TEXT_BLEND = 0.7;

/** A `container_button` (button_shiny_thick) with its style 4/5 triangle icons; disabled draws the icons at half opacity. */
const PageButton: FC<{ x: number; icons: number[]; right?: boolean; disabled: boolean; title: string; onClick: () => void }> = ({ x, icons, right = false, disabled, title, onClick }) => (
    <button aria-label={title} className="volt-wired-menu__page-button" disabled={disabled} style={{ left: x }} type="button" onClick={onClick}>
        {icons.map((left) => (
            <img key={left} alt="" draggable={false} src={right ? arrowRight : arrowLeft} style={{ left: left - BUTTON_BORDER, top: 10 - BUTTON_BORDER }} />
        ))}
    </button>
);

/** The widths of the two auto sized pixel-mode text windows: floor(textWidth + 4). */
const useTextWindowWidths = (start: string, end: string) => {
    const [widths, setWidths] = useState<number[]>(null);

    useEffect(() => {
        let disposed = false;
        const style = nativeTextStyles.u_regular;
        loadNativeFont(style)
            .then(({ font }) => !disposed && setWidths([start, end].map((text) => Math.floor(measureNativeText(font, text, style) + 4))))
            .catch(() => undefined);
        return () => {
            disposed = true;
        };
    }, [start, end]);

    return widths;
};

/**
 * The centred item list keeps its centre when it resizes (WindowController.setRectangle, on_resize_align_center): each resize moves it by
 * half the width change, rounded toward zero, and carries the odd pixel to the next one. The start text is set before the end text.
 */
const useCentredListLeft = (center: WiredMenuPagingFooterProps['center'], widths: number[] | null) => {
    const state = useRef({ x: center.x, rest: 0, start: center.startWidth, end: center.endWidth });

    if (widths) {
        const current = state.current;
        const resize = (start: number, end: number) => {
            const change = current.rest - (start + end - current.start - current.end);
            if (start + end !== current.start + current.end) {
                const step = Math.trunc(change / 2);
                current.x += step;
                current.rest = change - step * 2;
            }
            current.start = start;
            current.end = end;
        };
        resize(widths[0], current.end);
        resize(widths[0], widths[1]);
    }

    return state.current.x;
};

export interface WiredMenuPagingFooterProps {
    /** The frame width; the right button list sits 127 px from its right edge. */
    width: number;
    /** The centred itemlist of the layout: its x, and its start and end texts with their XML widths, shown until a page arrives. */
    center: { x: number; startText: string; startWidth: number; endText: string; endWidth: number };
    /** The paging text with `%entries_count%`, `%page%` and `%page_count%`. */
    template: string;
    currentPage: number;
    lastPage: number;
    totalEntries: number;
    requests: WiredPageRequests;
    className?: string;
}

/**
 * PagedTableView's `pagination` container: first / previous on the left, next / last on the right, and the centred
 * "N found. Showing page [ ] of M" list. The page field takes digits only and goes to its page on Enter or a click elsewhere.
 */
export const WiredMenuPagingFooter: FC<WiredMenuPagingFooterProps> = ({ width, center, template, currentPage, lastPage, totalEntries, requests, className = '' }) => {
    const [pageInput, setPageInput] = useState(currentPage === NO_PAGE ? '1' : String(currentPage));
    const loaded = currentPage !== NO_PAGE;
    const [startTemplate, endTemplate] = template.split('%page%');
    const startText = loaded && endTemplate !== undefined ? startTemplate.replace('%entries_count%', String(totalEntries)) : center.startText;
    const endText = loaded && endTemplate !== undefined ? endTemplate.replace('%page_count%', String(lastPage)) : center.endText;
    const widths = useTextWindowWidths(startText, endText);
    const listLeft = useCentredListLeft(center, widths);
    const startWidth = widths?.[0] ?? center.startWidth;

    useEffect(() => {
        setPageInput(currentPage === NO_PAGE ? '1' : String(currentPage));
    }, [currentPage]);

    const isFirst = loaded && currentPage <= 1;
    const isLast = loaded && lastPage !== NO_PAGE && currentPage >= lastPage;

    const navigateToInputPage = () => {
        const typed = parseInputPage(pageInput);
        const clamped = clampInputPage(typed, lastPage);

        if (clamped !== typed) setPageInput(String(clamped));
        if (!loaded || clamped === currentPage) return;

        requests.requestPage(clamped);
    };

    return (
        <div className={`volt-wired-menu__item ${className}`} style={{ left: 0, width, height: 30 }}>
            <PageButton disabled={isFirst} icons={[18, 27]} title="First page" x={17} onClick={() => requests.requestFirstPage()} />
            <PageButton disabled={isFirst} icons={[22]} title="Previous page" x={80} onClick={() => requests.requestPreviousPage()} />
            <PageButton right disabled={isLast} icons={[23]} title="Next page" x={width - 127} onClick={() => requests.requestNextPage()} />
            <PageButton right disabled={isLast} icons={[18, 27]} title="Last page" x={width - 67} onClick={() => requests.requestLastPage()} />
            <div className="volt-wired-menu__item" style={{ left: listLeft, top: 4, height: 25, visibility: widths ? undefined : 'hidden' }}>
                <WiredMenuLabel style={{ position: 'absolute', left: 0, top: 0, opacity: TEXT_BLEND }} text={startText} />
                <label className="volt-wired-menu__page-input" style={{ left: startWidth + LIST_SPACING }}>
                    <WiredMenuLabel style={{ position: 'absolute', left: -1, top: -1 }} text={pageInput} />
                    <input
                        aria-label="Page"
                        inputMode="numeric"
                        type="text"
                        value={pageInput}
                        onBlur={navigateToInputPage}
                        onChange={(event) => setPageInput(restrictPageInput(event.target.value))}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter') return;

                            event.preventDefault();
                            navigateToInputPage();
                        }}
                    />
                </label>
                <WiredMenuLabel style={{ position: 'absolute', left: startWidth + LIST_SPACING + PAGE_INPUT_WIDTH + LIST_SPACING, top: 0, opacity: TEXT_BLEND }} text={endText} />
            </div>
        </div>
    );
};
