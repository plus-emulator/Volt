import { FC, useState } from 'react';
import { localizeWithFallback, resolveWiredStyle, wiredStyleClassName } from '../../../../api';
import { VoltCardView } from '../../../../common';
import { useWiredTools } from '../../../../hooks';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { flattenWiredVariablePickerEntries, IWiredVariablePickerEntry } from '../WiredVariablePickerData';
import { WiredCheckboxOption } from '../WiredOptions';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredText } from '../WiredText';
import { WiredNativeContext } from '../WiredNativeContext';
import { WiredShellButton, WiredShellHeaderView } from '../WiredShellHeaderView';

interface Props {
    entries: IWiredVariablePickerEntry[];
    initialToken: string;
    initialMatchValue: boolean;
    initialValue: number;
    onClose: () => void;
    onSave: (token: string, matchValue: boolean, value: number) => void;
}

/** VariableFxAudienceVariablePopup: changes are local until Save, never applied by Cancel. */
export const WiredVariableFxAudienceView: FC<Props> = ({ entries, initialToken, initialMatchValue, initialValue, onClose, onSave }) => {
    const [token, setToken] = useState(initialToken);
    const [matchValue, setMatchValue] = useState(initialMatchValue);
    const [value, setValue] = useState(initialValue);
    const { activeWiredStyle } = useWiredTools();
    const shellStyle = resolveWiredStyle(activeWiredStyle);
    const selected = flattenWiredVariablePickerEntries(entries).find(entry => entry.token === token && entry.selectable);
    const hasValue = !!selected?.hasValue;
    const title = localizeWithFallback('wiredfurni.params.variablefx.audience_popup.title', 'Variable audience');

    return (
        <WiredNativeContext.Provider value={shellStyle === 'illumina'}>
            <VoltCardView className={`volt-wired volt-wired--official ${wiredStyleClassName(shellStyle)} volt-wired-fx-audience`} theme="primary-slim" isResizable={false} style={{ width: 300, minWidth: 300, maxWidth: 300 }}>
                <div role="dialog" aria-label={title}>
                    <WiredShellHeaderView shellStyle={shellStyle} title={title} onClose={onClose} menuItems={[]} showMenu={false} />
                    <div className="volt-wired-fx-audience__body">
                        <WiredVariablePicker entries={entries} recentScope="variable-fx-audience" selectedToken={token} onSelect={entry => { setToken(entry.token); if (!entry.hasValue) setMatchValue(false); }} />
                        <WiredCheckboxOption label={localizeWithFallback('wiredfurni.params.variablefx.audience_popup.select_value', 'Select a value')} checked={hasValue && matchValue} disabled={!hasValue} onChange={setMatchValue} />
                        <div className="volt-wired-fx-editor__named-row">
                            <WiredText text={localizeWithFallback('wiredfurni.params.variablefx.audience_popup.value', 'Value')} />
                            <WiredNumberInput ariaLabel="Audience value" width={45} min={-2147483648} max={2147483647} value={value} disabled={!hasValue || !matchValue} onChange={setValue} />
                        </div>
                    </div>
                    <div className="volt-wired__button-row volt-wired-fx-audience__actions">
                        <WiredShellButton shellStyle={shellStyle} disabled={!selected} onClick={() => selected && onSave(token, hasValue && matchValue, value)}>{localizeWithFallback('wiredfurni.params.variablefx.audience_popup.save', 'Save')}</WiredShellButton>
                        <WiredShellButton shellStyle={shellStyle} onClick={onClose}>{localizeWithFallback('cancel', 'Cancel')}</WiredShellButton>
                    </div>
                </div>
            </VoltCardView>
        </WiredNativeContext.Provider>
    );
};
