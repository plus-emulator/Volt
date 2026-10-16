import { WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';
import { useWired } from '../../../../hooks';
import { WiredAdvancedSourceRows } from '../WiredAdvancedSourceRows';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorFurniByTypeView: FC<{}> = () => {
    const [matchState, setMatchState] = useState(false);

    const { trigger = null, setIntParams } = useWired();

    useEffect(() => {
        if (!trigger) return;

        const p = trigger.intData;
        setMatchState(p.length >= 1 && p[0] === 1);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = useCallback(() => {
        setIntParams([matchState ? 1 : 0]);
    }, [matchState, setIntParams]);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredSelectorBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={requiresFurni} save={save} hideDelay={true}
            footer={<WiredAdvancedSourceRows rows={[{ kind: 'furni', slot: 0 }]} />}>
            <WiredSection title={LocalizeText('wiredfurni.params.select_options')}>
                <WiredCheckboxOption checked={matchState} onChange={setMatchState} label={LocalizeText('wiredfurni.params.state_match')} last />
            </WiredSection>
            <WiredSelectorOptionsSection />
        </WiredSelectorBaseView>
    );
};
