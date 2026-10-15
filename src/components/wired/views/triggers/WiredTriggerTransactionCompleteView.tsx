import { FC } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

/** AIR class_4226: no settings of its own; the contracts it listens for are the furni picked in the room. */
export const WiredTriggerTransactionCompleteView: FC = () => {
    const { setIntParams = null } = useWired();

    return (
        <WiredTriggerBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={() => setIntParams([])}>
            <WiredSection title={localizeWithFallback('wiredfurni.params.general_box_info', 'Usage information:')}>
                <WiredText soft wrap text={localizeWithFallback(
                    'wiredfurni.params.transaction_complete.usage_info',
                    'This box will trigger when a user has completed a transaction (select the contract).'
                )} />
            </WiredSection>
        </WiredTriggerBaseView>
    );
};
