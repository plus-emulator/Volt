import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType, WIRED_SLIDER_HUNDREDTH } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredCheckboxGroup, WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSliderSection } from '../WiredSlider';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorFurniAltitudeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, filter = false, setFilter = null, inverse = false, setInverse = null } = useWired();
    const [comparison, setComparison] = useState(1);
    const [altitude, setAltitude] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        // AIR FurniWithAltitude owns [height in hundredths, comparison].
        setAltitude(Math.min(8000, Math.max(0, trigger.intData[0] ?? 0)));
        setComparison(trigger.intData[1] ?? 1);
    }, [trigger]);

    // Filter and inverse remain category fields, not owned ints.
    const save = useCallback(() => setIntParams([altitude, comparison]), [altitude, comparison, setIntParams]);

    return (
        <WiredSelectorBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            hideDelay={true}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.comparison_selection')}>
                <WiredRadioGroup
                    name="furniAltitudeComparison"
                    options={[0, 1, 2].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.comparison.${id}`) }))}
                    value={comparison}
                    onChange={setComparison}
                />
            </WiredSection>
            <WiredSliderSection converter={WIRED_SLIDER_HUNDREDTH} min={0} max={8000} step={1} titleKey="wiredfurni.params.setaltitude" value={altitude} onChange={setAltitude} />
            <WiredSection title={LocalizeText('wiredfurni.params.selector_options_selector')}>
                <WiredCheckboxGroup>
                    <WiredCheckboxOption checked={filter} label={LocalizeText('wiredfurni.params.selector_option.0')} onChange={setFilter} />
                    <WiredCheckboxOption checked={inverse} label={LocalizeText('wiredfurni.params.selector_option.1')} last={true} onChange={setInverse} />
                </WiredCheckboxGroup>
            </WiredSection>
        </WiredSelectorBaseView>
    );
};
