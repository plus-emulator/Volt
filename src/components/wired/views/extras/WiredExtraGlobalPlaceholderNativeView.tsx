import { FC, useEffect, useMemo, useState } from 'react';
import {
    GLOBAL_PLACEHOLDER_VALUE_MAX_LENGTH,
    LocalizeText,
    localizeWithFallback,
    normalizeGlobalPlaceholderName,
    normalizeGlobalPlaceholderValue,
    WiredFurniType
} from '../../../../api';
import { Text } from '../../../../common';
import { useNotification, useWired } from '../../../../hooks';
import { WiredDropdown } from '../WiredDropdown';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredTextInput } from '../WiredTextInput';
import { WiredPlaceholderNameSection } from './WiredTextPlaceholderSections';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const FROM_VALUE = 0;
const FROM_ANOTHER_ROOM = 1;

interface ISharedPlaceholder {
    roomId: number;
    roomName: string;
    name: string;
}

/**
 * GlobalPlaceholderAddon.as (code 2000, GLOBAL_PLACEHOLDER), build WIN63-202610131318-860371703: the placeholder name, then
 * a radio choosing a typed value (L53-62) or another room's placeholder (room dropdown from findRooms L132, placeholder
 * dropdown from initPlaceholdersForRoom L97). Save (readIntParamsFromForm L155, readStringParamFromForm L160):
 * ints [mode, 0, room id or 0], string `name TAB value` (custom text) or `name TAB placeholder name` (room mode).
 * Load (onEditStart L64): getInt(0), getString(0) name, getString(1) text or placeholder, getInt(2) room id, and the
 * room list from wiredContext.referencePlaceholderList, which the server sends as WiredContext type 6.
 */
export const WiredExtraGlobalPlaceholderNativeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const { simpleAlert = null } = useNotification();
    const [placeholderName, setPlaceholderName] = useState('');
    const [mode, setMode] = useState(FROM_VALUE);
    const [customText, setCustomText] = useState('');
    const [roomId, setRoomId] = useState(0);
    const [sharedPlaceholder, setSharedPlaceholder] = useState('');

    const sharedList = useMemo<ISharedPlaceholder[] | null>(() => {
        const context = trigger?.contexts?.find((entry) => entry.type === 6);

        return context?.type === 6 ? context.placeholders : null;
    }, [trigger]);

    const rooms = useMemo(() => {
        const seen = new Map<number, string>();

        for (const placeholder of sharedList ?? []) {
            if (!seen.has(placeholder.roomId)) seen.set(placeholder.roomId, placeholder.roomName);
        }

        return [...seen.entries()].map(([id, label]) => ({ id, label }));
    }, [sharedList]);

    const roomPlaceholders = useMemo(
        () => (sharedList ?? []).filter((placeholder) => placeholder.roomId === roomId).map((placeholder) => placeholder.name),
        [sharedList, roomId]
    );

    const placeholderOptions = useMemo(() => roomPlaceholders.map((name, index) => ({ id: index, label: name })), [roomPlaceholders]);
    const selectedPlaceholderIndex = roomPlaceholders.indexOf(sharedPlaceholder);

    useEffect(() => {
        if (!trigger) return;

        const [name = '', second = ''] = (trigger.stringData ?? '').split('\t');
        const nextMode = trigger.intData?.[0] === FROM_ANOTHER_ROOM ? FROM_ANOTHER_ROOM : FROM_VALUE;

        setPlaceholderName(normalizeGlobalPlaceholderName(name));
        setMode(nextMode);
        setCustomText(nextMode === FROM_VALUE ? normalizeGlobalPlaceholderValue(second) : '');
        setRoomId(nextMode === FROM_ANOTHER_ROOM ? Math.max(0, Math.trunc(trigger.intData?.[2] ?? 0)) : 0);
        setSharedPlaceholder(nextMode === FROM_ANOTHER_ROOM ? second : '');
    }, [trigger]);

    const selectRoom = (nextRoomId: number) => {
        setRoomId(nextRoomId);
        setSharedPlaceholder('');
    };

    // The official editor names this placeholder after the shared one while the name is empty or still the previous pick's.
    const selectSharedPlaceholder = (index: number) => {
        const picked = roomPlaceholders[index] ?? '';
        const renames = !placeholderName.length || (!!sharedPlaceholder && sharedPlaceholder === placeholderName);

        if (renames) setPlaceholderName(normalizeGlobalPlaceholderName(picked));

        setSharedPlaceholder(picked);
    };

    // The server refuses a placeholder without a name (a string starting with the tab), so the editor stops it first.
    const validate = () => {
        if (normalizeGlobalPlaceholderName(placeholderName).length > 0) return true;

        simpleAlert?.(
            localizeWithFallback('wiredfurni.error.placeholder.name_length', 'Placeholder length must be between 1 and 40 characters.'),
            null,
            null,
            null,
            LocalizeText('wiredfurni.title')
        );

        return false;
    };

    const save = () => {
        const isRoomMode = mode === FROM_ANOTHER_ROOM;
        const source = isRoomMode ? (roomPlaceholders.includes(sharedPlaceholder) ? sharedPlaceholder : '') : normalizeGlobalPlaceholderValue(customText);

        setIntParams([mode, 0, isRoomMode ? Math.max(0, roomId) : 0]);
        setStringParam(`${normalizeGlobalPlaceholderName(placeholderName)}\t${source}`);
    };

    const anotherRoomDisabled = sharedList === null;
    const valueDisabled = sharedList === null && mode === FROM_ANOTHER_ROOM;

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={validate}
        >
            <WiredPlaceholderNameSection name={placeholderName} onChange={setPlaceholderName} />
            <WiredSection title={localizeWithFallback('wiredfurni.params.choose_type', 'Choose type:')}>
                <WiredRadioGroup
                    name="wiredGlobalPlaceholderSource"
                    options={[
                        {
                            id: FROM_VALUE,
                            label: localizeWithFallback('wiredfurni.params.from_value', 'From value'),
                            disabled: valueDisabled,
                            extra:
                                mode === FROM_VALUE ? (
                                    <WiredTextInput
                                        maxLength={GLOBAL_PLACEHOLDER_VALUE_MAX_LENGTH}
                                        value={customText}
                                        onChange={(value) => setCustomText(normalizeGlobalPlaceholderValue(value))}
                                    />
                                ) : null
                        },
                        {
                            id: FROM_ANOTHER_ROOM,
                            label: localizeWithFallback('wiredfurni.params.from_another_room', 'From another room'),
                            disabled: anotherRoomDisabled,
                            extra:
                                mode === FROM_ANOTHER_ROOM ? (
                                    <div className="flex flex-col gap-1">
                                        <Text>{localizeWithFallback('wiredfurni.params.room_selection', 'Choose room:')}</Text>
                                        <WiredDropdown
                                            caption={localizeWithFallback('wiredfurni.params.room_selection.tooltip', 'Choose a room')}
                                            options={rooms}
                                            value={roomId || -1}
                                            onChange={selectRoom}
                                        />
                                        <Text>{localizeWithFallback('wiredfurni.params.placeholder_selection', 'Choose placeholder:')}</Text>
                                        <WiredDropdown
                                            caption={localizeWithFallback('wiredfurni.params.placeholder_selection.tooltip', 'Choose a placeholder')}
                                            options={placeholderOptions}
                                            value={selectedPlaceholderIndex}
                                            onChange={selectSharedPlaceholder}
                                        />
                                    </div>
                                ) : null
                        }
                    ]}
                    value={mode}
                    onChange={setMode}
                />
            </WiredSection>
        </WiredExtraBaseView>
    );
};
