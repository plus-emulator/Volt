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
vi.mock('../../../hooks',()=>({useWired:()=>state}));
vi.mock('../../../common',()=>({Text:({children}:PropsWithChildren)=><span>{children}</span>}));
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
