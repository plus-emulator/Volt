import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { WiredQuantifierSection } from '../WiredOptions';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

interface WiredConditionActorIsOnFurniViewProps {
    negative?: boolean;
}

export const WiredConditionActorIsOnFurniView: FC<WiredConditionActorIsOnFurniViewProps> = ({ negative = false }) => {
    const {
        trigger = null,
        setIntParams = null,
        setFurniSources,
        setUserSources,
        quantifier: nativeQuantifier,
        setQuantifier: setNativeQuantifier
    } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => {
        return trigger?.furniSources[0] ?? 100;
    });
    const [userSource, setUserSource] = useState<number>(() => {
        return trigger?.userSources[0] ?? 0;
    });
    const [quantifier, setQuantifier] = useState<number>(() => {
        return nativeQuantifier;
    });

    useEffect(() => {
        if (!trigger) return;
        setFurniSource(trigger.furniSources[0] ?? 100);
        setUserSource(trigger.userSources[0] ?? 0);
        setQuantifier(nativeQuantifier);
    }, [trigger, nativeQuantifier]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () => {
        setIntParams([]);
        setFurniSources([furniSource]);
        setUserSources([userSource]);
        setNativeQuantifier(quantifier);
    };

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={
                <div className="flex flex-col gap-2">
                    <WiredQuantifierSection kind="users" name="triggerOnFurniQuantifier" negative={negative} value={quantifier} onChange={setQuantifier} />
                    <WiredSourcesSelector
                        showFurni={true}
                        showUsers={true}
                        furniSource={furniSource}
                        userSource={userSource}
                        onChangeFurni={onChangeFurniSource}
                        onChangeUsers={setUserSource}
                    />
                </div>
            }
        />
    );
};
