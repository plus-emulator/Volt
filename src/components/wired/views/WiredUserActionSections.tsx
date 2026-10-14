import { FC } from 'react';
import { DANCE_OPTIONS, LocalizeText, localizeWithFallback, SIGN_OPTIONS, USER_ACTION, USER_ACTION_OPTIONS } from '../../../api';
import { WiredDropdown } from './WiredDropdown';
import { WiredCheckboxOption } from './WiredOptions';
import { WiredSection } from './WiredSection';

interface WiredUserActionSectionsProps {
    action: number;
    onActionChange: (action: number) => void;
    signEnabled: boolean;
    onSignEnabledChange: (enabled: boolean) => void;
    signId: number;
    onSignChange: (id: number) => void;
    danceEnabled: boolean;
    onDanceEnabledChange: (enabled: boolean) => void;
    danceId: number;
    onDanceChange: (id: number) => void;
}

/** AIR class_3945/class_4219/class_4178: identical action and optional sign/dance sections. */
export const WiredUserActionSections: FC<WiredUserActionSectionsProps> = props => {
    const changeAction = (action: number) => {
        props.onActionChange(action);
        // updateExtraSections() resets the new action's optional filter rather than reviving an old selection.
        if (action === USER_ACTION.SIGN) { props.onSignEnabledChange(false); props.onSignChange(-1); }
        if (action === USER_ACTION.DANCE) { props.onDanceEnabledChange(false); props.onDanceChange(-1); }
    };
    const sign = props.action === USER_ACTION.SIGN;
    const dance = props.action === USER_ACTION.DANCE;
    const kind = sign ? 'sign' : 'dance';
    const enabled = sign ? props.signEnabled : props.danceEnabled;
    return <>
        <WiredSection title={localizeWithFallback('wiredfurni.params.action_selection', 'Action')}>
            <WiredDropdown caption={LocalizeText('wiredfurni.tooltip.action')} value={props.action} onChange={changeAction}
                options={USER_ACTION_OPTIONS.map(option => ({id:option.value,label:localizeWithFallback(`wiredfurni.params.action.${option.value}`,option.fallback)}))} />
        </WiredSection>
        {(sign || dance) && <WiredSection title={LocalizeText(`wiredfurni.params.${kind}_selection`)}>
            <WiredCheckboxOption checked={enabled} onChange={sign ? props.onSignEnabledChange : props.onDanceEnabledChange}
                label={LocalizeText(`wiredfurni.params.${kind}_filter`)} last />
            <div style={{ marginLeft: 25, marginTop: 3 }}>
                <WiredDropdown caption={LocalizeText(`wiredfurni.tooltip.${kind}`)} disabled={!enabled}
                    value={sign ? props.signId : props.danceId} onChange={sign ? props.onSignChange : props.onDanceChange}
                    options={(sign ? SIGN_OPTIONS : DANCE_OPTIONS).map(option => ({id:option.value,label:LocalizeText(`wiredfurni.params.action.${kind}.${option.value}`)}))} />
            </div>
        </WiredSection>}
    </>;
};
