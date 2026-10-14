import { WiredVariableShareSynchronizeComposer } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, SendMessageComposer, WiredFurniType } from '../../../../api';
import { Button, Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { WiredCheckboxGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/**
 * class_3963.as (base of VariableAddonShareAddon 1003 and VariableAddonImportAddon 1004), build WIN63-202610131318-860371703:
 * usage info, then three checkboxes (L19-39) saved as ints [textConnectors, subvariableCreators, variableFx] (readIntParamsFromForm L48),
 * loaded with getBoolean(0..2) (onEditStart L41). VariableAddonShareAddon.as L19-41 adds the Synchronize button, disabled
 * without write permission, which sends WiredVariableShareSynchronizeComposer(trigger.id) (class_3048, outgoing 2144).
 */
const CATEGORIES = [
    { key: 'wiredfurni.params.variables.addon_sharing.text_connectors', fallback: 'Text connectors' },
    { key: 'wiredfurni.params.variables.addon_sharing.subvariable_creators', fallback: 'Subvariable creators' },
    { key: 'wiredfurni.params.variables.addon_sharing.variable_fx', fallback: 'Variable FX' }
];

const WiredExtraVariableAddonView: FC<{ kind: 'share' | 'import' }> = ({ kind }) => {
    const { trigger = null, setIntParams = null } = useWired();
    const { roomSettings = null } = useWiredTools();
    const [categories, setCategories] = useState([false, false, false]);
    const isShare = kind === 'share';
    const usageInfo = isShare
        ? localizeWithFallback(
              'wiredfurni.params.variables.addon_share.usage_info',
              'Select which variable add-on categories this add-on shares with other rooms.'
          )
        : localizeWithFallback(
              'wiredfurni.params.variables.addon_import.usage_info',
              'Select which variable add-on categories this add-on imports from other rooms.'
          );

    useEffect(() => {
        if (!trigger) return;

        setCategories(CATEGORIES.map((_, index) => trigger.intData?.[index] === 1));
    }, [trigger]);

    const toggleCategory = (index: number, checked: boolean) =>
        setCategories((current) => current.map((value, position) => (position === index ? checked : value)));

    const save = () => setIntParams(categories.map((checked) => (checked ? 1 : 0)));

    const synchronize = () => {
        if (!trigger) return;

        SendMessageComposer(new WiredVariableShareSynchronizeComposer(trigger.id));
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <Text className="whitespace-pre-line">{usageInfo}</Text>
            <WiredSection title={localizeWithFallback('wiredfurni.params.variables.addon_sharing.categories', 'Categories')}>
                <WiredCheckboxGroup>
                    {CATEGORIES.map((category, index) => (
                        <WiredCheckboxOption
                            key={category.key}
                            checked={categories[index]}
                            label={localizeWithFallback(category.key, category.fallback)}
                            last={index === CATEGORIES.length - 1}
                            onChange={(checked) => toggleCategory(index, checked)}
                        />
                    ))}
                </WiredCheckboxGroup>
            </WiredSection>
            {isShare && (
                <Button disabled={!roomSettings?.canModify} fullWidth variant="secondary" onClick={synchronize}>
                    {localizeWithFallback('wiredfurni.params.variables.addon_share.synchronize', 'Synchronize')}
                </Button>
            )}
        </WiredExtraBaseView>
    );
};

/** VariableAddonShareAddon (1003, VARIABLE_ADDON_SHARE): the categories plus the Synchronize button. */
export const WiredExtraVariableAddonShareView: FC<{}> = () => <WiredExtraVariableAddonView kind="share" />;

/** VariableAddonImportAddon (1004, VARIABLE_ADDON_IMPORT): the categories only. */
export const WiredExtraVariableAddonImportView: FC<{}> = () => <WiredExtraVariableAddonView kind="import" />;
