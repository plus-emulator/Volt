import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorUsersOnFurniView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => {
        return trigger?.furniSources?.[0] ?? 100;
    });

    useEffect(() => {
        if (!trigger) return;

        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = () => {
        setIntParams([]);
        setFurniSources([furniSource]);
    };

    return (
        <WiredSelectorBaseView
            hasSpecialInput={true} nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            hideDelay={true}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <WiredSelectorOptionsSection />
        </WiredSelectorBaseView>
    );
};
