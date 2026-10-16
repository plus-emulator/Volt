import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { nativeSourceOptions, useAvailableUserSources } from '../WiredSourcesSelector';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { WiredCollapsibleSection } from '../WiredCollapsibleSection';
import { WiredSection } from '../WiredSection';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredSourceTypeSelector } from '../WiredSourceTypeSelector';
import { WiredText } from '../WiredText';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionMoveFurniAsGroupView: FC<{}> = () => {
    const { trigger, setIntParams, setFurniSources, setUserSources, furniIds, secondaryFurniIds,
        activePickSlot, setActivePickSlot } = useWired();
    const offsetsRef = useRef<HTMLDivElement>(null);
    const [targetUser, setTargetUser] = useState(false);
    const [x, setX] = useState(0);
    const [y, setY] = useState(0);
    const [moverSource, setMoverSource] = useState(100);
    const [targetSource, setTargetSource] = useState(0);
    const [userSource, setUserSource] = useState(0);
    useEffect(() => {
        setTargetUser(trigger.intData[0] === 1);
        setX(trigger.intData[1]); setY(trigger.intData[2]);
        setMoverSource(trigger.furniSources[0]); setTargetSource(trigger.furniSources[1]); setUserSource(trigger.userSources[0]);
    }, [trigger]);
    const save = () => {
        setIntParams([targetUser ? 1 : 0, x, y]);
        setFurniSources([moverSource, targetSource]); setUserSources([userSource]);
    };
    const userOptions = useAvailableUserSources(trigger, nativeSourceOptions(trigger.inputSources?.usersAllowed[0] ?? [0, 200, 201], 'users'), undefined, !trigger.inputSources?.usersAllowed[0]?.length);
    const sourceRow = (slot: number, source: number, update: (source: number) => void) => {
        const users = slot === 1 && targetUser;
        const pickSlot = source === 101 ? 1 : 0;
        return <WiredFurniSelectionSourceRow
            title={slot === 0 ? 'wiredfurni.params.sources.furni.title.mv.0' : 'wiredfurni.params.sources.merged.title.target_location'}
            headerContent={slot === 1 ? <WiredSourceTypeSelector types={['furni', 'user']} value={targetUser ? 'user' : 'furni'} onChange={type => setTargetUser(type === 'user')} /> : undefined}
            options={users ? userOptions : nativeSourceOptions(trigger.inputSources?.furniAllowed[slot] ?? [100, 101, 200, 201, 0], 'furni')}
            value={source} onChange={update} selectionKind={pickSlot === 0 ? 'primary' : 'secondary'}
            selectionActive={activePickSlot === pickSlot} selectionCount={(pickSlot === 0 ? furniIds : secondaryFurniIds).length}
            selectionLimit={trigger.maximumItemSelectionCount ?? 0} selectionEnabledValues={users ? [] : [100, 101]} showSelectionToggle={!users}
            onSelectionActivate={() => setActivePickSlot(pickSlot)} />;
    };
    return <WiredActionBaseView advancedAlwaysVisible hasSpecialInput nativeLayout requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE} save={save}
        selectionPreview={<></>} footerCollapsible={false} validate={() => !offsetsRef.current?.querySelector('.is-invalid')}
        footer={<>{sourceRow(0, moverSource, setMoverSource)}{sourceRow(1, targetUser ? userSource : targetSource, targetUser ? setUserSource : setTargetSource)}</>}>
        <WiredCollapsibleSection defaultExpanded title={LocalizeText('wiredfurni.params.general_box_info')}>
            <WiredText soft wrap text={LocalizeText('wiredfurni.params.move_as_group.usage_info')} />
        </WiredCollapsibleSection>
        <WiredSection title={LocalizeText('wiredfurni.params.place_furni.offsets')}>
            <div ref={offsetsRef} style={{ display: 'flex', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><WiredText text={LocalizeText('wiredfurni.params.place_furni.offsets.x')} /><WiredNumberInput ariaLabel={LocalizeText('wiredfurni.params.place_furni.offsets.x')} width={45} min={-64} max={64} value={x} onChange={setX} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><WiredText text={LocalizeText('wiredfurni.params.place_furni.offsets.y')} /><WiredNumberInput ariaLabel={LocalizeText('wiredfurni.params.place_furni.offsets.y')} width={45} min={-64} max={64} value={y} onChange={setY} /></div>
            </div>
        </WiredSection>
    </WiredActionBaseView>;
};
