import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IsTouchLayout, useVoltLayout } from '../../../api/touch';
import { HabboDropMenuView } from '../../../common/dropmenu/HabboDropMenuView';
import { useWiredNative } from './WiredNativeContext';

export interface WiredDropdownOption {
    id: number;
    label: string;
    advanced?: boolean;
}

export interface WiredDropdownProps {
    options: WiredDropdownOption[];
    /** -1 shows the caption, like an ExpandableDropdown without a selection. */
    value: number;
    caption?: string;
    advancedCaption?: string;
    disabled?: boolean;
    onChange: (id: number) => void;
}

const TOUCH_ROW_HEIGHT = 44;

const TouchWiredDropdown: FC<WiredDropdownProps> = ({ options: allOptions, value, caption = '', advancedCaption, disabled = false, onChange }) => {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [openRect, setOpenRect] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
    const [advancedExpanded, setAdvancedExpanded] = useState(false);

    const selected = allOptions.find((option) => option.id === value) ?? null;
    const selectedIsAdvanced = !!selected?.advanced;
    const hasHiddenAdvanced = !!advancedCaption && !advancedExpanded && !selectedIsAdvanced && allOptions.some((option) => option.advanced);
    const visibleOptions = hasHiddenAdvanced ? allOptions.filter((option) => !option.advanced) : allOptions;

    const close = useCallback(() => {
        setOpenRect(null);
        setAdvancedExpanded(false);
    }, []);

    const computeRect = useCallback(() => {
        const bounds = triggerRef.current?.getBoundingClientRect();
        const vh = window.visualViewport?.height ?? window.innerHeight;
        const vw = window.innerWidth;
        const margin = 8;
        const width = Math.min(vw - margin * 2, Math.max(240, bounds ? Math.round(bounds.width) : 260));
        const maxHeight = Math.min(340, Math.max(160, Math.floor(vh * 0.55)));
        const estHeight = Math.min(maxHeight, (visibleOptions.length + (hasHiddenAdvanced ? 1 : 0)) * TOUCH_ROW_HEIGHT + 8);
        const left = bounds ? Math.max(margin, Math.min(Math.round(bounds.left), vw - width - margin)) : margin;
        let top = bounds ? Math.round(bounds.bottom + 4) : margin;
        if (top + estHeight > vh - margin) {
            const above = bounds ? Math.round(bounds.top - estHeight - 4) : margin;
            top = above >= margin ? above : Math.max(margin, vh - estHeight - margin);
        }
        return { left, top, width, maxHeight };
    }, [visibleOptions.length, hasHiddenAdvanced]);

    useEffect(() => {
        if (!openRect) return;
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (!triggerRef.current?.contains(target) && !popupRef.current?.contains(target)) close();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                close();
            }
        };
        const onResize = () => setOpenRect(computeRect());
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('resize', onResize);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('resize', onResize);
        };
    }, [openRect, close, computeRect]);

    useEffect(() => {
        if (disabled) close();
    }, [disabled, close]);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                role="combobox"
                aria-label={caption}
                aria-expanded={!!openRect}
                aria-haspopup="listbox"
                disabled={disabled}
                className="volt-wired-touch-dropdown"
                onClick={() => (openRect ? close() : setOpenRect(computeRect()))}
            >
                <span className="volt-wired-touch-dropdown__label">{selected ? selected.label : caption}</span>
                <span className="volt-wired-touch-dropdown__arrow" aria-hidden="true" />
            </button>
            {openRect &&
                createPortal(
                    <div
                        ref={popupRef}
                        role="listbox"
                        aria-label={caption}
                        className="volt-wired-touch-dropdown__popup"
                        style={{ left: openRect.left, top: openRect.top, width: openRect.width, maxHeight: openRect.maxHeight }}
                    >
                        {visibleOptions.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                role="option"
                                aria-selected={selected?.id === option.id}
                                className={`volt-wired-touch-dropdown__row ${selected?.id === option.id ? 'is-selected' : ''}`}
                                onClick={() => {
                                    close();
                                    onChange(option.id);
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                        {hasHiddenAdvanced && (
                            <button
                                type="button"
                                className="volt-wired-touch-dropdown__row volt-wired-touch-dropdown__row--more"
                                onClick={() => setAdvancedExpanded(true)}
                            >
                                {advancedCaption}
                            </button>
                        )}
                    </div>,
                    document.body
                )}
        </>
    );
};

/** DropdownPreset: the Illumina dropmenu frame (22px) with the selected option or the caption as its text. */
export const WiredDropdown: FC<WiredDropdownProps> = (props) =>
{
    const { options, value, caption = '', advancedCaption, disabled = false, onChange } = props;
    const isNative = useWiredNative();
    const isTouch = IsTouchLayout(useVoltLayout());
    const selected = options.find((option) => option.id === value) ?? null;

    if (isTouch) return <TouchWiredDropdown {...props} />;

    if (!isNative)
        return (
            <select className="form-select form-select-sm" aria-label={caption} disabled={disabled} value={selected ? value : -1} onChange={(event) => onChange(parseInt(event.target.value))}>
                {!selected && <option value={-1}>{caption}</option>}
                {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
        );

    return (
        <HabboDropMenuView label={caption} caption={caption} skinStyle={100} disabled={disabled}
            options={options.map(option => ({ value: option.id, label: option.label, advanced: option.advanced }))}
            advancedCaption={advancedCaption} value={selected ? value : null} onSelect={onChange} />
    );
};
