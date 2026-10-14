import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredActionBaseView } from './WiredActionBaseView';

/**
 * SEND_LINK_MESSAGE (code 63), the official send-link-message editor. AIR: roomevents/wired_setup/actiontypes/SendLinkMessage.as
 * buildInputs L58 (source radio, message editor), readIntParamsFromForm L95 [source], readStringParamFromForm L100 (message),
 * validate L105 (UTF-8 length above 1000 bytes blocks the save with wiredfurni.params.link.message_too_large), onEditStart L66.
 * The official message editor clamps at 400 characters, so the message is a plain text area here with a byte counter.
 * Dossier: B/reviews/new-wireds-dossier-r88.json, code 63.
 */

const SOURCE_FROM_TRIGGER = 0;
const SOURCE_CUSTOM = 1;
const MESSAGE_MAX_BYTES = 1000;

const utf8Length = (text: string) => new TextEncoder().encode(text).length;

export const WiredActionSendLinkMessageView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [source, setSource] = useState(SOURCE_FROM_TRIGGER);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!trigger) return;

        setSource(trigger.intData?.[0] === SOURCE_CUSTOM ? SOURCE_CUSTOM : SOURCE_FROM_TRIGGER);
        setMessage(trigger.stringData ?? '');
    }, [trigger]);

    const tooLarge = utf8Length(message) > MESSAGE_MAX_BYTES;

    const save = () => {
        setIntParams([source]);
        setStringParam(message);
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            validate={() => !tooLarge}
            footer={
                <WiredSection title={localizeWithFallback('wiredfurni.params.link.endpoints', 'WIRED Links')}>
                    <Text small wrap>
                        {localizeWithFallback(
                            'wiredfurni.params.link.message_info',
                            "Send the trigger's chat or received message, or write a custom message with placeholders. Select the WIRED Links below."
                        )}
                    </Text>
                </WiredSection>
            }
        >
            <WiredSection title={localizeWithFallback('wiredfurni.params.link.message_source', 'Message source')}>
                <WiredRadioGroup
                    name="linkMessageSource"
                    options={[
                        { id: SOURCE_FROM_TRIGGER, label: localizeWithFallback('wiredfurni.params.link.from_trigger', 'From WIRED trigger') },
                        { id: SOURCE_CUSTOM, label: localizeWithFallback('wiredfurni.params.link.custom_message', 'Custom message') }
                    ]}
                    value={source}
                    onChange={setSource}
                />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.message', 'Message:')}>
                <textarea
                    className="form-control form-control-sm volt-wired__resizable-textarea"
                    disabled={source !== SOURCE_CUSTOM}
                    rows={4}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                />
                <Text small variant={tooLarge ? 'danger' : undefined}>
                    {`${utf8Length(message)}/${MESSAGE_MAX_BYTES}`}
                </Text>
                {tooLarge && (
                    <Text small variant="danger">
                        {localizeWithFallback(
                            'wiredfurni.params.link.message_too_large',
                            'This message is too large to save. Shorten it to fit the 1,000-byte text limit.'
                        )}
                    </Text>
                )}
            </WiredSection>
        </WiredActionBaseView>
    );
};
