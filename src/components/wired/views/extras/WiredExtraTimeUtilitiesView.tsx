import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredCollapsibleSection } from '../WiredCollapsibleSection';
import { WiredDropdown } from '../WiredDropdown';
import { WiredSection } from '../WiredSection';
import { WiredSubVariableCreator } from '../WiredSubVariableCreator';
import { WiredText } from '../WiredText';
import {
    ITimeUtilSubVariable,
    normalizeTimeUtilMask,
    normalizeTimeUtilMode,
    TIME_UTIL_ADVANCED_SUB_VARIABLES,
    TIME_UTIL_MODE_VALUE,
    TIME_UTIL_MODES,
    TIME_UTIL_SUB_VARIABLES
} from './timeUtilitiesParams';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MODE_FALLBACKS = ['Variable value', 'Creation time', 'Last update time'];
const SUB_VARIABLE_KEY = 'wiredfurni.params.time_util.subvariable.';

export const WiredExtraTimeUtilitiesView: FC<{}> = () => {
    const { trigger = null, nativeCatalog = null, setIntParams = null, setStringParam = null } = useWired();
    const [mask, setMask] = useState(0);
    const [mode, setMode] = useState(TIME_UTIL_MODE_VALUE);
    useEffect(() => {
        const intData = trigger?.intData ?? [];
        setMask(normalizeTimeUtilMask(intData[0] ?? 0));
        setMode(normalizeTimeUtilMode(intData[1] ?? TIME_UTIL_MODE_VALUE));
    }, [trigger]);
    const save = () => {
        setIntParams([normalizeTimeUtilMask(mask), normalizeTimeUtilMode(mode)]);
        setStringParam('');
    };
    const renderSubVariables = (subVariables: ITimeUtilSubVariable[]) => <WiredSubVariableCreator mask={mask} onChange={setMask}
        options={subVariables.map(option => ({ ...option, label: localizeWithFallback(`${SUB_VARIABLE_KEY}${option.id}`, option.label) }))} />;
    const variables = [...(nativeCatalog?.rows.values() ?? [])].map(entry => entry.variable);
    // AIR preserves a saved mode even when the current catalog has no variable with that capability.
    const savedMode = normalizeTimeUtilMode(trigger?.intData[1] ?? TIME_UTIL_MODE_VALUE);
    const modes = TIME_UTIL_MODES.filter(id => id === savedMode || !variables.length || variables.some(variable => id === 0 ? variable.hasValue : id === 1 ? variable.canReadCreationTime : variable.canReadLastUpdateTime));
    return <WiredExtraBaseView nativeLayout hasSpecialInput requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
        <WiredSection title={localizeWithFallback('wiredfurni.params.choose_type', 'Read the variable as:')}>
            <WiredDropdown caption={localizeWithFallback('wiredfurni.params.choose_type', 'Read the variable as:')}
                options={modes.map(id => ({ id, label: localizeWithFallback(`wiredfurni.params.time_util.mode.${id}`, MODE_FALLBACKS[id]) }))} value={mode} onChange={setMode} />
        </WiredSection>
        <WiredCollapsibleSection defaultExpanded title={localizeWithFallback('wiredfurni.params.create_subvariables', 'Create sub-variables:')}>
            {renderSubVariables(TIME_UTIL_SUB_VARIABLES)}
        </WiredCollapsibleSection>
        <WiredCollapsibleSection title={localizeWithFallback('wiredfurni.params.create_subvariables.advanced', 'Advanced sub-variables:')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <WiredText wrap text={localizeWithFallback('wiredfurni.params.time_util.advanced_info', 'These sub-variables count from 1970. Use them to compare how many time units lie between two timestamps.')} />
                {renderSubVariables(TIME_UTIL_ADVANCED_SUB_VARIABLES)}
            </div>
        </WiredCollapsibleSection>
    </WiredExtraBaseView>;
};
