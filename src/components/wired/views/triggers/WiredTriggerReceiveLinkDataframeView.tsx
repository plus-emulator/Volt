import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT, WiredFurniType } from '../../../../api';
import {
    ILinkDataframeReceiveRow,
    ILinkDataframeReceiveState,
    LINK_DATAFRAME_KEY_MAX_LENGTH,
    LINK_DATAFRAME_MAX_ROWS,
    LINK_DESTINATION_PLACEHOLDER,
    LINK_DESTINATION_VARIABLE,
    linkDataframeKeyError,
    linkDataframePlaceholderError,
    linkDataframeStorageError,
    normalizeLinkDataframeKey,
    readLinkDataframeReceive,
    writeLinkDataframeReceiveInts,
    writeLinkDataframeReceiveString
} from '../../../../api/wired/WiredLinkDataframe';
import { useWired } from '../../../../hooks';
import { LinkDataframeField, LinkDataframeVariableField } from '../common/WiredLinkDataframeFields';
import { WiredDropdown } from '../WiredDropdown';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import { WiredTextInput } from '../WiredTextInput';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

/**
 * Habbo's "receive dataframe" trigger (`wf_trg_receive_dataframe`, AIR class ReceiveLinkDataframe, trigger 30,
 * widthModifier 1.4, build WIN63-202610131318-860371703). Its preset LinkDataframeReceivePreset.as: int params
 * [count, then per row kind] (13 ints), the string param the first `count` rows as [key, text] JSON, and one
 * variable slot per row. A row captures into a text placeholder (kind 0) or a writable context variable (kind 1).
 */

const DESTINATION_OPTIONS = [
    { id: LINK_DESTINATION_PLACEHOLDER, label: 'wiredfurni.params.link.destination.placeholder' },
    { id: LINK_DESTINATION_VARIABLE, label: 'wiredfurni.params.link.destination.variable' }
].map((option) => ({ id: option.id, label: LocalizeText(option.label) }));

const COUNT_OPTIONS = Array.from({ length: LINK_DATAFRAME_MAX_ROWS + 1 }, (_, count) => ({ id: count, label: `${count}` }));

interface IReceiveDraftRow {
    key: string;
    text: string;
    kind: number;
    token: string;
}

const emptyDraftRows = (): IReceiveDraftRow[] =>
    Array.from({ length: LINK_DATAFRAME_MAX_ROWS }, () => ({ key: '', text: '', kind: LINK_DESTINATION_PLACEHOLDER, token: '' }));

const toDraftRow = (row: ILinkDataframeReceiveRow): IReceiveDraftRow => ({
    key: row.key,
    text: row.text,
    kind: row.kind,
    token: tokenOfVariableSlot(row.variableId)
});

const toRowState = (row: IReceiveDraftRow): ILinkDataframeReceiveRow => ({
    key: row.key,
    text: row.text,
    kind: row.kind,
    variableId: row.kind === LINK_DESTINATION_VARIABLE ? variableSlotOf(row.token) : WIRED_VARIABLE_ABSENT
});

/** The destination of a row as the duplicate check sees it (AIR LinkDataframeReceivePreset.validationError). */
const destinationOf = (row: ILinkDataframeReceiveRow) =>
    row.kind === LINK_DESTINATION_PLACEHOLDER ? `text:${row.text.toLowerCase()}` : `variable:${row.variableId}`;

/** AIR LinkDataframeReceiveRowPreset.validationError, localized; null when the row is valid. */
const receiveRowError = (row: ILinkDataframeReceiveRow): string | null => {
    const keyError = linkDataframeKeyError(row.key);

    if (keyError) return LocalizeText(keyError);
    if (row.kind === LINK_DESTINATION_PLACEHOLDER) {
        const placeholderError = linkDataframePlaceholderError(row.text.toLowerCase());

        return placeholderError ? LocalizeText(placeholderError) : null;
    }
    if (row.kind !== LINK_DESTINATION_VARIABLE) return LocalizeText('wiredfurni.error.link.invalid_dataframe');
    if (row.variableId === WIRED_VARIABLE_ABSENT) return LocalizeText('wiredfurni.error.link.invalid_capture_variable');

    return null;
};

/** The first error of the frame, as the editor reports it (load error, row errors, duplicates, storage size). */
const receiveFrameError = (loadError: string | null, state: ILinkDataframeReceiveState): string | null => {
    if (loadError) return LocalizeText(loadError);

    const keys = new Set<string>();
    const destinations = new Set<string>();

    for (let index = 0; index < state.count; index++) {
        const row = state.rows[index];
        const rowError = receiveRowError(row);

        if (rowError) return LocalizeText('wiredfurni.params.link.row_error', ['number', 'error'], [`${index + 1}`, rowError]);

        const key = normalizeLinkDataframeKey(row.key);

        if (keys.has(key)) return LocalizeText('wiredfurni.error.variables.name_uniq');

        keys.add(key);

        const destination = destinationOf(row);

        if (destinations.has(destination)) return LocalizeText('wiredfurni.error.link.destination_conflict');

        destinations.add(destination);
    }

    const storageError = linkDataframeStorageError(
        writeLinkDataframeReceiveString(state),
        writeLinkDataframeReceiveInts(state),
        state.rows.map((row) => row.variableId)
    );

    return storageError ? LocalizeText(storageError) : null;
};

interface ReceiveRowProps {
    index: number;
    row: IReceiveDraftRow;
    onChange: (row: IReceiveDraftRow) => void;
}

const ReceiveRow: FC<ReceiveRowProps> = ({ index, row, onChange }) => (
    <WiredSection title={LocalizeText('wiredfurni.params.link.row', ['number'], [`${index + 1}`])}>
        <LinkDataframeField label={LocalizeText('wiredfurni.params.link.key')}>
            <WiredTextInput maxLength={LINK_DATAFRAME_KEY_MAX_LENGTH} value={row.key} onChange={(key) => onChange({ ...row, key })} />
        </LinkDataframeField>
        <LinkDataframeField label={LocalizeText('wiredfurni.params.link.destination')}>
            <WiredDropdown options={DESTINATION_OPTIONS} value={row.kind} onChange={(kind) => onChange({ ...row, kind })} />
        </LinkDataframeField>
        {row.kind === LINK_DESTINATION_PLACEHOLDER && (
            <LinkDataframeField label={LocalizeText('wiredfurni.params.link.placeholder')}>
                <WiredTextInput maxLength={LINK_DATAFRAME_KEY_MAX_LENGTH} value={row.text} onChange={(text) => onChange({ ...row, text })} />
            </LinkDataframeField>
        )}
        {row.kind === LINK_DESTINATION_VARIABLE && (
            <LinkDataframeField label={LocalizeText('wiredfurni.params.link.capture_variable')}>
                <LinkDataframeVariableField
                    captureOnly={true}
                    usage="change-destination"
                    recentScope="wired-link-dataframe-receive"
                    value={{ target: -20, token: row.token }}
                    onChange={(next) => onChange({ ...row, token: next.token })}
                />
            </LinkDataframeField>
        )}
    </WiredSection>
);

export const WiredTriggerReceiveLinkDataframeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const [loadError, setLoadError] = useState<string | null>(null);
    const [count, setCount] = useState(0);
    const [rows, setRows] = useState<IReceiveDraftRow[]>(emptyDraftRows);

    useEffect(() => {
        if (!trigger) return;

        const state = readLinkDataframeReceive(trigger.intData ?? [], trigger.stringData ?? '', trigger.variableIds ?? []);

        setLoadError(state ? null : 'wiredfurni.error.link.invalid_dataframe');
        setCount(state?.count ?? 0);
        setRows(state ? state.rows.map(toDraftRow) : emptyDraftRows());
    }, [trigger]);

    const state = useMemo<ILinkDataframeReceiveState>(() => ({ count, rows: rows.map(toRowState) }), [count, rows]);
    const error = useMemo(() => receiveFrameError(loadError, state), [loadError, state]);

    const updateRow = (index: number, row: IReceiveDraftRow) => setRows((current) => current.map((item, itemIndex) => (itemIndex === index ? row : item)));

    // WiredTriggerBaseView takes no validate, so an invalid frame is not written and the error stays on screen.
    const save = () => {
        if (error !== null) return;

        setIntParams(writeLinkDataframeReceiveInts(state));
        setStringParam(writeLinkDataframeReceiveString(state));
        setVariableIds(state.rows.map((row) => row.variableId));
    };

    return (
        <WiredTriggerBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save}>
            <WiredSection>
                <WiredText soft={true} wrap={true} text={LocalizeText('wiredfurni.params.link.Receive_info')} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.link.row_count')}>
                <WiredDropdown options={COUNT_OPTIONS} value={count} onChange={setCount} />
            </WiredSection>
            {rows.slice(0, count).map((row, index) => (
                <ReceiveRow key={index} index={index} row={row} onChange={(next) => updateRow(index, next)} />
            ))}
            {error && (
                <WiredSection>
                    <WiredText wrap={true} text={error} />
                </WiredSection>
            )}
        </WiredTriggerBaseView>
    );
};
