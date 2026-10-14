import { FC, useCallback, useEffect, useState } from 'react';
import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';
import { useWired } from '../../../../hooks';
import { WiredHandItemField } from '../WiredHandItemField';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorUsersHandItemView: FC<{}> = () => {
    const [handItemId, setHandItemId] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        setHandItemId(trigger.intData.length > 0 ? trigger.intData[0] : 0);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = useCallback(() => {
        setIntParams([handItemId]);
    }, [handItemId, setIntParams]);

    return (
        <WiredSelectorBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={0} save={save} hideDelay={true}>
            <WiredHandItemField handItemId={handItemId} onChange={setHandItemId} showCopyButton nativeSection />
            <WiredSelectorOptionsSection />
        </WiredSelectorBaseView>
    );
};
