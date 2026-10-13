import { WiredEditorContext } from '@octane/renderer';
import { FC } from 'react';
import { localizeWithFallback } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';

type TextPlaceholdersContext = Extract<WiredEditorContext, { type: 7 }>;

/**
 * MessageEditorPreset's "add placeholder" list: the names wired context section 7 carries for the stack (for
 * example trigger_text under a User Says Keyword trigger), each inserted as $(name).
 */
export const WiredTextPlaceholders: FC<{ onInsert: (token: string) => void }> = ({ onInsert }) =>
{
    const { trigger = null } = useWired();
    const names = trigger?.contexts?.find((context): context is TextPlaceholdersContext => context.type === 7)?.placeholderNames ?? [];

    if (!names.length) return null;

    return (
        <div className="flex flex-wrap items-center gap-1">
            <Text small>{localizeWithFallback('wiredfurni.params.message_editor.add_placeholder', 'Add placeholder')}</Text>
            {names.map((name) => (
                <button key={name} className="btn btn-sm btn-secondary" type="button" onClick={() => onInsert(`$(${name})`)}>
                    {`$(${name})`}
                </button>
            ))}
        </div>
    );
};
