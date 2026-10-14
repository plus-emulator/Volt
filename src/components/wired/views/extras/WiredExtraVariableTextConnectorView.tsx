import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredTextArea } from '../WiredTextArea';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MAX_CONNECTOR_LINES = 30;
const MAX_CONNECTOR_CHARACTERS = 1000;

const truncateMappingsText = (value: string) => {
    const normalizedValue = (value ?? '').replace(/\r/g, '');
    const lines = normalizedValue.split('\n');
    const limitedByLines = lines.slice(0, MAX_CONNECTOR_LINES).join('\n');

    return limitedByLines.length > MAX_CONNECTOR_CHARACTERS ? limitedByLines.slice(0, MAX_CONNECTOR_CHARACTERS) : limitedByLines;
};

export const WiredExtraVariableTextConnectorView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [mappingsText, setMappingsText] = useState('');

    useEffect(() => {
        if (!trigger) return;

        setMappingsText(trigger.stringData || '');
    }, [trigger]);

    const save = () => {
        setIntParams([]);
        setStringParam(mappingsText ?? '');
    };

    const handleTextChange = (value: string) => setMappingsText(truncateMappingsText(value));

    const placeholderText = LocalizeText('wiredfurni.params.variables.connect_text.caption');

    return (
        <WiredExtraBaseView nativeLayout hasSpecialInput requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSection title={LocalizeText('wiredfurni.params.variables.connect_text.title')}>
                <WiredTextArea height={100} maxLength={MAX_CONNECTOR_CHARACTERS}
                    label={LocalizeText('wiredfurni.params.variables.connect_text.title')}
                    placeholder={placeholderText} value={mappingsText} onChange={handleTextChange} />
            </WiredSection>
        </WiredExtraBaseView>
    );
};
