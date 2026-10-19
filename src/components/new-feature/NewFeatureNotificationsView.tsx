import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { GetOptionalConfigurationValue } from '../../api';
import { useRewardTracks } from '../../hooks';
import { NewFeatureNotificationView } from './NewFeatureNotificationView';

// SingularNotificationController.as (AIR WIN63-202610151745-318700621, com/sulake/habbo/notifications/singular):
// :97 looks at notifications.new_feature.active 2 s after start, :311-331 retries a key whose condition cannot be read yet 3 times, 2 s apart.
const START_DELAY_MS = 2000;
const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 3;

const readActiveKeys = (): string[] =>
{
    const value = GetOptionalConfigurationValue<unknown>('notifications.new_feature.active', '');
    const keys = Array.isArray(value) ? value.map(String) : String(value ?? '').split(',');

    return keys.map((key) => key.trim()).filter((key, index, list) => key.length && list.indexOf(key) === index);
};

/** The new-feature bars of notifications.new_feature.active, in that order. */
export const NewFeatureNotificationsView: FC<{}> = () =>
{
    const [shownKeys, setShownKeys] = useState<string[]>([]);
    const { tracks = [] } = useRewardTracks();
    const tracksRef = useRef(tracks);

    tracksRef.current = tracks;

    // getNewFeatureConditionState (:333-354): 1 show, 0 never, -1 not known yet.
    const getConditionState = useCallback((key: string): number =>
    {
        const condition = String(GetOptionalConfigurationValue<unknown>(`notifications.new_feature.condition.${ key }`, '') ?? '');
        const parts = condition.split(':');

        if (!condition.length || parts.length < 2) return 1;

        if (parts[0] === 'reward_track_incomplete')
        {
            const track = tracksRef.current.find((entry) => entry.id === parts[1]);

            if (!track) return -1;

            return track.complete ? 0 : 1;
        }

        return 1;
    }, []);

    useEffect(() =>
    {
        const timeouts: ReturnType<typeof setTimeout>[] = [];

        const tryShow = (key: string, attempt: number) =>
        {
            const state = getConditionState(key);

            if (state === 0) return;

            if (state === -1)
            {
                if (attempt < MAX_RETRIES) timeouts.push(setTimeout(() => tryShow(key, attempt + 1), RETRY_DELAY_MS));

                return;
            }

            setShownKeys((keys) => (keys.includes(key) ? keys : [...keys, key]));
        };

        timeouts.push(setTimeout(() => readActiveKeys().forEach((key) => tryShow(key, 0)), START_DELAY_MS));

        return () => timeouts.forEach((timeout) => clearTimeout(timeout));
    }, [getConditionState]);

    const onDispose = useCallback((key: string) => setShownKeys((keys) => keys.filter((entry) => entry !== key)), []);

    if (!shownKeys.length) return null;

    return (
        <>
            {shownKeys.map((key) => (
                <NewFeatureNotificationView key={key} featureKey={key} onDispose={onDispose} />
            ))}
        </>
    );
};
