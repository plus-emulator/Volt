import { WiredFurniSelectorSection } from '../WiredFurniSelectorView';
import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT, WiredFurniType } from '../../../../api';
import {
    ILinkDataframeSendRow,
    ILinkDataframeSendState,
    isLinkDataframeTarget,
    LINK_DATAFRAME_KEY_MAX_LENGTH,
    LINK_DATAFRAME_MAX_MESSAGE_BYTES,
    LINK_DATAFRAME_MAX_ROWS,
    LINK_SOURCE_MESSAGE,
    LINK_SOURCE_NUMBER,
    LINK_SOURCE_VARIABLE_TEXT,
    LINK_SOURCE_VARIABLE_VALUE,
    linkDataframeKeyError,
    linkDataframeStorageError,
    linkDataframeUtf8Length,
    normalizeLinkDataframeKey,
    readLinkDataframeSend,
    writeLinkDataframeSendInts,
    writeLinkDataframeSendString
} from '../../../../api/wired/WiredLinkDataframe';
import { useWired } from '../../../../hooks';
import { LinkDataframeField } from '../common/WiredLinkDataframeFields';
import { WiredDropdown } from '../WiredDropdown';
import { getWiredValueTargetCode, normalizeWiredValueTarget, WiredActionValueOrVariableSection } from './WiredActionValueOrVariableSection';
import { WiredSection } from '../WiredSection';
import { FURNI_SOURCES, nativeSourceOptions, USER_SOURCES, WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredText } from '../WiredText';
import { WiredTextInput } from '../WiredTextInput';
import { WiredActionBaseView } from './WiredActionBaseView';

/**
 * Habbo's "send dataframe" action (`wf_act_send_dataframe`, AIR class SendLinkDataframe, action 64, widthModifier 1.4,
 * build WIN63-202610131318-860371703). Its preset LinkDataframeSendPreset.as: int params [count, then per row
 * mode, literal, target] (37 ints), the string param the first `count` rows as [key, text] JSON, and one variable slot
 * per row (readVariableIds L154). The sources are the full AIR arrays: furni slot 0 is the endpoint WIRED Links,
 * and row i reads its furni or user variable from furni slot i + 1 and user slot i (SendLinkDataframe.as:89-99
 * mergedSelections [i + 1, i]), so the save always carries 13 furni and 12 user source types.
 */

const INT_MIN = -2147483648;
const INT_MAX = 2147483647;
const DEFAULT_SOURCE = 0;
const FURNI_SOURCE_COUNT = LINK_DATAFRAME_MAX_ROWS + 1;
const USER_SOURCE_COUNT = LINK_DATAFRAME_MAX_ROWS;
const TARGET_FURNI = 0;
const TARGET_USER = 1;

/** The loaded source array at its AIR length, missing slots taken from the card's defaults. */
const sourceArray = (loaded: number[] | undefined, defaults: number[] | undefined, length: number): number[] =>
    Array.from({ length }, (_, index) => loaded?.[index] ?? defaults?.[index] ?? DEFAULT_SOURCE);

const sourceDropdownOptions = (allowed: number[] | undefined, kind: 'furni' | 'users', current: number) => {
    const options: WiredSourceOption[] = allowed?.length ? nativeSourceOptions(allowed, kind) : kind === 'furni' ? FURNI_SOURCES : USER_SOURCES;
    const listed = options.some((option) => option.value === current)
        ? options
        : [...options, { value: current, label: `wiredfurni.params.sources.${kind}.${current}` }];

    return listed.map((option) => ({ id: option.value, label: LocalizeText(option.label) }));
};

const SOURCE_OPTIONS = [
    { id: LINK_SOURCE_NUMBER, label: 'wiredfurni.params.link.source.number' },
    { id: LINK_SOURCE_VARIABLE_TEXT, label: 'wiredfurni.params.link.source.variable_text' },
    { id: LINK_SOURCE_MESSAGE, label: 'wiredfurni.params.link.source.message' }
].map((option) => ({ id: option.id, label: LocalizeText(option.label) }));

const COUNT_OPTIONS = Array.from({ length: LINK_DATAFRAME_MAX_ROWS + 1 }, (_, count) => ({ id: count, label: `${count}` }));

interface ISendDraftRow {
    key: string;
    text: string;
    mode: number;
    literal: number;
    target: number;
    token: string;
}

const emptyDraftRows = (): ISendDraftRow[] =>
    Array.from({ length: LINK_DATAFRAME_MAX_ROWS }, () => ({ key: '', text: '', mode: LINK_SOURCE_NUMBER, literal: 0, target: 0, token: '' }));

const toDraftRow = (row: ILinkDataframeSendRow): ISendDraftRow => ({
    key: row.key,
    text: row.text,
    mode: row.mode,
    literal: row.literal,
    target: row.target,
    token: tokenOfVariableSlot(row.variableId)
});

const isVariableMode = (mode: number) => mode === LINK_SOURCE_VARIABLE_VALUE || mode === LINK_SOURCE_VARIABLE_TEXT;

const toRowState = (row: ISendDraftRow): ILinkDataframeSendRow => ({
    key: row.key,
    text: row.text,
    mode: row.mode,
    literal: row.literal,
    target: row.target,
    variableId: isVariableMode(row.mode) ? variableSlotOf(row.token) : WIRED_VARIABLE_ABSENT
});

/** AIR LinkDataframeSendRowPreset.validationError, localized; null when the row is valid. */
const sendRowError = (row: ILinkDataframeSendRow): string | null => {
    const keyError = linkDataframeKeyError(row.key);

    if (keyError) return LocalizeText(keyError);
    if (!isLinkDataframeTarget(row.target) || row.mode < LINK_SOURCE_NUMBER || row.mode > LINK_SOURCE_MESSAGE) {
        return LocalizeText('wiredfurni.error.link.invalid_dataframe');
    }
    if (row.mode === LINK_SOURCE_MESSAGE) {
        return linkDataframeUtf8Length(row.text) > LINK_DATAFRAME_MAX_MESSAGE_BYTES
            ? LocalizeText('wiredfurni.error.too_much_text', ['limit'], [`${LINK_DATAFRAME_MAX_MESSAGE_BYTES}`])
            : null;
    }
    // An empty text variable is allowed (it sends an empty text); an empty value variable is not.
    if (row.mode === LINK_SOURCE_VARIABLE_VALUE && row.variableId === WIRED_VARIABLE_ABSENT)
        return LocalizeText('wiredfurni.params.link.select_source_variable');

    return null;
};

/** The first error of the frame, as the editor reports it (load error, row errors, duplicate keys, storage size). */
const sendFrameError = (loadError: string | null, state: ILinkDataframeSendState): string | null => {
    if (loadError) return LocalizeText(loadError);

    const keys = new Set<string>();

    for (let index = 0; index < state.count; index++) {
        const row = state.rows[index];
        const rowError = sendRowError(row);

        if (rowError) return LocalizeText('wiredfurni.params.link.row_error', ['number', 'error'], [`${index + 1}`, rowError]);

        const key = normalizeLinkDataframeKey(row.key);

        if (keys.has(key)) return LocalizeText('wiredfurni.error.variables.name_uniq');

        keys.add(key);
    }

    const storageError = linkDataframeStorageError(
        writeLinkDataframeSendString(state),
        writeLinkDataframeSendInts(state),
        state.rows.map((row) => row.variableId)
    );

    return storageError ? LocalizeText(storageError) : null;
};

interface SendRowProps {
    index: number;
    row: ISendDraftRow;
    onChange: (row: Partial<ISendDraftRow>) => void;
    onValidityChange: (valid: boolean) => void;
    /** The merged source of the row's variable target: furni slot index + 1 or user slot index. */
    source: { kind: 'furni' | 'users'; value: number; allowed: number[] | undefined } | null;
    onChangeSource: (value: number) => void;
}

const SendRow: FC<SendRowProps> = ({ index, row, onChange, source, onChangeSource, onValidityChange }) => (
    <WiredSection title={LocalizeText('wiredfurni.params.link.row', ['number'], [`${index + 1}`])} className="volt-wired__dataframe-row">
        <LinkDataframeField label={LocalizeText('wiredfurni.params.link.key')}>
            <WiredTextInput maxLength={LINK_DATAFRAME_KEY_MAX_LENGTH} value={row.key} onChange={(key) => onChange({ key })} />
            <WiredDropdown caption={LocalizeText('wiredfurni.params.link.source')} options={SOURCE_OPTIONS} value={row.mode === LINK_SOURCE_VARIABLE_VALUE ? LINK_SOURCE_NUMBER : row.mode} onChange={(mode) => onChange({ mode })} />
        </LinkDataframeField>
        {row.mode !== LINK_SOURCE_MESSAGE && (
            <LinkDataframeField label={LocalizeText('wiredfurni.params.link.value')}>
                <WiredActionValueOrVariableSection inline title={LocalizeText('wiredfurni.params.link.value')} targetTitle={LocalizeText('wiredfurni.params.link.variable')}
                    recentScope={`wired-link-dataframe-send-${index}`} min={INT_MIN} max={INT_MAX}
                    variableOnlyOrEmpty={row.mode === LINK_SOURCE_VARIABLE_TEXT} textConnectedOnly={row.mode === LINK_SOURCE_VARIABLE_TEXT}
                    variableUsage={row.mode === LINK_SOURCE_VARIABLE_TEXT ? 'condition' : 'change-reference'}
                    option={isVariableMode(row.mode) ? 1 : 0} literal={row.literal} variableToken={row.token} target={normalizeWiredValueTarget(row.target)}
                    onOptionChange={option => onChange({ mode: row.mode === LINK_SOURCE_VARIABLE_TEXT ? LINK_SOURCE_VARIABLE_TEXT : option ? LINK_SOURCE_VARIABLE_VALUE : LINK_SOURCE_NUMBER })}
                    onLiteralChange={literal => onChange({ literal })} onTargetChange={target => onChange({ target: getWiredValueTargetCode(target) })}
                    onVariableTokenChange={token => onChange({ token })} onValidityChange={onValidityChange} />
            </LinkDataframeField>
        )}
        {row.mode === LINK_SOURCE_MESSAGE && (
            <LinkDataframeField label={LocalizeText('wiredfurni.params.link.message')}>
                <WiredTextInput maxLength={LINK_DATAFRAME_MAX_MESSAGE_BYTES} value={row.text} onChange={(text) => onChange({ text })} />
            </LinkDataframeField>
        )}
        {isVariableMode(row.mode) && source && (
            <LinkDataframeField label={LocalizeText(source.kind === 'furni' ? 'wiredfurni.params.link.source_furni' : 'wiredfurni.params.link.source_users')}>
                <WiredDropdown options={sourceDropdownOptions(source.allowed, source.kind, source.value)} value={source.value} onChange={onChangeSource} />
            </LinkDataframeField>
        )}
    </WiredSection>
);

export const WiredActionSendLinkDataframeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null, setFurniSources = null, setUserSources = null } = useWired();
    const [loadError, setLoadError] = useState<string | null>(null);
    const [count, setCount] = useState(0);
    const [invalidRows, setInvalidRows] = useState<Set<number>>(() => new Set());
    const [rows, setRows] = useState<ISendDraftRow[]>(emptyDraftRows);
    const [furniSources, setFurniSourceSlots] = useState<number[]>(() => sourceArray(undefined, undefined, FURNI_SOURCE_COUNT));
    const [userSources, setUserSourceSlots] = useState<number[]>(() => sourceArray(undefined, undefined, USER_SOURCE_COUNT));

    useEffect(() => {
        if (!trigger) return;

        const state = readLinkDataframeSend(trigger.intData ?? [], trigger.stringData ?? '', trigger.variableIds ?? []);

        setInvalidRows(new Set());
        setLoadError(state ? null : 'wiredfurni.error.link.invalid_dataframe');
        setCount(state?.count ?? 0);
        setRows(state ? state.rows.map(toDraftRow) : emptyDraftRows());
        setFurniSourceSlots(sourceArray(trigger.furniSources, trigger.inputSources?.furniDefaults, FURNI_SOURCE_COUNT));
        setUserSourceSlots(sourceArray(trigger.userSources, trigger.inputSources?.userDefaults, USER_SOURCE_COUNT));
    }, [trigger]);

    const state = useMemo<ILinkDataframeSendState>(() => ({ count, rows: rows.map(toRowState) }), [count, rows]);
    const error = useMemo(() => sendFrameError(loadError, state), [loadError, state]);

    const updateRow = (index: number, row: Partial<ISendDraftRow>) => setRows((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...row } : item)));
    const updateValidity = (index: number, valid: boolean) => setInvalidRows(current => {
        if (current.has(index) === !valid) return current;
        const next = new Set(current);
        if (valid) next.delete(index); else next.add(index);
        return next;
    });
    const setSlot = (setter: (update: (current: number[]) => number[]) => void, slot: number, value: number) =>
        setter((current) => current.map((item, index) => (index === slot ? value : item)));

    const rowSource = (index: number, row: ISendDraftRow): SendRowProps['source'] => {
        if (row.target === TARGET_FURNI) return { kind: 'furni', value: furniSources[index + 1], allowed: trigger?.inputSources?.furniAllowed?.[index + 1] };
        if (row.target === TARGET_USER) return { kind: 'users', value: userSources[index], allowed: trigger?.inputSources?.usersAllowed?.[index] };

        return null;
    };

    const onChangeRowSource = (index: number, row: ISendDraftRow, value: number) => {
        if (row.target === TARGET_FURNI) setSlot(setFurniSourceSlots, index + 1, value);
        else if (row.target === TARGET_USER) setSlot(setUserSourceSlots, index, value);
    };

    const save = () => {
        setIntParams(writeLinkDataframeSendInts(state));
        setStringParam(writeLinkDataframeSendString(state));
        setVariableIds(state.rows.map((row) => row.variableId));
        setFurniSources([...furniSources]);
        setUserSources([...userSources]);
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            selectionPreview={<WiredFurniSelectorSection title={LocalizeText('wiredfurni.params.link.endpoints')} hideInstructions />}
            save={save}
            validate={() => error === null && !Array.from(invalidRows).some(index => index < count && rows[index].mode !== LINK_SOURCE_MESSAGE)}
            footer={
                <WiredSourcesSelector
                    showFurni={true}
                    furniSource={furniSources[0]}
                    furniTitle="wiredfurni.params.link.endpoints"
                    onChangeFurni={(value) => setSlot(setFurniSourceSlots, 0, value)}
                />
            }
        >
            <WiredSection>
                <WiredText soft={true} wrap={true} text={LocalizeText('wiredfurni.params.link.Send_info')} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.link.row_count')}>
                <WiredDropdown options={COUNT_OPTIONS} value={count} onChange={setCount} />
            </WiredSection>
            {rows.slice(0, count).map((row, index) => (
                <SendRow
                    key={index}
                    index={index}
                    row={row}
                    source={rowSource(index, row)}
                    onChange={(next) => updateRow(index, next)}
                    onValidityChange={valid => updateValidity(index, valid)}
                    onChangeSource={(value) => onChangeRowSource(index, row, value)}
                />
            ))}
            {error && (
                <WiredSection>
                    <WiredText wrap={true} text={error} />
                </WiredSection>
            )}
        </WiredActionBaseView>
    );
};
