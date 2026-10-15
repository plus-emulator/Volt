import { IWiredVariableData } from '@volt/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { getNativeVariableId, LocalizeText, nativeVariableDefinitions, tokenOfVariableSlot, variableSlotOf, WIRED_NATIVE_VARIABLE_TARGET, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredCollapsibleSection } from '../WiredCollapsibleSection';
import { WiredCheckboxGroup, WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourceTypeSelector } from '../WiredSourceTypeSelector';
import { WiredText } from '../WiredText';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

type Target = 'user' | 'furni' | 'global';
const targetOf = (value: number): Target => value === 0 ? 'furni' : value === -10 ? 'global' : 'user';
const toggle = (mask: number, bit: number, selected: boolean) => selected ? mask | (1 << bit) : mask & ~(1 << bit);

/** VariableUpdate.onChangeVariable, package25. All permissions come from the native WiredVariable record. */
export const variableUpdateControls = (variable: IWiredVariableData | undefined) => {
    const canCreateDelete = !variable || variable.canCreateAndDelete || variable.variableType === 2 || variable.availabilityType === 21 || variable.variableType === 3 || variable.variableType === 1;
    return {
        canCreateDelete,
        canChange: !variable || variable.hasValue || variable.variableType === 3 || variable.variableType === 1,
        otherRooms: !!variable && variable.variableTarget === -10 && [11, 20].includes(variable.availabilityType),
        persisted: !!variable && [10, 11, 20].includes(variable.availabilityType)
    };
};

/** AIR VariableUpdate owns six ints and one native variable slot; furniture picks are retained in both modes. */
export const WiredTriggerVariableChangedView: FC = () => {
    const { trigger, nativeCatalog, setIntParams, setVariableIds, setStringParam } = useWired();
    const [target, setTarget] = useState<Target>('user');
    const [token, setToken] = useState('');
    const [created, setCreated] = useState(false);
    const [changed, setChanged] = useState(false);
    const [deleted, setDeleted] = useState(false);
    const [changeMask, setChangeMask] = useState(0);
    const [originMask, setOriginMask] = useState(-1);
    const [mode, setMode] = useState(0);
    const rows = nativeCatalog?.rows;
    const selected = rows?.get(getNativeVariableId(token))?.variable;
    const controls = variableUpdateControls(selected);
    const entries = useMemo(() => {
        const definitions = nativeVariableDefinitions(rows, target).filter(definition => {
            const variable = rows?.get(definition.variableId)?.variable;
            return !!variable?.canInterceptChanges && !variable.requiresExecutionContext;
        });
        const options = buildWiredVariablePickerEntries(target, 'condition', definitions);
        if (!token || flattenWiredVariablePickerEntries(options).some(entry => entry.token === token)) return options;
        // Keep an unavailable saved id visible without granting picker permission to it.
        const fallback = createFallbackVariableEntry(target, token);
        return fallback ? [{ ...fallback, selectable: false }, ...options] : options;
    }, [rows, target, token]);

    useEffect(() => {
        if (!trigger) return;
        const ints = trigger.intData;
        const variableId = trigger.variableIds[0];
        setToken(tokenOfVariableSlot(variableId));
        setTarget(targetOf(rows?.get(variableId)?.variable.variableTarget));
        setCreated(ints[0] === 1); setChanged(ints[1] === 1); setDeleted(ints[2] === 1);
        setChangeMask(ints[3] ?? 0); setOriginMask(ints[4] ?? -1); setMode(ints.length > 5 && ints[5] !== 0 ? 1 : 0);
    }, [trigger]);

    // The shared catalog may arrive after the configuration; only resolve its target, never reset draft options.
    useEffect(() => {
        if (selected && selected.variableTarget !== WIRED_NATIVE_VARIABLE_TARGET[target]) setTarget(targetOf(selected.variableTarget));
    }, [selected]);

    const save = () => {
        setVariableIds([variableSlotOf(token)]);
        setStringParam('');
        setIntParams([created ? 1 : 0, changed ? 1 : 0, deleted ? 1 : 0, changeMask, (originMask & 15) === 15 ? -1 : originMask, mode]);
    };

    return <WiredTriggerBaseView hasSpecialInput nativeLayout requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save}>
        <WiredSection title={LocalizeText('wiredfurni.params.variables.trigger_mode')}>
            <WiredRadioGroup name="variable-update-mode" options={[0, 1].map(id => ({ id, label: LocalizeText(`wiredfurni.params.variables.trigger_mode.${id}`) }))} value={mode} onChange={setMode} />
        </WiredSection>
        <fieldset disabled={mode === 1} style={{ border: 0, margin: 0, padding: 0, minWidth: 0, opacity: mode === 1 ? 0.5 : 1 }}>
            <WiredSection title={LocalizeText('wiredfurni.params.variables.variable_selection')} headerOptionsRight={<WiredSourceTypeSelector types={['furni', 'user', 'global']} value={target} disabled={mode === 1} onChange={value => { setTarget(value as Target); setToken(''); }} />}>
                <WiredVariablePicker entries={entries} recentScope="variable-triggers" selectedToken={token} onSelect={entry => { if (mode === 0 && entry.selectable) setToken(entry.token); }} />
            </WiredSection>
        </fieldset>
        <WiredCollapsibleSection title={LocalizeText('wiredfurni.params.variables.trigger_options')}>
            <WiredCheckboxGroup>
                <WiredCheckboxOption label={LocalizeText('wiredfurni.params.variables.trigger_options.0')} checked={created} disabled={!controls.canCreateDelete} onChange={setCreated} />
                <div>
                    <WiredCheckboxOption label={LocalizeText('wiredfurni.params.variables.trigger_options.1')} checked={changed} disabled={!controls.canChange} onChange={setChanged} />
                    <fieldset className="volt-wired__option-extra" disabled={!changed || !controls.canChange} style={{ border: 0, padding: 0, minWidth: 0 }}>
                        <WiredCheckboxGroup>{[0, 1, 2].map(bit => <WiredCheckboxOption key={bit} last={bit === 2} label={LocalizeText(`wiredfurni.params.variables.trigger_options.1.${bit}`)} checked={(changeMask & (1 << bit)) !== 0} disabled={!changed || !controls.canChange} onChange={checked => setChangeMask(mask => toggle(mask, bit, checked))} />)}</WiredCheckboxGroup>
                    </fieldset>
                </div>
                <WiredCheckboxOption last label={LocalizeText('wiredfurni.params.variables.trigger_options.2')} checked={deleted} disabled={!controls.canCreateDelete} onChange={setDeleted} />
            </WiredCheckboxGroup>
        </WiredCollapsibleSection>
        <WiredCollapsibleSection title={LocalizeText('wiredfurni.params.variables.trigger_origin')}>
            <WiredCheckboxGroup>{[0, 1, 2, 3].map(bit => <div key={bit}>
                <WiredCheckboxOption last={bit === 3} label={LocalizeText(`wiredfurni.params.variables.trigger_origin.${bit}`)} checked={(originMask & (1 << bit)) !== 0} disabled={bit === 1 ? !controls.otherRooms : bit === 3 ? !controls.persisted : false} onChange={checked => setOriginMask(mask => toggle(mask & 15, bit, checked))} />
                {bit >= 2 && <div className="volt-wired__option-extra"><WiredText soft wrap text={LocalizeText(`wiredfurni.params.variables.trigger_origin.${bit}.info`)} /></div>}
            </div>)}</WiredCheckboxGroup>
        </WiredCollapsibleSection>
    </WiredTriggerBaseView>;
};
