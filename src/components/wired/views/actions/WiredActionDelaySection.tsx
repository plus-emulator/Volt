import { FC, useEffect, useRef, useState } from 'react';
import { localizeWithFallback, WIRED_SLIDER_PRECISE_DELAY, WIRED_SLIDER_PULSES } from '../../../../api';
import delayPreciseIcon from '../../../../assets/images/wired/native/delay_precise.png';
import delayStandardIcon from '../../../../assets/images/wired/native/delay_standard.png';
import { HabboDropMenuHandle, HabboDropMenuView } from '../../../../common/dropmenu/HabboDropMenuView';
import { WiredMiniIconButton } from '../WiredFurniPickButton';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredSection } from '../WiredSection';
import { WiredSlider } from '../WiredSlider';

/**
 * AIR ActionDelaySection (uibuilder/presets/sections/ActionDelaySection.as, build WIN63-202610131318-860371703):
 * "Delay (seconds):" with a 40px number input beside the title, a mini icon button at the right that opens the
 * Standard/Precise menu, and one slider per mode under it. Standard counts 500 ms pulses, Precise 50 ms steps.
 */
const STANDARD_MAX = 120;
const PRECISE_MAX = 1200;
const PRECISE_STEP_MS = 50;
const DELAY_INPUT_WIDTH = 40;
const MODE_DROPDOWN_WIDTH = 90;
const MINI_BUTTON_SIZE = 19;

interface WiredActionDelaySectionProps {
    /** The delay as the wire carries it: pulses when >= 0, minus the milliseconds in precise mode. */
    value: number;
    onChange: (encoded: number) => void;
    className?: string;
}

const encode = (precise: boolean, standardValue: number, preciseValue: number) => (precise ? -(preciseValue * PRECISE_STEP_MS) : standardValue);

/** MiniIconDropdownPreset: the dropdown stays hidden under the button's right edge and only its list is shown. */
const WiredDelayModeButton: FC<{ precise: boolean; onChange: (precise: boolean) => void }> = ({ precise, onChange }) => {
    const menuRef = useRef<HabboDropMenuHandle>(null);

    return (
        <div style={{ position: 'relative', width: MINI_BUTTON_SIZE, height: MINI_BUTTON_SIZE }}>
            <WiredMiniIconButton
                icon={precise ? delayPreciseIcon : delayStandardIcon}
                label={localizeWithFallback(precise ? 'wiredfurni.params.delay.mode.precise' : 'wiredfurni.params.delay.mode.standard', precise ? 'Precise (per 0.05s)' : 'Standard (per 0.5s)')}
                onClick={() => menuRef.current?.open()}
            />
            <HabboDropMenuView<number>
                menuRef={menuRef}
                skinStyle={100}
                label=""
                className="volt-wired__delay-mode-menu"
                style={{ position: 'absolute', left: MINI_BUTTON_SIZE - MODE_DROPDOWN_WIDTH, top: MINI_BUTTON_SIZE, width: MODE_DROPDOWN_WIDTH, visibility: 'hidden' }}
                value={precise ? 1 : 0}
                options={[
                    { value: 0, label: localizeWithFallback('wiredfurni.params.delay.mode.standard', 'Standard (per 0.5s)') },
                    { value: 1, label: localizeWithFallback('wiredfurni.params.delay.mode.precise', 'Precise (per 0.05s)') }
                ]}
                onSelect={(mode) => onChange(mode === 1)}
            />
        </div>
    );
};

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

    const change = (next: number) => {
        if (precise) {
            setPreciseValue(next);
            onChange(encode(true, standardValue, next));
            return;
        }

        setStandardValue(next);
        onChange(encode(false, next, preciseValue));
    };

    const converter = precise ? WIRED_SLIDER_PRECISE_DELAY : WIRED_SLIDER_PULSES;
    const max = precise ? PRECISE_MAX : STANDARD_MAX;
    const active = precise ? preciseValue : standardValue;
    const title = localizeWithFallback('wiredfurni.params.delay.seconds', 'Delay (seconds):');

    return (
        <WiredSection
            className={className}
            title={title}
            // SectionParam.titleYOffset = WiredStyle.namedInputOffset: the title sits level with the input text.
            titleOffset={2}
            headerOption={
                <WiredNumberInput
                    key={precise ? 'precise' : 'standard'}
                    ariaLabel={title}
                    endsWithFive={converter.endsWithFive}
                    max={max}
                    min={0}
                    precision={converter.precision}
                    value={active}
                    width={DELAY_INPUT_WIDTH}
                    onChange={change}
                />
            }
            headerOptionsRight={<WiredDelayModeButton precise={precise} onChange={changeMode} />}
        >
            <WiredSlider key={precise ? 'precise' : 'standard'} max={max} min={0} value={active} onChange={change} />
        </WiredSection>
    );
};
