import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredCollapsibleSection } from '../WiredCollapsibleSection';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSubVariableCreator } from '../WiredSubVariableCreator';
import { WiredText } from '../WiredText';
import { WiredTextArea } from '../WiredTextArea';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const l = (suffix: string, fallback: string) => localizeWithFallback(`wiredfurni.params.levelup.${suffix}`, fallback);
const subvariables = ['current_level', 'current_xp', 'progress', 'progress_percentage', 'xp_required', 'xp_remaining', 'is_maxed', 'max_level'];
const subvariableLabels = ['Current Level:', 'Current XP:', 'Level progress:', 'Level progress %:', 'Total XP required:', 'XP remaining:', 'Is maxed:', 'Max level:'];
const previewLevels = [1, 2, 3, 5, 10, 20];

// Keep the server's existing maximum-level bound; AIR permits 100000, Plus currently permits 10000.
const MAX_LEVEL = 10000;
const boundedMax = (value: number) => Math.min(MAX_LEVEL, Math.max(2, value));
const manualAnchors = (text: string) => {
    const anchors = new Map<number, number>([[1, 0]]);
    for (const line of text.split('\n')) {
        const match = line.trim().match(/^(\d+)\s*[=,]\s*(\d+)$/);
        if (match && Number(match[1]) > 0) anchors.set(Number(match[1]), Number(match[2]));
    }
    return [...anchors].sort((left, right) => left[0] - right[0]);
};

/** VariableLvlUpAddon: mode-specific drafts and native owned ints [mask, mode, ...mode fields]. */
export const WiredExtraVariableLevelUpSystemView: FC<{}> = () => {
    const { trigger, setIntParams, setStringParam } = useWired();
    const [mode, setMode] = useState(1);
    const [mask, setMask] = useState(3);
    const [step, setStep] = useState(100);
    const [linearMax, setLinearMax] = useState(50);
    const [firstXp, setFirstXp] = useState(100);
    const [factor, setFactor] = useState(20);
    const [exponentialMax, setExponentialMax] = useState(50);
    const [manual, setManual] = useState('');
    useEffect(() => {
        const ints = trigger?.intData ?? [];
        const nextMode = ints[1] === 0 ? 0 : ints[1] === 2 ? 2 : 1;
        setMode(nextMode); setMask((ints[0] ?? 3) & 255);
        setStep(nextMode === 1 ? (ints[2] ?? 100) : 100);
        setLinearMax(nextMode === 1 ? boundedMax(ints[3] ?? 50) : 50);
        setFirstXp(nextMode === 2 ? (ints[2] ?? 100) : 100);
        setFactor(nextMode === 2 ? (ints[3] ?? 20) : 20);
        setExponentialMax(nextMode === 2 ? boundedMax(ints[4] ?? 50) : 50);
        setManual(nextMode === 0 ? (trigger?.stringData ?? '').replace(/\r/g, '') : '');
    }, [trigger]);
    const save = () => {
        setIntParams(mode === 0 ? [mask, 0] : mode === 2 ? [mask, 2, firstXp, factor, boundedMax(exponentialMax)] : [mask, 1, step, boundedMax(linearMax)]);
        setStringParam(mode === 0 ? manual : '');
    };
    const namedNumber = (suffix: string, fallback: string, value: number, onChange: (value: number) => void, maximum = false, ariaSuffix = '') => <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <WiredText text={l(suffix, fallback)} />
        <WiredNumberInput ariaLabel={`${l(suffix, fallback)}${ariaSuffix}`} value={value} onChange={onChange} min={maximum ? 2 : 1} max={maximum ? MAX_LEVEL : 100000} width={maximum ? 20 : 35} />
    </label>;
    const anchors = manualAnchors(manual);
    const maxLevel = mode === 0 ? anchors[anchors.length - 1][0] : mode === 2 ? exponentialMax : linearMax;
    const xpForLevel = (level: number) => {
        if (level > maxLevel) return 'Unreachable level';
        let xp = 0;
        if (mode === 1) xp = (level - 1) * step;
        else if (mode === 2) {
            const strength = factor / 100;
            xp = strength === 0 ? firstXp * (level - 1) : Math.trunc(firstXp * ((Math.pow(1 + strength, level - 1) - 1 + 1e-9) / strength));
        } else if (level > 1) {
            const upperIndex = anchors.findIndex(([anchorLevel]) => anchorLevel >= level);
            const [upperLevel, upperXp] = anchors[upperIndex];
            const [lowerLevel, lowerXp] = anchors[Math.max(0, upperIndex - 1)];
            xp = level === upperLevel ? upperXp : lowerXp + Math.trunc((upperXp - lowerXp) / (upperLevel - lowerLevel) * (level - lowerLevel));
        }
        return xp > 9223372036854776000 ? 'Out of bounds' : String(xp);
    };
    return <WiredExtraBaseView nativeLayout hasSpecialInput requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
        <WiredCollapsibleSection defaultExpanded title={l('mode', 'Mode')}>
            <WiredRadioGroup name="level-up-mode" value={mode} onChange={setMode} options={[
                { id: 1, label: l('mode.1', 'Linear'), extra: <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {namedNumber('step_size', 'Step size:', step, setStep)}
                    {namedNumber('max_level', 'Max level:', linearMax, setLinearMax, true, ' Linear')}
                </div> },
                { id: 2, label: l('mode.2', 'Exponential'), extra: <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {namedNumber('first_level_xp', 'Base XP:', firstXp, setFirstXp)}
                    {namedNumber('increase_factor', 'Increase factor (%):', factor, setFactor)}
                    {namedNumber('max_level', 'Max level:', exponentialMax, setExponentialMax, true, ' Exponential')}
                </div> },
                { id: 0, label: l('mode.0', 'Manual'), extra: <WiredTextArea height={60} maxLength={1000} label={l('mode.0', 'Manual')} value={manual}
                    onChange={value => setManual(value.replace(/[^0-9=\n]/g, ''))} placeholder={l('interpolation_placeholder', '5=100\n10=500\n20=4000')} /> }
            ]} />
        </WiredCollapsibleSection>
        <WiredCollapsibleSection title={l('preview', 'Preview')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {previewLevels.map(level => <span key={level} data-testid="level-preview-row" style={{ display: 'flex', alignItems: 'baseline' }}>
                    {l('preview.entry', 'Level: %lvl% - XP: %xp%').split(/(%lvl%|%xp%)/).map((part, index) => <WiredText key={index}
                        text={part === '%lvl%' ? String(level) : part === '%xp%' ? xpForLevel(level) : part}
                        color={part === '%lvl%' || part === '%xp%' ? 7501076 : undefined} />)}
                </span>)}
            </div>
        </WiredCollapsibleSection>
        <WiredCollapsibleSection defaultExpanded title={localizeWithFallback('wiredfurni.params.create_subvariables', 'Create sub-variables:')}>
            <WiredSubVariableCreator mask={mask} onChange={setMask} options={subvariables.map((name, id) => ({ id, name, label: l(`subvariable.${id}`, subvariableLabels[id]) }))} />
        </WiredCollapsibleSection>
    </WiredExtraBaseView>;
};
