import { FC } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredAdvancedSourceRows } from '../WiredAdvancedSourceRows';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

/**
 * AIR ReceiveLinkMessage (`wf_trg_receive_message`, trigger 29, build WIN63-202610131318-860371703): no parameters.
 * The WIRED Links it listens to are the furni picked in the room; the received message goes to $(trigger_text).
 * The WIRED Links source is the always-open advanced section with no picks section (ReceiveLinkMessage.as:34-41).
 */
export const WiredTriggerReceiveLinkMessageView: FC<{}> = () => {
    const { setIntParams = null, setStringParam = null } = useWired();

    return (
        <WiredTriggerBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            advancedAlwaysVisible
            showSelection={false}
            footer={<WiredAdvancedSourceRows rows={[{ kind: 'furni', slot: 0, title: 'wiredfurni.params.link.endpoints', pickCount: true }]} />}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={() => {
                setIntParams([]);
                setStringParam('');
            }}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.general_box_info')}>
                <WiredText soft={true} wrap={true} text={LocalizeText('wiredfurni.params.link.receive_message_info')} />
            </WiredSection>
        </WiredTriggerBaseView>
    );
};
