import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType, WiredNativeVariableScope, tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { WiredSection } from '../WiredSection';
import { useWired } from '../../../../hooks';
import { WiredMergedSourceSection } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { FurniPickSlotButtons, VariableQuantifierRadios, VariableScopeButtons, useConditionVariableEntries } from './WiredVariableConditionParts';
import { scopeOfTargetCode, targetCodeOfScope } from '../../../../api';
import { WiredConditionBaseView } from './WiredConditionBaseView';

interface WiredConditionHasVariableViewProps {
    negative?: boolean;
}

/** The scopes the has-variable card offers: the furni, the user, or the execution's own context. */
const SCOPES: WiredNativeVariableScope[] = ['furni', 'user', 'context'];
/** The furni source that reads the selected furni, which the card needs picks for. */
const FURNI_SOURCE_SELECTED = 100;
const FURNI_SOURCE_SECONDARY_SELECTED = 101;

/**
 * Owned: [target]; furni: [the holder's furni source]; users: [the holder's user source]; variables: [the variable];
 * the quantifier is the condition's own field; the text is empty. The negative card is the same form, inverted by the server.
 */
export const WiredConditionHasVariableView: FC<WiredConditionHasVariableViewProps> = ({ negative = false }) => {
    const {
        trigger = null,
        furniIds = [],
        secondaryFurniIds = [], setActivePickSlot = null,
        quantifier = 0,
        setQuantifier = null,
        setIntParams = null,
        setStringParam = null,
        setVariableIds = null,
        setFurniSources = null,
        setUserSources = null
    } = useWired();
    const [scope, setScope] = useState<WiredNativeVariableScope>('user');
    const [variableToken, setVariableToken] = useState('');
    const [furniSource, setFurniSource] = useState(0);
    const [userSource, setUserSource] = useState(0);
    const entries = useConditionVariableEntries(scope, variableToken, 'exists');

    const picksFurni = scope === 'furni' && (furniSource === FURNI_SOURCE_SELECTED || furniSource === FURNI_SOURCE_SECONDARY_SELECTED);
    useEffect(() => {
        if (picksFurni) setActivePickSlot(furniSource === FURNI_SOURCE_SECONDARY_SELECTED ? 1 : 0);
    }, [furniSource, picksFurni, setActivePickSlot]);

    const requiresFurni = picksFurni ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;

    useEffect(() => {
        if (!trigger) return;

        setScope(scopeOfTargetCode(trigger.intData?.[0]));
        setVariableToken(tokenOfVariableSlot(trigger.variableIds?.[0]));
        setFurniSource(trigger.furniSources?.[0] ?? 0);
        setUserSource(trigger.userSources?.[0] ?? 0);
    }, [trigger]);

    const save = () => {
        setIntParams([targetCodeOfScope(scope)]);
        setFurniSources([scope === 'furni' ? furniSource : 0]);
        setUserSources([scope === 'user' ? userSource : 0]);
        setVariableIds([variableSlotOf(variableToken)]);
        setStringParam('');
    };

    const validate = () => !!variableToken;

    const handleScopeChange = (next: WiredNativeVariableScope) => {
        if (next === scope) return;

        setScope(next);
        setVariableToken('');
    };

    return (
        <WiredConditionBaseView
            nativeLayout
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            validate={validate}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <VariableQuantifierRadios
                        name={`wiredConditionHasVariableQuantifier-${negative ? 'neg' : 'pos'}`}
                        value={quantifier}
                        onChange={(value) => setQuantifier?.(value)}
                    />
                    {/* AIR HasVariable.as:82-111 (WIN63-202610131318): mergedSelections [[0,0]] titled "variables", always in the footer; a context holder reads as a fixed row. */}
                    <WiredMergedSourceSection scope={scope} title="wiredfurni.params.sources.merged.title.variables" furniSlot={0} userSlot={0}
                        furniSource={furniSource} userSource={userSource} onChangeFurni={setFurniSource} onChangeUsers={setUserSource} />
                    {picksFurni && <FurniPickSlotButtons slots={[furniSource === FURNI_SOURCE_SECONDARY_SELECTED ? { slot: 1, count: secondaryFurniIds.length } : { slot: 0, count: furniIds.length }]} />}
                </div>
            }
        >
            <WiredSection title={LocalizeText('wiredfurni.params.variables.variable_selection')} headerOptionsRight={<VariableScopeButtons scopes={SCOPES} value={scope} onChange={handleScopeChange} />}>
                <WiredVariablePicker entries={entries} recentScope="variable-conditions" selectedToken={variableToken} onSelect={entry => setVariableToken(entry.token)} onClear={() => setVariableToken('')} />
            </WiredSection>
        </WiredConditionBaseView>
    );
};
