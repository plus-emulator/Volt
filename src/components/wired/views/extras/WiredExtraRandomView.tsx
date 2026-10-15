import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { WiredSliderSection } from '../WiredSlider';
import { useWired } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MIN_PICK_AMOUNT = 1;
const MIN_SKIP_EXECUTIONS = 0;
const MAX_RANDOM_VALUE = 100;

const normalizePickAmount = (value: number) => {
    if (isNaN(value)) return MIN_PICK_AMOUNT;

    return Math.max(MIN_PICK_AMOUNT, Math.min(MAX_RANDOM_VALUE, Math.floor(value)));
};

const normalizeSkipExecutions = (value: number) => {
    if (isNaN(value)) return MIN_SKIP_EXECUTIONS;

    return Math.max(MIN_SKIP_EXECUTIONS, Math.min(MAX_RANDOM_VALUE, Math.floor(value)));
};

export const WiredExtraRandomView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [pickAmount, setPickAmount] = useState(MIN_PICK_AMOUNT);
    const [skipExecutions, setSkipExecutions] = useState(MIN_SKIP_EXECUTIONS);

    useEffect(() => {
        if (!trigger) return;

        // owned: [skipped executions, pick amount].
        setSkipExecutions(normalizeSkipExecutions(trigger.intData.length > 0 ? trigger.intData[0] : MIN_SKIP_EXECUTIONS));
        setPickAmount(normalizePickAmount(trigger.intData.length > 1 ? trigger.intData[1] : MIN_PICK_AMOUNT));
    }, [trigger]);

    const save = () => {
        setIntParams([normalizeSkipExecutions(skipExecutions), normalizePickAmount(pickAmount)]);
        setStringParam('');
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSliderSection titleKey="wiredfurni.params.pickamount" unit="picks" min={MIN_PICK_AMOUNT} max={MAX_RANDOM_VALUE} step={1} withInput={false} value={pickAmount} onChange={setPickAmount} />
            <WiredSliderSection titleKey="wiredfurni.params.skipactions" unit="skips" min={MIN_SKIP_EXECUTIONS} max={MAX_RANDOM_VALUE} step={1} withInput={false} value={skipExecutions} onChange={setSkipExecutions} />
        </WiredExtraBaseView>
    );
};
