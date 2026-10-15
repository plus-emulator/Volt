import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WIRED_DIRECTION_GRID, WiredDirectionIcon, WiredMoveIconName } from '../WiredDirectionIcon';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const ROTATION_CLOCKWISE = 9;
const ROTATION_COUNTER_CLOCKWISE = 10;

interface DirectionExtraOption {
    value: number;
    icon: WiredMoveIconName;
    label: string;
}

interface DirectionPickerProps {
    name: string;
    title: string;
    noneLabel: string;
    value: number;
    onChange: (value: number) => void;
    extraOptions?: DirectionExtraOption[];
}

const DirectionPicker: FC<DirectionPickerProps> = (props) => {
    const { name = '', title = '', noneLabel = '', value = -1, onChange = null, extraOptions = [] } = props;

    return (
        <WiredSection title={title}>
            <WiredRadioGroup name={name} columns={4} value={value} onChange={onChange} options={[
                { id: -1, label: noneLabel, newLine: true },
                ...WIRED_DIRECTION_GRID.flat().map(direction => ({ id: direction, label: <WiredDirectionIcon direction={direction} selected={value === direction} /> })),
                ...extraOptions.map(option => ({ id: option.value, label: <span title={option.label}><WiredDirectionIcon direction={option.value} icon={option.icon} selected={value === option.value} /></span> }))
            ]} />
        </WiredSection>
    );
};

export const WiredActionMoveRotateUserView: FC<{}> = (props) => {
    const [movementDirection, setMovementDirection] = useState(-1);
    const [rotationDirection, setRotationDirection] = useState(-1);
    const { trigger = null, setIntParams, setUserSources } = useWired();
    const [userSource, setUserSource] = useState(0);
    const save = () => {
        setIntParams([movementDirection, rotationDirection]);
        setUserSources([userSource]);
    };

    const rotationExtraOptions: DirectionExtraOption[] = [
        { value: ROTATION_CLOCKWISE, icon: 'rotate_cw', label: LocalizeText('wiredfurni.params.rotatefurni.1') },
        { value: ROTATION_COUNTER_CLOCKWISE, icon: 'rotate_ccw', label: LocalizeText('wiredfurni.params.rotatefurni.2') }
    ];

    useEffect(() => {
        setMovementDirection(trigger.intData.length > 0 ? trigger.intData[0] : -1);
        setRotationDirection(trigger.intData.length > 1 ? trigger.intData[1] : -1);
        setUserSource(trigger.userSources[0] ?? 0);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <DirectionPicker
                name="wired-move-user-direction"
                title={LocalizeText('wiredfurni.params.moveuser')}
                noneLabel={LocalizeText('wiredfurni.params.movefurni.0')}
                value={movementDirection}
                onChange={setMovementDirection}
            />
            <DirectionPicker
                name="wired-rotate-user-direction"
                title={LocalizeText('wiredfurni.params.rotateuser')}
                noneLabel={LocalizeText('wiredfurni.params.rotatefurni.0')}
                extraOptions={rotationExtraOptions}
                value={rotationDirection}
                onChange={setRotationDirection}
            />
        </WiredActionBaseView>
    );
};
