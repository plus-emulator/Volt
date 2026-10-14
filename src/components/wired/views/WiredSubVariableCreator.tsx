import { FC } from 'react';
import { WiredCheckboxGroup, WiredCheckboxOption } from './WiredOptions';

/** AIR SubVariableCreatorPreset: checkbox rows with read-only, right-aligned 85px name fields. */
export const WiredSubVariableCreator: FC<{
    options: { id: number; name: string; label: string }[];
    mask: number;
    onChange: (mask: number) => void;
}> = ({ options, mask, onChange }) => <WiredCheckboxGroup>
    {options.map((option, index) => <div key={option.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
        <div style={{ flex: 1, minWidth: 0 }}><WiredCheckboxOption label={option.label} checked={(mask & (1 << option.id)) !== 0} last={index === options.length - 1}
            onChange={selected => onChange(selected ? mask | (1 << option.id) : mask & ~(1 << option.id))} /></div>
        <div className="volt-wired__input-box" style={{ width: 93, flexShrink: 0 }}>
            <input className="volt-wired__input-field volt-wired__input-field--stretch" aria-label={option.name} readOnly disabled={(mask & (1 << option.id)) === 0} value={option.name} />
        </div>
    </div>)}
</WiredCheckboxGroup>;
