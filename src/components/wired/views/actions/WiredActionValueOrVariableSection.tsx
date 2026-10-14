import { FC, useEffect, useMemo, useRef, useState } from 'react';
import variableIcon from '../../../../assets/images/wired/native/icon_variable_reference.png';
import nativeFurniIcon from '../../../../assets/images/wired/native/icon_source_furni.png';
import nativeUserIcon from '../../../../assets/images/wired/native/icon_source_users.png';
import nativeGlobalIcon from '../../../../assets/images/wired/native/icon_source_global.png';
import nativeContextIcon from '../../../../assets/images/wired/native/icon_source_context.png';
import { useWiredNative } from '../WiredNativeContext';
import { WiredSourceTypeSelector } from '../WiredSourceTypeSelector';
import { WiredText } from '../WiredText';
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
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries, WiredVariablePickerUsage } from '../WiredVariablePickerData';

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
    variableUsage?: WiredVariablePickerUsage;
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
    disabled?: boolean;
    onValidityChange?: (valid: boolean) => void;
}

export const WiredActionValueOrVariableSection: FC<WiredActionValueOrVariableSectionProps> = (props) => {
    const isNative = useWiredNative();
    const {
        title,
        targetTitle,
        recentScope,
        variableUsage = 'change-reference',
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
    const variableEntries = useMemo(() => buildWiredVariablePickerEntries(target, variableUsage, definitions), [definitions, target, variableUsage]);
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

    if (isNative) return <NativeValueOrVariable {...props} entries={resolvedEntries} />;

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

/** AIR25 ValueOrVariableInputPreset: an editable number/name field with a reference chooser. */
const NativeValueOrVariable: FC<WiredActionValueOrVariableSectionProps & { entries: ReturnType<typeof buildWiredVariablePickerEntries> }> = (props) => {
    const { title, targetTitle, recentScope, option, literal, min, max, target, variableToken, entries, disabled = false, onOptionChange, onLiteralChange, onTargetChange, onVariableTokenChange, onValidityChange } = props;
    const flatEntries = flattenWiredVariablePickerEntries(entries);
    const selected = flatEntries.find(entry => entry.token === variableToken);
    const shown = option === WIRED_VALUE_OPTION_VARIABLE ? selected?.displayLabel ?? variableToken : String(literal);
    const wireKey = `${option}:${literal}:${target}:${variableToken}`;
    const publishedKey = useRef(wireKey);
    const [text, setText] = useState(shown);
    const [valid, setValid] = useState(true);
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (publishedKey.current === wireKey) return;
        publishedKey.current = wireKey;
        setText(shown);
        setValid(true);
    }, [shown, wireKey]);
    useEffect(() => { onValidityChange?.(disabled || valid); }, [disabled, valid, onValidityChange]);
    useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

    const edit = (next: string) => {
        setText(next);
        // These three forms are accepted by AIR ValueOrVariableSection.isNumericText.
        if (/^-?\d+$/.test(next) || /^0x[0-9a-fA-F]+$/.test(next) || /^0b[01]+$/.test(next)) {
            const value = Number(next);
            const accepted = Number.isInteger(value) && value >= min && value <= max && value >= -2147483648 && value <= 2147483647;
            setValid(accepted);
            publishedKey.current = `0:${accepted ? value : literal}:${target}:${variableToken}`;
            onOptionChange(WIRED_VALUE_OPTION_LITERAL);
            if (accepted) onLiteralChange(value);
            return;
        }
        if (next === '-' || next === '+') {
            publishedKey.current = `0:${literal}:${target}:${variableToken}`;
            onOptionChange(WIRED_VALUE_OPTION_LITERAL);
            setValid(false);
            return;
        }
        const matches = flatEntries.filter(entry => entry.selectable && entry.displayLabel === next);
        setValid(matches.length === 1);
        publishedKey.current = `1:${literal}:${target}:${matches.length === 1 ? matches[0].token : variableToken}`;
        onOptionChange(WIRED_VALUE_OPTION_VARIABLE);
        if (matches.length === 1) onVariableTokenChange(matches[0].token);
    };

    return (
        <WiredSection title={title}>
            <div style={{ position: 'relative' }}>
                <div className={`volt-wired__input-box ${valid ? '' : 'is-invalid'}`} style={{ display: 'flex', width: '100%' }}>
                    <input className="volt-wired__input-field volt-wired__input-field--stretch" type="text" style={{ minWidth: 0, flex: '1 1 0', width: 0 }} aria-label={title} disabled={disabled} value={text} onChange={event => edit(event.target.value)} />
                    {option === WIRED_VALUE_OPTION_VARIABLE && <span title={target} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 19, minWidth: 19, zIndex: 1 }}><img src={{ furni: nativeFurniIcon, user: nativeUserIcon, global: nativeGlobalIcon, context: nativeContextIcon }[target]} alt={target} draggable={false} style={{ imageRendering: 'pixelated' }} /></span>}
                    <button type="button" aria-label={localizeWithFallback('wiredfurni.params.variables.reference_value.popup', 'Choose variable')} disabled={disabled} onClick={() => setOpen(value => !value)} style={{ width: 19, minWidth: 19, border: 0, padding: 0, background: 'transparent', zIndex: 1 }}>
                        <img src={variableIcon} alt="" draggable={false} style={{ imageRendering: 'pixelated' }} />
                    </button>
                </div>
                {open && !disabled && (
                    <div role="dialog" aria-label={targetTitle} className="volt-wired__value-chooser" style={{ position: 'absolute', zIndex: 100, top: '100%', right: 0, width: 260, border: '1px solid #000', padding: 8, background: '#e9e9e1' }}>
                        <div className="flex items-center justify-between gap-2">
                            <WiredText text={targetTitle} bold />
                            <WiredSourceTypeSelector types={['furni', 'user', 'global', 'context']} value={target} onChange={next => { onTargetChange(next); onVariableTokenChange(''); }} />
                        </div>
                        <WiredVariablePicker entries={entries} recentScope={recentScope} selectedToken={variableToken} onSelect={entry => {
                            onOptionChange(WIRED_VALUE_OPTION_VARIABLE);
                            onVariableTokenChange(entry.token);
                            setText(entry.displayLabel);
                            setValid(true);
                            setOpen(false);
                        }} />
                    </div>
                )}
            </div>
        </WiredSection>
    );
};
