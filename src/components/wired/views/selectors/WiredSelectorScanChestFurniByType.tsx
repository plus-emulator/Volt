import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired, useWiredNativeVariables } from '../../../../hooks';
import { FurniPickSlotButtons } from '../conditions/WiredVariableConditionParts';
import { WiredExtraBaseView } from '../extras/WiredExtraBaseView';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries } from '../WiredVariablePickerData';

/**
 * The chest scanner add-on (AIR addons/chests/class_3960). Owned: [scanning mode (1 only the previewed items)]; variable: the context
 * variable the count is written to; furni: [the item types, the chests].
 */
export const WiredSelectorScanChestFurniByType: FC<{}> = () => {
    const {
        trigger = null,
        setIntParams = null,
        setFurniSources = null,
        setVariableIds = null,
        furniIds = [],
        secondaryFurniIds = [],
        setActivePickSlot = null
    } = useWired();
    const { contextVariableDefinitions = [] } = useWiredNativeVariables();
    const [scanningMode, setScanningMode] = useState(0);
    const [typesSource, setTypesSource] = useState(0);
    const [chestSource, setChestSource] = useState(100);
    const [variableToken, setVariableToken] = useState('');
    // The editor offers the context variables that hold a value and can be written.
    const entries = useMemo(
        () =>
            buildWiredVariablePickerEntries(
                'context',
                'give',
                contextVariableDefinitions.filter((definition) => !!definition.hasValue && !definition.isReadOnly)
            ),
        [contextVariableDefinitions]
    );

    useEffect(() => {
        if (!trigger) return;

        setScanningMode(trigger.intData.length > 0 && trigger.intData[0] === 1 ? 1 : 0);
        setTypesSource(trigger.furniSources[0] ?? 0);
        setChestSource(trigger.furniSources[1] ?? 100);
        setVariableToken(tokenOfVariableSlot(trigger.variableIds[0] ?? WIRED_VARIABLE_ABSENT));
        setActivePickSlot?.([trigger.furniSources[0], trigger.furniSources[1]].find((source) => source === 100 || source === 101) === 101 ? 1 : 0);
    }, [setActivePickSlot, trigger]);

    const save = useCallback(() => {
        setIntParams([scanningMode]);
        setFurniSources([typesSource, chestSource]);
        setVariableIds([variableSlotOf(variableToken)]);
    }, [chestSource, scanningMode, setFurniSources, setIntParams, setVariableIds, typesSource, variableToken]);

    const validate = () => !!variableToken;
    const pick = (source: number, set: (value: number) => void) => {
        set(source);

        if (source === 100 || source === 101) setActivePickSlot?.(source === 101 ? 1 : 0);
    };
    const lists = [0, 1].filter((list) => [typesSource, chestSource].includes(list === 0 ? 100 : 101));

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            validate={validate}
            footerCollapsible={false}
            footer={
                <>
                    <WiredSourcesSelector
                        showFurni={true}
                        furniSlot={0}
                        furniSource={typesSource}
                        furniTitle="wiredfurni.params.sources.furni.title.item_types"
                        onChangeFurni={(source) => pick(source, setTypesSource)}
                    />
                    <WiredSourcesSelector
                        showFurni={true}
                        furniSlot={1}
                        furniSource={chestSource}
                        furniTitle="wiredfurni.params.sources.furni.title.chests"
                        onChangeFurni={(source) => pick(source, setChestSource)}
                    />
                    <FurniPickSlotButtons
                        slots={lists.map((slot) => ({ slot: slot as 0 | 1, count: slot === 0 ? furniIds.length : secondaryFurniIds.length }))}
                    />
                </>
            }
        >
            <Text className="whitespace-pre-line">
                {localizeWithFallback(
                    'wiredfurni.params.chest_item_type_scanner.info',
                    'This add-on scans Wired chest(s) for certain furni types, and stores the amount of available items inside a context variable of choice'
                )}
            </Text>
            <WiredVariablePicker
                entries={entries}
                recentScope="scan-chest-variable"
                selectedToken={variableToken}
                onSelect={(entry) => setVariableToken(entry.token)}
            />
            <WiredSection title={localizeWithFallback('wiredfurni.params.chest_item_type_scanner', 'Scanning options:')}>
                <WiredRadioGroup
                    name="scanChestMode"
                    value={scanningMode}
                    onChange={setScanningMode}
                    options={[0, 1].map((value) => ({
                        id: value,
                        label: localizeWithFallback(`wiredfurni.params.chest_item_type_scanner.${value}`, `Mode ${value}`)
                    }))}
                />
            </WiredSection>
        </WiredExtraBaseView>
    );
};
