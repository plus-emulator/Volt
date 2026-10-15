import { FC, PropsWithChildren } from 'react';
import { LocalizeText } from '../../../../api';
import { useWiredNative } from '../WiredNativeContext';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WIRED_ADVANCED_SURFACE_COLOR, WiredSurfaceContext, WiredText } from '../WiredText';
import { WiredTextInput } from '../WiredTextInput';

export const typedPlaceholderName = (value: string) => value.replace(/[^a-zA-Z0-9_ ]/g, '').replace(/ /g, '_').toLowerCase().slice(0, 32);
export const flatPlaceholderVariableName = (name: string) => typedPlaceholderName(name.replace('@', '').replace('~', '').replace(/\./g, '_'));

/** AIR PlaceholderNameSection: 32-character field and selectable, two-line HTML preview at fontSize*3. */
export const WiredPlaceholderNameSection: FC<{ name: string; onChange: (value: string) => void; capturer?: boolean }> = ({ name, onChange, capturer = false }) => {
    const native = useWiredNative();
    const token = `${capturer ? '#' : '$'}(${name})`;
    const safe = token.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const preview = LocalizeText('wiredfurni.params.texts.placeholder_preview', ['placeholder'], [safe]).replace(/#ffffaa/gi, native ? '#727514' : '#ffffaa');
    return <WiredSection title={LocalizeText(`wiredfurni.params.texts.${capturer ? 'capturer' : 'placeholder'}_name`)}>
        <WiredTextInput value={name} onChange={value => onChange(typedPlaceholderName(value))} maxLength={32} />
        <div style={{ height: 36, marginTop: 5, font: '12px/14px Arial, sans-serif', userSelect: 'text', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: preview }} />
    </WiredSection>;
};

/** PlaceholderTypeSection: delimiter is an attached named input, 55px content +8px border, at most5 characters. */
export const WiredPlaceholderTypeSection: FC<{ name: string; multiple: boolean; onChange: (multiple: boolean) => void; delimiter: string; onDelimiter: (value: string) => void; kind?: 'user' | 'furni'; multipleDisabled?: boolean }> = ({ name, multiple, onChange, delimiter, onDelimiter, kind, multipleDisabled }) => <WiredSection title={LocalizeText('wiredfurni.params.texts.placeholder_type')}>
    <WiredRadioGroup name={name} value={multiple ? 1 : 0} onChange={value => onChange(value === 1)} options={[
        { id: 0, label: LocalizeText(`wiredfurni.params.texts.placeholder_type.${kind ? `${kind}.` : ''}1`) },
        { id: 1, label: LocalizeText(`wiredfurni.params.texts.placeholder_type.${kind ? `${kind}.` : ''}2`), disabled: multipleDisabled, extra: <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}><WiredText text={LocalizeText('wiredfurni.params.texts.select_delimiter')} /><WiredTextInput width={55} maxLength={5} disabled={!multiple || multipleDisabled} value={delimiter} onChange={onDelimiter} /></label> }
    ]} />
</WiredSection>;

export const WiredVariablePlaceholderModeSection: FC<{ input?: boolean; textual: boolean; canText: boolean; onChange: (textual: boolean) => void }> = ({ input, textual, canText, onChange }) => <WiredSection title={LocalizeText(`wiredfurni.params.texts.variable_${input ? 'input' : 'display'}_type`)}>
    <WiredRadioGroup name={`variable-${input ? 'input' : 'output'}-mode`} value={textual ? 1 : 0} onChange={value => onChange(value === 1)} options={[
        { id: 0, label: LocalizeText('wiredfurni.params.texts.variable_display_type.1') },
        { id: 1, label: LocalizeText('wiredfurni.params.texts.variable_display_type.2'), disabled: !canText, extra: <div style={{ opacity: 0.5 }}><WiredText wrap text={LocalizeText('wiredfurni.params.texts.variable_display_type.2.info')} /></div> }
    ]} />
</WiredSection>;

export const WiredTextAlwaysAdvanced: FC<PropsWithChildren> = ({ children }) => useWiredNative() ? <WiredSurfaceContext.Provider value={WIRED_ADVANCED_SURFACE_COLOR}><div className="volt-wired__native-advanced-body">{children}</div></WiredSurfaceContext.Provider> : <>{children}</>;
