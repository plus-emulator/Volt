import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

/**
 * Owned: [match criteria]; furni: [the chest or contract furni to cancel], which the form disables when every transaction
 * is cancelled; users: [the default user]; no variable.
 */
export const WiredActionCancelTransactionView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources = null, setUserSources = null } = useWired();
    const [matchMode, setMatchMode] = useState(0);
    const [furniSource, setFurniSource] = useState(100);
    const [userSource, setUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        setMatchMode(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setFurniSource(trigger.furniSources[0] ?? 100);
        setUserSource(trigger.userSources[0] ?? 0);
    }, [trigger]);

    const save = () => {
        setIntParams([matchMode]);
        setFurniSources([matchMode === 1 ? 100 : furniSource]);
        setUserSources([userSource]);
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            footer={
                <>
                    <WiredSourcesSelector
                        showFurni={true}
                        furniSlot={0}
                        furniSource={furniSource}
                        furniDisabled={matchMode === 1}
                        onChangeFurni={setFurniSource}
                    />
                    <WiredSourcesSelector showUsers={true} userSlot={0} userSource={userSource} onChangeUsers={setUserSource} />
                </>
            }
        >
            <Text className="whitespace-pre-line">
                {localizeWithFallback(
                    'wiredfurni.params.cancel_transaction.usage_info',
                    'Cancel an ongoing payment or trade. You can specify the contract, or cancel any transaction that may be ongoing.'
                )}
            </Text>
            <Text bold>{localizeWithFallback('wiredfurni.params.cancel_transaction.match_criteria', 'Cancel transaction:')}</Text>
            <WiredRadioGroup
                name="cancelTransactionMode"
                value={matchMode}
                onChange={setMatchMode}
                options={[
                    { id: 0, label: localizeWithFallback('wiredfurni.params.cancel_transaction.match_criteria.0', 'Specified contract') },
                    { id: 1, label: localizeWithFallback('wiredfurni.params.cancel_transaction.match_criteria.1', 'Any ongoing transaction') }
                ]}
            />
        </WiredActionBaseView>
    );
};
