import { FC, useCallback } from 'react';
import { WiredFurniType } from '../../../../api';
import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorFurniPicksView: FC<{}> = () => {
    const { setIntParams = null } = useWired();

    // Filter and inverse are category fields of the selector save; the owned ints stay empty.
    const save = useCallback(() => {
        setIntParams([]);
    }, [setIntParams]);

    return (
        <WiredSelectorBaseView
            hasSpecialInput={true} nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            hideDelay={true}

        >
            <WiredSelectorOptionsSection />
        </WiredSelectorBaseView>
    );
};
