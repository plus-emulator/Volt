import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSlider } from '../WiredSlider';
import { WiredActionBaseView } from './WiredActionBaseView';

/**
 * OVERRIDE_HEIGHT (code 53), the official override-height editor. AIR: roomevents/wired_setup/actiontypes/class_4092.as
 * buildInputs L35 (type radio 0/1, height slider 0..8000 step 1 shown as the raw value), onChangeType L43 (slider disabled when type is 1),
 * readIntParamsFromForm L54 [height, type], onEditStart L48 (type read with getBoolean(1)). The editor has no source rows.
 * The official height title key wiredfurni.params.override_height.height is not in external_flash_texts.txt; the English here is a fallback.
 * Dossier: B/reviews/new-wireds-dossier-r88.json, code 53.
 */

const HEIGHT_MAX = 8000;

export const WiredActionOverrideHeightNativeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [height, setHeight] = useState(0);
    const [type, setType] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        setHeight(Math.min(HEIGHT_MAX, Math.max(0, trigger.intData?.[0] ?? 0)));
        setType(trigger.intData?.[1] === 1 ? 1 : 0);
    }, [trigger]);

    const save = () => {
        setIntParams([height, type]);
    };

    return (
        <WiredActionBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save}>
            <WiredSection title={localizeWithFallback('wiredfurni.params.override_height.type', 'Height:')}>
                <WiredRadioGroup
                    name="overrideHeightType"
                    options={[0, 1].map((value) => ({
                        id: value,
                        label: localizeWithFallback(
                            `wiredfurni.params.override_height.type.${value}`,
                            value === 0 ? 'Set this height' : 'Back to the stacking height'
                        )
                    }))}
                    value={type}
                    onChange={setType}
                />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.override_height.height', 'Height')}>
                <div className="flex items-center gap-2">
                    <WiredSlider disabled={type === 1} max={HEIGHT_MAX} min={0} step={1} value={height} onChange={setHeight} />
                    <span>{height}</span>
                </div>
            </WiredSection>
        </WiredActionBaseView>
    );
};
