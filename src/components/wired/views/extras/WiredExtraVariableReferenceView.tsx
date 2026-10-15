import { WiredEditorContext } from '@volt/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WIRED_VARIABLE_ABSENT } from '../../../../api';
import { WiredDropdown } from '../WiredDropdown';
import { WiredSection } from '../WiredSection';
import { WiredCheckboxOption } from '../WiredOptions';
import { WiredVariableNameSection } from './WiredExtraUserVariableView';
import { normalizeWiredVariableName } from '../../../../api';
import { WiredExtraBaseView } from './WiredExtraBaseView';

type SharedContext = Extract<WiredEditorContext, { type: 4 }>;
type SharedRow = SharedContext['shared'][number];

/**
 * Owned: [read only]; text: the reference's name; variableIds[0]: the shared variable's id exactly as the
 * server sent it in the shared-variables context (roomId, room name and the variable block).
 */
export const WiredExtraVariableReferenceView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const [variableName, setVariableName] = useState('');
    const [readOnly, setReadOnly] = useState(true);
    const [selectedVariableId, setSelectedVariableId] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

    const sharedContext = useMemo(() => trigger?.contexts?.find((context): context is SharedContext => context.type === 4), [trigger]);
    const sharedRows: SharedRow[] = useMemo(() => sharedContext?.shared ?? [], [sharedContext]);
    const editable = !!sharedContext;

    const rooms = useMemo(() => {
        const byId = new Map<number, string>();

        for (const row of sharedRows) if (!byId.has(row.roomId)) byId.set(row.roomId, row.roomName);

        // The official editor lists the rooms by name.
        return [...byId.entries()].map(([roomId, roomName]) => ({ roomId, roomName })).sort((left, right) => left.roomName.localeCompare(right.roomName));
    }, [sharedRows]);

    const roomVariables = useMemo(() => sharedRows.filter((row) => row.roomId === selectedRoomId), [selectedRoomId, sharedRows]);

    useEffect(() => {
        if (!trigger) {
            setVariableName('');
            setReadOnly(true);
            setSelectedVariableId('');
            setSelectedRoomId(null);
            return;
        }

        const variableId = trigger.variableIds.length > 0 ? trigger.variableIds[0] : '';
        const row = sharedRows.find((entry) => entry.variable.variableId === variableId);

        setVariableName(normalizeWiredVariableName(trigger.stringData));
        setReadOnly(trigger.intData.length > 0 ? trigger.intData[0] === 1 : true);
        setSelectedVariableId(variableId === WIRED_VARIABLE_ABSENT ? '' : variableId);
        setSelectedRoomId(row?.roomId ?? null);
    }, [sharedRows, trigger]);

    // Picking a variable names the reference after it while the name is empty or still the previous pick's name (the official editor does the same).
    const selectVariable = (variableId: string) => {
        const previous = sharedRows.find((row) => row.variable.variableId === selectedVariableId);
        const next = sharedRows.find((row) => row.variable.variableId === variableId);

        if (!variableName.length || (previous && variableName === normalizeWiredVariableName(previous.variable.variableName))) {
            setVariableName(normalizeWiredVariableName(next?.variable.variableName ?? ''));
        }

        setSelectedVariableId(variableId);
    };

    const save = () => {
        setIntParams([readOnly ? 1 : 0]);
        setStringParam(normalizeWiredVariableName(variableName));
        setVariableIds([selectedVariableId || WIRED_VARIABLE_ABSENT]);
    };

    const validate = () => editable && !!normalizeWiredVariableName(variableName).length && !!selectedVariableId && selectedVariableId !== WIRED_VARIABLE_ABSENT;

    return <WiredExtraBaseView nativeLayout hasSpecialInput requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate}>
        <WiredVariableNameSection value={variableName} onChange={setVariableName} disabled={!editable} />
        <WiredSection title={LocalizeText('wiredfurni.params.variables.room_selection')}>
            <WiredDropdown caption={LocalizeText('wiredfurni.params.variables.room_selection.tooltip')} disabled={!editable} value={selectedRoomId ?? -1} options={rooms.map(room => ({ id: room.roomId, label: room.roomName }))} onChange={roomId => {
                if (roomId === selectedRoomId) return;
                setSelectedRoomId(roomId); selectVariable('');
            }} />
        </WiredSection>
        <WiredSection title={LocalizeText('wiredfurni.params.variables.variable_ref_selection')}>
            <WiredDropdown caption={LocalizeText('wiredfurni.params.variables.variable_selection.tooltip')} disabled={!editable} value={roomVariables.findIndex(row => row.variable.variableId === selectedVariableId)} options={roomVariables.map((row, id) => ({ id, label: row.variable.variableName }))} onChange={id => selectVariable(roomVariables[id]?.variable.variableId ?? '')} />
        </WiredSection>
        <WiredSection title={LocalizeText('wiredfurni.params.variables.settings')}><WiredCheckboxOption last disabled={!editable} checked={readOnly} onChange={setReadOnly} label={LocalizeText('wiredfurni.params.variables.settings.read_only')} /></WiredSection>
    </WiredExtraBaseView>;
};
