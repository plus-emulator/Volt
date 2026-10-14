import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { WiredSection } from '../WiredSection';
import { WiredCheckboxGroup, WiredCheckboxOption, WiredQuantifierSection } from '../WiredOptions';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

interface WiredConditionFurniMatchesSnapshotViewProps {
    negative?: boolean;
}

export const WiredConditionFurniMatchesSnapshotView: FC<WiredConditionFurniMatchesSnapshotViewProps> = ({ negative = false }) => {
    const [stateFlag, setStateFlag] = useState(0);
    const [directionFlag, setDirectionFlag] = useState(0);
    const [positionFlag, setPositionFlag] = useState(0);
    const [altitudeFlag, setAltitudeFlag] = useState(0);
    const [quantifier, setQuantifier] = useState(0);
    const { trigger = null, setIntParams = null, setFurniSources, quantifier: nativeQuantifier, setQuantifier: setNativeQuantifier } = useWired();
    const [furniSource, setFurniSource] = useState(100);

    const save = () => {
        setIntParams([stateFlag, directionFlag, positionFlag, altitudeFlag]);
        setFurniSources([furniSource]);
        setNativeQuantifier(quantifier);
    };

    useEffect(() => {
        setStateFlag(trigger.getBoolean(0) ? 1 : 0);
        setDirectionFlag(trigger.getBoolean(1) ? 1 : 0);
        setPositionFlag(trigger.getBoolean(2) ? 1 : 0);
        setAltitudeFlag(trigger.getBoolean(3) ? 1 : 0);
        setFurniSource(trigger.furniSources[0] ?? 100);
        setQuantifier(nativeQuantifier);
    }, [trigger, nativeQuantifier]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredConditionBaseView
            nativeLayout
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={
                <div className="flex flex-col gap-2">
                    <WiredQuantifierSection name="snapshotQuantifier" kind="furni" negative={negative} value={quantifier} onChange={setQuantifier} />
                    <WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />
                </div>
            }
        >
            <WiredSection title={LocalizeText('wiredfurni.params.conditions')}>
                <WiredCheckboxGroup>
                    <WiredCheckboxOption checked={!!stateFlag} onChange={value => setStateFlag(value ? 1 : 0)} label={LocalizeText('wiredfurni.params.condition.state')} />
                    <WiredCheckboxOption checked={!!directionFlag} onChange={value => setDirectionFlag(value ? 1 : 0)} label={LocalizeText('wiredfurni.params.condition.direction')} />
                    <WiredCheckboxOption checked={!!positionFlag} onChange={value => setPositionFlag(value ? 1 : 0)} label={LocalizeText('wiredfurni.params.condition.position')} />
                    <WiredCheckboxOption checked={!!altitudeFlag} onChange={value => setAltitudeFlag(value ? 1 : 0)} label={LocalizeText('wiredfurni.params.condition.altitude')} last />
                </WiredCheckboxGroup>
            </WiredSection>
        </WiredConditionBaseView>
    );
};
