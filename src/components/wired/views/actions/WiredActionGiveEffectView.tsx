import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredActionBaseView } from './WiredActionBaseView';

/**
 * GIVE_EFFECT (code 52), the official give-effect editor. AIR: roomevents/wired_setup/actiontypes/class_3931.as
 * buildInputs L38 (id 0..10000, priority 0..2, type radio), readIntParamsFromForm L56 [id, priority, type],
 * onEditStart L49 (the type is read back with getBoolean(2), so 1 means the second choice).
 * The official text keys wiredfurni.params.give_effect.* are not in external_flash_texts.txt; the English here is a fallback.
 * Dossier: B/reviews/new-wireds-dossier-r88.json, code 52.
 */

const ID_MAX = 10000;
const PRIORITY_MAX = 2;

export const WiredActionGiveEffectView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [effectId, setEffectId] = useState(0);
    const [priority, setPriority] = useState(0);
    const [type, setType] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        setEffectId(Math.min(ID_MAX, Math.max(0, trigger.intData?.[0] ?? 0)));
        setPriority(Math.min(PRIORITY_MAX, Math.max(0, trigger.intData?.[1] ?? 0)));
        setType(trigger.intData?.[2] === 1 ? 1 : 0);
    }, [trigger]);

    const save = () => {
        setIntParams([effectId, priority, type]);
    };

    return (
        <WiredActionBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSection title={localizeWithFallback('wiredfurni.params.give_effect.id', 'Effect ID:')}>
                <WiredNumberInput min={0} max={ID_MAX} value={effectId} onChange={setEffectId} />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.give_effect.priority', 'Priority:')}>
                <WiredNumberInput min={0} max={PRIORITY_MAX} value={priority} onChange={setPriority} />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.give_effect.type', 'Type:')}>
                <WiredRadioGroup
                    name="giveEffectType"
                    options={[0, 1].map((value) => ({
                        id: value,
                        label: localizeWithFallback(`wiredfurni.params.give_effect.type.${value}`, `Type ${value}`)
                    }))}
                    value={type}
                    onChange={setType}
                />
            </WiredSection>
        </WiredActionBaseView>
    );
};
