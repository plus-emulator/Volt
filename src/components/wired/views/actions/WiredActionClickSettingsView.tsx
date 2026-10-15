import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredDropdown } from '../WiredDropdown';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

/** What a click on another avatar does, as the server and the renderer number it. */
const USER_OPTIONS = [
    { value: 0, key: 'wiredfurni.params.click_settings.user.0', fallback: 'Default' },
    { value: 1, key: 'wiredfurni.params.click_settings.user.1', fallback: 'Click and walk behind the avatar' },
    { value: 2, key: 'wiredfurni.params.click_settings.user.2', fallback: 'Pass through: the click lands behind the avatar' }
];

/** What a click on a furni does. */
const FURNI_OPTIONS = [
    { value: 0, key: 'wiredfurni.params.click_settings.furni.0', fallback: 'Default' },
    { value: 1, key: 'wiredfurni.params.click_settings.furni.1', fallback: 'Pass through: the click lands on the tile under the furni' }
];

const normalize = (value: number, options: { value: number }[]) => (options.some((option) => option.value === value) ? value : 0);

/**
 * The official click-settings action: two dropdowns, what a click on a user does and what a click
 * on a furni does, sent to the selected users' clients.
 */
export const WiredActionClickSettingsView: FC<{}> = () => {
    const [userOption, setUserOption] = useState(0);
    const [furniOption, setFurniOption] = useState(0);
    const [userSource, setUserSource] = useState(0);
    const { trigger = null, setIntParams = null, setUserSources } = useWired();

    const save = () => {
        setIntParams([userOption, furniOption]);
        setUserSources([userSource]);
    };

    useEffect(() => {
        setUserOption(normalize(trigger?.intData?.length > 0 ? trigger.intData[0] : 0, USER_OPTIONS));
        setFurniOption(normalize(trigger?.intData?.[1] ?? 0, FURNI_OPTIONS));
        setUserSource(trigger?.userSources[0] ?? 0);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <WiredSection title={localizeWithFallback('wiredfurni.params.click_settings.user', 'Clicking a user')}>
                <WiredDropdown caption={localizeWithFallback('wiredfurni.params.click_settings.user', 'Clicking a user')}
                    value={userOption} onChange={setUserOption}
                    options={USER_OPTIONS.map(option => ({ id: option.value, label: localizeWithFallback(option.key, option.fallback) }))} />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.click_settings.furni', 'Clicking a furni')}>
                <WiredDropdown caption={localizeWithFallback('wiredfurni.params.click_settings.furni', 'Clicking a furni')}
                    value={furniOption} onChange={setFurniOption}
                    options={FURNI_OPTIONS.map(option => ({ id: option.value, label: localizeWithFallback(option.key, option.fallback) }))} />
            </WiredSection>
        </WiredActionBaseView>
    );
};
