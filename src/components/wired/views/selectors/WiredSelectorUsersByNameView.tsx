import { WiredTextArea } from '../WiredTextArea';
import { WiredSection } from '../WiredSection';
import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorUsersByNameView: FC<{}> = () => {
    const [namesText, setNamesText] = useState('');
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        setNamesText((trigger.stringData || '').replace(/\t/g, '\n'));
    }, [trigger]);

    // Filter and inverse are category fields of the selector save; the owned ints stay empty.
    const save = useCallback(() => {
        setStringParam(namesText.replace(/\n\r/g, '\t').replace(/\r|\n/g, '\t'));
        setIntParams([]);
    }, [namesText, setStringParam, setIntParams]);

    return (
        <WiredSelectorBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={0} save={save} hideDelay={true}>
            <WiredSection title={LocalizeText('wiredfurni.params.enter_names')}>
                <WiredTextArea height={140} maxLength={1000} value={namesText} onChange={value => setNamesText(value.split('\n').slice(0, 20).join('\n'))} />
            </WiredSection>
            <WiredSelectorOptionsSection />
        </WiredSelectorBaseView>
    );
};
