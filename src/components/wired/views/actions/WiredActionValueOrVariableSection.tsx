import { FC, useMemo } from 'react';
import { localizeWithFallback, WIRED_NATIVE_VARIABLE_TARGET } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Text } from '../../../../common';
import { useWiredNativeVariables } from '../../../../hooks';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredSection } from '../WiredSection';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries } from '../WiredVariablePickerData';

/**
 * The ValueOrVariable section of the official editors (AIR uiBuilder/presets/sections/ValueOrVariableSection.as:
 * init L143, option L239 (0 typed number, 1 variable), numberValue L244, target L218, finalizeSelection L275).
 * The value is either a typed whole number or a variable; the target is the variable's scope.
 */

export type WiredValueTargetType = 'user' | 'furni' | 'global' | 'context';

export const WIRED_VALUE_OPTION_LITERAL = 0;
export const WIRED_VALUE_OPTION_VARIABLE = 1;

export const normalizeWiredValueTarget = (value: number | undefined): WiredValueTargetType => {
    switch (value) {
        case WIRED_NATIVE_VARIABLE_TARGET.furni:
            return 'furni';
        case WIRED_NATIVE_VARIABLE_TARGET.global:
            return 'global';
        case WIRED_NATIVE_VARIABLE_TARGET.context:
            return 'context';
        default:
            return 'user';
    }
};

export const getWiredValueTargetCode = (type: WiredValueTargetType): number => WIRED_NATIVE_VARIABLE_TARGET[type];

const TARGET_BUTTONS: Array<{ key: WiredValueTargetType; icon: string }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'global', icon: globalVariableIcon },
    { key: 'context', icon: contextVariableIcon }
];

export interface WiredActionValueOrVariableSectionProps {
    title: string;
    targetTitle: string;
    recentScope: string;
    min: number;
    max: number;
    option: number;
    onOptionChange: (option: number) => void;
    literal: number;
    onLiteralChange: (value: number) => void;
    target: WiredValueTargetType;
    onTargetChange: (target: WiredValueTargetType) => void;
    variableToken: string;
    onVariableTokenChange: (token: string) => void;
}

export const WiredActionValueOrVariableSection: FC<WiredActionValueOrVariableSectionProps> = (props) => {
    const {
        title,
        targetTitle,
        recentScope,
        min,
        max,
        option,
        onOptionChange,
        literal,
        onLiteralChange,
        target,
        onTargetChange,
        variableToken,
        onVariableTokenChange
    } = props;
    const {
        userVariableDefinitions = [],
        furniVariableDefinitions = [],
        roomVariableDefinitions = [],
        contextVariableDefinitions = []
    } = useWiredNativeVariables();
    const isVariable = option === WIRED_VALUE_OPTION_VARIABLE;

    const definitions = useMemo(() => {
        switch (target) {
            case 'furni':
                return furniVariableDefinitions;
            case 'global':
                return roomVariableDefinitions;
            case 'context':
                return contextVariableDefinitions;
            default:
                return userVariableDefinitions;
        }
    }, [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, target, userVariableDefinitions]);
    const variableEntries = useMemo(() => buildWiredVariablePickerEntries(target, 'change-reference', definitions), [definitions, target]);
    const resolvedEntries = useMemo(() => {
        if (!variableToken) return variableEntries;
        if (flattenWiredVariablePickerEntries(variableEntries).some((entry) => entry.token === variableToken)) return variableEntries;

        const fallbackEntry = createFallbackVariableEntry(target, variableToken);

        return fallbackEntry ? [fallbackEntry, ...variableEntries] : variableEntries;
    }, [target, variableEntries, variableToken]);

    const changeTarget = (next: WiredValueTargetType) => {
        if (next === target) return;

        onTargetChange(next);
        onVariableTokenChange('');
    };

    return (
        <WiredSection title={title}>
            <label className="volt-wired__change-var-radio">
                <input checked={!isVariable} name={`${recentScope}-value-option`} type="radio" onChange={() => onOptionChange(WIRED_VALUE_OPTION_LITERAL)} />
                <Text>{localizeWithFallback('wiredfurni.params.variables.reference_value.set_value', 'Set value:')}</Text>
                <WiredNumberInput disabled={isVariable} min={min} max={max} value={literal} onChange={onLiteralChange} />
            </label>
            <div className="volt-wired__change-var-reference-block">
                <label className="volt-wired__change-var-radio">
                    <input
                        checked={isVariable}
                        name={`${recentScope}-value-option`}
                        type="radio"
                        onChange={() => onOptionChange(WIRED_VALUE_OPTION_VARIABLE)}
                    />
                    <Text>{localizeWithFallback('wiredfurni.params.variables.reference_value.from_variable', 'From Variable:')}</Text>
                </label>
                {isVariable && (
                    <>
                        <Text bold>{targetTitle}</Text>
                        <div className="volt-wired__give-var-targets">
                            {TARGET_BUTTONS.map((button) => (
                                <button
                                    key={button.key}
                                    type="button"
                                    className={`volt-wired__give-var-target volt-wired__give-var-target--${button.key} ${target === button.key ? 'is-active' : ''}`}
                                    onClick={() => changeTarget(button.key)}
                                >
                                    <img src={button.icon} alt={button.key} />
                                </button>
                            ))}
                        </div>
                        <WiredVariablePicker
                            entries={resolvedEntries}
                            recentScope={recentScope}
                            selectedToken={variableToken}
                            onSelect={(entry) => onVariableTokenChange(entry.token)}
                        />
                    </>
                )}
            </div>
        </WiredSection>
    );
};
