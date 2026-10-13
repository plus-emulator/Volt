import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WIRED_SLIDER_PRECISE_DELAY, WIRED_SLIDER_PULSES } from '../../../../api';
import { WiredSliderSection } from '../WiredSlider';

/** ActionDelaySection limits: the standard slider counts 500 ms pulses, the precise one 50 ms steps. */
const STANDARD_MAX = 120;
const PRECISE_MAX = 1200;
const PRECISE_STEP_MS = 50;

interface WiredActionDelaySectionProps {
    /** The delay as the wire carries it: pulses when >= 0, minus the milliseconds in precise mode. */
    value: number;
    onChange: (encoded: number) => void;
    className?: string;
}

const encode = (precise: boolean, standardValue: number, preciseValue: number) => (precise ? -(preciseValue * PRECISE_STEP_MS) : standardValue);

export const WiredActionDelaySection: FC<WiredActionDelaySectionProps> = ({ value, onChange, className }) => {
    const [precise, setPrecise] = useState(value < 0);
    const [standardValue, setStandardValue] = useState(value < 0 ? 0 : value);
    const [preciseValue, setPreciseValue] = useState(value < 0 ? Math.abs(value) / PRECISE_STEP_MS : 0);

    // A newly opened box (or a paste) brings its own encoded delay; adopt it when it is not what is shown already.
    useEffect(() => {
        if (value === encode(precise, standardValue, preciseValue)) return;

        setPrecise(value < 0);
        setStandardValue(value < 0 ? 0 : value);
        setPreciseValue(value < 0 ? Math.abs(value) / PRECISE_STEP_MS : 0);
    }, [value]);

    const changeMode = (nextPrecise: boolean) => {
        setPrecise(nextPrecise);
        onChange(encode(nextPrecise, standardValue, preciseValue));
    };

    const modeSelect = (
        <select
            aria-label={localizeWithFallback('wiredfurni.params.delay.mode.title', 'Delay mode')}
            className="form-select form-select-sm"
            style={{ width: 90 }}
            value={precise ? 1 : 0}
            onChange={(event) => changeMode(event.target.value === '1')}
        >
            <option value={0}>{localizeWithFallback('wiredfurni.params.delay.mode.standard', 'Standard')}</option>
            <option value={1}>{localizeWithFallback('wiredfurni.params.delay.mode.precise', 'Precise')}</option>
        </select>
    );

    return precise ? (
        <WiredSliderSection
            className={className}
            converter={WIRED_SLIDER_PRECISE_DELAY}
            headerOptionsRight={modeSelect}
            max={PRECISE_MAX}
            min={0}
            titleKey="wiredfurni.params.delay"
            unit="seconds"
            value={preciseValue}
            withInput={false}
            onChange={(next) => {
                setPreciseValue(next);
                onChange(encode(true, standardValue, next));
            }}
        />
    ) : (
        <WiredSliderSection
            className={className}
            converter={WIRED_SLIDER_PULSES}
            headerOptionsRight={modeSelect}
            max={STANDARD_MAX}
            min={0}
            titleKey="wiredfurni.params.delay"
            unit="seconds"
            value={standardValue}
            withInput={false}
            onChange={(next) => {
                setStandardValue(next);
                onChange(encode(false, next, preciseValue));
            }}
        />
    );
};
