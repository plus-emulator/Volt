import { WiredActionDefinition } from '@octane/renderer';
import { CSSProperties, FC, PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { GetWiredTimeLocale, LocalizeText, localizeWithFallback, WiredFurniType, WIRED_SLIDER_PRECISE_DELAY, WIRED_SLIDER_PULSES } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSlider';
import { WiredBaseView } from '../WiredBaseView';
import { WiredDropdown } from '../WiredDropdown';

// ActionDelaySection: standard delays are 0 to 120 pulses; precise ones 0 to 1200 steps of 50 ms, saved as minus the milliseconds.
const STANDARD_DELAY_MAX = 120;
const PRECISE_DELAY_MAX = 1200;
const PRECISE_DELAY_STEP_MS = 50;

export interface WiredActionBaseViewProps {
    hasSpecialInput: boolean;
    requiresFurni: number;
    save: () => void;
    validate?: () => boolean;
    cardStyle?: CSSProperties;
    hideDelay?: boolean;
    footer?: ReactNode;
    footerCollapsible?: boolean;
    selectionPreview?: ReactNode;
    nativeLayout?: boolean;
}

export const WiredActionBaseView: FC<PropsWithChildren<WiredActionBaseViewProps>> = (props) => {
    const {
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        validate = null,
        hasSpecialInput = false,
        children = null,
        cardStyle = undefined,
        hideDelay = false,
        footer = null,
        footerCollapsible = true,
        selectionPreview = null,
        nativeLayout = false
    } = props;
    const { trigger = null, actionDelay = 0, setActionDelay = null } = useWired();
    const [preciseDelay, setPreciseDelay] = useState(false);

    useEffect(() => {
        const delay = (trigger as WiredActionDefinition).delayInPulses;

        setPreciseDelay(delay < 0);
        setActionDelay(delay);
    }, [trigger, setActionDelay]);

    const delaySteps = preciseDelay ? Math.round(-actionDelay / PRECISE_DELAY_STEP_MS) : Math.max(0, actionDelay);
    const setDelaySteps = (steps: number) => setActionDelay(preciseDelay ? -(steps * PRECISE_DELAY_STEP_MS) : steps);
    const changeDelayMode = (mode: number) =>
    {
        setPreciseDelay(mode === 1);
        setActionDelay(0);
    };
    const delayMode = (
        <WiredDropdown
            options={[
                { id: 0, label: localizeWithFallback('wiredfurni.params.delay.mode.standard', 'Standard') },
                { id: 1, label: localizeWithFallback('wiredfurni.params.delay.mode.precise', 'Precise') }
            ]}
            value={preciseDelay ? 1 : 0}
            onChange={changeDelayMode}
        />
    );

    return (
        <WiredBaseView
            hasSpecialInput={hasSpecialInput}
            requiresFurni={requiresFurni}
            save={save}
            validate={validate}
            wiredType="action"
            cardStyle={cardStyle}
            footer={footer}
            footerCollapsible={footerCollapsible}
            selectionPreview={selectionPreview}
            nativeLayout={nativeLayout}
            delay={
                !hideDelay && (
                    <WiredSliderSection
                        className="octane-wired__section--delay"
                        converter={preciseDelay ? WIRED_SLIDER_PRECISE_DELAY : WIRED_SLIDER_PULSES}
                        headerOptionsRight={delayMode}
                        max={preciseDelay ? PRECISE_DELAY_MAX : STANDARD_DELAY_MAX}
                        min={0}
                        titleKey="wiredfurni.params.delay"
                        unit="seconds"
                        value={delaySteps}
                        withInput={false}
                        onChange={setDelaySteps}
                    />
                )
            }
            legacyDelay={
                !hideDelay && (
                    <>
                        {!!children && <div className="octane-wired__divider" />}
                        <div className="flex flex-col octane-wired__section octane-wired__section--delay">
                            <Text bold>{LocalizeText('wiredfurni.params.delay', ['seconds'], [preciseDelay ? WIRED_SLIDER_PRECISE_DELAY.toString(delaySteps) : GetWiredTimeLocale(delaySteps)])}</Text>
                            {delayMode}
                            <Slider max={preciseDelay ? PRECISE_DELAY_MAX : STANDARD_DELAY_MAX} min={0} value={delaySteps} onChange={(event) => setDelaySteps(event as number)} />
                        </div>
                    </>
                )
            }
        >
            {children}
        </WiredBaseView>
    );
};
