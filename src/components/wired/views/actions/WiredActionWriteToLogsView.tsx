import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredDropdown } from '../WiredDropdown';
import { WiredTextInput } from '../WiredTextInput';
import { WiredActionBaseView } from './WiredActionBaseView';

/**
 * Habbo's "write to logs" (`wf_act_log`, and `wf_act_neg_log` for when the conditions fail): a
 * message written into the room's wired log at a level, where the room log window lists it.
 * Native AIR class_3502 owns one integer `[level]` and the unmodified message string.
 */

/** Habbo's four levels, in the order the room log window numbers them (default texts: 0 INFO, 1 WARN, 2 ERROR, 3 DEBUG). */
export const WRITE_TO_LOGS_LEVELS: Array<{ fallback: string; value: number }> = [
    { fallback: 'INFO', value: 0 },
    { fallback: 'WARN', value: 1 },
    { fallback: 'ERROR', value: 2 },
    { fallback: 'DEBUG', value: 3 }
];

export const WRITE_TO_LOGS_MESSAGE_MAX_LENGTH = 400;
/** The official editor opens on the first level (observed int params [0]). */
const DEFAULT_LEVEL = 0;

const normalizeLevel = (value: number): number => (Number.isInteger(value) && value >= 0 && value <= 3 ? value : DEFAULT_LEVEL);

export const WiredActionWriteToLogsView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [message, setMessage] = useState('');
    const [level, setLevel] = useState(DEFAULT_LEVEL);

    useEffect(() => {
        if (!trigger) return;

        setMessage(trigger.stringData ?? '');
        setLevel(normalizeLevel(trigger.intData?.[0]));
    }, [trigger]);

    const save = () => {
        setStringParam(message);
        setIntParams([level]);
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
        >
            <WiredSection title={localizeWithFallback('wiredfurni.params.write_to_logs.log_level.title', 'Log level')}>
                <WiredDropdown caption={localizeWithFallback('wiredfurni.params.write_to_logs.log_level.title', 'Log level')}
                    value={level} onChange={setLevel}
                    options={WRITE_TO_LOGS_LEVELS.map(entry => ({ id: entry.value,
                        label: localizeWithFallback(`wiredfurni.params.write_to_logs.log_level.${entry.value}`, entry.fallback) }))} />
            </WiredSection>
            <WiredSection title={localizeWithFallback('wiredfurni.params.write_to_logs.log_message.title', 'Message')}>
                <WiredTextInput maxLength={WRITE_TO_LOGS_MESSAGE_MAX_LENGTH} value={message} onChange={setMessage} />
            </WiredSection>
        </WiredActionBaseView>
    );
};
