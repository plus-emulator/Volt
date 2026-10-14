import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSlider } from '../WiredSlider';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import move0 from '../../../../assets/images/wired/native/move_0.png';
import move2 from '../../../../assets/images/wired/native/move_2.png';
import move4 from '../../../../assets/images/wired/native/move_4.png';
import move6 from '../../../../assets/images/wired/native/move_6.png';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const MAX_DISTANCE = 20;

// AIR class_4082: positive axis first (move_2 / move_4), then negative (move_6 / move_0).
const HORIZONTAL_OPTIONS = [
    { id: 1, label: <img src={move2} alt="+X" /> },
    { id: 0, label: <img src={move6} alt="−X" /> }
];
const VERTICAL_OPTIONS = [
    { id: 1, label: <img src={move4} alt="+Y" /> },
    { id: 0, label: <img src={move0} alt="−Y" /> }
];

export const WiredActionRelativeMoveView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources } = useWired();

    const [horizontalDirection, setHorizontalDirection] = useState(1);
    const [horizontalDistance, setHorizontalDistance] = useState(0);
    const [verticalDirection, setVerticalDirection] = useState(1);
    const [verticalDistance, setVerticalDistance] = useState(0);
    const [furniSource, setFurniSource] = useState(100);

    useEffect(() => {
        if (!trigger) return;

        setHorizontalDirection((trigger.intData[0] ?? 0) < 0 ? 0 : 1);
        setHorizontalDistance(Math.abs(trigger.intData[0] ?? 0));
        setVerticalDirection((trigger.intData[1] ?? 0) < 0 ? 0 : 1);
        setVerticalDistance(Math.abs(trigger.intData[1] ?? 0));

        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    const save = () => {
        setIntParams([horizontalDistance * (horizontalDirection === 0 ? -1 : 1), verticalDistance * (verticalDirection === 0 ? -1 : 1)]);
        setFurniSources([furniSource]);
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.movement.horizontal.selection')}>
                <WiredRadioGroup name="relativeMoveHorizontal" columns={4} options={HORIZONTAL_OPTIONS} value={horizontalDirection} onChange={setHorizontalDirection} />
                <WiredText text={LocalizeText('wiredfurni.params.movement.horizontal.distance', ['distance'], [horizontalDistance.toString()])} />
                <WiredSlider max={MAX_DISTANCE} min={0} step={1} value={horizontalDistance} onChange={setHorizontalDistance} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.movement.vertical.selection')}>
                <WiredRadioGroup name="relativeMoveVertical" columns={4} options={VERTICAL_OPTIONS} value={verticalDirection} onChange={setVerticalDirection} />
                <WiredText text={LocalizeText('wiredfurni.params.movement.vertical.distance', ['distance'], [verticalDistance.toString()])} />
                <WiredSlider max={MAX_DISTANCE} min={0} step={1} value={verticalDistance} onChange={setVerticalDistance} />
            </WiredSection>
        </WiredActionBaseView>
    );
};
