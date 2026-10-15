import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WIRED_DIRECTION_GRID, WiredDirectionIcon } from '../WiredDirectionIcon';
import { WiredRadioGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const rotationOptions: number[] = [0, 1, 2, 3, 4, 5, 6];

export const WiredActionMoveAndRotateFurniView: FC<{}> = (props) => {
    const [movement, setMovement] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [blockOnUserCollision, setBlockOnUserCollision] = useState(true);
    const { trigger = null, setIntParams = null, setFurniSources = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => {
        return trigger?.furniSources?.[0] ?? 100;
    });

    const save = () => {
        setIntParams([movement, rotation, blockOnUserCollision ? 1 : 0]);
        setFurniSources([furniSource]);
    };

    useEffect(() => {
        if (trigger.intData.length >= 2) {
            setMovement(trigger.intData[0]);
            setRotation(trigger.intData[1]);
        } else {
            setMovement(0);
            setRotation(0);
        }

        setFurniSource(trigger.furniSources[0]);

        setBlockOnUserCollision((trigger.intData[2] ?? 0) !== 0);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.startdir')}>
                <WiredRadioGroup name="movement" columns={4} value={movement} onChange={setMovement} options={WIRED_DIRECTION_GRID.flat().map(direction => ({ id: direction, label: <WiredDirectionIcon direction={direction} selected={movement === direction} /> }))} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.turn')}>
                <WiredRadioGroup name="rotation" value={rotation} onChange={setRotation} options={rotationOptions.map(id => ({ id, label: LocalizeText(`wiredfurni.params.turn.${id}`) }))} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.user_collide')}>
                <WiredCheckboxOption checked={blockOnUserCollision} onChange={setBlockOnUserCollision} label={LocalizeText('wiredfurni.params.user_collide.0')} last />
            </WiredSection>
        </WiredActionBaseView>
    );
};
