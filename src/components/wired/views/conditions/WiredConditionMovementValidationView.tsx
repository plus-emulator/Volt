import { FC } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

/**
 * wf_cnd_valid_moves (condition 39): Habbo sends no furni or user selections for this card (observed on AIR
 * WIN63-202610131318-860371703), so there are no picks, no advanced section and the save carries no sources.
 */
export const WiredConditionMovementValidationView: FC<{}> = () => {
    const { setIntParams, setStringParam, setFurniSources } = useWired();

    const save = () => {
        setIntParams([]);
        setStringParam('');
        setFurniSources([]);
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
        />
    );
};
