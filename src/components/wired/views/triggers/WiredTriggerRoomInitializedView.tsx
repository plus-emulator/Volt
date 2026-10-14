import { FC } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

/** AIR RoomInitialized (trigger 28, widthModifier 1.5): no parameters, only the usage information. */
export const WiredTriggerRoomInitializedView: FC<{}> = () => {
    const { setIntParams = null, setStringParam = null } = useWired();

    return (
        <WiredTriggerBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={() => {
                setIntParams([]);
                setStringParam('');
            }}
        >
            <WiredSection>
                <WiredText className="whitespace-pre-line" wrap={true} text={LocalizeText('wiredfurni.params.room_initialized.usage_info')} />
            </WiredSection>
        </WiredTriggerBaseView>
    );
};
