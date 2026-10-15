import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredTextInput } from '../WiredTextInput';
import { WiredActionBaseView } from './WiredActionBaseView';

/**
 * RESET_REWARD_TRACK (code 59), the official reset-reward-track editor. AIR: roomevents/wired_setup/actiontypes/class_4288.as
 * buildInputs L34 (track id, 100 characters, no tab), readStringParamFromForm L41 (track id), onEditStart L46. No integer params.
 * Dossier: B/reviews/new-wireds-dossier-r88.json, code 59.
 */

const TRACK_MAX_LENGTH = 100;

export const WiredActionResetRewardTrackNativeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [track, setTrack] = useState('');

    useEffect(() => {
        if (!trigger) return;

        setTrack(trigger.stringData ?? '');
    }, [trigger]);

    const save = () => {
        setStringParam(track);
        setIntParams([]);
    };

    return (
        <WiredActionBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSection title={localizeWithFallback('wiredfurni.params.reward_track.reset.track', 'Reward track:')}>
                <WiredTextInput
                    maxLength={TRACK_MAX_LENGTH}
                    placeholder={localizeWithFallback('wiredfurni.params.reward_track.track_id', 'Track id:')}
                    value={track}
                    onChange={(value) => setTrack(value.replace(/\t/g, '').slice(0, TRACK_MAX_LENGTH))}
                />
            </WiredSection>
        </WiredActionBaseView>
    );
};
