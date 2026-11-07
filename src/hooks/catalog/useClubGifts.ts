import { ClubGiftInfoEvent, ClubGiftInfoParser, GetClubGiftInfo } from '@volt/renderer';
import { UseQueryResult, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useVoltQuery } from '../../api/volt-query';
import { useMessageEvent } from '../events';

const CLUB_GIFTS_KEY = ['volt', 'catalog', 'clubGifts'];

/**
 * Habbo Club gift availability. The server also pushes ClubGiftInfoEvent after each claimed gift.
 * Every ClubGiftInfoEvent carries the full state, so it goes straight into the cache. Invalidating
 * here would loop: each refetch reply is the same event and cancels the refetch it answers.
 */
export const useClubGifts = (options: { enabled?: boolean } = {}): UseQueryResult<ClubGiftInfoParser> => {
    const queryClient = useQueryClient();

    const query = useVoltQuery<ClubGiftInfoEvent, ClubGiftInfoParser>({
        key: CLUB_GIFTS_KEY,
        request: () => new GetClubGiftInfo(),
        parser: ClubGiftInfoEvent,
        select: (event) => event.getParser(),
        enabled: options.enabled,
        staleTime: Infinity
    });

    const onClubGiftInfo = useCallback((event: ClubGiftInfoEvent) => queryClient.setQueryData(CLUB_GIFTS_KEY, event.getParser()), [queryClient]);

    useMessageEvent<ClubGiftInfoEvent>(ClubGiftInfoEvent, onClubGiftInfo);

    return query;
};
