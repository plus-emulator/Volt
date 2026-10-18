import { CatalogGroupsComposer, GroupPurchasedEvent, GuildMembershipsMessageEvent, HabboGroupEntryData } from '@volt/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/** AIR UsersInGroup.REQUEST_TIMEOUT: the group list is asked for at most once every five seconds. */
const REFRESH_INTERVAL_MS = 5000;

const useUserGroupsStore = () => {
    const [groups, setGroups] = useState<HabboGroupEntryData[]>([]);
    const lastRequest = useRef(0);

    const request = useCallback(() => {
        lastRequest.current = Date.now();
        SendMessageComposer(new CatalogGroupsComposer());
    }, []);

    // AIR UsersInGroup.maybeGetGuildMemberships (selectors/UsersInGroup.as:90-98): a fresh list unless one was asked for in the last five seconds.
    const refresh = useCallback(() => {
        if (Date.now() > lastRequest.current + REFRESH_INTERVAL_MS) request();
    }, [request]);

    const onGuildMemberships = useCallback((event: GuildMembershipsMessageEvent) => {
        setGroups(event.getParser()?.groups || []);
    }, []);

    useMessageEvent<GuildMembershipsMessageEvent>(GuildMembershipsMessageEvent, onGuildMemberships);

    useMessageEvent<GroupPurchasedEvent>(GroupPurchasedEvent, () => request());

    useEffect(() => request(), [request]);

    return { groups, refresh };
};

export const useUserGroups = (): { data: HabboGroupEntryData[]; refresh: () => void } => {
    const { groups, refresh } = useSharedHook(useUserGroupsStore);

    return { data: groups, refresh };
};

registerSharedHook(useUserGroupsStore);
