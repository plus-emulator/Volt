/*
 * VariableLeaderboardAddon (addon code 1005, wf_xtra_var_leaderboard, widthModifier 1.35), build WIN63-202610131318-860371703:
 * the UI builder sections (addons/leaderboard/VariableLeaderboardAddon.as buildInputs L126, buildFilter L166, validate L247,
 * refreshGeneralWarning L315, updateCapabilities L355, sortOptions L531), the columns preset
 * (uibuilder/presets/applications/VariableLeaderboardColumnsPreset.as) and the codec that saves it
 * (addons/leaderboard/VariableLeaderboardConfigCodec.as). Dossier entry 1005.
 * Saves intParams (19), variableIds (12, '0' is null) and stringParam (17 TAB-joined fields) through api/wired/WiredVariableLeaderboard.ts.
 */
import { WiredEditorContext } from '@volt/renderer';
import { FC, ReactNode, useMemo, useState } from 'react';
import { createNativeVariableToken, getNativeVariableId, localizeWithFallback, WiredFurniType } from '../../../../api';
import {
    canonicalVariableLeaderboardId,
    createUnpublishedVariableLeaderboardConfig,
    decodeVariableLeaderboardConfig,
    defaultVariableLeaderboardColumnLabel,
    defaultVariableLeaderboardWidth,
    encodeVariableLeaderboardConfig,
    getDefaultVariableLeaderboardColumn,
    getVariableLeaderboardColumnTypeOptions,
    getVariableLeaderboardConfigError,
    getVariableLeaderboardSortOptions,
    hasNoPersistentVariableLeaderboardChoice,
    hasTooManyVariableLeaderboardChoices,
    hasValueVariableLeaderboardChoice,
    IVariableLeaderboardConfig,
    IVariableLeaderboardConfigColumn,
    IVariableLeaderboardOverride,
    isVariableLeaderboardFilterEligible,
    isVariableLeaderboardNullId,
    suggestVariableLeaderboardDisplayName,
    VARIABLE_LEADERBOARD_COLUMN,
    VARIABLE_LEADERBOARD_INT32_MAX,
    VARIABLE_LEADERBOARD_INT32_MIN,
    VARIABLE_LEADERBOARD_MAX_CHOICES,
    VARIABLE_LEADERBOARD_OFFSET_MAX,
    VARIABLE_LEADERBOARD_OFFSET_MIN,
    VARIABLE_LEADERBOARD_OPERAND,
    VariableLeaderboardConfigError
} from '../../../../api/wired/WiredVariableLeaderboard';
import { useWired, useWiredNativeVariables } from '../../../../hooks';
import { WiredDropdown } from '../WiredDropdown';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredCheckboxGroup, WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import { WiredTextInput } from '../WiredTextInput';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    IWiredVariableDefinitionLike
} from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/** Sort labels by sort mode (sortOptions L531). */
const SORT_TEXTS: Array<[string, string]> = [
    ['wiredfurni.params.variable_leaderboard.sort.highest_value', 'Highest value'],
    ['wiredfurni.params.variable_leaderboard.sort.lowest_value', 'Lowest value'],
    ['wiredfurni.params.variable_leaderboard.sort.oldest_creation', 'Oldest creation'],
    ['wiredfurni.params.variable_leaderboard.sort.latest_creation', 'Latest creation'],
    ['wiredfurni.params.variable_leaderboard.sort.oldest_update', 'Oldest update'],
    ['wiredfurni.params.variable_leaderboard.sort.latest_update', 'Latest update']
];

/** Column type labels by type (columnTypeLabel). */
const COLUMN_TEXTS: Record<number, [string, string]> = {
    [VARIABLE_LEADERBOARD_COLUMN.USERNAME]: ['wiredfurni.params.variable_leaderboard.column.username', 'Username'],
    [VARIABLE_LEADERBOARD_COLUMN.VALUE]: ['wiredfurni.params.variable_leaderboard.column.value', 'Value'],
    [VARIABLE_LEADERBOARD_COLUMN.LAST_UPDATE]: ['wiredfurni.params.variable_leaderboard.column.last_update', 'Last update'],
    [VARIABLE_LEADERBOARD_COLUMN.CREATION]: ['wiredfurni.params.variable_leaderboard.column.creation', 'Creation time'],
    [VARIABLE_LEADERBOARD_COLUMN.LEVEL]: ['wiredfurni.params.variable_leaderboard.column.level', 'Level*'],
    [VARIABLE_LEADERBOARD_COLUMN.TEXT_CONNECTION]: ['wiredfurni.params.variable_leaderboard.column.text_connection', 'Text*']
};

/** Column width labels by width (0 small to 3 XL). */
const WIDTH_TEXTS: Array<[string, string]> = [
    ['wiredfurni.params.variable_leaderboard.column_width.small', 'Small'],
    ['wiredfurni.params.variable_leaderboard.column_width.medium', 'Medium'],
    ['wiredfurni.params.variable_leaderboard.column_width.large', 'Large'],
    ['wiredfurni.params.variable_leaderboard.column_width.xl', 'XL']
];

const PAGE_SIZES = [10, 15, 20];
const COUNT_OPTIONS = [1, 2, 3, 4].map((count) => ({ id: count, label: `${count}` }));
const PAGE_SIZE_OPTIONS = PAGE_SIZES.map((size, id) => ({ id, label: `${size}` }));

const SAVE_ERROR_TEXTS: Record<VariableLeaderboardConfigError, [string, string]> = {
    title_required: ['wiredfurni.error.variable_leaderboard.title_required', 'Enter a leaderboard title.'],
    column_name_length: ['wiredfurni.error.variable_leaderboard.column_name_length', 'Column names must contain at least two characters.'],
    filter_required: ['wiredfurni.error.variable_leaderboard.filter_required', 'Select a filtering variable.'],
    global_operand_required: ['wiredfurni.error.variable_leaderboard.global_operand_required', 'Select a global comparison variable.'],
    invalid_configuration: ['wiredfurni.error.variable_leaderboard.invalid_configuration', 'Invalid leaderboard configuration.'],
    missing_context: ['wiredfurni.error.variable_leaderboard.missing_context', 'Leaderboard information is unavailable. Close and reopen this WIRED box.']
};

const INT32 = { min: VARIABLE_LEADERBOARD_INT32_MIN, max: VARIABLE_LEADERBOARD_INT32_MAX };
const OVERRIDE_MAX_LENGTH = 22;

/** The viewer's edits to the stack in the editor, and the state they were made against. */
interface IEditorEdit {
    source: unknown;
    config?: IVariableLeaderboardConfig;
    error?: VariableLeaderboardConfigError | null;
    filterOpen?: boolean;
    multiOpen?: boolean;
}

type LeaderboardContext = Extract<WiredEditorContext, { type: 8 }>;
type LeaderboardChoice = LeaderboardContext['choices'][number];

/** The type 8 context entry the server attaches to the edit-start message. */
const findLeaderboardContext = (contexts: WiredEditorContext[] | undefined): LeaderboardContext | null =>
    contexts?.find((context): context is LeaderboardContext => context.type === 8) ?? null;

/** The literal is edited as an int32; a longer canonical literal from the server makes the box invalid, as the addon does. */
const literalFitsInt32 = (literal: string): boolean => {
    const value = Number(literal);

    return value >= INT32.min && value <= INT32.max;
};

/** The name in the box: the typed or saved override, else the suggestion for the technical name. */
const overrideNameOf = (overrides: IVariableLeaderboardOverride[], choice: LeaderboardChoice): string =>
    overrides.find((override) => override.variableId === choice.variableId)?.name ?? suggestVariableLeaderboardDisplayName(choice.technicalName);

/** An empty name saves as the suggestion, so the box never stores an empty override. */
const resolveOverrides = (overrides: IVariableLeaderboardOverride[], choices: LeaderboardChoice[]): IVariableLeaderboardOverride[] =>
    choices.map((choice) => {
        const name = overrideNameOf(overrides, choice).slice(0, OVERRIDE_MAX_LENGTH);

        return { variableId: choice.variableId, name: name || suggestVariableLeaderboardDisplayName(choice.technicalName) };
    });

const CollapsibleSection: FC<{ title: string; open: boolean; onToggle: () => void; children?: ReactNode }> = ({ title, open, onToggle, children }) => (
    <WiredSection
        title={
            <button type="button" className="volt-wired-leaderboard__toggle" aria-expanded={open} onClick={onToggle}>
                {`${open ? '▾' : '▸'} ${title}`}
            </button>
        }
    >
        {open && children}
    </WiredSection>
);

/**
 * The variable leaderboard addon editor. The filter picker lists the persisted user variables of the catalog that need no execution
 * context; the global comparison picker lists the room's global variables. The stacked variables come from the type 8 context.
 */
export const WiredExtraVariableLeaderboardView: FC<{}> = () => {
    const { trigger = null, nativeCatalog = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const { roomVariableDefinitions = [] } = useWiredNativeVariables();
    const context = useMemo(() => findLeaderboardContext(trigger?.contexts), [trigger]);
    // The decoded stack, read from the trigger; the viewer's edits are kept beside it and dropped when the trigger changes.
    const base = useMemo(() => {
        const decoded = decodeVariableLeaderboardConfig(trigger?.intData ?? [], trigger?.variableIds ?? [], trigger?.stringData ?? '');
        const config = decoded ?? createUnpublishedVariableLeaderboardConfig();

        // An unpublished box starts on the stack's tile (VariableLeaderboardAddon.onEditStart L178).
        if (!trigger?.stringData && context) config.location = { tileX: context.physicalTileX, tileY: context.physicalTileY, offsetX: 0, altitude: 0 };

        const invalid =
            !decoded || (config.comparisonEnabled && config.operandKind === VARIABLE_LEADERBOARD_OPERAND.LITERAL && !literalFitsInt32(config.literal));

        return { config, invalid };
    }, [trigger, context]);
    const [edit, setEdit] = useState<IEditorEdit | null>(null);
    const owned = edit?.source === trigger ? edit : null;
    const config = owned?.config ?? base.config;
    const invalid = base.invalid;
    const validationError = owned?.error ?? null;
    const filterOpen = owned?.filterOpen ?? base.config.filterEnabled;
    const multiOpen = owned?.multiOpen ?? false;

    const patchEdit = (change: (current: IEditorEdit) => IEditorEdit) =>
        setEdit((previous) => change(previous?.source === trigger ? previous : { source: trigger }));

    const choices = useMemo(() => (context?.choices ?? []).slice(0, VARIABLE_LEADERBOARD_MAX_CHOICES), [context]);
    const hasValueChoice = hasValueVariableLeaderboardChoice(context);

    const filterDefinitions = useMemo<IWiredVariableDefinitionLike[]>(() => {
        const definitions: IWiredVariableDefinitionLike[] = [];

        for (const entry of nativeCatalog?.rows?.values() ?? []) {
            const variable = entry.variable;

            if (!isVariableLeaderboardFilterEligible(variable)) continue;

            definitions.push({
                variableId: variable.variableId,
                name: variable.variableName,
                availability: variable.availabilityType,
                hasValue: variable.hasValue,
                isReadOnly: !variable.canWriteValue
            });
        }

        return definitions;
    }, [nativeCatalog]);

    const globalDefinitions = useMemo<IWiredVariableDefinitionLike[]>(
        () =>
            roomVariableDefinitions.map((definition) => ({
                variableId: definition.variableId,
                name: definition.name,
                availability: definition.availability,
                hasValue: definition.hasValue,
                isReadOnly: definition.isReadOnly
            })),
        [roomVariableDefinitions]
    );

    const filterEntries = useMemo(() => pickerEntries('user', filterDefinitions, config.filterVariableId), [config.filterVariableId, filterDefinitions]);
    const globalEntries = useMemo(
        () => pickerEntries('global', globalDefinitions, config.globalOperandVariableId),
        [config.globalOperandVariableId, globalDefinitions]
    );

    const resolvedConfig = useMemo<IVariableLeaderboardConfig>(
        () => ({ ...config, overrides: resolveOverrides(config.overrides, choices) }),
        [config, choices]
    );

    const update = (patch: Partial<IVariableLeaderboardConfig>) =>
        patchEdit((current) => ({ ...current, config: { ...(current.config ?? base.config), ...patch }, error: null }));

    const setFilterEnabled = (enabled: boolean) => {
        patchEdit((current) => ({ ...current, filterOpen: enabled || filterOpen }));
        update(
            enabled
                ? { filterEnabled: true }
                : {
                      filterEnabled: false,
                      filterVariableId: '0',
                      comparisonEnabled: false,
                      operandKind: VARIABLE_LEADERBOARD_OPERAND.LITERAL,
                      globalOperandVariableId: '0',
                      literal: ''
                  }
        );
    };

    const setComparisonEnabled = (enabled: boolean) =>
        update(
            enabled
                ? { comparisonEnabled: true, operandKind: VARIABLE_LEADERBOARD_OPERAND.LITERAL, globalOperandVariableId: '0', literal: config.literal || '0' }
                : { comparisonEnabled: false, operandKind: VARIABLE_LEADERBOARD_OPERAND.LITERAL, globalOperandVariableId: '0', literal: '' }
        );

    const setOperandKind = (kind: number) =>
        update(
            kind === VARIABLE_LEADERBOARD_OPERAND.GLOBAL
                ? { operandKind: kind, literal: '' }
                : { operandKind: kind, globalOperandVariableId: '0', literal: config.literal || '0' }
        );

    const setColumnCount = (count: number) => {
        const columns = config.columns.slice(0, count);

        while (columns.length < count) columns.push(getDefaultVariableLeaderboardColumn(columns));

        update({ columns });
    };

    const setColumn = (slot: number, patch: Partial<IVariableLeaderboardConfigColumn>) =>
        update({ columns: config.columns.map((column, index) => (index === slot ? { ...column, ...patch } : column)) });

    const setColumnType = (slot: number, type: number) =>
        setColumn(slot, { type, label: defaultVariableLeaderboardColumnLabel(type), width: defaultVariableLeaderboardWidth(type) });

    const setOverrideName = (choice: LeaderboardChoice, name: string) => {
        const overrides = choices.map((item) => ({
            variableId: item.variableId,
            name: item.variableId === choice.variableId ? name : overrideNameOf(config.overrides, item)
        }));

        update({ overrides });
    };

    const suggestNames = () =>
        update({
            overrides: choices.map((choice) => ({
                variableId: choice.variableId,
                name: suggestVariableLeaderboardDisplayName(choice.technicalName).slice(0, OVERRIDE_MAX_LENGTH)
            }))
        });

    const warning: string | null = (() => {
        if (invalid)
            return localizeWithFallback(
                'wiredfurni.params.variable_leaderboard.warning.invalid_configuration',
                'This leaderboard configuration is invalid and cannot be saved.'
            );
        if (!context)
            return localizeWithFallback(
                'wiredfurni.params.variable_leaderboard.warning.missing_context',
                'Leaderboard information is unavailable. Close and reopen this WIRED box.'
            );
        if (hasNoPersistentVariableLeaderboardChoice(context))
            return localizeWithFallback(
                'wiredfurni.params.variable_leaderboard.warning.no_persistent_user',
                'This stack has no persisted user variable. The leaderboard will be empty.'
            );
        if (hasTooManyVariableLeaderboardChoices(context))
            return localizeWithFallback(
                'wiredfurni.params.variable_leaderboard.warning.too_many_choices',
                'This stack has more than 10 selectable variables. Only the bottom 10 are shown; reduce the stack before saving.'
            );

        return null;
    })();

    const validate = (): boolean => {
        const error = getVariableLeaderboardConfigError(resolvedConfig, !!context, invalid);

        patchEdit((current) => ({ ...current, error }));

        return error === null;
    };

    const save = () => {
        const encoded = encodeVariableLeaderboardConfig(resolvedConfig);

        if (!encoded) return;

        setIntParams(encoded.intParams);
        setStringParam(encoded.stringParam);
        setVariableIds(encoded.variableIds);
    };

    const sortOptions = getVariableLeaderboardSortOptions(hasValueChoice, config.sortMode).map((mode) => ({
        id: mode,
        label: localizeWithFallback(SORT_TEXTS[mode][0], SORT_TEXTS[mode][1])
    }));
    const widthOptions = WIDTH_TEXTS.map(([key, fallback], id) => ({ id, label: localizeWithFallback(key, fallback) }));
    const operandIsLiteral = config.operandKind === VARIABLE_LEADERBOARD_OPERAND.LITERAL;

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate}>
            {warning && <WiredText text={warning} wrap={true} soft={true} />}
            {validationError && <WiredText text={localizeWithFallback(...SAVE_ERROR_TEXTS[validationError])} wrap={true} bold={true} />}

            <WiredSection title={localizeWithFallback('wiredfurni.params.variable_leaderboard.section.general', 'General')}>
                <WiredText text={localizeWithFallback('wiredfurni.params.variable_leaderboard.title', 'Title:')} />
                <WiredTextInput value={config.title} maxLength={50} onChange={(title) => update({ title })} />
                <WiredText text={localizeWithFallback('wiredfurni.params.variable_leaderboard.description', 'Description:')} />
                <WiredTextInput value={config.description} maxLength={80} onChange={(description) => update({ description })} />
                <WiredDropdown
                    caption={localizeWithFallback('wiredfurni.params.variable_leaderboard.section.sorting', 'Sorting:')}
                    options={sortOptions}
                    value={config.sortMode}
                    onChange={(sortMode) => update({ sortMode })}
                />
                <WiredDropdown
                    caption={localizeWithFallback('wiredfurni.params.variable_leaderboard.entries_per_page', 'Page size:')}
                    options={PAGE_SIZE_OPTIONS}
                    value={config.pageSizeOption}
                    onChange={(pageSizeOption) => update({ pageSizeOption })}
                />
                {!hasValueChoice && (
                    <WiredText
                        text={localizeWithFallback(
                            'wiredfurni.params.variable_leaderboard.value_unavailable',
                            'Value columns and value sorting require at least one persisted user variable on this stack to currently have a value.'
                        )}
                        wrap={true}
                        soft={true}
                    />
                )}
            </WiredSection>

            <WiredSection title={localizeWithFallback('wiredfurni.params.variable_leaderboard.section.columns', 'Columns')}>
                <WiredDropdown
                    caption={localizeWithFallback('wiredfurni.params.variable_leaderboard.columns.count', 'Number of columns:')}
                    options={COUNT_OPTIONS}
                    value={config.columns.length}
                    onChange={setColumnCount}
                />
                {config.columns.map((column, slot) => (
                    <div key={slot} className="volt-wired-leaderboard__column">
                        <WiredDropdown
                            options={getVariableLeaderboardColumnTypeOptions(config.columns, slot, hasValueChoice).map((type) => ({
                                id: type,
                                label: localizeWithFallback(COLUMN_TEXTS[type][0], COLUMN_TEXTS[type][1])
                            }))}
                            value={column.type}
                            disabled={slot === 0}
                            onChange={(type) => setColumnType(slot, type)}
                        />
                        <WiredTextInput value={column.label} maxLength={12} width={110} onChange={(label) => setColumn(slot, { label })} />
                        <WiredDropdown options={widthOptions} value={column.width} onChange={(width) => setColumn(slot, { width })} />
                    </div>
                ))}
                <WiredText
                    text={localizeWithFallback(
                        'wiredfurni.params.variable_leaderboard.column_type_info',
                        '*Some column types may require other Variable add-ons on the stack'
                    )}
                    wrap={true}
                    soft={true}
                />
            </WiredSection>

            <CollapsibleSection
                title={localizeWithFallback('wiredfurni.params.variable_leaderboard.section.multi_variable', 'Multi-variable mode')}
                open={multiOpen}
                onToggle={() => patchEdit((current) => ({ ...current, multiOpen: !multiOpen }))}
            >
                <WiredText
                    text={localizeWithFallback(
                        'wiredfurni.params.variable_leaderboard.multi_variable_info',
                        'When several variables are stacked, viewers can choose one from the leaderboard. Set the display name shown for each variable.'
                    )}
                    wrap={true}
                    soft={true}
                />
                {choices.map((choice) => (
                    <div key={choice.variableId} className="volt-wired-leaderboard__choice">
                        <WiredText text={choice.technicalName} soft={true} />
                        <WiredTextInput
                            value={overrideNameOf(config.overrides, choice)}
                            maxLength={OVERRIDE_MAX_LENGTH}
                            width={150}
                            onChange={(name) => setOverrideName(choice, name)}
                        />
                    </div>
                ))}
                <button type="button" className="volt-wired-leaderboard__suggest" disabled={choices.length === 0} onClick={suggestNames}>
                    {localizeWithFallback('wiredfurni.params.variable_leaderboard.suggest', 'Suggest names')}
                </button>
            </CollapsibleSection>

            <CollapsibleSection
                title={localizeWithFallback('wiredfurni.params.variable_leaderboard.section.filter', 'Filter')}
                open={filterOpen}
                onToggle={() => patchEdit((current) => ({ ...current, filterOpen: !filterOpen }))}
            >
                <WiredCheckboxGroup>
                    <WiredCheckboxOption
                        label={localizeWithFallback('wiredfurni.params.variable_leaderboard.filter.enabled', 'Enable filtering')}
                        checked={config.filterEnabled}
                        onChange={setFilterEnabled}
                        last={!config.filterEnabled}
                    />
                </WiredCheckboxGroup>
                {config.filterEnabled && (
                    <>
                        <WiredText text={localizeWithFallback('wiredfurni.params.variable_leaderboard.filter.variable', 'Filtering variable:')} />
                        <WiredVariablePicker
                            recentScope="variable-leaderboard-filter"
                            entries={filterEntries}
                            selectedToken={createNativeVariableToken(config.filterVariableId)}
                            onSelect={(entry) => update({ filterVariableId: canonicalVariableLeaderboardId(getNativeVariableId(entry.token)) })}
                        />
                        <WiredCheckboxGroup>
                            <WiredCheckboxOption
                                label={localizeWithFallback(
                                    'wiredfurni.params.variable_leaderboard.filter.compare',
                                    'Compare the filtering variable\u0027s value'
                                )}
                                checked={config.comparisonEnabled}
                                onChange={setComparisonEnabled}
                                last={!config.comparisonEnabled}
                            />
                        </WiredCheckboxGroup>
                        {config.comparisonEnabled && (
                            <>
                                <WiredText text={localizeWithFallback('wiredfurni.params.variable_leaderboard.filter.operand', 'Compare against:')} />
                                <WiredRadioGroup
                                    name="variableLeaderboardOperand"
                                    options={[
                                        { id: VARIABLE_LEADERBOARD_OPERAND.LITERAL, label: 'Value' },
                                        { id: VARIABLE_LEADERBOARD_OPERAND.GLOBAL, label: 'Global variable' }
                                    ]}
                                    value={config.operandKind}
                                    onChange={setOperandKind}
                                />
                                {operandIsLiteral ? (
                                    <WiredNumberInput
                                        min={INT32.min}
                                        max={INT32.max}
                                        value={literalFitsInt32(config.literal) ? Number(config.literal) : 0}
                                        onChange={(value) => update({ literal: `${value}` })}
                                    />
                                ) : (
                                    <WiredVariablePicker
                                        recentScope="variable-leaderboard-operand"
                                        entries={globalEntries}
                                        selectedToken={createNativeVariableToken(config.globalOperandVariableId)}
                                        onSelect={(entry) =>
                                            update({ globalOperandVariableId: canonicalVariableLeaderboardId(getNativeVariableId(entry.token)) })
                                        }
                                    />
                                )}
                            </>
                        )}
                    </>
                )}
            </CollapsibleSection>

            <WiredSection title={localizeWithFallback('wiredfurni.params.variable_leaderboard.section.location', 'Leaderboard location')}>
                <WiredText text={localizeWithFallback('wiredfurni.params.variable_leaderboard.location.tile', 'Tile:')} />
                <WiredNumberInput
                    min={INT32.min}
                    max={INT32.max}
                    value={config.location.tileX}
                    onChange={(tileX) => update({ location: { ...config.location, tileX } })}
                />
                <WiredNumberInput
                    min={INT32.min}
                    max={INT32.max}
                    value={config.location.tileY}
                    onChange={(tileY) => update({ location: { ...config.location, tileY } })}
                />
                <WiredText text={localizeWithFallback('wiredfurni.params.variable_leaderboard.location.offset', 'Offset:')} />
                <WiredNumberInput
                    min={VARIABLE_LEADERBOARD_OFFSET_MIN}
                    max={VARIABLE_LEADERBOARD_OFFSET_MAX}
                    value={config.location.offsetX}
                    onChange={(offsetX) => update({ location: { ...config.location, offsetX } })}
                />
                <WiredText text={localizeWithFallback('wiredfurni.params.variable_leaderboard.location.altitude', 'Altitude:')} />
                <WiredNumberInput
                    min={INT32.min}
                    max={INT32.max}
                    value={config.location.altitude}
                    onChange={(altitude) => update({ location: { ...config.location, altitude } })}
                />
            </WiredSection>
        </WiredExtraBaseView>
    );
};

/** The picker entries of one scope, with the saved variable kept in the list even when it is not in the catalog any more. */
const pickerEntries = (target: 'user' | 'global', definitions: IWiredVariableDefinitionLike[], variableId: string) => {
    const entries = buildWiredVariablePickerEntries(target, 'filter-main', definitions);

    if (isVariableLeaderboardNullId(variableId)) return entries;

    const token = createNativeVariableToken(variableId);

    if (flattenWiredVariablePickerEntries(entries).some((entry) => entry.token === token)) return entries;

    const fallback = createFallbackVariableEntry(target, token);

    return fallback ? [fallback, ...entries] : entries;
};
