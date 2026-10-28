import { CSSProperties, FC, PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';
import boxLines from '../../assets/images/wired/native/menu_box_lines.png';
import discordIcon from '../../assets/images/wired/native/menu_discord.png';
import { ClassicScrollAreaView, VoltCardHeaderView, VoltCardView } from '../../common';
import { WiredMenuLabel } from './WiredMenuLabel';

interface Rect {
    x: number;
    y: number;
    w?: number;
    h?: number;
}

const place = ({ x, y, w, h }: Rect): CSSProperties => ({ left: x, top: y, width: w, height: h });

/** An absolutely placed element of the wired_menu_view layout: the XML rect is the contract. */
export const WiredMenuItem: FC<PropsWithChildren<Rect & { className?: string; style?: CSSProperties }>> = ({ x, y, w, h, className = '', style, children }) => (
    <div className={`volt-wired-menu__item ${className}`} style={{ ...place({ x, y, w, h }), ...style }}>
        {children}
    </div>
);

/** The `border` windows of the menu: a flat 0xdadada panel. */
export const WiredMenuPanel: FC<PropsWithChildren<Rect & { className?: string }>> = ({ className = '', children, ...rect }) => (
    <div className={`volt-wired-menu__item volt-wired-menu__panel ${className}`} style={place(rect)}>
        {children}
    </div>
);

const isText = (children: ReactNode): children is string | number => typeof children === 'string' || typeof children === 'number';

/** A layout `text` window: plain text is drawn as the native TextField, anything else is placed as it is. */
export const WiredMenuTitle: FC<PropsWithChildren<Rect & { className?: string }>> = ({ className = '', children, ...rect }) => (
    <div className={`volt-wired-menu__item ${isText(children) ? '' : 'volt-wired-menu__text volt-wired-menu__text--bold'} ${className}`} style={place(rect)}>
        {isText(children) ? <WiredMenuLabel bold text={String(children)} /> : children}
    </div>
);

export const WiredMenuText: FC<PropsWithChildren<Rect & { className?: string }>> = ({ className = '', children, ...rect }) => (
    <div className={`volt-wired-menu__item ${isText(children) ? '' : 'volt-wired-menu__text'} ${className}`} style={place(rect)}>
        {isText(children) ? <WiredMenuLabel text={String(children)} /> : children}
    </div>
);

interface WiredMenuCheckboxProps extends Rect {
    checked: boolean;
    disabled?: boolean;
    label: ReactNode;
    onChange: (checked: boolean) => void;
}

/** `option_box`: a 20px checkbox window at (0,1) and its label at x=20. */
export const WiredMenuCheckbox: FC<WiredMenuCheckboxProps> = ({ checked, disabled = false, label, onChange, ...rect }) => (
    <label className={`volt-wired-menu__item volt-wired-menu__option ${disabled ? 'is-disabled' : ''}`} style={place(rect)}>
        <input checked={checked} disabled={disabled} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
        <span className="volt-wired-menu__text">{label}</span>
    </label>
);

interface WiredMenuButtonProps extends Rect {
    disabled?: boolean;
    danger?: boolean;
    className?: string;
    title?: string;
    onClick: () => void;
}

/** The skin border of a menu button; absolutely placed children are measured from inside it. */
const BUTTON_BORDER = 5;
/** The caption's top in a 25px high button; the label is centred, so a taller button moves it down by half the extra height. */
const BUTTON_CAPTION_TOP = 3;

/** The menu's `button_shiny_regular` buttons; the red ones use the 0xe33934 style 5 skin. A text caption is the button's centred label. */
export const WiredMenuButton: FC<PropsWithChildren<WiredMenuButtonProps>> = ({ disabled = false, danger = false, className = '', title, onClick, children, ...rect }) => (
    <button
        className={`volt-wired-menu__item volt-wired-menu__button ${danger ? 'is-danger' : ''} ${className}`}
        disabled={disabled}
        title={title}
        style={place(rect)}
        type="button"
        onClick={onClick}
    >
        {isText(children) ? (
            <WiredMenuLabel
                align="button"
                className="volt-wired-menu__button-caption"
                color={danger ? 0xffffff : 0}
                style={{ left: -BUTTON_BORDER, top: BUTTON_CAPTION_TOP + Math.floor(((rect.h ?? 25) - 25) / 2) - BUTTON_BORDER, opacity: disabled && !danger ? 0.5 : undefined }}
                text={String(children)}
                width={rect.w}
            />
        ) : (
            children
        )}
    </button>
);

interface WiredMenuButtonIconProps {
    src: string;
    alt?: string;
    /** The static_bitmap's place in the button; without it the bitmap is centred (pivot_point center) in a `box` sized window. */
    x?: number;
    y?: number;
    box?: { w: number; h: number };
    className?: string;
}

/** A static_bitmap inside a menu button, placed on whole pixels like the official window. */
export const WiredMenuButtonIcon: FC<WiredMenuButtonIconProps> = ({ src, alt = '', x, y, box, className = '' }) => {
    const [size, setSize] = useState<{ w: number; h: number }>(null);
    const left = x ?? (box && size ? Math.floor((box.w - size.w) / 2) : 0);
    const top = y ?? (box && size ? Math.floor((box.h - size.h) / 2) : 0);

    return (
        <img
            alt={alt}
            className={`volt-wired-menu__button-icon ${className}`}
            draggable={false}
            src={src}
            style={{ left: left - BUTTON_BORDER, top: top - BUTTON_BORDER, visibility: x !== undefined || size ? undefined : 'hidden' }}
            onLoad={(event) => setSize({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })}
        />
    );
};

export interface WiredMenuTab {
    key: string;
    label: string;
}

interface WiredMenuFrameProps {
    title: string;
    tabs: WiredMenuTab[];
    activeTab: string;
    headerTitle: string;
    onTabChange: (key: string) => void;
    onClose: () => void;
}

const BOX_LINES = [8, 78, 148, 218, 288, 358, 428];

/** wired_menu_view: a 500x500 frame-3 window; every child below sits at the XML's client coordinates. */
export const WiredMenuFrame: FC<PropsWithChildren<WiredMenuFrameProps>> = ({ title, tabs, activeTab, headerTitle, onTabChange, onClose, children }) => (
    <VoltCardView
        className="volt-wired-menu"
        frameStyle={3}
        initialPosition={{ x: 36, y: 35 }}
        isResizable={false}
        theme="primary-slim"
        uniqueKey="wired-creator-tools"
    >
        <VoltCardHeaderView headerText="" onCloseClick={onClose}>
            <WiredMenuLabel align="center" className="volt-wired-menu__caption" color={0xffffff} text={title} textStyle="u_frame_title" width={486} />
        </VoltCardHeaderView>
        <div className="volt-wired-menu__client">
            <div className="volt-wired-menu__tabs" role="tablist">
                {tabs.map((tab, index) => (
                    <button
                        key={tab.key}
                        aria-selected={tab.key === activeTab}
                        className={`volt-wired-menu__tab ${tab.key === activeTab ? 'is-active' : ''}`}
                        role="tab"
                        style={{ left: 8 + index * 96 }}
                        type="button"
                        onClick={() => onTabChange(tab.key)}
                    >
                        <WiredMenuLabel align="center" className="volt-wired-menu__tab-caption" text={tab.label} width={96} />
                    </button>
                ))}
            </div>
            <div className="volt-wired-menu__header">
                <div className="volt-wired-menu__header-inner" />
                {BOX_LINES.map((x, index) => (
                    <img key={x} alt="" className="volt-wired-menu__box-lines" draggable={false} src={boxLines} style={{ left: x, top: index % 2 === 0 ? 20 : -20 }} />
                ))}
                <WiredMenuLabel align="center" className="volt-wired-menu__header-title" color={0xffffff} text={headerTitle} textStyle="u_headline_medium" width={500} />
                <div className="volt-wired-menu__discord">
                    <img alt="" draggable={false} src={discordIcon} />
                </div>
            </div>
            <div className="volt-wired-menu__body">{children}</div>
        </div>
    </VoltCardView>
);

export interface WiredMenuTableColumn {
    key: string;
    title: string;
    /** TableColumn.widthFactor: the share of the row width. */
    factor: number;
    /** TableColumn.alignment; the official default is centred. */
    align?: 'left' | 'center' | 'right';
}

export interface WiredMenuTableRow {
    key: string;
    cells: Record<string, ReactNode>;
    linkColumn?: string;
    onLink?: () => void;
    selected?: boolean;
    onSelect?: () => void;
}

interface WiredMenuTableProps extends Rect {
    columns: WiredMenuTableColumn[];
    rows: WiredMenuTableRow[];
    emptyText?: string;
    /** TableView.initialize(columns, showTitles): the picker list has no title row. */
    showTitles?: boolean;
    /** Util.disableSection: the border and every text are drawn at half opacity. */
    disabled?: boolean;
    rowClassName?: string;
}

const TABLE_MARGIN = 5;
const TITLE_ROW_HEIGHT = 23;
const ROW_HEIGHT = 20;
const SCROLLBAR_OFFSET = 21;
const CELL_MARGIN = 4;
const TEXT_HEIGHT = 17;

/** TableRowView.updateColor: even and odd rows, and the selected row with and without focus. */
const ROW_COLORS = { even: '#eaeaea', odd: '#f9f9f9', focused: '#b8e2fc', selected: '#d1d1d1' };

/** A selected row is drawn with focus after a mouse down on it, until the next mouse down outside it (WME_CLICK_AWAY). */
const useRowFocus = () => {
    const [focused, setFocused] = useState(false);
    const rowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!focused) return;
        const onPointerDown = (event: PointerEvent) => {
            if (!rowRef.current?.contains(event.target as Node)) setFocused(false);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
    }, [focused]);

    return { focused, setFocused, rowRef };
};

/** The shared `table_view` layout (TableView): a border_white box, a 23px bold title row, a splitter and 20px rows. */
export const WiredMenuTable: FC<WiredMenuTableProps> = ({ columns, rows, emptyText = 'Nothing to display', showTitles = true, disabled = false, rowClassName = '', ...rect }) => {
    const width = rect.w ?? 472;
    const height = rect.h ?? 177;
    const contentsWidth = width - TABLE_MARGIN * 2;
    const contentsHeight = height - TABLE_MARGIN * 2;
    const titleHeight = showTitles ? TITLE_ROW_HEIGHT + 1 : 0;
    const itemsHeight = contentsHeight - titleHeight;
    const rowWidth = contentsWidth - (rows.length * ROW_HEIGHT > itemsHeight ? SCROLLBAR_OFFSET : 0);
    const cellWidth = (column: WiredMenuTableColumn) => Math.floor(rowWidth * column.factor);
    const { focused, setFocused, rowRef } = useRowFocus();
    const textStyle: CSSProperties = disabled ? { opacity: 0.5 } : undefined;

    const cell = (column: WiredMenuTableColumn, content: ReactNode, bold: boolean, top: number) => {
        const cellW = cellWidth(column);
        if (typeof content !== 'string' && typeof content !== 'number') return content;
        const text = String(content);
        const align = column.align ?? 'center';
        if (align === 'right')
            return <WiredMenuLabel align="right" bold={bold} style={{ ...textStyle, position: 'absolute', left: CELL_MARGIN, top }} text={text} width={cellW - CELL_MARGIN * 2} />;
        if (align === 'center')
            return <WiredMenuLabel align="center" bold={bold} style={{ ...textStyle, position: 'absolute', left: CELL_MARGIN, top }} text={text} width={cellW - CELL_MARGIN * 2} />;
        return <WiredMenuLabel bold={bold} overflowWidth={bold ? undefined : cellW - CELL_MARGIN * 4} style={{ ...textStyle, position: 'absolute', left: CELL_MARGIN, top }} text={text} />;
    };

    return (
        <div className={`volt-wired-menu__item volt-wired-menu__table ${disabled ? 'is-disabled' : ''}`} style={place(rect)}>
            <div className="volt-wired-menu__table-border" />
            <div className="volt-wired-menu__table-contents" style={{ left: TABLE_MARGIN, top: TABLE_MARGIN, width: contentsWidth, height: contentsHeight }}>
                {showTitles && (
                    <>
                        <div className="volt-wired-menu__table-title" style={{ width: rowWidth }}>
                            {columns.map((column) => (
                                <div key={column.key} className="volt-wired-menu__cell" style={{ width: cellWidth(column) }}>
                                    {cell(column, column.title, true, 2)}
                                </div>
                            ))}
                        </div>
                        <div className="volt-wired-menu__table-splitter" style={{ width: rowWidth }} />
                    </>
                )}
                {rows.length > 0 && (
                    <ClassicScrollAreaView className="volt-wired-menu__table-items air-style3-scroll-area" scrollStep={ROW_HEIGHT} style={{ top: titleHeight, width: contentsWidth, height: itemsHeight }}>
                        {rows.map((row, index) => {
                            const background = row.selected ? (focused ? ROW_COLORS.focused : ROW_COLORS.selected) : index % 2 === 0 ? ROW_COLORS.even : ROW_COLORS.odd;
                            return (
                                <div
                                    key={row.key}
                                    ref={row.selected ? rowRef : undefined}
                                    className={`volt-wired-menu__table-row ${rowClassName} ${row.selected ? 'is-selected' : ''}`}
                                    style={{ width: rowWidth, background }}
                                    onClick={row.onSelect}
                                    onPointerDown={() => setFocused(true)}
                                >
                                    {columns.map((column) => (
                                        <div key={column.key} className="volt-wired-menu__cell" style={{ width: cellWidth(column) }}>
                                            {row.linkColumn === column.key ? (
                                                <button className="volt-wired-menu__link" type="button" onClick={row.onLink}>
                                                    {row.cells[column.key]}
                                                </button>
                                            ) : (
                                                cell(column, row.cells[column.key], false, 1)
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </ClassicScrollAreaView>
                )}
            </div>
            {rows.length === 0 && !!emptyText && (
                <WiredMenuLabel
                    align="center"
                    color={0x333333}
                    style={{ ...textStyle, position: 'absolute', left: 0, top: titleHeight + Math.floor((contentsHeight - titleHeight - TEXT_HEIGHT) / 2) }}
                    text={emptyText}
                    width={width}
                />
            )}
        </div>
    );
};
