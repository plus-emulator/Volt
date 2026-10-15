import { FC, ReactNode, useMemo } from 'react';
import { IWiredNativeVariableDefinition, LocalizeText, localizeWithFallback } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { WiredDropdown } from '../WiredDropdown';
import { WiredText } from '../WiredText';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    WiredVariablePickerTarget,
    WiredVariablePickerUsage
} from '../WiredVariablePickerData';

/**
 * Field pieces shared by the WIRED Link dataframe editors (AIR LinkDataframeSendPreset / LinkDataframeReceivePreset
 * rows, WIN63-202610131318-860371703): a labelled field, and a variable slot that picks its scope and variable like
 * the ValueOrVariableSection and VariablePicker presets do. Scope codes are the AIR variable targets.
 */

// Scope names are the AIR source type texts (wiredfurni.params.sourcetype.*, ValueOrVariableInputPreset).
export const LINK_DATAFRAME_SCOPES: Array<{ target: number; key: WiredVariablePickerTarget; label: string; fallback: string }> = [
    { target: 0, key: 'furni', label: 'wiredfurni.params.sourcetype.furni', fallback: 'Furni' },
    { target: 1, key: 'user', label: 'wiredfurni.params.sourcetype.users', fallback: 'User' },
    { target: -10, key: 'global', label: 'wiredfurni.params.sourcetype.global', fallback: 'Global' },
    { target: -20, key: 'context', label: 'wiredfurni.params.sourcetype.context', fallback: 'Context' }
];

export const LinkDataframeField: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
    <div className="volt-wired__dataframe-field">
        <WiredText text={label} />
        <div className="volt-wired__dataframe-controls">{children}</div>
    </div>
);

export interface LinkDataframeVariableValue {
    target: number;
    token: string;
}

export interface LinkDataframeVariableFieldProps {
    value: LinkDataframeVariableValue;
    onChange: (next: LinkDataframeVariableValue) => void;
    /** Send rows choose the scope; receive rows always capture into a context variable. */
    showScope?: boolean;
    /** Send text rows only list variables with a text connector (AIR variableSelectionFilter). */
    textOnly?: boolean;
    /** Receive rows only list writable, user-made context variables with a value (AIR LinkDataframeReceiveRowPreset.variableFilter). */
    captureOnly?: boolean;
    usage: WiredVariablePickerUsage;
    recentScope: string;
}

const scopeOf = (target: number) => LINK_DATAFRAME_SCOPES.find((scope) => scope.target === target) ?? LINK_DATAFRAME_SCOPES[0];

export const LinkDataframeVariableField: FC<LinkDataframeVariableFieldProps> = ({
    value,
    onChange,
    showScope = false,
    textOnly = false,
    captureOnly = false,
    usage,
    recentScope
}) => {
    const {
        userVariableDefinitions = [],
        furniVariableDefinitions = [],
        roomVariableDefinitions = [],
        contextVariableDefinitions = []
    } = useWiredNativeVariables();
    const scope = scopeOf(captureOnly ? -20 : value.target);

    const definitions = useMemo(() => {
        const catalog: IWiredNativeVariableDefinition[] =
            scope.key === 'furni'
                ? furniVariableDefinitions
                : scope.key === 'user'
                  ? userVariableDefinitions
                  : scope.key === 'global'
                    ? roomVariableDefinitions
                    : contextVariableDefinitions;

        return catalog.filter(
            (definition) =>
                (!textOnly || definition.isTextConnected) &&
                (!captureOnly || (definition.hasValue && !definition.isReadOnly && !!definition.canCreateAndDelete))
        );
    }, [captureOnly, contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, scope.key, textOnly, userVariableDefinitions]);

    const entries = useMemo(() => {
        const built = buildWiredVariablePickerEntries(scope.key, usage, definitions);

        if (!value.token || flattenWiredVariablePickerEntries(built).some((entry) => entry.token === value.token)) return built;

        const fallback = createFallbackVariableEntry(scope.key, value.token);

        return fallback ? [fallback, ...built] : built;
    }, [definitions, scope.key, usage, value.token]);

    return (
        <>
            {showScope && (
                <WiredDropdown
                    options={LINK_DATAFRAME_SCOPES.map((option) => ({ id: option.target, label: localizeWithFallback(option.label, option.fallback) }))}
                    value={scope.target}
                    onChange={(target) => onChange({ target, token: '' })}
                />
            )}
            <WiredVariablePicker
                entries={entries}
                placeholder={LocalizeText('wiredfurni.params.variables.variable_selection')}
                recentScope={recentScope}
                selectedToken={value.token}
                onSelect={(entry) => onChange({ target: scope.target, token: entry.token })}
            />
        </>
    );
};
