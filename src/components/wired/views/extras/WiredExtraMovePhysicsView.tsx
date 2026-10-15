import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { WiredCheckboxGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { normalizeNativeSource } from '../../../../api';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const DEFAULT_SOURCE = 0;
const getFlag = (value: number) => value === 1;

export const WiredExtraMovePhysicsView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setFurniSources = null, setUserSources = null } = useWired();
    const [keepAltitude, setKeepAltitude] = useState(false);
    const [moveThroughFurni, setMoveThroughFurni] = useState(false);
    const [moveThroughUsers, setMoveThroughUsers] = useState(false);
    const [blockByFurni, setBlockByFurni] = useState(false);
    const [moveThroughFurniSource, setMoveThroughFurniSource] = useState(DEFAULT_SOURCE);
    const [blockByFurniSource, setBlockByFurniSource] = useState(DEFAULT_SOURCE);
    const [moveThroughUsersSource, setMoveThroughUsersSource] = useState(DEFAULT_SOURCE);
    // Furni slot 0 is the move-through source, slot 1 the block-by source; user slot 0 the move-through users.
    // The card's own groups and defaults decide what is valid.
    const furniAllowed = [trigger?.inputSources?.furniAllowed[0], trigger?.inputSources?.furniAllowed[1]];
    const furniDefaults = [trigger?.inputSources?.furniDefaults[0] ?? 0, trigger?.inputSources?.furniDefaults[1] ?? 0];
    const userAllowed = trigger?.inputSources?.usersAllowed[0];
    const userDefault = trigger?.inputSources?.userDefaults[0] ?? 0;
    const normalizeFurni = (value: number, slot: number) => normalizeNativeSource(value, furniAllowed[slot], furniDefaults[slot]);
    const normalizeUsers = (value: number) => normalizeNativeSource(value, userAllowed, userDefault);

    useEffect(() => {
        if (!trigger) return;

        setKeepAltitude(getFlag(trigger.intData[0] ?? 0));
        setMoveThroughFurni(getFlag(trigger.intData[1] ?? 0));
        setMoveThroughUsers(getFlag(trigger.intData[2] ?? 0));
        setBlockByFurni(getFlag(trigger.intData[3] ?? 0));
        setMoveThroughFurniSource(normalizeFurni(trigger.furniSources[0] ?? furniDefaults[0], 0));
        setBlockByFurniSource(normalizeFurni(trigger.furniSources[1] ?? furniDefaults[1], 1));
        setMoveThroughUsersSource(normalizeUsers(trigger.userSources[0] ?? userDefault));
    }, [trigger, furniAllowed[0], furniAllowed[1], furniDefaults[0], furniDefaults[1], userAllowed, userDefault]);

    const save = () => {
        setIntParams([keepAltitude ? 1 : 0, moveThroughFurni ? 1 : 0, moveThroughUsers ? 1 : 0, blockByFurni ? 1 : 0]);
        // Furni tail: move-through source, then block-by source. User tail: move-through users source.
        setFurniSources([normalizeFurni(moveThroughFurniSource, 0), normalizeFurni(blockByFurniSource, 1)]);
        setUserSources([normalizeUsers(moveThroughUsersSource)]);
        setStringParam('');
    };

    const footer = useMemo(() => {
        return (
            <div className="flex flex-col gap-3">
                {(
                    <WiredSourcesSelector
                        showFurni={true}
                        furniSlot={0}
                        furniSource={moveThroughFurniSource}
                        furniTitle="wiredfurni.params.sources.furni.title.physics.0"
                        onChangeFurni={(value) => setMoveThroughFurniSource(normalizeFurni(value, 0))}
                    />
                )}
                {(
                    <WiredSourcesSelector
                        showFurni={true}
                        furniSlot={1}
                        furniSource={blockByFurniSource}
                        furniTitle="wiredfurni.params.sources.furni.title.physics.1"
                        onChangeFurni={(value) => setBlockByFurniSource(normalizeFurni(value, 1))}
                    />
                )}
                {(
                    <WiredSourcesSelector
                        showUsers={true}
                        userSlot={0}
                        userSource={moveThroughUsersSource}
                        usersTitle="wiredfurni.params.sources.users.title.physics.0"
                        allowClickedUserSource={false}
                        onChangeUsers={(value) => setMoveThroughUsersSource(normalizeUsers(value))}
                    />
                )}
            </div>
        );
    }, [blockByFurni, blockByFurniSource, moveThroughFurni, moveThroughFurniSource, moveThroughUsers, moveThroughUsersSource, furniAllowed[0], furniAllowed[1], userAllowed]);

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            nativeLayout
            footer={footer}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.select_options')}>
                <WiredCheckboxGroup>
                    <WiredCheckboxOption checked={keepAltitude} onChange={setKeepAltitude} label={LocalizeText('wiredfurni.params.movephysics.keep_altitude')} />
                    <WiredCheckboxOption checked={moveThroughFurni} onChange={setMoveThroughFurni} label={LocalizeText('wiredfurni.params.movephysics.move_through_furni')} />
                    <WiredCheckboxOption checked={moveThroughUsers} onChange={setMoveThroughUsers} label={LocalizeText('wiredfurni.params.movephysics.move_through_users')} />
                    <WiredCheckboxOption checked={blockByFurni} onChange={setBlockByFurni} label={LocalizeText('wiredfurni.params.movephysics.block_by_furni')} last />
                </WiredCheckboxGroup>
            </WiredSection>
        </WiredExtraBaseView>
    );
};
