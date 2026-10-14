import { FC, useEffect, useState } from 'react';
import { WiredFurniType, WIRED_SLIDER_PULSES } from '../../../../api';
import { WiredSliderSection } from '../WiredSlider';
import { useWired } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MIN_EXECUTIONS = 1;
const MAX_EXECUTIONS = 100;
const DEFAULT_EXECUTIONS = 1;
/** The window is counted in pulses; one pulse is half a second. */
const MIN_PULSES = 1;
const MAX_PULSES = 20;
const DEFAULT_PULSES = 2;

const normalizeExecutions = (value: number) => {
    if (isNaN(value)) return DEFAULT_EXECUTIONS;

    return Math.max(MIN_EXECUTIONS, Math.min(MAX_EXECUTIONS, Math.round(value)));
};

const normalizePulses = (value: number) => {
    if (isNaN(value)) return DEFAULT_PULSES;

    return Math.max(MIN_PULSES, Math.min(MAX_PULSES, Math.round(value)));
};

export const WiredExtraExecutionLimitView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [executions, setExecutions] = useState(DEFAULT_EXECUTIONS);
    const [pulses, setPulses] = useState(DEFAULT_PULSES);

    useEffect(() => {
        if (!trigger) return;

        // owned: [executions per window, window in pulses].
        setExecutions(normalizeExecutions(trigger.intData.length > 0 ? trigger.intData[0] : DEFAULT_EXECUTIONS));
        setPulses(normalizePulses(trigger.intData.length > 1 ? trigger.intData[1] : DEFAULT_PULSES));
    }, [trigger]);

    const save = () => {
        setIntParams([normalizeExecutions(executions), normalizePulses(pulses)]);
        setStringParam('');
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSliderSection titleKey="wiredfurni.params.setexecutions" unit="amount" min={MIN_EXECUTIONS} max={MAX_EXECUTIONS} step={1} withInput={false} value={executions} onChange={setExecutions} />
            <WiredSliderSection titleKey="wiredfurni.params.settimewindow" unit="timewindow" converter={WIRED_SLIDER_PULSES} min={MIN_PULSES} max={MAX_PULSES} step={1} withInput={false} value={pulses} onChange={setPulses} />
        </WiredExtraBaseView>
    );
};
