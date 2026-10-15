import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WIRED_STRING_DELIMETER, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredRadioGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredTextInput } from '../WiredTextInput';
import { getWiredTextPlaceholderNames, WiredMessageEditor } from '../common/WiredMessageEditor';
import { WiredBubbleWidthSelect } from '../WiredBubbleWidthSelect';
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
    
    const save = () => {
        setStringParam((botSource === WIRED_BOT_NAMED_SOURCE ? botName : '') + WIRED_STRING_DELIMETER + message);
        setIntParams([talkMode, bubbleWidth, hideBotName ? 1 : 0]);
        setUserSources([botSource]);
    };

    useEffect(() => {
        const data = trigger.stringData.split(WIRED_STRING_DELIMETER);
        const nextBotName = data.length > 0 ? data[0] : '';

        if (data.length > 0) setBotName(nextBotName);
        setMessage(data.length > 1 ? data[1] : '');

        setTalkMode(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setBotSource(normalizeBotSource(trigger.userSources[0] ?? botDefault, botAllowed, botDefault, nextBotName.length > 0));
        setBubbleWidth(trigger.intData.length > 1 ? trigger.intData[1] : -1);
        setHideBotName(trigger.intData.length > 2 && trigger.intData[2] !== 0);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
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
                <WiredSection title={LocalizeText('wiredfurni.params.bot.name')}>
                    <WiredTextInput maxLength={32} value={botName} onChange={setBotName} />
                </WiredSection>
            )}
            <WiredSection title={LocalizeText('wiredfurni.params.message')}>
                <div className="flex flex-col gap-[4px]">
                    <WiredMessageEditor height={40} previewStyle={31} previewWidth={bubbleWidth} previewType={talkMode === 1 ? 2 : 0} previewUsername={hideBotName ? '' : botName} placeholderNames={getWiredTextPlaceholderNames(trigger?.contexts)} value={message} onChange={setMessage} />
                    <WiredRadioGroup name="talkMode" value={talkMode} onChange={setTalkMode} options={[{ id: 0, label: LocalizeText('wiredfurni.params.talk') }, { id: 1, label: LocalizeText('wiredfurni.params.shout') }]} />
                    <WiredCheckboxOption checked={hideBotName} onChange={setHideBotName} label={localizeWithFallback('wiredfurni.params.bot_talk.hide_bot_name', 'Hide bot name')} last />
                </div>
            </WiredSection>
            <WiredBubbleWidthSelect value={bubbleWidth} onChange={setBubbleWidth} />
        </WiredActionBaseView>
    );
};
