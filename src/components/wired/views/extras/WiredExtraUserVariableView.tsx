import { FC, useEffect, useMemo, useState } from 'react';
import { handleWiredVariableNameKeyDown, LocalizeText, localizeWithFallback, normalizeWiredVariableName, WIRED_VARIABLE_NAME_MAX, WiredFurniType } from '../../../../api';
import { useNotificationActions, useWired } from '../../../../hooks';
import { WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredTextInput } from '../WiredTextInput';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/** AIR VariableNameSection: native 40-character input, spaces become underscores and names are lowercase. */
export const WiredVariableNameSection: FC<{ value: string; onChange: (value: string) => void; disabled?: boolean }> = ({ value, onChange, disabled = false }) =>
    <WiredSection title={LocalizeText('wiredfurni.params.variables.variable_name')}>
        <WiredTextInput maxLength={WIRED_VARIABLE_NAME_MAX} value={value} disabled={disabled} onChange={name => onChange(normalizeWiredVariableName(name))} onKeyDown={event => handleWiredVariableNameKeyDown(event, onChange)} />
    </WiredSection>;

interface WiredExtraVariableViewProps {
    availabilityRoomValue: number;
    availabilityRoomText: string;
    availabilityRadioName: string;
    showSharedAvailability?: boolean;
    /** User [availability, has value]; furniture [has value, availability]. */
    availabilityFirst?: boolean;
}

/** AIR UserVariable/FurniVariable buildInputs share these three sections. */
export const WiredExtraVariableView: FC<WiredExtraVariableViewProps> = props => {
    const { trigger, setIntParams, setStringParam } = useWired();
    const { showConfirm } = useNotificationActions();
    const [variableName, setVariableName] = useState('');
    const [hasValue, setHasValue] = useState(false);
    const [availability, setAvailability] = useState(props.availabilityRoomValue);
    const normalizeAvailability = useMemo(() => (value: number) => props.showSharedAvailability && value === 11 ? 11 : value === 10 ? 10 : props.availabilityRoomValue, [props.availabilityRoomValue, props.showSharedAvailability]);
    useEffect(() => {
        if (!trigger) return;
        setVariableName(normalizeWiredVariableName(trigger.stringData));
        setHasValue(trigger.intData[props.availabilityFirst ? 1 : 0] === 1);
        setAvailability(normalizeAvailability(trigger.intData[props.availabilityFirst ? 0 : 1] ?? props.availabilityRoomValue));
    }, [normalizeAvailability, props.availabilityFirst, props.availabilityRoomValue, trigger]);
    const save = () => {
        setStringParam(normalizeWiredVariableName(variableName));
        setIntParams(props.availabilityFirst ? [normalizeAvailability(availability), hasValue ? 1 : 0] : [hasValue ? 1 : 0, normalizeAvailability(availability)]);
    };
    const roomText = props.availabilityRoomText === 'wiredfurni.params.variables.availability.1' ? localizeWithFallback('wiredfurni.condition.room.active', 'While the room is active') : props.availabilityRoomText;
    // UserVariable.requireConfirmation: moving persisted/shared data to room-only availability deletes stored holders.
    const wasStored = trigger?.intData[0] === 10 || trigger?.intData[0] === 11;
    const clearsStoredValues = props.availabilityFirst && wasStored && availability !== 10 && availability !== 11;
    return <WiredExtraBaseView nativeLayout hasSpecialInput requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}
        confirmSave={clearsStoredValues ? (confirm, cancel) => showConfirm(
            LocalizeText('wiredfurni.variables.availability_change.body'), confirm, cancel, null, null,
            LocalizeText('wiredfurni.variables.availability_change.title')
        ) : undefined}>
        <WiredVariableNameSection value={variableName} onChange={setVariableName} />
        <WiredSection title={LocalizeText('wiredfurni.params.variables.settings')}><WiredCheckboxOption last checked={hasValue} onChange={setHasValue} label={LocalizeText('wiredfurni.params.variables.settings.has_value')} /></WiredSection>
        <WiredSection title={LocalizeText('wiredfurni.params.variables.availability')}>
            <WiredRadioGroup name={props.availabilityRadioName} value={availability} onChange={setAvailability} options={[
                { id: props.availabilityRoomValue, label: roomText },
                { id: 10, label: LocalizeText('wiredfurni.params.variables.availability.10') },
                ...(props.showSharedAvailability ? [{ id: 11, label: LocalizeText('wiredfurni.params.variables.availability.11') }] : [])
            ]} />
        </WiredSection>
    </WiredExtraBaseView>;
};

export const WiredExtraUserVariableView: FC = () => <WiredExtraVariableView availabilityRadioName="wiredUserVariableAvailability" availabilityRoomText={LocalizeText('wiredfurni.params.variables.availability.0')} availabilityRoomValue={0} showSharedAvailability availabilityFirst />;
