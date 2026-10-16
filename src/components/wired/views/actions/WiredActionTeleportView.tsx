import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionTeleportView: FC<{}> = () => {
    const { trigger, setIntParams, setFurniSources, setUserSources } = useWired();
    const isTeleport = trigger?.code === 8;
    const isUserToFurni = trigger?.code === 43;
    const [fast, setFast] = useState(false);
    const [walkMode, setWalkMode] = useState(0);
    const [furniSource, setFurniSource] = useState(100);
    const [userSource, setUserSource] = useState(0);
    useEffect(() => {
        setFast(trigger?.intData[0] === 1);
        setWalkMode(trigger?.intData[0] ?? 0);
        setFurniSource(trigger?.furniSources[0] ?? 100);
        setUserSource(trigger?.userSources[0] ?? 0);
    }, [trigger]);
    const save = () => {
        setIntParams(isTeleport ? [fast ? 1 : 0] : isUserToFurni ? [walkMode] : []);
        setFurniSources([furniSource]);
        setUserSources([userSource]);
    };
    return (
        <WiredActionBaseView
            nativeLayout={true}
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footerCollapsible={!isUserToFurni}
            // AIR class_3993 (furni to user) and class_3932 (user to furni) return advancedAlwaysVisible true; teleport_to does not.
            advancedAlwaysVisible={trigger?.code === 35 || isUserToFurni}
            footer={
                <WiredSourcesSelector
                    showFurni={true}
                    furniTitle={isUserToFurni ? 'wiredfurni.params.sources.furni.title.mv.1' : undefined}
                    usersTitle={isUserToFurni ? 'wiredfurni.params.sources.furni.title.mv_user2' : undefined}
                    showUsers={true}
                    furniSource={furniSource}
                    userSource={userSource}
                    onChangeFurni={setFurniSource}
                    onChangeUsers={setUserSource}
                />
            }
        >
            {isTeleport && <WiredSection title={LocalizeText('wiredfurni.params.teleport.options')}>
                <WiredCheckboxOption last checked={fast} onChange={setFast} label={LocalizeText('wiredfurni.params.teleport.options.0')} />
            </WiredSection>}
            {isUserToFurni && <WiredSection title={LocalizeText('wiredfurni.params.user_move.walkmode')}>
                <WiredRadioGroup name="userWalkMode" value={walkMode} onChange={setWalkMode}
                    options={[0, 1, 2].map(id => ({ id, label: LocalizeText(`wiredfurni.params.user_move.walkmode.${id}`) }))} />
            </WiredSection>}
        </WiredActionBaseView>
    );
};
