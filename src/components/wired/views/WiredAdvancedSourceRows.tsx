import type { ConditionDefinition, Triggerable } from '@volt/renderer';
import { FC } from 'react';
import { useWired } from '../../../hooks';
import { WiredFurniSelectionSourceRow } from './WiredFurniSelectionSourceRow';
import { WiredQuantifierSection } from './WiredOptions';
import { nativeSourceOptions, WiredSourceRowFence, WiredSourcesSelector } from './WiredSourcesSelector';

export interface WiredAdvancedSourceRow {
    kind: 'furni' | 'users';
    slot: number;
    /** furniSelectionTitle / userSelectionTitle of the card; the AIR defaults otherwise. */
    title?: string;
    disabled?: boolean;
    /** forceHidePickFurniInstructions: no picks section, so the picked-furni label carries " [n/limit]" (WiredInputSourcePicker.as:333-357). */
    pickCount?: boolean;
}

const QUANTIFIER_KINDS: Record<number, 'furni' | 'users'> = { 1: 'furni', 2: 'users' };

const listed = (trigger: Triggerable | null, row: WiredAdvancedSourceRow) =>
    (row.kind === 'furni' ? trigger?.inputSources?.furniAllowed : trigger?.inputSources?.usersAllowed)?.[row.slot] !== undefined;

// Only condition definitions carry the quantifier type byte (ConditionDefinition.readFooter).
const asCondition = (trigger: Triggerable | null) => trigger && 'quantifierType' in trigger ? trigger as ConditionDefinition : null;

const quantifierKindOf = (trigger: Triggerable | null) => QUANTIFIER_KINDS[asCondition(trigger)?.quantifierType ?? 0];

/** AIR builds the section only when the server lists one of its selections or a quantifier type (L530). */
export const hasWiredAdvancedSources = (trigger: Triggerable | null, rows: WiredAdvancedSourceRow[]) =>
    !!trigger?.advanced && (!!quantifierKindOf(trigger) || rows.some(row => listed(trigger, row)));

const withSource = (sources: number[], defaults: number[] | undefined, slot: number, value: number) =>
{
    const next = [...sources];

    for (let index = next.length; index < slot; index++) next[index] = defaults?.[index] ?? 0;

    next[slot] = value;

    return next;
};

/**
 * The generic AIR advanced section (UserDefinedRoomEventsCtrl.createAdvancedSections, WIN63-202610131318-860371703 L520-619):
 * the condition's quantifier radio when the server sends a furni or users quantifier type, then one source row per listed
 * unmerged furni and user selection the server lists. Rows edit the card's own source arrays, which every save sends.
 */
export const WiredAdvancedSourceRows: FC<{ rows: WiredAdvancedSourceRow[] }> = ({ rows }) =>
{
    const { trigger = null, furniSources = [], setFurniSources = null, userSources = [], setUserSources = null, quantifier = 0, setQuantifier = null, furniIds = [] } = useWired();
    const condition = asCondition(trigger);
    const quantifierKind = quantifierKindOf(trigger);
    const furniDefaults = trigger?.inputSources?.furniDefaults;
    const userDefaults = trigger?.inputSources?.userDefaults;

    return (
        <>
            {quantifierKind && <WiredQuantifierSection name={`advancedQuantifier-${trigger?.id}`} kind={quantifierKind} negative={condition.inverse} value={quantifier} onChange={setQuantifier} />}
            {rows.filter(row => listed(trigger, row)).map(row => row.kind === 'furni' && row.pickCount
                ? (
                    <WiredSourceRowFence key={`furni-${row.slot}`} disabled={row.disabled}>
                        <WiredFurniSelectionSourceRow title={row.title ?? 'wiredfurni.params.sources.furni.title'} showSelectionToggle={false}
                            options={nativeSourceOptions(trigger.inputSources.furniAllowed[row.slot], 'furni')}
                            value={furniSources[row.slot] ?? furniDefaults?.[row.slot] ?? 0}
                            selectionKind="primary" selectionActive={true} selectionCount={furniIds.length}
                            selectionLimit={trigger.maximumItemSelectionCount ?? 0} selectionEnabledValues={[100]}
                            onChange={value => setFurniSources(current => withSource(current, furniDefaults, row.slot, value))} />
                    </WiredSourceRowFence>
                )
                : row.kind === 'furni'
                    ? (
                        <WiredSourcesSelector key={`furni-${row.slot}`} showFurni furniSlot={row.slot} furniTitle={row.title} rowDisabled={row.disabled}
                            furniSource={furniSources[row.slot] ?? furniDefaults?.[row.slot] ?? 0}
                            onChangeFurni={value => setFurniSources(current => withSource(current, furniDefaults, row.slot, value))} />
                    )
                    : (
                        <WiredSourcesSelector key={`users-${row.slot}`} showUsers userSlot={row.slot} usersTitle={row.title} rowDisabled={row.disabled}
                            userSource={userSources[row.slot] ?? userDefaults?.[row.slot] ?? 0}
                            onChangeUsers={value => setUserSources(current => withSource(current, userDefaults, row.slot, value))} />
                    ))}
        </>
    );
};
