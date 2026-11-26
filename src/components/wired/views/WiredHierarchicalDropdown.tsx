import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IsTouchLayout, useVoltLayout } from '../../../api/touch';
import { NativeText } from '../../../common/native-text/NativeText';
import { WiredInputBorderSkin } from './WiredInputBorderSkin';
import { useWiredNative } from './WiredNativeContext';

export interface WiredHierarchicalOption {
    label: string;
    value: string | null;
    children: WiredHierarchicalOption[];
}

export interface WiredHierarchicalDropdownProps {
    options: WiredHierarchicalOption[];
    value: string | null;
    caption: string;
    disabled?: boolean;
    onChange: (value: string) => void;
}

interface Column {
    options: WiredHierarchicalOption[];
    path: WiredHierarchicalOption[];
    left: number;
    top: number;
    width: number;
    height: number;
}

const ROW_HEIGHT = 22;
const MAX_COLUMN_HEIGHT = 300;
const ROW_HOVERED = 0xe0e0e0;
const ROW_SELECTED = 0xb8e2fc;
const ROW_EVEN = 0xefefef;
const ROW_ODD = 0xfafafa;

const isBranch = (option: WiredHierarchicalOption) => option.children.length > 0;

const findPath = (options: WiredHierarchicalOption[], value: string): WiredHierarchicalOption[] | null =>
{
    for (const option of options)
    {
        if (!isBranch(option) && option.value === value) return [option];

        if (isBranch(option))
        {
            const path = findPath(option.children, value);

            if (path) return [option, ...path];
        }
    }

    return null;
};

const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

/** AIR HierarchicalDropdown: the selected path as the caption, one column per open branch, a branch opens on hover. */
export const WiredHierarchicalDropdown: FC<WiredHierarchicalDropdownProps> = ({ options, value, caption, disabled = false, onChange }) =>
{
    const isNative = useWiredNative();
    const isTouch = IsTouchLayout(useVoltLayout());
    const fieldRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [columns, setColumns] = useState<Column[]>([]);
    const [hovered, setHovered] = useState<number[]>([]);
    const [touchOpenRect, setTouchOpenRect] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
    const [touchStack, setTouchStack] = useState<WiredHierarchicalOption[]>([]);
    const path = value === null ? null : findPath(options, value);
    const label = path ? path.map(option => option.label).join(' > ') : caption;
    const isOpen = (isTouch ? touchOpenRect !== null : columns.length > 0) && !disabled;

    const close = useCallback(() =>
    {
        setColumns([]);
        setHovered([]);
        setTouchOpenRect(null);
        setTouchStack([]);
    }, []);

    const columnSize = (count: number) =>
    {
        const fieldWidth = fieldRef.current?.offsetWidth ?? 0;
        const width = Math.min(window.innerWidth, Math.max(180, Math.min(280, fieldWidth)));
        const height = Math.min(count * ROW_HEIGHT, Math.max(ROW_HEIGHT, Math.min(MAX_COLUMN_HEIGHT, window.innerHeight) - 4)) + 4;

        return { width, height };
    };

    const open = () =>
    {
        if (disabled || !options.length || !fieldRef.current) return;

        const field = fieldRef.current.getBoundingClientRect();

        if (isTouch)
        {
            const vh = window.visualViewport?.height ?? window.innerHeight;
            const vw = window.innerWidth;
            const margin = 8;
            const width = Math.min(vw - margin * 2, Math.max(260, Math.round(field.width)));
            const maxHeight = Math.min(360, Math.max(180, Math.floor(vh * 0.6)));
            const left = Math.max(margin, Math.min(Math.round(field.left), vw - width - margin));
            let top = Math.round(field.bottom + 4);
            if (top + maxHeight > vh - margin)
            {
                const above = Math.round(field.top - maxHeight - 4);
                top = above >= margin ? above : Math.max(margin, vh - maxHeight - margin);
            }
            setTouchStack([]);
            setTouchOpenRect({ left, top, width, maxHeight });
            return;
        }

        const { width, height } = columnSize(options.length);
        let top = field.bottom;

        if (top + height > window.innerHeight) top = field.top - height;

        setColumns([{ options, path: [], left: Math.max(0, Math.min(field.left, window.innerWidth - width)), top: Math.max(0, top), width, height }]);
        setHovered([]);
    };

    const hover = (depth: number, index: number, row: HTMLElement) =>
    {
        if (hovered[depth] === index) return;

        const column = columns[depth];
        const option = column.options[index];
        const next = columns.slice(0, depth + 1);

        setHovered([...hovered.slice(0, depth), index]);

        if (isBranch(option))
        {
            const { width, height } = columnSize(option.children.length);
            let left = column.left + column.width - 1;

            if (left + width > window.innerWidth) left = column.left - width + 1;

            const top = Math.max(0, Math.min(row.getBoundingClientRect().top - 2, window.innerHeight - height));

            next.push({ options: option.children, path: [...column.path, option], left: Math.max(0, left), top, width, height });
        }

        setColumns(next);
    };

    const choose = (depth: number, index: number, row: HTMLElement) =>
    {
        const option = columns[depth].options[index];

        if (isBranch(option))
        {
            hover(depth, index, row);
            return;
        }

        if (option.value === null) return;

        close();
        onChange(option.value);
    };

    const onColumnScroll = (depth: number) =>
    {
        if (hovered[depth] === undefined) return;

        setHovered(hovered.slice(0, depth));
        setColumns(columns.slice(0, depth + 1));
    };

    useEffect(() =>
    {
        if (!isOpen) return;

        const onPointerDown = (event: PointerEvent) =>
        {
            const target = event.target as Node;

            if (!fieldRef.current?.contains(target) && !popupRef.current?.contains(target)) close();
        };
        const onKeyDown = (event: KeyboardEvent) =>
        {
            if (event.key !== 'Escape') return;

            event.stopPropagation();
            close();
        };

        const onScroll = (event: Event) =>
        {
            if (event.target instanceof Node && event.target.contains(fieldRef.current)) close();
        };

        document.addEventListener('scroll', onScroll, true);
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('resize', close);

        return () =>
        {
            document.removeEventListener('scroll', onScroll, true);
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('resize', close);
        };
    }, [isOpen, close]);

    if (isTouch)
    {
        const activeParent = touchStack.length ? touchStack[touchStack.length - 1] : null;
        const visibleOptions = activeParent ? activeParent.children : options;
        const selectedValue = path ? path[path.length - 1].value : null;

        return (
            <>
                <button ref={fieldRef} type="button" className="volt-wired-touch-dropdown" aria-label={caption} aria-expanded={isOpen} disabled={disabled}
                    onClick={() => (isOpen ? close() : open())}>
                    <span className="volt-wired-touch-dropdown__label">{label}</span>
                    <span className="volt-wired-touch-dropdown__arrow" aria-hidden="true" />
                </button>
                {isOpen && touchOpenRect && createPortal(
                    <div ref={popupRef} role="listbox" aria-label={caption} className="volt-wired-touch-dropdown__popup"
                        style={{ left: touchOpenRect.left, top: touchOpenRect.top, width: touchOpenRect.width, maxHeight: touchOpenRect.maxHeight }}>
                        {activeParent && (
                            <button type="button" className="volt-wired-touch-dropdown__back" onClick={() => setTouchStack(current => current.slice(0, -1))}>
                                ‹ {activeParent.label}
                            </button>
                        )}
                        {visibleOptions.map((option, index) =>
                        {
                            const branch = isBranch(option);
                            const disabledRow = !branch && option.value === null;
                            const isSelected = !branch && selectedValue !== null && option.value === selectedValue;

                            return (
                                <button key={index} type="button" role="option" aria-selected={isSelected} disabled={disabledRow}
                                    className={`volt-wired-touch-dropdown__row ${isSelected ? 'is-selected' : ''}`}
                                    onClick={() =>
                                    {
                                        if (branch) { setTouchStack(current => [...current, option]); return; }
                                        if (option.value === null) return;
                                        close();
                                        onChange(option.value);
                                    }}>
                                    <span className="volt-wired-touch-dropdown__row-label">{option.label}</span>
                                    {branch && <span className="volt-wired-touch-dropdown__chevron" aria-hidden="true">›</span>}
                                </button>
                            );
                        })}
                    </div>,
                    document.body
                )}
            </>
        );
    }

    if (!isNative)
        return (
            <select className="form-select form-select-sm" aria-label={caption} disabled={disabled} value={path ? value : ''} onChange={(event) => onChange(event.target.value)}>
                {!path && <option value="">{caption}</option>}
                {options.map((option, index) => isBranch(option)
                    ? <optgroup key={index} label={option.label}>{option.children.map((child, childIndex) => <option key={childIndex} value={child.value ?? ''}>{child.label}</option>)}</optgroup>
                    : <option key={index} value={option.value ?? ''}>{option.label}</option>)}
            </select>
        );

    const selectedValue = path ? path[path.length - 1].value : null;

    return (
        <>
            <button ref={fieldRef} type="button" className="volt-wired-hdropdown" aria-label={caption} aria-expanded={isOpen} disabled={disabled}
                onClick={() => (isOpen ? close() : open())}>
                <WiredInputBorderSkin />
                <span className="volt-wired-hdropdown__label"><NativeText text={label} textStyle="il_regular" background={0xffffff} /></span>
                <span className="volt-wired-hdropdown__arrow" aria-hidden="true" />
            </button>
            {isOpen && createPortal(
                <div ref={popupRef} className="volt-wired-hdropdown__popup">
                    {columns.map((column, depth) => (
                        <div key={depth} className="volt-wired-hdropdown__column" role="listbox" aria-label={caption}
                            style={{ left: column.left, top: column.top, width: column.width, height: column.height }}>
                            <WiredInputBorderSkin />
                            <div className="volt-wired-hdropdown__nodes" onScroll={() => onColumnScroll(depth)}>
                                {column.options.map((option, index) =>
                                {
                                    const disabledRow = !isBranch(option) && option.value === null;
                                    const color = hovered[depth] === index ? ROW_HOVERED
                                        : selectedValue !== null && option.value === selectedValue ? ROW_SELECTED
                                            : index % 2 === 0 ? ROW_EVEN : ROW_ODD;

                                    return (
                                        <div key={index} role="option" aria-selected={selectedValue !== null && option.value === selectedValue}
                                            className={'volt-wired-hdropdown__row' + (disabledRow ? ' is-disabled' : '')} style={{ background: hex(color) }}
                                            onPointerEnter={(event) => hover(depth, index, event.currentTarget)}
                                            onClick={(event) => choose(depth, index, event.currentTarget)}>
                                            <span className="volt-wired-hdropdown__node-label"><NativeText text={option.label} textStyle="il_regular" background={color} /></span>
                                            {isBranch(option) && <span className="volt-wired-hdropdown__branch-arrow" aria-hidden="true" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </>
    );
};
