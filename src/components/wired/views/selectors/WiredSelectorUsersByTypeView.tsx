import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

const USER_TYPES = [1, 2, 4];

export const WiredSelectorUsersByTypeView: FC<{}> = () => {
    const [userType, setUserType] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        setUserType(trigger.intData.length > 0 ? trigger.intData[0] : 1);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = useCallback(() => {
        setIntParams([userType]);
    }, [userType, setIntParams]);

    return (
        <WiredSelectorBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={0} save={save} hideDelay={true}>
            <WiredSection title={LocalizeText('wiredfurni.params.usertype')}>
                <WiredRadioGroup name="usersByTypeSelector" value={userType} onChange={setUserType}
                    options={USER_TYPES.map(id => ({id,label:LocalizeText(`wiredfurni.params.usertype.${id}`)}))} />
            </WiredSection>
            <WiredSelectorOptionsSection />
        </WiredSelectorBaseView>
    );
};
