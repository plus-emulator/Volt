import { FC } from 'react';
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

/** DropdownPreset: the Illumina dropmenu frame (22px) with the selected option or the caption as its text. */
export const WiredDropdown: FC<WiredDropdownProps> = ({ options, value, caption = '', advancedCaption, disabled = false, onChange }) =>
{
    const isNative = useWiredNative();
    const selected = options.find((option) => option.id === value) ?? null;

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
