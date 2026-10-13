import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WIRED_STRING_DELIMETER, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { getWiredTextPlaceholderNames, WiredMessageEditor } from '../common/WiredMessageEditor';
import { WiredBubbleWidthSelect } from '../WiredBubbleWidthSelect';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';
import { normalizeBotSource, WIRED_BOT_NAMED_SOURCE } from '../../../../api';

export const WiredActionBotTalkToAvatarView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [message, setMessage] = useState('');
    const [talkMode, setTalkMode] = useState(-1);
    const [botSource, setBotSource] = useState<number>(WIRED_BOT_NAMED_SOURCE);
    const [bubbleWidth, setBubbleWidth] = useState<number>(-1);
    const [hideBotName, setHideBotName] = useState(false);
    const { trigger = null, setStringParam = null, setIntParams = null, setUserSources = null } = useWired();
    const botAllowed = trigger?.inputSources?.usersAllowed[0];
    const botDefault = trigger?.inputSources?.userDefaults[0] ?? 0;
    const userAllowed = trigger?.inputSources?.usersAllowed[1];
    const userDefault = trigger?.inputSources?.userDefaults[1] ?? 0;
        const [userSource, setUserSource] = useState<number>(() => trigger?.userSources?.[1] ?? userDefault);

    const save = () => {
        setStringParam((botSource === WIRED_BOT_NAMED_SOURCE ? botName : '') + WIRED_STRING_DELIMETER + message);
        // owned: [talk mode, bubble width, hide bot name]; users: [bot, talked-to user].
        setIntParams([talkMode, bubbleWidth, hideBotName ? 1 : 0]);
        setUserSources([botSource, userSource]);
    };

    useEffect(() => {
        const data = trigger.stringData.split(WIRED_STRING_DELIMETER);
        const nextBotName = data.length > 0 ? data[0] : '';

        if (data.length > 0) setBotName(nextBotName);
        if (data.length > 1) setMessage(data[1].length > 0 ? data[1] : '');

        setTalkMode(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(trigger.userSources.length > 1 ? trigger.userSources[1] : userDefault);
        setBotSource(normalizeBotSource(trigger.userSources.length > 0 ? trigger.userSources[0] : botDefault, botAllowed, botDefault, nextBotName.length > 0));
        setBubbleWidth(trigger.intData.length > 1 ? trigger.intData[1] : -1);
        setHideBotName(trigger.intData.length > 2 && trigger.intData[2] !== 0);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <div className="flex flex-col gap-2">
                    <WiredSourcesSelector showUsers={true} userSlot={1} userSource={userSource} onChangeUsers={setUserSource} />
                    <hr className="m-0 bg-dark" />
                    <WiredSourcesSelector
                        showUsers={true}
                        userSlot={0}
                        userSource={botSource}
                        usersTitle="wiredfurni.params.sources.users.title.bots"
                        onChangeUsers={(value) => setBotSource(normalizeBotSource(value, botAllowed, botDefault, botName.length > 0))}
                    />
                </div>
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
                <WiredMessageEditor placeholderNames={getWiredTextPlaceholderNames(trigger?.contexts)} value={message} onChange={setMessage} />
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
                    <Text>{LocalizeText('wiredfurni.params.whisper')}</Text>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <input checked={hideBotName} className="form-check-input" type="checkbox" onChange={(event) => setHideBotName(event.target.checked)} />
                <Text>{localizeWithFallback('wiredfurni.params.bot_talk.hide_bot_name', 'Hide bot name')}</Text>
            </div>
            <WiredBubbleWidthSelect value={bubbleWidth} onChange={setBubbleWidth} />
        </WiredActionBaseView>
    );
};
