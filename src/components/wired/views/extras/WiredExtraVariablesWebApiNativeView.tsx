import { WiredGenerateWebApiKeyComposer, WiredWebApiKeyResultEvent } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { CopyToClipboard, expandLocalizedText, localizeWithFallback, NotificationBubbleType, SendMessageComposer, WiredFurniType } from '../../../../api';
import {
    buildVariablesWebApiKeys,
    canAllowVariablesBulkDelete,
    parseVariablesWebApiKeys,
    withVariablesWebApiRoutes
} from '../../../../api/wired/WiredVariablesWebApiKeys';
import { WiredShellButton } from '../WiredShellHeaderView';
import { WiredText } from '../WiredText';
import { WiredTextArea } from '../WiredTextArea';
import { useMessageEvent, useNotification, useWired } from '../../../../hooks';
import { WiredCheckboxGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/**
 * VariablesWebApiAddon.as (code 2002, build WIN63-202610131318-860371703): usage warning, read key (L58-70 createApiKeySection false),
 * write key (createApiKeySection true, onWriteKeyChange L93), and the bulk delete permission (L72-91, confirm before enabling).
 * Keys are minted by the server: generate sends WiredGenerateWebApiKeyComposer(trigger.id, isReadKey), read true, write false (L123-130).
 * Save and load: VariablesWebApiAddon.as L98-116, see api/wired/WiredVariablesWebApiKeys.ts.
 */
/** Hotel texts carry `${key}` references and `\n` as two characters; the official box expands both. */
const localizeText = (key: string, fallback: string): string =>
    expandLocalizedText(localizeWithFallback(key, fallback), (nested) => localizeWithFallback(nested, '') || null);

export const WiredExtraVariablesWebApiNativeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const { showSingleBubble = null, showConfirm = null } = useNotification();
    const [readKey, setReadKey] = useState('');
    const [writeKey, setWriteKey] = useState('');
    const [bulkDelete, setBulkDelete] = useState(false);

    useEffect(() => {
        if (!trigger) return;

        const keys = parseVariablesWebApiKeys(trigger.stringData, trigger.intData);

        setReadKey(keys.readKey);
        setWriteKey(keys.writeKey);
        setBulkDelete(keys.bulkDelete);
    }, [trigger]);

    useMessageEvent<WiredWebApiKeyResultEvent>(WiredWebApiKeyResultEvent, (event) => {
        const parser = event.getParser();

        if (!trigger || parser.itemId !== trigger.id) return;

        if (parser.isReadKey) setReadKey(parser.key ?? '');
        else setWriteKey(parser.key ?? '');
    });

    const generate = (isReadKey: boolean) => {
        if (!trigger) return;

        SendMessageComposer(new WiredGenerateWebApiKeyComposer(trigger.id, isReadKey));
    };

    const copyKey = async (key: string) => {
        if (!key || !(await CopyToClipboard(key))) return;

        showSingleBubble?.(localizeWithFallback('notification.wired.copied_api_key', 'Successfully copied API key to clipboard'), NotificationBubbleType.INFO);
    };

    const toggleBulkDelete = (checked: boolean) => {
        if (!checked) {
            setBulkDelete(false);
            return;
        }

        showConfirm(
            withVariablesWebApiRoutes(
                localizeText(
                    'wiredfurni.params.web_api.permissions.bulk_delete.warning.desc',
                    'Enabling this option is dangerous.\nAccidentally calling the "/variables/bulk-delete" endpoint irreversibly deletes all contents of variables.\n\nMake sure to test your application on test variables in a different room first.'
                )
            ),
            () => setBulkDelete(true),
            null,
            null,
            null,
            localizeText('wiredfurni.params.web_api.permissions.bulk_delete.warning.title', 'Are you sure?')
        );
    };

    const save = () => {
        const { stringParam, intParams } = buildVariablesWebApiKeys({ readKey, writeKey, bulkDelete });

        setStringParam(stringParam);
        setIntParams(intParams);
    };

    const keySection = (isReadKey: boolean) => {
        const key = isReadKey ? readKey : writeKey;

        return (
            <WiredSection
                title={localizeWithFallback(
                    isReadKey ? 'wiredfurni.params.web_api.read.title' : 'wiredfurni.params.web_api.write.title',
                    isReadKey ? 'API key for reading:' : 'API key for writing:'
                )}
            >
                <div className="flex flex-col" style={{ gap: 5 }}>
                    <div className="flex" style={{ gap: 12 }}>
                        <WiredShellButton shellStyle="illumina" onClick={() => generate(isReadKey)}>
                            {localizeWithFallback(
                                key ? 'wiredfurni.params.web_api.regenerate' : 'wiredfurni.params.web_api.generate',
                                key ? 'Regenerate' : 'Generate'
                            )}
                        </WiredShellButton>
                        <WiredShellButton shellStyle="illumina" disabled={!key} onClick={() => (isReadKey ? setReadKey('') : setWriteKey(''))}>
                            {localizeWithFallback('wiredfurni.params.web_api.clear', 'Clear')}
                        </WiredShellButton>
                        <WiredShellButton shellStyle="illumina" disabled={!key} onClick={() => void copyKey(key)}>
                            {localizeWithFallback('wiredfurni.params.web_api.copy', 'Copy')}
                        </WiredShellButton>
                    </div>
                    <WiredTextArea label={isReadKey ? 'Read key' : 'Write key'} height={30} readOnly wrap value={key} />
                </div>
            </WiredSection>
        );
    };

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footerCollapsible={false}
        >
            <WiredSection title={localizeText('wiredfurni.params.general_box_warning', 'Usage warning:')}>
                <WiredText wrap color={15544371} text={localizeText(
                        'wiredfurni.params.web_api.usage_info',
                        "Create API keys for reading and writing variables from dedicated HTTPS endpoints.\nNobody else can see the contents of this box, and you should not share these keys with anyone you don't trust.\n\nAfter changing variable configurations in the room, you may need to reload the room for the API to work properly."
                    )} />
            </WiredSection>
            {keySection(true)}
            {keySection(false)}
            <WiredSection title={localizeWithFallback('wiredfurni.params.web_api.permissions', 'Extra permissions:')}>
                <WiredCheckboxGroup>
                    <WiredCheckboxOption
                        checked={bulkDelete}
                        disabled={!canAllowVariablesBulkDelete(writeKey)}
                        label={localizeWithFallback('wiredfurni.params.web_api.permissions.bulk_delete', 'Allow mass deletion')}
                        last={true}
                        onChange={toggleBulkDelete}
                    />
                </WiredCheckboxGroup>
                <div style={{ paddingLeft: 23 }}><WiredText soft wrap text={withVariablesWebApiRoutes(
                        localizeText(
                            'wiredfurni.params.web_api.permissions.bulk_delete.info',
                            'Enables access to the /variables/bulk-delete endpoint. Use with caution!'
                        )
                    )} /></div>
            </WiredSection>
        </WiredExtraBaseView>
    );
};
