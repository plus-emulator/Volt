import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredDirectionIcon } from '../WiredDirectionIcon';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredCheckboxOption, WiredQuantifierSection } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const toggleDirection = (mask: number, direction: number, checked: boolean) => {
    if (checked) return mask | (1 << direction);

    return mask & ~(1 << direction);
};

export const WiredConditionActorDirView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setUserSources, quantifier: nativeQuantifier, setQuantifier: setNativeQuantifier } = useWired();
    const [directionMask, setDirectionMask] = useState(0);
    const [userSource, setUserSource] = useState(0);
    const [quantifier, setQuantifier] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        const nextDirectionMask = trigger.intData.length > 0 ? trigger.intData[0] : 0;
        const nextUserSource = trigger.userSources[0] ?? 0;
        const nextQuantifier = nativeQuantifier;

        setDirectionMask(nextDirectionMask);
        setUserSource(nextUserSource);
        setQuantifier(nextQuantifier === 1 ? 1 : 0);
    }, [trigger, nativeQuantifier]);

    const save = () => {
        setIntParams([directionMask]);
        setUserSources([userSource]);
        setNativeQuantifier(quantifier);
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<>
                <WiredQuantifierSection name="actorDirQuantifier" kind="users" value={quantifier} onChange={setQuantifier} />
                <WiredSourcesSelector showUsers userSource={userSource} onChangeUsers={setUserSource} />
            </>}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.direction_selection')}>
                <div className="volt-wired__options volt-wired__options--checkbox" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    {Array.from({ length: 8 }, (_, direction) => <WiredCheckboxOption key={direction} last={direction >= 4} checked={(directionMask & (1 << direction)) !== 0} label={<span aria-label={`Direction ${direction}`}><WiredDirectionIcon direction={direction} selected={(directionMask & (1 << direction)) !== 0} /></span>} onChange={checked => setDirectionMask(mask => toggleDirection(mask, direction, checked))} />)}
                </div>
            </WiredSection>
        </WiredConditionBaseView>
    );
};
