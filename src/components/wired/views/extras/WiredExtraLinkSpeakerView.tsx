import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredCheckboxGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/**
 * AIR class_4123 (`LINK_SPEAKER`, addon 2003, build WIN63-202610131318-860371703): a checkbox group, index 0 the
 * message, index 1 the dataframe, saved as int params [message 0/1, dataframe 0/1]. Forces furni selection
 * (forceFurniSelection), which picks the WIRED Links by id.
 */

export const WiredExtraLinkSpeakerView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [message, setMessage] = useState(false);
    const [dataframe, setDataframe] = useState(false);

    useEffect(() => {
        if (!trigger) return;

        setMessage(trigger.getBoolean(0));
        setDataframe(trigger.getBoolean(1));
    }, [trigger]);

    const save = () => setIntParams([message ? 1 : 0, dataframe ? 1 : 0]);

    return (
        <WiredExtraBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save}>
            <WiredSection title={LocalizeText('wiredfurni.params.link_speaker.speak_for')}>
                <WiredCheckboxGroup>
                    <WiredCheckboxOption checked={message} label={LocalizeText('wiredfurni.params.link_speaker.message')} onChange={setMessage} />
                    <WiredCheckboxOption
                        checked={dataframe}
                        label={LocalizeText('wiredfurni.params.link_speaker.dataframe')}
                        last={true}
                        onChange={setDataframe}
                    />
                </WiredCheckboxGroup>
            </WiredSection>
        </WiredExtraBaseView>
    );
};
