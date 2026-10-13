import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WIRED_STRING_DELIMETER, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredTextCounter, WiredTextFormattingHelp } from '../common/WiredTextFormattingHelp';
import { WiredTextPlaceholders } from '../common/WiredTextPlaceholders';
import { WiredBubbleWidthSelect } from '../WiredBubbleWidthSelect';
import { WiredCheckboxOption } from '../WiredOptions';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';
import { normalizeBotSource, WIRED_BOT_NAMED_SOURCE } from '../../../../api';

export const WiredActionBotTalkView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [message, setMessage] = useState('');
    const [talkMode, setTalkMode] = useState(-1);
    const [botSource, setBotSource] = useState<number>(WIRED_BOT_NAMED_SOURCE);
    const [bubbleWidth, setBubbleWidth] = useState<number>(-1);
    const [hideBotName, setHideBotName] = useState(false);
    const { trigger = null, setStringParam = null, setIntParams = null, setUserSources = null } = useWired();
    const botAllowed = trigger?.inputSources?.usersAllowed[0];
    const botDefault = trigger?.inputSources?.userDefaults[0] ?? 0;
    // The October bot talk editors: TextAreaParam(40, -1, 8, -1, 400).
    const maxMessageLength = 400;

    const save = () => {
        setStringParam((botSource === WIRED_BOT_NAMED_SOURCE ? botName : '') + WIRED_STRING_DELIMETER + message);
        setIntParams([talkMode, bubbleWidth, hideBotName ? 1 : 0]);
        setUserSources([botSource]);
    };

    useEffect(() => {
        const data = trigger.stringData.split(WIRED_STRING_DELIMETER);
        const nextBotName = data.length > 0 ? data[0] : '';

        if (data.length > 0) setBotName(nextBotName);
        if (data.length > 1) setMessage(data[1].length > 0 ? data[1] : '');

        setTalkMode(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setBotSource(normalizeBotSource(trigger.userSources[0] ?? botDefault, botAllowed, botDefault, nextBotName.length > 0));
        setBubbleWidth(trigger.intData.length > 1 ? trigger.intData[1] : -1);
        setHideBotName(trigger.intData.length > 2 && trigger.intData[2] === 1);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <WiredSourcesSelector
                    showUsers={true}
                    userSource={botSource}
                    usersTitle="wiredfurni.params.sources.users.title.bots"
                    onChangeUsers={(value) => setBotSource(normalizeBotSource(value, botAllowed, botDefault, botName.length > 0))}
                />
            }
        >
            {botSource === WIRED_BOT_NAMED_SOURCE && (
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.bot.name')}</Text>
                    <OctaneInput maxLength={32} type="text" value={botName} onChange={(event) => setBotName(event.target.value)} />
                </div>
            )}
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.message')}</Text>
                <textarea
                    className="form-control form-control-sm octane-wired__resizable-textarea"
                    maxLength={maxMessageLength}
                    rows={4}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                />
                <WiredTextCounter maxLength={maxMessageLength} value={message} />
                <WiredTextFormattingHelp />
                <WiredTextPlaceholders onInsert={(token) => setMessage((current) => (current + token).slice(0, maxMessageLength))} />
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                    <input
                        checked={talkMode === 0}
                        className="form-check-input"
                        id="talkMode1"
                        name="talkMode"
                        type="radio"
                        onChange={(event) => setTalkMode(0)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.talk')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <input
                        checked={talkMode === 1}
                        className="form-check-input"
                        id="talkMode2"
                        name="talkMode"
                        type="radio"
                        onChange={(event) => setTalkMode(1)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.shout')}</Text>
                </div>
            </div>
            <WiredBubbleWidthSelect value={bubbleWidth} onChange={setBubbleWidth} />
            <WiredCheckboxOption checked={hideBotName} label={localizeWithFallback('wiredfurni.params.bot_talk.hide_bot_name', 'Hide bot name')} last={true} onChange={setHideBotName} />
        </WiredActionBaseView>
    );
};
