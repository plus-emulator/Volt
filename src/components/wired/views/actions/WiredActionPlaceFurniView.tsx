import { FC, useEffect, useState } from 'react';
import { LocalizeText, tokenOfVariableSlot, variableSlotOf, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredCollapsibleSection } from '../WiredCollapsibleSection';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { WiredText } from '../WiredText';
import { WiredFurniPickButton } from '../WiredFurniPickButton';
import { WiredSourceTypeSelector } from '../WiredSourceTypeSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { getWiredValueTargetCode, normalizeWiredValueTarget, WiredActionValueOrVariableSection } from './WiredActionValueOrVariableSection';
import { WiredSection } from '../WiredSection';
import { WiredMergedSourceSection, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionPlaceFurniView: FC<{}> = () => {
    const { trigger, nativeCatalog, setIntParams, setStringParam, setFurniSources, setUserSources, setVariableIds, activePickSlot, setActivePickSlot } =
        useWired();
    const [targetIsUser, setTargetIsUser] = useState(false);
    const [location, setLocation] = useState(0);
    const [altitude, setAltitude] = useState(0);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [offsetZ, setOffsetZ] = useState(0);
    const [offsetEnabled, setOffsetEnabled] = useState([false, false, false]);
    const [validValue, setValidValue] = useState(true);
    const [spawnWithVariable, setSpawnWithVariable] = useState(false);
    const [valueIsVariable, setValueIsVariable] = useState(false);
    const [value, setValue] = useState(0);
    const [valueTarget, setValueTarget] = useState(0);
    const [spawnVariable, setSpawnVariable] = useState('n');
    const [valueVariable, setValueVariable] = useState('n');
    // The hotel opens this card on the snapshot of the picked furni (110), the triggering furni (0) and the selector (200 / users 0, 200).
    const [furni, setFurni] = useState([110, 0, 200]);
    const [users, setUsers] = useState([0, 200]);
    useEffect(() => {
        const p = trigger?.intData ?? [];
        setTargetIsUser(p[0] === 1);
        setLocation(p[1] ?? 0);
        setAltitude(p[2] ?? 0);
        setOffsetX(p[3] ?? 0);
        setOffsetY(p[4] ?? 0);
        setOffsetZ(p[5] ?? 0);
        setOffsetEnabled([3, 4, 5].map(index => (p[index] ?? 0) !== 0));
        setValidValue(true);
        setSpawnWithVariable(p[6] === 1);
        setValueIsVariable(p[7] === 1);
        setValue(p[8] ?? 0);
        setValueTarget(p[9] ?? 0);
        setSpawnVariable(trigger?.variableIds[0] ?? 'n');
        setValueVariable(trigger?.variableIds[1] ?? 'n');
        setFurni([0, 1, 2].map((slot) => trigger?.furniSources[slot] ?? [110, 0, 200][slot]));
        setUsers([0, 1].map((slot) => trigger?.userSources[slot] ?? [0, 200][slot]));
    }, [trigger]);
    const rows = nativeCatalog?.available ? [...nativeCatalog.rows.values()].map((row) => row.variable) : [];
    const spawnRows = rows.filter((row) => row.variableTarget === 0 && row.variableType === 0 && row.canCreateAndDelete);
    const spawnDefinition = spawnRows.find(row => row.variableId === spawnVariable);
    // Preserve saved references while the catalog loads; a resolved no-value variable disables the initial value.
    const spawnValueEnabled = spawnWithVariable && spawnVariable !== 'n' && (!spawnDefinition || spawnDefinition.hasValue);
    const spawnEntries = buildWiredVariablePickerEntries('furni', 'give', spawnRows.map(row => ({ variableId: row.variableId, name: row.variableName,
        availability: row.availabilityType, hasValue: row.hasValue, canCreateAndDelete: row.canCreateAndDelete })));
    const spawnToken = tokenOfVariableSlot(spawnVariable);
    if (spawnToken && !flattenWiredVariablePickerEntries(spawnEntries).some(entry => entry.token === spawnToken)) {
        const fallback = createFallbackVariableEntry('furni', spawnToken);
        if (fallback) spawnEntries.unshift(fallback);
    }
    const setF = (slot: number, source: number) => setFurni((previous) => previous.map((entry, index) => (index === slot ? source : entry)));
    const setU = (slot: number, source: number) => setUsers((previous) => previous.map((entry, index) => (index === slot ? source : entry)));
    const referenceNeeded = location === 1 || altitude === 2;
    const validate = () =>
        (!spawnValueEnabled || validValue) && [offsetX, offsetY, offsetZ, value].every(Number.isInteger) &&
        Math.abs(offsetX) <= 64 &&
        Math.abs(offsetY) <= 64 &&
        Math.abs(offsetZ) <= 8000 &&
        value >= -2147483648 &&
        value <= 2147483647;
    const save = () => {
        setIntParams([
            targetIsUser ? 1 : 0,
            location,
            altitude,
            offsetEnabled[0] ? offsetX : 0,
            offsetEnabled[1] ? offsetY : 0,
            offsetEnabled[2] ? offsetZ : 0,
            spawnWithVariable ? 1 : 0,
            spawnValueEnabled && valueIsVariable ? 1 : 0,
            spawnValueEnabled ? value : 0,
            valueTarget
        ]);
        setStringParam('');
        setFurniSources(furni);
        setUserSources(users);
        setVariableIds([spawnWithVariable ? spawnVariable : 'n', spawnValueEnabled && valueIsVariable ? valueVariable : 'n']);
    };
    return (
        <WiredActionBaseView
            nativeLayout={true}
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            validate={validate}
            selectionPreview={<></>}
            footer={
                <>
                    <WiredSourcesSelector showFurni={true} furniTitle="wiredfurni.params.sources.furni.title.place_furni" furniSource={furni[0]} onChangeFurni={(source) => setF(0, source)} />
                    {/* AIR class_3972.as:161-198, 278-285 (WIN63-202610131318): merged 0 "custom_target" (furni 1 / users 0) is always in the footer with the
                        furni/users type selector in its header, greyed unless the location or altitude needs a custom reference. */}
                    <WiredMergedSourceSection
                        scope={targetIsUser ? 'users' : 'furni'}
                        title="wiredfurni.params.sources.merged.title.custom_target"
                        furniSlot={1}
                        userSlot={0}
                        furniSource={furni[1]}
                        userSource={users[0]}
                        disabled={!referenceNeeded}
                        headerOption={<WiredSourceTypeSelector types={['furni', 'user']} value={targetIsUser ? 'user' : 'furni'} onChange={type => setTargetIsUser(type === 'user')} />}
                        onChangeFurni={(source) => setF(1, source)}
                        onChangeUsers={(source) => setU(0, source)}
                    />
                    <div style={{ display: 'flex', gap: 5 }}>
                        {[0, 1].map(slot => <WiredFurniPickButton key={slot} kind={slot === 0 ? 'primary' : 'secondary'} active={activePickSlot === slot} onClick={() => setActivePickSlot(slot as 0 | 1)} />)}
                    </div>
                </>
            }
        >
            <WiredCollapsibleSection defaultExpanded title={LocalizeText('wiredfurni.params.general_box_info')}>
                <WiredText soft wrap text={LocalizeText('wiredfurni.params.place_furni.usage_info')} />
            </WiredCollapsibleSection>
            <WiredCollapsibleSection defaultExpanded title={LocalizeText('wiredfurni.params.place_furni.target_location')}>
                <WiredRadioGroup name="place-location" value={location} onChange={setLocation} options={[0, 1].map(id => ({ id,
                    label: LocalizeText(`wiredfurni.params.place_furni.target_location.${id}`),
                    extra: id === 0 ? <WiredText soft wrap text={LocalizeText('wiredfurni.params.place_furni.target_location.0.info')} /> : undefined }))} />
            </WiredCollapsibleSection>
            <WiredCollapsibleSection defaultExpanded title={LocalizeText('wiredfurni.params.place_furni.target_altitude')}>
                <WiredRadioGroup name="place-altitude" value={altitude} onChange={setAltitude} options={[0, 1, 2].map(id => ({ id, label: LocalizeText(`wiredfurni.params.place_furni.target_altitude.${id}`) }))} />
            </WiredCollapsibleSection>
            <WiredCollapsibleSection title={LocalizeText('wiredfurni.params.place_furni.offsets')}>
                {[{ suffix: 'x', value: offsetX, update: setOffsetX, max: 64 }, { suffix: 'y', value: offsetY, update: setOffsetY, max: 64 }, { suffix: 'altitude', value: offsetZ, update: setOffsetZ, max: 8000 }].map((input, index) => <div key={input.suffix} style={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                    <WiredCheckboxOption label={LocalizeText(`wiredfurni.params.place_furni.offsets.${input.suffix}`)} checked={offsetEnabled[index]} last={index === 2}
                        onChange={selected => setOffsetEnabled(current => current.map((enabled, slot) => slot === index ? selected : enabled))} />
                    <WiredNumberInput width={45} ariaLabel={LocalizeText(`wiredfurni.params.place_furni.offsets.${input.suffix}`)} value={input.value} onChange={input.update} min={-input.max} max={input.max} disabled={!offsetEnabled[index]} />
                </div>)}
            </WiredCollapsibleSection>
            <WiredCollapsibleSection title={LocalizeText('wiredfurni.params.place_furni.spawn_with_variable')}>
                <WiredCheckboxOption label={LocalizeText('wiredfurni.params.place_furni.spawn_with_variable')} checked={spawnWithVariable} onChange={setSpawnWithVariable} last />
                <fieldset disabled={!spawnWithVariable} inert={!spawnWithVariable} style={{ border: 0, padding: 0, margin: '3px 0 0 25px', minWidth: 0 }}>
                    <WiredSection title={LocalizeText('wiredfurni.params.variables.variable_selection')}>
                        <WiredVariablePicker entries={spawnEntries} selectedToken={spawnToken} recentScope="place-furni-spawn" onSelect={entry => setSpawnVariable(variableSlotOf(entry.token))} />
                    </WiredSection>
                    <WiredActionValueOrVariableSection title={LocalizeText('wiredfurni.params.place_furni.spawn_with_value')}
                        targetTitle={LocalizeText('wiredfurni.params.variables.reference_value.target')} recentScope="place-furni-value"
                        min={-2147483648} max={2147483647} option={valueIsVariable ? 1 : 0} onOptionChange={option => setValueIsVariable(option === 1)}
                        literal={value} onLiteralChange={setValue} target={normalizeWiredValueTarget(valueTarget)} onTargetChange={target => setValueTarget(getWiredValueTargetCode(target))}
                        variableToken={tokenOfVariableSlot(valueVariable)} onVariableTokenChange={token => setValueVariable(variableSlotOf(token))} disabled={!spawnValueEnabled} onValidityChange={setValidValue}
                        // AIR class_3972.as:109,161-198 (WIN63-202610131318): merged 1 ([2,1]) is claimed by the spawn value section and drawn in its popup;
                        // isInputSourceDisabled(1) = !spawnWithVariable || section disabled, which also keeps the popup closed.
                        popupSources={<WiredMergedSourceSection bare scope={normalizeWiredValueTarget(valueTarget)} title="wiredfurni.params.sources.merged.title.variables" furniSlot={2} userSlot={1}
                            furniSource={furni[2]} userSource={users[1]} disabled={!spawnValueEnabled} onChangeFurni={(source) => setF(2, source)} onChangeUsers={(source) => setU(1, source)} />} />
                </fieldset>
            </WiredCollapsibleSection>
        </WiredActionBaseView>
    );
};
