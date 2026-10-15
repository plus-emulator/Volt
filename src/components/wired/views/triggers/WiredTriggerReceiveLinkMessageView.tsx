import { FC } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectorSection } from '../WiredFurniSelectorView';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

/**
 * AIR ReceiveLinkMessage (`wf_trg_receive_message`, trigger 29, build WIN63-202610131318-860371703): no parameters.
 * The WIRED Links it listens to are the furni picked in the room; the received message goes to $(trigger_text).
 */
export const WiredTriggerReceiveLinkMessageView: FC<{}> = () => {
    const { setIntParams = null, setStringParam = null } = useWired();

    return (
        <WiredTriggerBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            footerCollapsible={false}
            selectionPreview={<WiredFurniSelectorSection title={LocalizeText('wiredfurni.params.link.endpoints')} hideInstructions />}
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
