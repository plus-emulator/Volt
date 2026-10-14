import { parseWiredLiteral } from '../../../../api/wired/WiredLiteral';
import { FC, useEffect, useMemo, useState } from 'react';
import {
    IWiredVariableFxParams,
    localizeWithFallback,
    readWiredVariableFxParams,
    WIRED_FX_CATEGORY,
    WIRED_FX_COLOR_DYNAMIC_LEVELLING,
    WIRED_FX_COLOR_DYNAMIC_RED_TO_GREEN,
    WIRED_FX_COLOR_DYNAMIC_TEAM,
    WIRED_FX_COLOR_NOT_APPLICABLE,
    WIRED_FX_ICONS,
    WIRED_FX_NUMBER_ALIGNMENTS,
    WIRED_FX_OVERRIDE_TARGET,
    WIRED_FX_PALETTE,
    WIRED_FX_RENDERER,
    WIRED_FX_SEGMENTS_MAX,
    WIRED_FX_SHOW_DURATION_MAX_MS,
    WIRED_FX_SHOW_DURATION_MIN_MS,
    WIRED_FX_SHOW_MODE,
    WIRED_FX_SOURCE,
    WIRED_FX_STACK_ORDER_MAX,
    WIRED_FX_STACK_ORDER_MIN,
    WIRED_FX_VISIBILITY,
    WIRED_FX_WIDTH_NOT_APPLICABLE,
    WIRED_FX_WIDTHS,
    WiredFurniType,
    wiredVariableFxSegmentsAllowed,
    wiredVariableFxStyle,
    wiredVariableFxStyles,
    wiredVariableFxUsesRange,
    writeWiredVariableFxParams
} from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { VoltInput } from '../../../../layout';
import { WiredSection, WiredSplitter } from '../WiredSection';
import { WiredCollapsibleSection } from '../WiredCollapsibleSection';
import { WiredDropdown } from '../WiredDropdown';
import { WiredRadioGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredText } from '../WiredText';
import userIcon from '../../../../assets/images/wired/native/icon_source_users.png';
import globalIcon from '../../../../assets/images/wired/native/icon_source_global.png';
import furniIcon from '../../../../assets/images/wired/native/icon_source_furni.png';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, IWiredVariablePickerEntry, WiredVariablePickerTarget } from '../WiredVariablePickerData';
import { tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';

export interface WiredExtraVariableFxViewProps {
    category: number;
}

interface IFxOption {
    value: number;
    key: string;
    fallback: string;
}

/** The three variable slots of the card: override minimum, override maximum, audience. */
interface IFxVariableTokens {
    overrideMin: string;
    overrideMax: string;
    audience: string;
}

const VISIBILITY_OPTIONS: IFxOption[] = [
    { value: WIRED_FX_VISIBILITY.EVERYONE, key: 'wiredfurni.params.variablefx.visibility.everyone', fallback: 'Everyone' },
    { value: WIRED_FX_VISIBILITY.ONLY_USER, key: 'wiredfurni.params.variablefx.visibility.only_user', fallback: 'Only the user' },
    { value: WIRED_FX_VISIBILITY.GAME_TEAM, key: 'wiredfurni.params.variablefx.visibility.game_team', fallback: 'Users who are on the same team' },
    { value: WIRED_FX_VISIBILITY.HAS_VARIABLE, key: 'wiredfurni.params.variablefx.visibility.has_variable', fallback: 'Users who have variable' },
    { value: WIRED_FX_VISIBILITY.HAS_VARIABLE_WITH_VALUE, key: 'wiredfurni.params.variablefx.visibility.has_variable.value', fallback: 'Users with variable and value' }
];

const SHOW_MODE_OPTIONS: IFxOption[] = [
    { value: WIRED_FX_SHOW_MODE.ALWAYS, key: 'wiredfurni.params.variablefx.show_mode.always', fallback: 'Always visible' },
    { value: WIRED_FX_SHOW_MODE.WHEN_CHANGES, key: 'wiredfurni.params.variablefx.show_mode.when_variable_changes', fallback: 'Visible when the variable updates' },
    { value: WIRED_FX_SHOW_MODE.NEVER, key: 'wiredfurni.params.variablefx.show_mode.never', fallback: 'Never visible' }
];

const TARGET_OPTIONS: IFxOption[] = [
    { value: WIRED_FX_OVERRIDE_TARGET.HOLDER, key: 'wiredfurni.params.variablefx.override.holder', fallback: "The holder's own variable" },
    { value: WIRED_FX_OVERRIDE_TARGET.GLOBAL, key: 'wiredfurni.params.variablefx.override.global', fallback: 'A room variable' }
];

/** The bars a segmented renderer or a level badge can be: the labels for the renderer ids the styles offer. */
const BAR_OPTIONS: Record<number, IFxOption> = {
    [WIRED_FX_RENDERER.CLASSIC_MINI]: { value: WIRED_FX_RENDERER.CLASSIC_MINI, key: 'wiredfurni.params.variablefx.style.classic_mini', fallback: 'Classic mini' },
    [WIRED_FX_RENDERER.BLOCK]: { value: WIRED_FX_RENDERER.BLOCK, key: 'wiredfurni.params.variablefx.style.block', fallback: 'Blocks' },
    [WIRED_FX_RENDERER.STRIPED]: { value: WIRED_FX_RENDERER.STRIPED, key: 'wiredfurni.params.variablefx.style.striped', fallback: 'Striped' },
    [WIRED_FX_RENDERER.ARROW]: { value: WIRED_FX_RENDERER.ARROW, key: 'wiredfurni.params.variablefx.style.arrow', fallback: 'Arrows' }
};

/** The colour an id stands for: the server's dynamic ids, the palette, or the style's own. */
const colourOption = (value: number): IFxOption => {
    switch (value) {
        case WIRED_FX_COLOR_NOT_APPLICABLE:
            return { value, key: 'wiredfurni.params.variablefx.color.default', fallback: "The style's own" };
        case WIRED_FX_COLOR_DYNAMIC_RED_TO_GREEN:
            return { value, key: 'wiredfurni.params.variablefx.color.red_to_green', fallback: 'Red to green by value' };
        case WIRED_FX_COLOR_DYNAMIC_LEVELLING:
            return { value, key: 'wiredfurni.params.variablefx.color.levelling', fallback: 'By level (red to green)' };
        case WIRED_FX_COLOR_DYNAMIC_TEAM:
            return { value, key: 'wiredfurni.params.variablefx.color.team', fallback: "The holder's team colour" };
        default: {
            const palette = WIRED_FX_PALETTE.find((entry) => entry.id === value);

            return { value, key: palette?.key ?? '', fallback: palette?.fallback ?? String(value) };
        }
    }
};

const widthOption = (value: number): IFxOption => {
    const width = WIRED_FX_WIDTHS.find((entry) => entry.id === value);

    return { value, key: width?.key ?? '', fallback: width?.fallback ?? String(value) };
};

const variableTokensFromWire = (variableIds: string[]): IFxVariableTokens => ({
    overrideMin: tokenOfVariableSlot(variableIds[0]),
    overrideMax: tokenOfVariableSlot(variableIds[1]),
    audience: tokenOfVariableSlot(variableIds[2])
});

/** The override slots are used only when their switch is on, and the audience only when visibility needs it. */
const variableIdsFor = (params: IWiredVariableFxParams, tokens: IFxVariableTokens, usesRange: boolean, needsAudience: boolean): string[] => [
    usesRange && params.overrideMinEnabled ? variableSlotOf(tokens.overrideMin) : WIRED_VARIABLE_ABSENT,
    usesRange && params.overrideMaxEnabled ? variableSlotOf(tokens.overrideMax) : WIRED_VARIABLE_ABSENT,
    needsAudience ? variableSlotOf(tokens.audience) : WIRED_VARIABLE_ABSENT
];

/** Only user-made variables carry an id the server can look up; the internal ones are left out. */
const customOnly = (entries: IWiredVariablePickerEntry[]): IWiredVariablePickerEntry[] =>
    entries
        .map((entry) => (entry.children?.length ? { ...entry, children: customOnly(entry.children) } : entry))
        .filter((entry) => (entry.children ? entry.children.length > 0 : entry.kind === 'custom'));

const toInt = (raw: string, fallback: number) => {
    const parsed = parseInt(raw, 10);

    return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * The one editor of the six variable fx boxes. What differs per category is which fields make sense: levels and
 * plain numbers have no range, a level badge picks the bar it draws, a number display places its icon, segments
 * only apply to segmented renderers, and the style decides which colours, widths and renderers are offered.
 */
export const WiredExtraVariableFxView: FC<WiredExtraVariableFxViewProps> = (props) => {
    const { category } = props;
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [] } = useWiredNativeVariables();
    const [params, setParams] = useState<IWiredVariableFxParams>(() => readWiredVariableFxParams([], category));
    const [variables, setVariables] = useState<IFxVariableTokens>(() => variableTokensFromWire([]));
    const [icon, setIcon] = useState('');
    const [rangeError, setRangeError] = useState(false);

    const styles = wiredVariableFxStyles(category);
    const style = wiredVariableFxStyle(category, params.styleId);
    const usesRange = wiredVariableFxUsesRange(category);
    const showsIcon = category === WIRED_FX_CATEGORY.NUMBER_DISPLAY;
    const showsLevelBar = category === WIRED_FX_CATEGORY.LEVELLING_PROGRESS;
    const segmentsAllowed = wiredVariableFxSegmentsAllowed(category, params.rendererId, params.categoryExtra);
    const holderTarget: WiredVariablePickerTarget = params.source === WIRED_FX_SOURCE.FURNI ? 'furni' : 'user';
    const needsAudience = params.visibility >= WIRED_FX_VISIBILITY.HAS_VARIABLE;
    const visibilityOptions = [VISIBILITY_OPTIONS[1], VISIBILITY_OPTIONS[2], VISIBILITY_OPTIONS[3], VISIBILITY_OPTIONS[4], VISIBILITY_OPTIONS[0]]
        .filter((option) => params.source === WIRED_FX_SOURCE.USER || option.value >= WIRED_FX_VISIBILITY.EVERYONE);
    const categoryHasColor = styles.some(entry => entry.colorIds.some(id => id !== WIRED_FX_COLOR_NOT_APPLICABLE));
    const categoryHasWidth = styles.some(entry => entry.widthIds.some(id => id !== WIRED_FX_WIDTH_NOT_APPLICABLE));
    const categoryHasRenderer = styles.some(entry => entry.rendererIds.length > 1);
    const categoryHasSegments = styles.some(entry => entry.rendererIds.some(renderer => wiredVariableFxSegmentsAllowed(category, renderer, entry.defaultSubRendererId)) || entry.subRendererIds.length > 0);

    const holderEntries = useMemo(
        () =>
            customOnly(
                buildWiredVariablePickerEntries(holderTarget, 'change-reference', holderTarget === 'furni' ? furniVariableDefinitions : userVariableDefinitions)
            ),
        [holderTarget, userVariableDefinitions, furniVariableDefinitions]
    );
    const roomEntries = useMemo(() => customOnly(buildWiredVariablePickerEntries('global', 'change-reference', roomVariableDefinitions)), [roomVariableDefinitions]);
    const audienceEntries = useMemo(() => customOnly(buildWiredVariablePickerEntries('user', 'change-reference', userVariableDefinitions)), [userVariableDefinitions]);

    useEffect(() => {
        setParams(readWiredVariableFxParams(trigger?.intData ?? [], category));
        setVariables(variableTokensFromWire(trigger?.variableIds ?? []));
        setIcon((trigger?.stringData ?? '').trim());
        setRangeError(false);
    }, [trigger, category]);

    const patch = (changes: Partial<IWiredVariableFxParams>) => setParams((previous) => ({ ...previous, ...changes }));
    const patchVariables = (changes: Partial<IFxVariableTokens>) => setVariables((previous) => ({ ...previous, ...changes }));

    const chooseSource = (source: number) => {
        patch({ source, visibility: source === WIRED_FX_SOURCE.FURNI && params.visibility < WIRED_FX_VISIBILITY.EVERYONE ? WIRED_FX_VISIBILITY.EVERYONE : params.visibility });
        // The holder changes with the source, so the holder's own override variables no longer apply.
        patchVariables({ overrideMin: '', overrideMax: '' });
    };

    // A style brings its own colour, width and renderer; the level bar follows the style too.
    const chooseStyle = (styleId: number) => {
        const next = wiredVariableFxStyle(category, styleId);

        patch({
            styleId: next.styleId,
            colorId: next.defaultColorId,
            widthId: next.defaultWidthId,
            rendererId: next.defaultRendererId,
            categoryExtra: category === WIRED_FX_CATEGORY.LEVELLING_PROGRESS ? next.defaultSubRendererId : params.categoryExtra
        });
    };

    const validate = () => {
        const min = parseWiredLiteral(params.minValue);
        const max = parseWiredLiteral(params.maxValue);
        const invalidRange = usesRange && (min === null || max === null || max <= min);
        const missingOverride = usesRange && ((params.overrideMinEnabled && !variables.overrideMin) || (params.overrideMaxEnabled && !variables.overrideMax));
        const missingAudience = needsAudience && !variables.audience;

        setRangeError(invalidRange);

        return !invalidRange && !missingOverride && !missingAudience;
    };

    const save = () => {
        setIntParams(writeWiredVariableFxParams(params, category));
        setStringParam(showsIcon ? icon : '');
        setVariableIds(variableIdsFor(params, variables, usesRange, needsAudience));
    };

    const select = (label: string, value: number, options: IFxOption[], onChange: (value: number) => void, testId?: string, disabled = false) => (
        <div className="volt-wired-fx-editor__named-row" data-testid={testId}>
            <WiredText text={label} />
            <WiredDropdown caption={label} value={value} options={options.map(option => ({ id: option.value, label: localizeWithFallback(option.key, option.fallback) }))} disabled={disabled} onChange={onChange} />
        </div>
    );

    const overrideRow = (
        label: string,
        enabled: boolean,
        target: number,
        token: string,
        onChange: (enabled: boolean, target: number, token: string) => void,
        scope: string
    ) => (
        <div className="volt-wired-fx-editor__override">
            <WiredCheckboxOption label={label} checked={enabled} onChange={checked => onChange(checked, target, token)} />
            <fieldset className="volt-wired-fx-editor__override-value" disabled={!enabled} inert={!enabled}>
                <WiredVariablePicker entries={target === WIRED_FX_OVERRIDE_TARGET.GLOBAL ? roomEntries : holderEntries} recentScope={scope} selectedToken={token}
                    onSelect={entry => onChange(enabled, target, entry.token)} />
                <div className="volt-wired__give-var-targets">
                    {TARGET_OPTIONS.map(option => <button key={option.value} type="button" disabled={!enabled}
                        className={`volt-wired__give-var-target ${target === option.value ? 'is-active' : ''}`}
                        aria-label={localizeWithFallback(option.key, option.fallback)} aria-pressed={target === option.value} onClick={() => onChange(enabled, option.value, '')}>
                        <img src={option.value === WIRED_FX_OVERRIDE_TARGET.GLOBAL ? globalIcon : params.source === WIRED_FX_SOURCE.FURNI ? furniIcon : userIcon} alt="" />
                    </button>)}
                </div>
            </fieldset>
        </div>
    );

    const sourceControls = (
        <div className="volt-wired__give-var-targets">
            {[{ source: WIRED_FX_SOURCE.FURNI, icon: furniIcon, label: 'Furni variables' }, { source: WIRED_FX_SOURCE.USER, icon: userIcon, label: 'User variables' }].map(option => (
                <button key={option.source} type="button" className={`volt-wired__give-var-target ${params.source === option.source ? 'is-active' : ''}`}
                    aria-label={option.label} aria-pressed={params.source === option.source} onClick={() => chooseSource(option.source)}>
                    <img src={option.icon} alt="" />
                </button>
            ))}
        </div>
    );
    const changeControls = (
        <fieldset className="volt-wired-fx-editor__change-settings" disabled={params.showMode !== WIRED_FX_SHOW_MODE.WHEN_CHANGES}>
            <div className="volt-wired-fx-editor__update-mask">
                {[[1, 'Created variable'], [2, 'Increased variable'], [4, 'Decreased variable'], [8, 'Unchanged variable']].map(([bit, label], index) => (
                    <WiredCheckboxOption key={bit} label={localizeWithFallback(`wiredfurni.params.variablefx.update_mask.${index + 1}`, String(label))}
                        checked={(params.updateMask & Number(bit)) !== 0} disabled={params.showMode !== WIRED_FX_SHOW_MODE.WHEN_CHANGES}
                        onChange={checked => patch({ updateMask: checked ? params.updateMask | Number(bit) : params.updateMask & ~Number(bit) })} />
                ))}
            </div>
            <WiredSplitter />
            <div className="volt-wired-fx-editor__named-row">
                <WiredText text={localizeWithFallback('wiredfurni.params.variablefx.show_duration', 'Duration (milliseconds)')} />
                <WiredNumberInput ariaLabel="Duration (milliseconds)" min={WIRED_FX_SHOW_DURATION_MIN_MS} max={WIRED_FX_SHOW_DURATION_MAX_MS} width={45} value={params.showDurationMs}
                    disabled={params.showMode !== WIRED_FX_SHOW_MODE.WHEN_CHANGES} onChange={showDurationMs => patch({ showDurationMs })} />
            </div>
            <WiredSplitter />
            <WiredCheckboxOption label={localizeWithFallback('wiredfurni.params.variablefx.mouse_hover', 'Show on mouse hover')}
                checked={params.showOnMouseHover === 1} disabled={params.showMode !== WIRED_FX_SHOW_MODE.WHEN_CHANGES}
                onChange={checked => patch({ showOnMouseHover: checked ? 1 : 0 })} last />
        </fieldset>
    );

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate} nativeLayout headerControls={sourceControls}>
            {category === WIRED_FX_CATEGORY.LEVELLING_PROGRESS && <WiredSection>
                <WiredText wrap text={localizeWithFallback('wiredfurni.params.variablefx.levelling_progress.info', 'Levels come from the level-up system addon on the same tile; without one the badge shows level 1.')} />
            </WiredSection>}
            <WiredSection title={localizeWithFallback('wiredfurni.params.variablefx.visualization.style', 'Style')}
                headerOption={<WiredDropdown caption={localizeWithFallback('wiredfurni.params.variablefx.visualization.style', 'Style')} value={params.styleId}
                    options={styles.map(entry => ({ id: entry.styleId, label: localizeWithFallback(entry.key, entry.fallback) }))} onChange={chooseStyle} />}>
                <div className="volt-wired-fx-editor__visualization">
                    <WiredText bold text={localizeWithFallback('wiredfurni.params.variablefx.visualization', 'Visualization')} />
                    {categoryHasColor && select(localizeWithFallback('wiredfurni.params.variablefx.visualization.color', 'Colour'), params.colorId, style.colorIds.map(colourOption), colorId => patch({ colorId }), 'fx-color', style.colorIds.length <= 1)}
                    {categoryHasWidth && select(localizeWithFallback('wiredfurni.params.variablefx.visualization.width', 'Width'), params.widthId, style.widthIds.map(widthOption), widthId => patch({ widthId }), undefined, style.widthIds.length <= 1 || (segmentsAllowed && params.segments > 0))}
                    {categoryHasRenderer && select(localizeWithFallback('wiredfurni.params.variablefx.visualization.renderer', 'Bar'), params.rendererId, style.rendererIds.map(id => BAR_OPTIONS[id] ?? { value: id, key: '', fallback: String(id) }), rendererId => patch({ rendererId }), undefined, style.rendererIds.length <= 1)}
                    {showsLevelBar && select(localizeWithFallback('wiredfurni.params.variablefx.visualization.sub_renderer', 'Bar beside the badge'), params.categoryExtra, style.subRendererIds.map(id => BAR_OPTIONS[id] ?? { value: id, key: '', fallback: String(id) }), categoryExtra => patch({ categoryExtra }), undefined, style.subRendererIds.length <= 1)}
                    {categoryHasSegments && select(localizeWithFallback('wiredfurni.params.variablefx.visualization.segments', 'Segments'), segmentsAllowed ? params.segments : -1,
                        segmentsAllowed ? Array.from({ length: WIRED_FX_SEGMENTS_MAX + 1 }, (_, value) => ({ value, key: value === 0 ? 'wiredfurni.params.variablefx.visualization.segments.not_specified' : '', fallback: value === 0 ? 'Not specified' : String(value) })) : [{ value: -1, key: '', fallback: 'Not applicable' }],
                        segments => patch({ segments }), 'fx-segments', !segmentsAllowed)}
                    {showsIcon && <>
                        <div className="volt-wired-fx-editor__named-row" data-testid="fx-icon">
                            <WiredText text={localizeWithFallback('wiredfurni.params.variablefx.visualization.icon', 'Icon')} />
                            <WiredDropdown caption={localizeWithFallback('wiredfurni.params.variablefx.visualization.icon', 'Icon')} value={WIRED_FX_ICONS.indexOf(icon) + 1}
                                options={[{ id: 0, label: localizeWithFallback('wiredfurni.params.variablefx.icon.none', 'None') }, ...WIRED_FX_ICONS.map((name, index) => ({ id: index + 1, label: localizeWithFallback(`wiredfurni.params.variablefx.icon.${name}`, name.replace(/_/g, ' ')) }))]}
                                onChange={id => setIcon(id === 0 ? '' : WIRED_FX_ICONS[id - 1])} />
                        </div>
                        {select(localizeWithFallback('wiredfurni.params.variablefx.visualization.icon_alignment', 'Icon alignment'), params.categoryExtra,
                            WIRED_FX_NUMBER_ALIGNMENTS.map((alignment, value) => ({ value, key: `wiredfurni.params.variablefx.icon_alignment.${alignment}`, fallback: alignment })), categoryExtra => patch({ categoryExtra }))}
                    </>}
                </div>
            </WiredSection>
            {usesRange && <WiredSection title={localizeWithFallback('wiredfurni.params.variablefx.value_range', 'Value range')}>
                <WiredText wrap text={localizeWithFallback('wiredfurni.params.variablefx.value_range.info', 'Default minimum and maximum values.')} />
                <div className="volt-wired-fx-editor__range">
                    <label><WiredText text="Min:" /><VoltInput aria-label="Minimum" type="text" inputMode="numeric" inputSize="sm" data-testid="fx-min" value={params.minValue} onChange={event => patch({ minValue: event.target.value })} /></label>
                    <span>−</span>
                    <label><WiredText text="Max:" /><VoltInput aria-label="Maximum" type="text" inputMode="numeric" inputSize="sm" data-testid="fx-max" value={params.maxValue} onChange={event => patch({ maxValue: event.target.value })} /></label>
                </div>
                {rangeError && <Text small className="text-red-500">{localizeWithFallback('wiredfurni.params.variablefx.validation.range', 'The maximum has to be above the minimum.')}</Text>}
            </WiredSection>}
            <WiredCollapsibleSection key={`visibility-${trigger?.id}-${category}`} title={localizeWithFallback('wiredfurni.params.variablefx.visibility', 'Visibility')}>
                <WiredRadioGroup name="variable-fx-show-mode" value={params.showMode} onChange={showMode => patch({ showMode })}
                    options={SHOW_MODE_OPTIONS.map(option => ({ id: option.value, label: localizeWithFallback(option.key, option.fallback), extra: option.value === WIRED_FX_SHOW_MODE.WHEN_CHANGES ? changeControls : undefined }))} />
                {select(localizeWithFallback('wiredfurni.params.variablefx.visibility.audience', 'Audience'), params.visibility, visibilityOptions, visibility => patch({ visibility }))}
                {needsAudience && <div className="volt-wired-fx-editor__audience">
                    <WiredVariablePicker entries={audienceEntries} recentScope="variable-fx-audience" selectedToken={variables.audience} onSelect={entry => patchVariables({ audience: entry.token })} />
                    {params.visibility === WIRED_FX_VISIBILITY.HAS_VARIABLE_WITH_VALUE && <label>
                        <WiredText text={localizeWithFallback('wiredfurni.params.variablefx.audience_value', 'with value')} />
                        <VoltInput aria-label="Audience value" type="number" inputSize="sm" data-testid="fx-audience-value" value={params.audienceValue} onChange={event => patch({ audienceValue: toInt(event.target.value, 0) })} />
                    </label>}
                </div>}
            </WiredCollapsibleSection>
            {usesRange && <WiredCollapsibleSection key={`range-${trigger?.id}-${category}`} title={localizeWithFallback('wiredfurni.params.variablefx.advanced.range', 'Advanced range')}>
                {overrideRow(localizeWithFallback('wiredfurni.params.variablefx.advanced.override_min', 'Take the minimum from a variable'), params.overrideMinEnabled, params.overrideMinTarget, variables.overrideMin,
                    (enabled, target, token) => { patch({ overrideMinEnabled: enabled, overrideMinTarget: target }); patchVariables({ overrideMin: token }); }, 'variable-fx-override-min')}
                {overrideRow(localizeWithFallback('wiredfurni.params.variablefx.advanced.override_max', 'Take the maximum from a variable'), params.overrideMaxEnabled, params.overrideMaxTarget, variables.overrideMax,
                    (enabled, target, token) => { patch({ overrideMaxEnabled: enabled, overrideMaxTarget: target }); patchVariables({ overrideMax: token }); }, 'variable-fx-override-max')}
            </WiredCollapsibleSection>}
            <WiredCollapsibleSection key={`stack-${trigger?.id}-${category}`} title={localizeWithFallback('wiredfurni.params.variablefx.stack_order', 'Order in FX stack')}>
                <WiredText wrap text={localizeWithFallback('wiredfurni.params.variablefx.stack_order.info', "Higher values place this FX lower in the object's FX stack.")} />
                <WiredNumberInput ariaLabel="Order in FX stack" width={-1} min={WIRED_FX_STACK_ORDER_MIN} max={WIRED_FX_STACK_ORDER_MAX} value={params.stackOrder} onChange={stackOrder => patch({ stackOrder })} />
            </WiredCollapsibleSection>
        </WiredExtraBaseView>
    );
};
