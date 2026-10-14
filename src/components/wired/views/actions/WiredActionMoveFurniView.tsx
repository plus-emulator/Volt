import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WIRED_DIRECTION_GRID, WiredDirectionIcon, WiredMoveIconName } from '../WiredDirectionIcon';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

// AIR wf_act_move_rotate: the radio showing move_<direction> sends this value.
const NORMAL_DIRECTION_VALUE_MAP: Record<number, number> = {
    0: 4,
    1: 8,
    2: 5,
    3: 9,
    4: 6,
    5: 10,
    6: 7,
    7: 11
};

// AIR class_4131: fixed direction values, then diagonal, straight and random.
const extraDirectionOptions: { value: number; icon: WiredMoveIconName }[] = [
    { value: 2, icon: 'diag' }, { value: 3, icon: 'vrt' }, { value: 1, icon: 'rnd' }
];

export const WiredActionMoveFurniView: FC<{}> = (props) => {
    const [movement, setMovement] = useState(0);
    const [rotation, setRotation] = useState(0);
    const { trigger = null, setIntParams = null, setFurniSources = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => {
        return trigger?.furniSources?.[0] ?? 100;
    });

    const save = () => {
        setIntParams([movement, rotation]);
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
            <WiredSection title={LocalizeText('wiredfurni.params.movefurni')}>
                <WiredRadioGroup name="movement" columns={4} value={movement} onChange={setMovement} options={[
                    { id: 0, label: LocalizeText('wiredfurni.params.movefurni.0'), newLine: true },
                    ...WIRED_DIRECTION_GRID.flat().map(direction => ({ id: NORMAL_DIRECTION_VALUE_MAP[direction], label: <WiredDirectionIcon direction={direction} selected={movement === NORMAL_DIRECTION_VALUE_MAP[direction]} /> })),
                    ...extraDirectionOptions.map(option => ({ id: option.value, label: <WiredDirectionIcon direction={option.value} icon={option.icon} selected={movement === option.value} /> }))
                ]} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.rotatefurni')}>
                <WiredRadioGroup name="rotation" value={rotation} onChange={setRotation} options={[0, 1, 2, 3].map(id => ({ id, label: (id === 1 || id === 2)
                    ? <span className="inline-flex items-center gap-[3px]"><WiredDirectionIcon direction={id} icon={id === 1 ? 'rotate_cw' : 'rotate_ccw'} /><WiredText text={LocalizeText(`wiredfurni.params.rotatefurni.${id}`)} /></span>
                    : LocalizeText(`wiredfurni.params.rotatefurni.${id}`) }))} />
            </WiredSection>
        </WiredActionBaseView>
    );
};
