import type { ConditionDefinition } from '@volt/renderer';
import { IWiredVariableData } from '@volt/renderer';
import { IWiredVariablePickerEntry } from '../WiredVariablePickerData';
import { WiredSourceTypeSelector } from '../WiredSourceTypeSelector';
import { WiredSection } from '../WiredSection';
import { WiredFurniPickButton } from '../WiredFurniPickButton';
import { WiredRadioGroup } from '../WiredOptions';
import { useWiredNative } from '../WiredNativeContext';
import { FC } from 'react';
import { getNativeVariableId, localizeWithFallback, LocalizeText, WiredNativeVariableScope } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Button, Text } from '../../../../common';
import { useVariableScopeEntries, useWired } from '../../../../hooks';

const SCOPE_ICONS: Record<WiredNativeVariableScope, string> = {
    user: userVariableIcon,
    furni: furniVariableIcon,
    global: globalVariableIcon,
    context: contextVariableIcon
};

/** The scope's buttons, in the order given; the active one is highlighted. */
export const VariableScopeButtons: FC<{ scopes: WiredNativeVariableScope[]; value: WiredNativeVariableScope; onChange: (scope: WiredNativeVariableScope) => void }> = ({
    scopes,
    value,
    onChange
}) => useWiredNative() ? <WiredSourceTypeSelector types={scopes} value={value} onChange={onChange} /> : (
    <div className="volt-wired__give-var-targets">
        {scopes.map((scope) => (
            <button
                key={scope}
                type="button"
                className={`volt-wired__give-var-target volt-wired__give-var-target--${scope} ${value === scope ? 'is-active' : ''}`}
                onClick={() => onChange(scope)}
            >
                <img src={SCOPE_ICONS[scope]} alt={scope} />
            </button>
        ))}
    </div>
);

/** Quantifier radios of the variable conditions: all or any of the holders. */
export const VariableQuantifierRadios: FC<{ name: string; value: number; onChange: (value: number) => void }> = ({ name, value, onChange }) =>
{
    // AIR getQuantifierKey (UserDefinedRoomEventsCtrl.as:512-518): the negative card's invert flag selects the ".neg." labels.
    const { trigger = null } = useWired();
    const key = `wiredfurni.params.quantifier.variables${trigger && 'inverse' in trigger && (trigger as ConditionDefinition).inverse ? '.neg' : ''}`;

    return <VariableQuantifierRadiosView name={name} value={value} onChange={onChange} labelKey={key} />;
};

const VariableQuantifierRadiosView: FC<{ name: string; value: number; labelKey: string; onChange: (value: number) => void }> = ({ name, value, labelKey, onChange }) => useWiredNative() ? <WiredSection title={LocalizeText('wiredfurni.params.quantifier_selection')}><WiredRadioGroup name={name} value={value} onChange={onChange} options={[0, 1].map(id => ({ id, label: LocalizeText(`${labelKey}.${id}`) }))} /></WiredSection> : (
    <div className="flex flex-col gap-1">
        <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
        {[0, 1].map((option) => (
            <label key={option} className="flex items-center gap-1">
                <input checked={value === option} className="form-check-input" name={name} type="radio" onChange={() => onChange(option)} />
                <Text>{LocalizeText(`${labelKey}.${option}`)}</Text>
            </label>
        ))}
    </div>
);

/** Primary and secondary pick buttons for the furni slots a card reads from; the active slot receives the next picks. */
export const FurniPickSlotButtons: FC<{ slots: Array<{ slot: 0 | 1; count: number }> }> = ({ slots }) => {
    const { activePickSlot = 0, setActivePickSlot = null } = useWired();
    const native = useWiredNative();

    if (!slots.length) return null;
    if (native) return <div style={{ display: 'flex', gap: 2 }}>{slots.filter((entry, index) => slots.findIndex(other => other.slot === entry.slot) === index).map(({ slot }) => <WiredFurniPickButton key={slot} kind={slot === 0 ? 'primary' : 'secondary'} active={activePickSlot === slot} onClick={() => setActivePickSlot?.(slot)} />)}</div>;

    return (
        <div className="flex gap-2">
            {slots.filter((entry, index) => slots.findIndex(other => other.slot === entry.slot) === index).map(({ slot, count }) => (
                <Button key={slot} disabled={activePickSlot === slot} onClick={() => setActivePickSlot(slot)}>
                    {slot === 0
                        ? localizeWithFallback('wiredfurni.params.picks.primary', 'Primary picks ({count})', ['count'], [String(count)])
                        : localizeWithFallback('wiredfurni.params.picks.secondary', 'Secondary picks ({count})', ['count'], [String(count)])}
                </Button>
            ))}
        </div>
    );
};

/** Keep saved unavailable IDs visible; picker choices use the native AIR capability flags. */
export const useConditionVariableEntries = (scope: WiredNativeVariableScope, token: string, kind: 'exists' | 'age' | 'value') => {
    const entries = useVariableScopeEntries(scope, 'condition', token);
    const { nativeCatalog } = useWired();
    if (!nativeCatalog?.rows) return entries;
    const allowed = (variable: IWiredVariableData) => kind === 'exists' ? !variable.alwaysAvailable : kind === 'age' ? variable.canReadCreationTime || variable.canReadLastUpdateTime : variable.hasValue;
    const filter = (list: IWiredVariablePickerEntry[]): IWiredVariablePickerEntry[] => list.flatMap(entry => {
        if (entry.children) return [{ ...entry, children: filter(entry.children) }];
        const variable = nativeCatalog.rows.get(getNativeVariableId(entry.token))?.variable;
        if (variable && allowed(variable)) return [entry];
        return entry.token === token ? [{ ...entry, selectable: false }] : [];
    });
    return filter(entries);
};
