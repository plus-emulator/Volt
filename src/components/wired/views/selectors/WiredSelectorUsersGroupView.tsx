import { WiredDropdown } from '../WiredDropdown';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';
import { useUserGroups, useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

const GROUP_CURRENT_ROOM = 0;
const GROUP_SELECTED = 1;

export const WiredSelectorUsersGroupView: FC<{}> = () => {
    const { data: groups = [], refresh: refreshGroups } = useUserGroups();
    const [groupType, setGroupType] = useState(GROUP_CURRENT_ROOM);
    const [selectedGroupId, setSelectedGroupId] = useState(0);
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();

    // UsersInGroup.onEditStart asks the server for the current group list every time the editor opens.
    useEffect(() => {
        if (trigger) refreshGroups?.();
    }, [trigger, refreshGroups]);

    useEffect(() => {
        if (!trigger) return;

        // The text is the group id; empty is the room's own group.
        const groupText = (trigger.stringData ?? '').trim();

        setGroupType(groupText.length ? GROUP_SELECTED : GROUP_CURRENT_ROOM);
        setSelectedGroupId(groupText.length ? Number(groupText) : 0);
    }, [trigger]);

    const selectedGroupOptions = useMemo(() => groups.map((group) => ({ value: group.groupId, label: group.groupName })), [groups]);

    // Filter and inverse are category fields of the selector save; there are no owned ints.
    const save = () => {
        setIntParams([]);
        setStringParam(groupType === GROUP_SELECTED && selectedGroupOptions.some(group=>group.value===selectedGroupId) ? String(selectedGroupId) : '');
    };

    return (
        <WiredSelectorBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={0} save={save} hideDelay={true}>
            <WiredSection title={LocalizeText('wiredfurni.params.groupselection')}>
                <WiredRadioGroup name="usersGroupSelectorType" value={groupType} onChange={setGroupType}
                    options={[
                        {id:GROUP_CURRENT_ROOM,label:LocalizeText('wiredfurni.params.grouptype.0')},
                        {id:GROUP_SELECTED,label:LocalizeText('wiredfurni.params.grouptype.1'),extra:<WiredDropdown
                            caption={LocalizeText('wiredfurni.tooltip.group')} value={selectedGroupId} onChange={setSelectedGroupId}
                            options={selectedGroupOptions.map(group=>({id:group.value,label:group.label}))} />}
                    ]} />
            </WiredSection>
            <WiredSelectorOptionsSection />
        </WiredSelectorBaseView>
    );
};
