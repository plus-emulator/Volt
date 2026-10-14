import { FC } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

/** AIR class_4009: no settings of its own; the contracts it listens for are the furni picked in the room. */
export const WiredTriggerTransactionFailView: FC = () => {
    const { setIntParams = null } = useWired();

    return (
        <WiredTriggerBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={() => setIntParams([])}>
            <WiredSection title={localizeWithFallback('wiredfurni.params.general_box_info', 'Usage information:')}>
                <WiredText soft wrap text={localizeWithFallback(
                    'wiredfurni.params.transaction_failed.usage_info',
                    'This box will trigger when a user has failed to complete a transaction (select the contract).\n\nAdditionally, the failure reason is provided through an internal variable'
                )} />
            </WiredSection>
        </WiredTriggerBaseView>
    );
};
