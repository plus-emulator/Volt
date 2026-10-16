import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionRemoveFurniView: FC<{}> = () => {
    const { trigger, setIntParams, setFurniSources } = useWired();
    // Observed on hhus: the card offers 0/200/201 with 200 selected, and the server refuses the selected-furni source 100.
    const furniDefault = trigger?.inputSources?.furniDefaults[0] ?? 200;
    const [source, setSource] = useState(furniDefault);
    useEffect(() => setSource(trigger?.furniSources[0] ?? furniDefault), [furniDefault, trigger]);
    const save = () => {
        setIntParams([]);
        setFurniSources([source]);
    };
    return (
        <WiredActionBaseView advancedAlwaysVisible
            nativeLayout={true}
            hasSpecialInput={true}
            requiresFurni={source === 100 ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={source} onChangeFurni={setSource} />}
        />
    );
};
