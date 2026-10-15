import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useNotificationActions, useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredCheckboxGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { nativeSourceOptions, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionSendSignalView: FC<{}> = () => {
    const { trigger, furniIds, secondaryFurniIds, activePickSlot, setActivePickSlot, setIntParams, setFurniSources, setUserSources } = useWired();
    const { showConfirm } = useNotificationActions();
    const confirmationRevision = useRef([0, 0]);
    const [antennaSource, setAntennaSource] = useState(100);
    const [forwardedSource, setForwardedSource] = useState(200);
    const [userSource, setUserSource] = useState(200);
    const [splitFurni, setSplitFurni] = useState(false);
    const [splitUsers, setSplitUsers] = useState(false);

    useEffect(() => {
        setAntennaSource(trigger.furniSources[0]);
        setForwardedSource(trigger.furniSources[1]);
        setUserSource(trigger.userSources[0]);
        setSplitFurni(trigger.intData[0] === 1);
        setSplitUsers(trigger.intData[1] === 1);
        return () => { confirmationRevision.current = confirmationRevision.current.map(value => value + 1); };
    }, [trigger]);

    const save = () => {
        setIntParams([splitFurni ? 1 : 0, splitUsers ? 1 : 0]);
        setFurniSources([antennaSource, forwardedSource]);
        setUserSources([userSource]);
    };

    // AIR SendSignal.onChangeCheckbox confirms only an OFF -> ON edit, never loading saved flags.
    const changeSplit = (slot: number, checked: boolean) => {
        const update = slot === 0 ? setSplitFurni : setSplitUsers;
        const revision = ++confirmationRevision.current[slot];
        update(checked);
        if (checked) showConfirm(LocalizeText('wiredfurni.params.signal_warning.desc'), () => {}, () => {
            if (confirmationRevision.current[slot] === revision) update(false);
        }, null, null, LocalizeText('wiredfurni.params.signal_warning.title'));
    };
    const sourceRow = (slot: number, source: number, update: (source: number) => void, title: string) => {
        const pickSlot = source === 101 ? 1 : 0;
        return <WiredFurniSelectionSourceRow title={title} options={nativeSourceOptions(trigger.inputSources?.furniAllowed[slot] ?? [100, 101, 200, 201, 0], 'furni')}
            value={source} onChange={update} selectionKind={pickSlot === 0 ? 'primary' : 'secondary'}
            selectionActive={activePickSlot === pickSlot} selectionCount={(pickSlot === 0 ? furniIds : secondaryFurniIds).length}
            selectionLimit={trigger.maximumItemSelectionCount ?? 0} selectionEnabledValues={[100, 101]}
            onSelectionActivate={() => setActivePickSlot(pickSlot)} />;
    };
    return <WiredActionBaseView hasSpecialInput nativeLayout requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE} save={save} selectionPreview={<></>}
        footer={<>
            {sourceRow(0, antennaSource, setAntennaSource, 'wiredfurni.params.sources.furni.title.signal_antenna')}
            {sourceRow(1, forwardedSource, setForwardedSource, 'wiredfurni.params.sources.furni.title.signal_forward')}
            <WiredSourcesSelector showUsers usersTitle="wiredfurni.params.sources.users.title.signal_forward" userSource={userSource} onChangeUsers={setUserSource} />
        </>}>
        <WiredSection title={LocalizeText('wiredfurni.params.signal.send_options')}>
            <WiredCheckboxGroup>
                <WiredCheckboxOption checked={splitFurni} onChange={checked => changeSplit(0, checked)} label={LocalizeText('wiredfurni.params.signal.split_furni')} />
                <WiredCheckboxOption last checked={splitUsers} onChange={checked => changeSplit(1, checked)} label={LocalizeText('wiredfurni.params.signal.split_users')} />
            </WiredCheckboxGroup>
        </WiredSection>
    </WiredActionBaseView>;
};
