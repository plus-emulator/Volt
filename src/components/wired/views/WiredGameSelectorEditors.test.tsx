import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from './WiredNativeContext';
const state=vi.hoisted(()=>({
    trigger:{intData:[10],stringData:'7',furniSources:[200],userSources:[201]},filter:true,inverse:false,quantifier:1,
    setIntParams:vi.fn(),setStringParam:vi.fn(),setFurniSources:vi.fn(),setUserSources:vi.fn(),setQuantifier:vi.fn(),setFilter:vi.fn(),setInverse:vi.fn()
}));
vi.mock('../../../api',async()=>({
    ...(await vi.importActual('../../../api/wired/WiredUserActionOptions')),
    LocalizeText:(key:string)=>key,localizeWithFallback:(key:string)=>key,
    GetOwnRoomObject:()=>({model:{getValue:()=>999}}),
    WiredFurniType:{STUFF_SELECTION_OPTION_NONE:0,STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT:2}
}));
vi.mock('../../../hooks',()=>({useWired:()=>state,useUserGroups:()=>({data:[{groupId:20,groupName:'Group Twenty'},{groupId:30,groupName:'Group Thirty'}]})}));
vi.mock('../../../common',()=>({Text:({children}:PropsWithChildren)=><span>{children}</span>}));
vi.mock('../../mod-tools/native/NativeSkinView',()=>({NativeSkinView:()=>null}));
vi.mock('./WiredText',()=>({WiredText:({text}:{text:string})=><span>{text}</span>}));
vi.mock('./WiredSourcesSelector',()=>({WiredSourcesSelector:()=>null}));
vi.mock('./WiredShellHeaderView',()=>({WiredShellButton:({children,onClick}:PropsWithChildren<{onClick:()=>void}>)=><button onClick={onClick}>{children}</button>}));
vi.mock('./WiredDropdown',()=>({WiredDropdown:({value,options,disabled,caption,onChange}:any)=><select aria-label={caption} disabled={disabled} value={value} onChange={event=>onChange(Number(event.target.value))}><option value={-1}>{caption}</option>{options.map((option:any)=><option key={option.id} value={option.id}>{option.label}</option>)}</select>}));
const Base=({children,footer,save,nativeLayout,cardStyle}:PropsWithChildren<{footer?:ReactNode;save:()=>void;nativeLayout:boolean;cardStyle?:unknown}>)=><WiredNativeContext.Provider value={nativeLayout}><div data-testid="editor" data-native={String(nativeLayout)} data-width={String(cardStyle)}>{children}{footer}<button onClick={save}>Save</button></div></WiredNativeContext.Provider>;
vi.mock('./selectors/WiredSelectorBaseView',()=>({WiredSelectorBaseView:(props:any)=><Base {...props}/>}));
vi.mock('./triggers/WiredTriggerBaseView',()=>({WiredTriggerBaseView:(props:any)=><Base {...props}/>}));
vi.mock('./conditions/WiredConditionBaseView',()=>({WiredConditionBaseView:(props:any)=><Base {...props}/>}));
import { WiredTriggerUserPerformsActionView } from './triggers/WiredTriggerUserPerformsActionView';
import { WiredConditionUserPerformsActionView } from './conditions/WiredConditionUserPerformsActionView';
import { WiredSelectorUsersByActionView } from './selectors/WiredSelectorUsersByActionView';
import { WiredSelectorUsersTeamView } from './selectors/WiredSelectorUsersTeamView';
import { WiredSelectorUsersHandItemView } from './selectors/WiredSelectorUsersHandItemView';
import { WiredSelectorUsersOnFurniView } from './selectors/WiredSelectorUsersOnFurniView';
import { WiredSelectorFurniOnFurniView } from './selectors/WiredSelectorFurniOnFurniView';

describe('Native game selector editors',()=>{
    beforeEach(()=>{vi.clearAllMocks();state.trigger={intData:[10],stringData:'7',furniSources:[200],userSources:[201]};});
    afterEach(cleanup);
    it.each([WiredTriggerUserPerformsActionView,WiredConditionUserPerformsActionView,WiredSelectorUsersByActionView])('keeps saved sign selection and clears old extras when changing action',View=>{
        render(<View/>);
        expect(screen.getByTestId('editor').getAttribute('data-native')).toBe('true');
        expect(screen.getByRole('combobox',{name:'wiredfurni.tooltip.sign'})).toHaveProperty('value','7');
        fireEvent.click(screen.getByText('Save'));expect(state.setIntParams).toHaveBeenLastCalledWith([10]);expect(state.setStringParam).toHaveBeenLastCalledWith('7');
        const action=screen.getByRole('combobox',{name:'wiredfurni.tooltip.action'});
        fireEvent.change(action,{target:{value:'11'}});
        const dance=screen.getByRole('combobox',{name:'wiredfurni.tooltip.dance'});
        expect(dance).toHaveProperty('disabled',true);expect(dance).toHaveProperty('value','-1');
        fireEvent.click(screen.getByRole('checkbox',{name:'wiredfurni.params.dance_filter'}));
        fireEvent.change(dance,{target:{value:'4'}});fireEvent.click(screen.getByText('Save'));
        expect(state.setIntParams).toHaveBeenLastCalledWith([11]);expect(state.setStringParam).toHaveBeenLastCalledWith('dance 4');
        fireEvent.change(action,{target:{value:'10'}});
        expect(screen.getByRole('combobox',{name:'wiredfurni.tooltip.sign'})).toHaveProperty('disabled',true);
        fireEvent.click(screen.getByText('Save'));expect(state.setStringParam).toHaveBeenLastCalledWith('');
    });
    it('uses two team columns with Any spanning the first row and separate category flags',()=>{
        state.trigger.intData=[2];const {container}=render(<WiredSelectorUsersTeamView/>);
        const grid=container.querySelector('.volt-wired__options--radio') as HTMLElement;
        expect(grid.style.gridTemplateColumns).toContain('repeat(2');
        expect((grid.firstElementChild as HTMLElement).style.gridColumn).toBe('1 / -1');
        expect(screen.getByTestId('editor').getAttribute('data-width')).toBe('undefined');
        fireEvent.click(screen.getByRole('radio',{name:'wiredfurni.params.team.4'}));
        fireEvent.click(screen.getByRole('checkbox',{name:'wiredfurni.params.selector_option.1'}));
        fireEvent.click(screen.getByText('Save'));expect(state.setIntParams).toHaveBeenLastCalledWith([4]);expect(state.setInverse).toHaveBeenCalledWith(true);
    });
    it('captures and displays a custom hand item without losing category flags',()=>{
        state.trigger.intData=[1127];render(<WiredSelectorUsersHandItemView/>);
        expect(screen.getByRole('combobox')).toHaveProperty('value','1127');
        fireEvent.click(screen.getByText('wiredfurni.params.capture.handitem'));
        expect(screen.getByRole('combobox')).toHaveProperty('value','999');
        fireEvent.click(screen.getByText('Save'));expect(state.setIntParams).toHaveBeenLastCalledWith([999]);
        expect(screen.getByRole('checkbox',{name:'wiredfurni.params.selector_option.0'})).toHaveProperty('checked',true);
    });
    it.each([[WiredSelectorUsersOnFurniView,[]],[WiredSelectorFurniOnFurniView,[3]]] as const)('retains the on-furniture selector source and owned ints', (View,ints)=>{
        state.trigger.intData=[3];render(<View/>);fireEvent.click(screen.getByText('Save'));
        expect(screen.getByTestId('editor').getAttribute('data-native')).toBe('true');
        expect(state.setFurniSources).toHaveBeenLastCalledWith([200]);expect(state.setIntParams).toHaveBeenLastCalledWith(ints);
    });
});

import { WiredSelectorUsersByNameView } from './selectors/WiredSelectorUsersByNameView';

import { WiredSelectorUsersByTypeView } from './selectors/WiredSelectorUsersByTypeView';

import { WiredSelectorUsersGroupView } from './selectors/WiredSelectorUsersGroupView';

import { WiredSelectorFurniByTypeView } from './selectors/WiredSelectorFurniByTypeView';

import { WiredSelectorFurniPicksView } from './selectors/WiredSelectorFurniPicksView';

import { WiredSelectorFurniSignalView } from './selectors/WiredSelectorFurniSignalView';

import { WiredSelectorUsersSignalView } from './selectors/WiredSelectorUsersSignalView';

import { WiredSelectorRemoteView } from './selectors/WiredSelectorRemoteView';

describe('Remaining simple selector editors',()=>{
    beforeEach(()=>{vi.clearAllMocks();state.trigger={intData:[1,5],stringData:'Alice\tBob',furniSources:[200],userSources:[201]};});
    afterEach(cleanup);
    it('renders saved names as lines and preserves the AIR tab-delimited save contract',()=>{
        render(<WiredSelectorUsersByNameView/>);
        const field=screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(field.value).toBe('Alice\nBob');expect(field.maxLength).toBe(1000);expect(field.parentElement!.style.height).toBe('140px');
        fireEvent.change(field,{target:{value:'Alice\nCarol'}});fireEvent.click(screen.getByText('Save'));
        expect(state.setStringParam).toHaveBeenLastCalledWith('Alice\tCarol');expect(state.setIntParams).toHaveBeenLastCalledWith([]);
        fireEvent.change(field,{target:{value:Array(25).fill('Name').join('\n')}});expect(field.value.split('\n')).toHaveLength(20);
    });
    it('keeps the group dropdown visible disabled without choosing an arbitrary group',()=>{
        state.trigger.stringData='';render(<WiredSelectorUsersGroupView/>);
        const group=screen.getByRole('combobox',{name:'wiredfurni.tooltip.group'});
        expect(group.matches(':disabled')).toBe(true);
        fireEvent.click(screen.getByRole('radio',{name:'wiredfurni.params.grouptype.1'}));
        expect(group.matches(':disabled')).toBe(false);
        fireEvent.click(screen.getByText('Save'));expect(state.setStringParam).toHaveBeenLastCalledWith('');
        fireEvent.change(group,{target:{value:'30'}});fireEvent.click(screen.getByText('Save'));expect(state.setStringParam).toHaveBeenLastCalledWith('30');
    });
    it('loads the saved group and retains it while selecting room group',()=>{
        state.trigger.stringData='20';render(<WiredSelectorUsersGroupView/>);
        expect(screen.getByRole('combobox')).toHaveProperty('value','20');
        fireEvent.click(screen.getByRole('radio',{name:'wiredfurni.params.grouptype.0'}));fireEvent.click(screen.getByText('Save'));expect(state.setStringParam).toHaveBeenLastCalledWith('');
        fireEvent.click(screen.getByRole('radio',{name:'wiredfurni.params.grouptype.1'}));fireEvent.click(screen.getByText('Save'));expect(state.setStringParam).toHaveBeenLastCalledWith('20');
    });
    it('restores Remote filter radios and retains disabled inline40px stack count',()=>{
        render(<WiredSelectorRemoteView/>);
        const count=screen.getByDisplayValue('5') as HTMLInputElement;
        expect(count.style.width).toBe('40px');
        fireEvent.click(screen.getByRole('radio',{name:'wiredfurni.params.remote_selection.filter.0'}));
        expect(count.matches(':disabled')).toBe(true);
        fireEvent.click(screen.getByText('Save'));expect(state.setIntParams).toHaveBeenLastCalledWith([1,0]);expect(state.setFurniSources).toHaveBeenLastCalledWith([200]);
        fireEvent.click(screen.getByRole('radio',{name:'wiredfurni.params.remote_selection.filter.1'}));
        expect(count.matches(':disabled')).toBe(false);expect(count.value).toBe('5');
        fireEvent.change(count,{target:{value:'9'}});fireEvent.click(screen.getByText('Save'));expect(state.setIntParams).toHaveBeenLastCalledWith([1,9]);
    });
    it('keeps user type codes and furniture state matching distinct from selector flags',()=>{
        const {unmount}=render(<WiredSelectorUsersByTypeView/>);
        fireEvent.click(screen.getByRole('radio',{name:'wiredfurni.params.usertype.4'}));fireEvent.click(screen.getByText('Save'));expect(state.setIntParams).toHaveBeenLastCalledWith([4]);
        unmount();render(<WiredSelectorFurniByTypeView/>);
        state.setFurniSources.mockClear();
        fireEvent.click(screen.getByRole('checkbox',{name:'wiredfurni.params.state_match'}));fireEvent.click(screen.getByText('Save'));
        // The furni source is the advanced row's choice from the server list (AIR class_3961, createAdvancedSections), not a fixed 100.
        expect(state.setIntParams).toHaveBeenLastCalledWith([0]);expect(state.setFurniSources).not.toHaveBeenCalled();
    });
    it.each([WiredSelectorFurniPicksView,WiredSelectorFurniSignalView,WiredSelectorUsersSignalView])('uses native category options without introducing owned parameters',View=>{
        render(<View/>);expect(screen.getByTestId('editor').getAttribute('data-width')).toBe('undefined');expect(screen.getByTestId('editor').getAttribute('data-native')).toBe('true');
        fireEvent.click(screen.getByRole('checkbox',{name:'wiredfurni.params.selector_option.1'}));fireEvent.click(screen.getByText('Save'));
        expect(state.setInverse).toHaveBeenCalledWith(true);expect(state.setIntParams).toHaveBeenLastCalledWith([]);
    });
});
