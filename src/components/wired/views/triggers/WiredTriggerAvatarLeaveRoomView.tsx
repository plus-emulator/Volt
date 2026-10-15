import { FC } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

/** October AIR AvatarLeavesRoom inherits DefaultTriggerConf: no configurable inputs. */
export const WiredTriggerAvatarLeaveRoomView: FC = () => {
    const { setStringParam, setIntParams, setVariableIds } = useWired();
    return <WiredTriggerBaseView nativeLayout hasSpecialInput={false} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
        save={() => { setStringParam(''); setIntParams([]); setVariableIds([]); }} />;
};
