import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { WiredCheckboxGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionSetFurniStateToView: FC<{}> = (props) => {
    const [stateFlag, setStateFlag] = useState(0);
    const [directionFlag, setDirectionFlag] = useState(0);
    const [positionFlag, setPositionFlag] = useState(0);
    const [altitudeFlag, setAltitudeFlag] = useState(0);
    const { trigger = null, setIntParams = null, setFurniSources } = useWired();
    const [furniSource, setFurniSource] = useState(100);

    const save = () => {
        setIntParams([stateFlag, directionFlag, positionFlag, altitudeFlag]);
        setFurniSources([furniSource]);
    };

    useEffect(() => {
        setStateFlag(trigger.getBoolean(0) ? 1 : 0);
        setDirectionFlag(trigger.getBoolean(1) ? 1 : 0);
        setPositionFlag(trigger.getBoolean(2) ? 1 : 0);
        setAltitudeFlag(trigger.getBoolean(3) ? 1 : 0);

        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.conditions')}>
                <WiredCheckboxGroup>{[
                    { key: 'state', value: stateFlag, update: setStateFlag },
                    { key: 'direction', value: directionFlag, update: setDirectionFlag },
                    { key: 'position', value: positionFlag, update: setPositionFlag },
                    { key: 'altitude', value: altitudeFlag, update: setAltitudeFlag }
                ].map(({ key, value, update }, index) => <WiredCheckboxOption key={key} last={index === 3} checked={!!value}
                    label={LocalizeText(`wiredfurni.params.condition.${key}`)} onChange={checked => update(checked ? 1 : 0)} />)}</WiredCheckboxGroup>
            </WiredSection>
        </WiredActionBaseView>
    );
};
