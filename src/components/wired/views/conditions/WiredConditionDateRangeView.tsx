import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredDateToString, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredTextInput } from '../WiredTextInput';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionDateRangeView: FC<{}> = (props) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => {
        const startDateInstance = new Date(startDate);
        const endDateInstance = new Date(endDate);

        // new Date('garbage') is a truthy *Invalid Date*, not null — the old
        // `if(startDateInstance && endDateInstance)` was always true, so an
        // unparseable input wrote NaN as the int param. Guard on getTime().
        const startDateMili = isNaN(startDateInstance.getTime()) ? 0 : Math.floor(startDateInstance.getTime() / 1000);
        const endDateMili = isNaN(endDateInstance.getTime()) ? 0 : Math.floor(endDateInstance.getTime() / 1000);

        setIntParams([startDateMili, endDateMili]);
    };

    useEffect(() => {
        // Seed both inputs (default "now") even for a never-configured furni so
        // the first save can't send new Date('') → NaN.
        let startDate = new Date();
        let endDate = new Date();

        if (trigger.intData.length >= 2) {
            if (trigger.intData[0] > 0) startDate = new Date(trigger.intData[0] * 1000);

            if (trigger.intData[1] > 0) endDate = new Date(trigger.intData[1] * 1000);
        }

        setStartDate(WiredDateToString(startDate));
        setEndDate(WiredDateToString(endDate));
    }, [trigger]);

    return (
        <WiredConditionBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSection title={LocalizeText('wiredfurni.params.startdate')}>
                <WiredTextInput maxLength={1000} placeholder="YYYY/MM/DD HH:MM" value={startDate} onChange={setStartDate} />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.enddate')}>
                <WiredTextInput maxLength={1000} placeholder="YYYY/MM/DD HH:MM" value={endDate} onChange={setEndDate} />
            </WiredSection>
        </WiredConditionBaseView>
    );
};
