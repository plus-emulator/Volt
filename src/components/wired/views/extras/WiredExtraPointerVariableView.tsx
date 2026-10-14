import { FC, useEffect, useMemo, useState } from 'react';
import {
    expandLocalizedText,
    handleWiredVariableNameKeyDown,
    localizeWithFallback,
    normalizeWiredVariableName,
    tokenOfVariableSlot,
    variableSlotOf,
    WIRED_NATIVE_VARIABLE_TARGET,
    WIRED_VARIABLE_NAME_MAX,
    WiredFurniType
} from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/native/icon_source_context.png';
import furniVariableIcon from '../../../../assets/images/wired/native/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/native/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/native/icon_source_users.png';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredTextInput } from '../WiredTextInput';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    IWiredVariableDefinitionLike
} from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/** class_4027.var_3924 (package_223/class_4027.as:6): the variable type the accessor must have. */
const ACCESSOR_VARIABLE_TYPE = 0;

type PointerSourceScope = 'furni' | 'user' | 'global' | 'context';

/** SourceTypeSelectorParam order (PointerVariable.as L47): class_4254 FURNI, USER, var_5827 (room), var_4327 (context). */
const SOURCE_BUTTONS: Array<{ key: PointerSourceScope; icon: string }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'global', icon: globalVariableIcon },
    { key: 'context', icon: contextVariableIcon }
];

const SOURCE_TYPE_BY_SCOPE: Record<PointerSourceScope, number> = {
    furni: WIRED_NATIVE_VARIABLE_TARGET.furni,
    user: WIRED_NATIVE_VARIABLE_TARGET.user,
    global: WIRED_NATIVE_VARIABLE_TARGET.global,
    context: WIRED_NATIVE_VARIABLE_TARGET.context
};

const scopeOfSourceType = (sourceType: number): PointerSourceScope => {
    const scope = (Object.keys(SOURCE_TYPE_BY_SCOPE) as PointerSourceScope[]).find((key) => SOURCE_TYPE_BY_SCOPE[key] === sourceType);

    return scope ?? 'furni';
};

/**
 * PointerVariable.as (variable code 9, var_6040), build WIN63-202610131318-860371703: the source type selector (ints [sourceType],
 * L47 and readIntParamsFromForm L82), a context accessor variable (variableIds [accessor], readVariableIdsFromForm L87) and the
 * variable name (string, readStringParamFromForm L92). The accessor list is filtered by accessorVariableFilter (L32):
 * variableType == class_4027.var_3924, variableTarget == class_4254.var_4327 (context), hasValue, !requiresExecutionContext.
 */
// AirSourceOnly (wf_var_pointer): PointerVariable.as
export const WiredExtraPointerVariableView: FC<{}> = () => {
    const { trigger = null, nativeCatalog = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const [variableName, setVariableName] = useState('');
    const [sourceScope, setSourceScope] = useState<PointerSourceScope>('furni');
    const [accessorToken, setAccessorToken] = useState('');

    const accessorDefinitions = useMemo<IWiredVariableDefinitionLike[]>(() => {
        const definitions: IWiredVariableDefinitionLike[] = [];

        for (const entry of nativeCatalog?.rows?.values() ?? []) {
            const variable = entry.variable;

            if (variable.variableType !== ACCESSOR_VARIABLE_TYPE || variable.variableTarget !== WIRED_NATIVE_VARIABLE_TARGET.context) continue;
            if (!variable.hasValue || variable.requiresExecutionContext) continue;

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

    const accessorEntries = useMemo(() => buildWiredVariablePickerEntries('context', 'filter-main', accessorDefinitions), [accessorDefinitions]);

    const resolvedAccessorEntries = useMemo(() => {
        if (!accessorToken) return accessorEntries;
        if (flattenWiredVariablePickerEntries(accessorEntries).some((entry) => entry.token === accessorToken)) return accessorEntries;

        const fallbackEntry = createFallbackVariableEntry('context', accessorToken);

        return fallbackEntry ? [fallbackEntry, ...accessorEntries] : accessorEntries;
    }, [accessorEntries, accessorToken]);

    useEffect(() => {
        if (!trigger) return;

        const sourceType = trigger.intData?.[0] ?? SOURCE_TYPE_BY_SCOPE.furni;

        setVariableName(normalizeWiredVariableName(trigger.stringData));
        setSourceScope(scopeOfSourceType(sourceType));
        setAccessorToken(tokenOfVariableSlot(trigger.variableIds?.[0]));
    }, [trigger]);

    const save = () => {
        setIntParams([SOURCE_TYPE_BY_SCOPE[sourceScope]]);
        setVariableIds([variableSlotOf(accessorToken)]);
        setStringParam(normalizeWiredVariableName(variableName));
    };

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            headerControls={
                <div className="volt-wired__give-var-targets" role="group" aria-label={localizeWithFallback('wiredfurni.params.variables.variable_selection', 'Variable selection:')}>
                    {SOURCE_BUTTONS.map((button) => (
                        <button
                            key={button.key}
                            type="button"
                            aria-label={button.key}
                            aria-pressed={sourceScope === button.key}
                            className={`volt-wired__give-var-target volt-wired__give-var-target--${button.key} ${sourceScope === button.key ? 'is-active' : ''}`}
                            onClick={() => setSourceScope(button.key)}
                        >
                            <img src={button.icon} alt="" />
                        </button>
                    ))}
                </div>
            }
        >
            <WiredSection>
                <Text className="whitespace-pre-line" small>
                    {expandLocalizedText(
                        localizeWithFallback(
                            'wiredfurni.params.variables.pointer.usage_info',
                            "A pointer variable is another variable in disguise, identified through a context variable pointing to the furni ID of the target variable's Wired box\n\nDISCLAIMER: This is an advanced but powerful Wired box. You likely won't need it unless you feel the need for it!"
                        ),
                        () => null
                    )}
                </Text>
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.variables.variable_name', 'Variable name:')}>
                <WiredTextInput
                    maxLength={WIRED_VARIABLE_NAME_MAX}
                    value={variableName}
                    onChange={(value) => setVariableName(normalizeWiredVariableName(value))}
                    onKeyDown={(event) => handleWiredVariableNameKeyDown(event, setVariableName)}
                />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.variables.pointer.accessor', 'Context accessor variable:')}>
                <WiredVariablePicker
                    entries={resolvedAccessorEntries}
                    recentScope="variable-pointer"
                    selectedToken={accessorToken}
                    onSelect={(entry) => setAccessorToken(entry.token)}
                />
            </WiredSection>
        </WiredExtraBaseView>
    );
};
