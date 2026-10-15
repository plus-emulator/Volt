import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { WiredSliderSection } from '../WiredSlider';
import { useWired } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MIN_DURATION = 50;
const MAX_DURATION = 2000;
const STEP_DURATION = 50;
const DEFAULT_DURATION = 500;

const normalizeDuration = (value: number) => {
    if (isNaN(value)) return DEFAULT_DURATION;

    // AIR snaps a dragged thumb to 50ms, but preserves a typed millisecond value.
    return Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.trunc(value)));
};

export const WiredExtraAnimationTimeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [duration, setDuration] = useState(DEFAULT_DURATION);

    useEffect(() => {
        if (!trigger) return;

        setDuration(normalizeDuration(trigger.intData.length > 0 ? trigger.intData[0] : DEFAULT_DURATION));
    }, [trigger]);

    const save = () => {
        setIntParams([normalizeDuration(duration)]);
        setStringParam('');
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} nativeLayout requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSliderSection
                titleKey="wiredfurni.params.setanimationtime2"
                min={MIN_DURATION}
                max={MAX_DURATION}
                step={STEP_DURATION}
                value={duration}
                onChange={setDuration}
            />
        </WiredExtraBaseView>
    );
};
