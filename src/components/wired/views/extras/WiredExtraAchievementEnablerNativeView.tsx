import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredTextArea } from '../WiredTextArea';
import { WiredSection } from '../WiredSection';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/**
 * AIR class_4012 (`ACHIEVEMENT_ENABLER`, addon 2001, build WIN63-202610131318-860371703): a text area of
 * achievements, one per line (max 2000 characters). String param only, no int params.
 */

const ACHIEVEMENT_ENABLER_MAX_LENGTH = 2000;

export const WiredExtraAchievementEnablerNativeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [text, setText] = useState('');

    useEffect(() => {
        if (!trigger) return;

        setText(trigger.stringData ?? '');
    }, [trigger]);

    const save = () => {
        setIntParams([]);
        setStringParam(text.slice(0, ACHIEVEMENT_ENABLER_MAX_LENGTH));
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSection title={LocalizeText('wiredfurni.params.achievement_enabler')}>
                <WiredTextArea height={60} maxLength={ACHIEVEMENT_ENABLER_MAX_LENGTH}
                    placeholder={LocalizeText('wiredfurni.params.achievement_enabler.placeholder')}
                    value={text} onChange={setText} />
            </WiredSection>
        </WiredExtraBaseView>
    );
};
