import {
    FurnitureFloorUpdateEvent,
    GetRoomEngine,
    GetSessionDataManager,
    RoomEngineObjectEvent,
    RoomObjectCategory,
    RoomObjectVariable,
    Triggerable
} from '@volt/renderer';
import { FC, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { GetRoomSession, LocalizeText } from '../../../api';
import { Button, Text } from '../../../common';
import { useMessageEvent, useVoltEvent, useWired } from '../../../hooks';
import arrowLeft from '../../../assets/images/wired/native/arrow-left.png';
import arrowRight from '../../../assets/images/wired/native/arrow-right.png';
import { useWiredNative } from './WiredNativeContext';
import { WiredSection } from './WiredSection';
import { WiredShellButton } from './WiredShellHeaderView';
import { WiredText } from './WiredText';

export const FURNI_SOURCES = [
    { value: 100, label: 'wiredfurni.params.sources.furni.100' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' },
    { value: 201, label: 'wiredfurni.params.sources.furni.201' },
    { value: 0, label: 'wiredfurni.params.sources.furni.0' }
];

export const USER_SOURCES = [
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];

export const CLICKED_USER_SOURCE_VALUE = 11;
export const CLICKED_USER_SOURCE = { value: CLICKED_USER_SOURCE_VALUE, label: 'wiredfurni.params.sources.users.11' };

export const BOT_SOURCES = [
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 100, label: 'wiredfurni.params.sources.users.100' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];

export interface WiredSourceOption {
    value: number;
    label: string;
}

/** The card's own allowed group as options, labelled from the source keys; every value the server allows is listed. */
export const nativeSourceOptions = (values: number[] | undefined, kind: 'furni' | 'users'): WiredSourceOption[] =>
    sortWiredSourceOptions((values ?? []).map((value) => ({ value, label: `wiredfurni.params.sources.${kind}.${value}` })), kind);

const FURNI_SOURCE_LABEL_ORDER = [
    'wiredfurni.params.sources.furni.100',
    'wiredfurni.params.sources.furni.101',
    'wiredfurni.params.sources.furni.110',
    'wiredfurni.params.sources.furni.200',
    'wiredfurni.params.sources.furni.201',
    'wiredfurni.params.sources.furni.0',
    'wiredfurni.params.sources.furni.900'
];

const USER_SOURCE_LABEL_ORDER = [
    'wiredfurni.params.sources.users.0',
    'wiredfurni.params.sources.users.11',
    'wiredfurni.params.sources.users.200',
    'wiredfurni.params.sources.users.201',
    'wiredfurni.params.sources.users.100',
    'wiredfurni.params.sources.users.101',
    'wiredfurni.params.sources.users.900'
];

const getSourceSortIndex = (label: string, category: 'furni' | 'users') => {
    const order = category === 'furni' ? FURNI_SOURCE_LABEL_ORDER : USER_SOURCE_LABEL_ORDER;
    const index = order.indexOf(label);

    return index >= 0 ? index : order.length + 1;
};

export const sortWiredSourceOptions = (options: WiredSourceOption[], category: 'furni' | 'users') => {
    return [...options].sort((left, right) => {
        const orderDifference = getSourceSortIndex(left.label, category) - getSourceSortIndex(right.label, category);

        if (orderDifference !== 0) return orderDifference;

        return left.value - right.value;
    });
};

interface WiredSourcesSelectorProps {
    furniSlot?: number;
    /** The furni choice is fixed by the card's mode; the picker shows the value without letting it change. */
    furniDisabled?: boolean;
    userSlot?: number;
    showFurni?: boolean;
    showUsers?: boolean;
    furniSource?: number;
    userSource?: number;
    furniTitle?: string;
    usersTitle?: string;
    furniSources?: WiredSourceOption[];
    userSources?: WiredSourceOption[];
    allowClickedUserSource?: boolean;
    furniDetail?: ReactNode;
    userDetail?: ReactNode;
    /** Right-aligned header option of the shown section (AIR InputSourceSection's merged source type selector). */
    headerOption?: ReactNode;
    /** Only the source row, for a section the owner draws (AIR ValueOrVariablePopupPreset.attachInputSource). */
    bare?: boolean;
    /** isInputSourceDisabled: greys the row only; the section title and header type selector stay live (InputSourceControlPreset.updateUI L89-94). */
    rowDisabled?: boolean;
    onChangeFurni?: (source: number) => void;
    onChangeUsers?: (source: number) => void;
}

const BOT_SOURCE_TITLE = 'wiredfurni.params.sources.users.title.bots';

const CLICK_USER_TRIGGER_NAME = 'wf_trg_click_user';
const isClickUserTriggerName = (value?: string) => {
    if (!value) return false;

    return value.toLowerCase().startsWith(CLICK_USER_TRIGGER_NAME);
};

const hasClickUserTriggerInStack = (trigger: Triggerable) => {
    if (!trigger) return false;

    const roomSession = GetRoomSession();
    const roomId = roomSession?.roomId ?? GetRoomEngine().activeRoomId;

    if (roomId == null || roomId < 0) return false;

    const triggerObject = GetRoomEngine().getRoomObject(roomId, trigger.id, RoomObjectCategory.FLOOR);

    if (!triggerObject) return false;

    const triggerLocation = triggerObject.getLocation();
    const roomObjects = GetRoomEngine().getRoomObjects(roomId, RoomObjectCategory.FLOOR) || [];

    for (const roomObject of roomObjects) {
        if (!roomObject) continue;

        const location = roomObject.getLocation();

        if (!location || location.x !== triggerLocation.x || location.y !== triggerLocation.y) continue;

        const typeId = roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
        const furniData = GetSessionDataManager().getFloorItemData(typeId);

        if (isClickUserTriggerName(furniData?.className) || isClickUserTriggerName(furniData?.fullName) || isClickUserTriggerName(furniData?.name)) return true;
    }

    return false;
};

export const getAvailableUserSources = (
    trigger: Triggerable,
    userSources: WiredSourceOption[],
    currentUserSource: number,
    usersTitle = 'wiredfurni.params.sources.users.title',
    allowClickedUserSource = true
) => {
    if (!allowClickedUserSource || usersTitle === BOT_SOURCE_TITLE) return userSources;
    if (userSources.some((option) => option.value === CLICKED_USER_SOURCE_VALUE)) return userSources;

    if (!hasClickUserTriggerInStack(trigger)) return userSources;

    const triggerIndex = userSources.findIndex((option) => option.value === 0);

    if (triggerIndex === -1) return [...userSources, CLICKED_USER_SOURCE];

    return [...userSources.slice(0, triggerIndex + 1), CLICKED_USER_SOURCE, ...userSources.slice(triggerIndex + 1)];
};

export const useAvailableUserSources = (
    trigger: Triggerable,
    userSources: WiredSourceOption[] = USER_SOURCES,
    usersTitle = 'wiredfurni.params.sources.users.title',
    allowClickedUserSource = true
) => {
    const [hasClickUserTrigger, setHasClickUserTrigger] = useState(false);

    const refreshStackSources = useCallback(() => {
        setHasClickUserTrigger(hasClickUserTriggerInStack(trigger));
    }, [trigger]);

    useEffect(() => {
        refreshStackSources();

        if (!trigger) return;

        const intervalId = window.setInterval(refreshStackSources, 1000);

        return () => window.clearInterval(intervalId);
    }, [refreshStackSources, trigger]);

    useVoltEvent<RoomEngineObjectEvent>(
        [RoomEngineObjectEvent.ADDED, RoomEngineObjectEvent.REMOVED, RoomEngineObjectEvent.PLACED, RoomEngineObjectEvent.CONTENT_UPDATED],
        (event) => {
            if (!trigger) return;
            if (event.category !== RoomObjectCategory.FLOOR) return;

            const roomSession = GetRoomSession();
            const roomId = roomSession?.roomId ?? GetRoomEngine().activeRoomId;

            if (event.roomId !== roomId) return;

            refreshStackSources();
        },
        !!trigger
    );

    useMessageEvent<FurnitureFloorUpdateEvent>(FurnitureFloorUpdateEvent, () => {
        if (!trigger) return;

        refreshStackSources();
    });

    return useMemo(
        () => getAvailableUserSources(trigger, userSources, 0, usersTitle, allowClickedUserSource && hasClickUserTrigger),
        [allowClickedUserSource, hasClickUserTrigger, trigger, userSources, usersTitle]
    );
};

/** A greyed, inert wrapper around one source row (AIR InputSourceControlPreset.disabled); a plain fragment when enabled. */
export const WiredSourceRowFence: FC<{ disabled?: boolean; children?: ReactNode }> = ({ disabled = false, children = null }) =>
    disabled ? <fieldset disabled inert style={{ minWidth: 0, border: 0, padding: 0, margin: 0, opacity: 0.5 }}>{children}</fieldset> : <>{children}</>;

export const WiredSourcesSelector: FC<WiredSourcesSelectorProps> = (props) => {
    const {
        furniSlot = 0,
        furniDisabled = false,
        userSlot = 0,
        showFurni = false,
        showUsers = false,
        furniSource = 0,
        userSource = 0,
        furniTitle = 'wiredfurni.params.sources.furni.title',
        usersTitle = 'wiredfurni.params.sources.users.title',
        furniSources = null,
        userSources = null,
        allowClickedUserSource = true,
        furniDetail = null,
        userDetail = null,
        headerOption = null,
        bare = false,
        rowDisabled = false,
        onChangeFurni = null,
        onChangeUsers = null
    } = props;
    const { trigger = null } = useWired();
    const native = useWiredNative();
    const nativeFurniSources = trigger?.inputSources?.furniAllowed[furniSlot]?.map(value => ({ value, label: `wiredfurni.params.sources.furni.${value}` }));
    const nativeUserSources = trigger?.inputSources?.usersAllowed[userSlot]?.map(value => ({ value, label: `wiredfurni.params.sources.users.${value}` }));
    // The card's own allowed groups are the list whenever it sends one; explicit lists are only the fallback.
    const hasNativeFurni = !!nativeFurniSources?.length;
    const hasNativeUsers = !!nativeUserSources?.length;
    const availableUserSources = useAvailableUserSources(trigger, hasNativeUsers ? nativeUserSources : (userSources ?? USER_SOURCES), usersTitle, !hasNativeUsers && allowClickedUserSource);
    const orderedFurniSources = useMemo(() => sortWiredSourceOptions(hasNativeFurni ? nativeFurniSources : (furniSources ?? FURNI_SOURCES), 'furni'), [furniSources, hasNativeFurni, nativeFurniSources]);
    const orderedUserSources = useMemo(() => {
        if (usersTitle === BOT_SOURCE_TITLE) return [...availableUserSources];

        return sortWiredSourceOptions(availableUserSources, 'users');
    }, [availableUserSources, usersTitle]);

    useEffect(() => {
        if (!showUsers || !onChangeUsers) return;
        if (userSource !== CLICKED_USER_SOURCE_VALUE) return;
        if (availableUserSources.some((source) => source.value === CLICKED_USER_SOURCE_VALUE)) return;

        onChangeUsers(0);
    }, [availableUserSources, onChangeUsers, showUsers, userSource]);

    const furniIndex = Math.max(
        0,
        orderedFurniSources.findIndex((s) => s.value === furniSource)
    );
    const userIndex = Math.max(
        0,
        orderedUserSources.findIndex((s) => s.value === userSource)
    );

    const prevFurni = () => {
        const next = (furniIndex - 1 + orderedFurniSources.length) % orderedFurniSources.length;
        onChangeFurni && onChangeFurni(orderedFurniSources[next].value);
    };

    const nextFurni = () => {
        const next = (furniIndex + 1) % orderedFurniSources.length;
        onChangeFurni && onChangeFurni(orderedFurniSources[next].value);
    };

    const prevUsers = () => {
        const next = (userIndex - 1 + orderedUserSources.length) % orderedUserSources.length;
        onChangeUsers && onChangeUsers(orderedUserSources[next].value);
    };

    const nextUsers = () => {
        const next = (userIndex + 1) % orderedUserSources.length;
        onChangeUsers && onChangeUsers(orderedUserSources[next].value);
    };

    if (!showFurni && !showUsers) return null;

    if (native) {
        const row = (label: string, onPrevious: () => void, onNext: () => void, disabled = false) => <WiredSourceRow disabled={disabled} label={LocalizeText(label)} onNext={onNext} onPrevious={onPrevious} />;
        const furniRow = <WiredSourceRowFence disabled={rowDisabled}>{row(orderedFurniSources[furniIndex].label, prevFurni, nextFurni, furniDisabled)}{furniDetail}</WiredSourceRowFence>;
        const userRow = <WiredSourceRowFence disabled={rowDisabled}>{row(orderedUserSources[userIndex].label, prevUsers, nextUsers)}{userDetail}</WiredSourceRowFence>;

        return (
            <>
                {showFurni && (bare ? furniRow : <WiredSection title={LocalizeText(furniTitle)} headerOptionsRight={headerOption}>{furniRow}</WiredSection>)}
                {showUsers && (bare ? userRow : <WiredSection title={LocalizeText(usersTitle)} headerOptionsRight={headerOption}>{userRow}</WiredSection>)}
            </>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {showFurni && (
                <>
                    <Text bold>{LocalizeText(furniTitle)}</Text>
                    {headerOption}
                    <WiredSourceRowFence disabled={rowDisabled}><div className="flex items-center gap-1">
                        <Button variant="primary" classNames={['volt-wired__picker-button']} className="px-2 py-1" disabled={furniDisabled} onClick={prevFurni}>
                            <FaChevronLeft />
                        </Button>
                        <div className="flex min-w-0 flex-1 items-center justify-center volt-wired__picker-label">
                            <Text small className="text-center">
                                {LocalizeText(orderedFurniSources[furniIndex].label)}
                            </Text>
                        </div>
                        <Button variant="primary" classNames={['volt-wired__picker-button']} className="px-2 py-1" disabled={furniDisabled} onClick={nextFurni}>
                            <FaChevronRight />
                        </Button>
                    </div></WiredSourceRowFence>
                    {furniDetail && <div className="volt-wired__source-detail">{furniDetail}</div>}
                </>
            )}

            {showFurni && showUsers && <hr className="m-0 bg-dark" />}

            {showUsers && (
                <>
                    <Text bold>{LocalizeText(usersTitle)}</Text>
                    {headerOption}
                    <WiredSourceRowFence disabled={rowDisabled}><div className="flex items-center gap-1">
                        <Button variant="primary" classNames={['volt-wired__picker-button']} className="px-2 py-1" onClick={prevUsers}>
                            <FaChevronLeft />
                        </Button>
                        <div className="flex min-w-0 flex-1 items-center justify-center volt-wired__picker-label">
                            <Text small className="text-center">
                                {LocalizeText(orderedUserSources[userIndex].label)}
                            </Text>
                        </div>
                        <Button variant="primary" classNames={['volt-wired__picker-button']} className="px-2 py-1" onClick={nextUsers}>
                            <FaChevronRight />
                        </Button>
                    </div></WiredSourceRowFence>
                    {userDetail && <div className="volt-wired__source-detail">{userDetail}</div>}
                </>
            )}
        </div>
    );
};

/** Native height of the LR list (inputSourceListMinHeight) and of the arrow buttons. */
const SOURCE_LIST_MIN_HEIGHT = 23;
const SOURCE_BUTTON_HEIGHT = 20;

/**
 * InputSourceSection's LR row: the centred list puts every item at int((height - itemHeight) / 2), the label wraps
 * in its centre column (TextParam wrap, align centre) and a two-line label makes the row taller than 23px.
 */
export const WiredSourceRow: FC<{ label: string; onPrevious: () => void; onNext: () => void; disabled?: boolean }> = ({ label, onPrevious, onNext, disabled = false }) =>
{
    const labelRef = useRef<HTMLSpanElement>(null);
    const [labelHeight, setLabelHeight] = useState(16);

    useLayoutEffect(() =>
    {
        const element = labelRef.current;

        if (!element) return;

        const observer = new ResizeObserver(() => setLabelHeight(Math.round(element.getBoundingClientRect().height)));

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const rowHeight = Math.max(SOURCE_LIST_MIN_HEIGHT, labelHeight);
    const buttonTop = Math.trunc((rowHeight - SOURCE_BUTTON_HEIGHT) / 2);

    return (
        <div className="volt-wired__slider-row volt-wired__source-row" style={{ height: rowHeight + 8 }}>
            <WiredShellButton className="volt-wired__icon-button" shellStyle="illumina" style={{ marginTop: buttonTop }} disabled={disabled} onClick={onPrevious}>
                <img alt="" draggable={false} src={arrowLeft} />
            </WiredShellButton>
            <span className="volt-wired__source-label" style={{ marginTop: Math.trunc((rowHeight - labelHeight) / 2) }}>
                <span ref={labelRef} className="volt-wired__source-label-text">
                    <WiredText text={label} wrap={true} />
                </span>
            </span>
            <WiredShellButton className="volt-wired__icon-button" shellStyle="illumina" style={{ marginTop: buttonTop }} disabled={disabled} onClick={onNext}>
                <img alt="" draggable={false} src={arrowRight} />
            </WiredShellButton>
        </div>
    );
};

export type WiredMergedSourceScope = 'furni' | 'user' | 'users' | 'global' | 'context';

const NO_CYCLE = () => undefined;

/**
 * AIR WiredInputSourcePicker.refreshContainer (WIN63-202610131318, L276-389): a merged section whose type is a room or
 * context holder reads "wiredfurni.params.sources.<global|context>" and InputSourceControlPreset.updateUI (L91-94)
 * disables both arrows (isButtonsDisabled). Only the whole section is disabled by isInputSourceDisabled.
 */
export const WiredHolderSourceSection: FC<{ title: string; scope: 'global' | 'context'; headerOption?: ReactNode; bare?: boolean; rowDisabled?: boolean }> = ({ title, scope, headerOption = null, bare = false, rowDisabled = false }) =>
{
    const native = useWiredNative();
    const label = LocalizeText(`wiredfurni.params.sources.${scope}`);
    const row = <WiredSourceRowFence disabled={rowDisabled}>{native ? <WiredSourceRow label={label} disabled onPrevious={NO_CYCLE} onNext={NO_CYCLE} /> : <Text>{label}</Text>}</WiredSourceRowFence>;

    if (bare) return row;

    return <WiredSection title={LocalizeText(title)} headerOptionsRight={headerOption}>{row}</WiredSection>;
};

/** One merged input section (AIR mergedSelections entry): furni or users cycle their sources; room and context holders are fixed. */
export const WiredMergedSourceSection: FC<{
    scope: WiredMergedSourceScope;
    title: string;
    furniSlot?: number;
    userSlot?: number;
    furniSource?: number;
    userSource?: number;
    disabled?: boolean;
    bare?: boolean;
    /** The section's type selector when the card has no custom type picker (AIR InputSourceSection, hasCustomTypePicker false). */
    headerOption?: ReactNode;
    onChangeFurni?: (value: number) => void;
    onChangeUsers?: (value: number) => void;
}> = ({ scope, title, furniSlot = 0, userSlot = 0, furniSource = 0, userSource = 0, disabled = false, bare = false, headerOption = null, onChangeFurni = null, onChangeUsers = null }) =>
{
    // isInputSourceDisabled greys the row only (InputSourceControlPreset.updateUI L89-94); the title and header type selector stay live.
    return scope === 'global' || scope === 'context'
        ? <WiredHolderSourceSection title={title} scope={scope} headerOption={headerOption} bare={bare} rowDisabled={disabled} />
        : <WiredSourcesSelector showFurni={scope === 'furni'} showUsers={scope !== 'furni'} furniSlot={furniSlot} userSlot={userSlot} headerOption={headerOption} bare={bare} rowDisabled={disabled}
            furniSource={furniSource} userSource={userSource} furniTitle={title} usersTitle={title} onChangeFurni={onChangeFurni} onChangeUsers={onChangeUsers} />;
};
