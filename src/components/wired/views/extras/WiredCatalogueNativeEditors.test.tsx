import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const state=vi.hoisted(()=>({trigger:{id:55,stringData:'read\twrite',intData:[1],furniSources:[100],userSources:[0],variableIds:['n']},setIntParams:vi.fn(),setStringParam:vi.fn(),send:vi.fn(),copy:vi.fn(async()=>true),confirm:vi.fn(),alert:vi.fn(),setFurniSources:vi.fn(),setUserSources:vi.fn(),setQuantifier:vi.fn(),setVariableIds:vi.fn(),quantifier:1}));
vi.mock('../../../../api',async()=>({
    ...(await vi.importActual('../../../../api/wired/WiredNativeVariables')),
    LocalizeText:(key:string)=>key,localizeWithFallback:(_key:string,fallback:string)=>fallback,
    expandLocalizedText:(text:string)=>text,CopyToClipboard:state.copy,SendMessageComposer:state.send,
    NotificationBubbleType:{INFO:'info'},WiredFurniType:{STUFF_SELECTION_OPTION_NONE:0,STUFF_SELECTION_OPTION_BY_ID:1,STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT:2}
}));
vi.mock('../../../../hooks',()=>({useWired:()=>state,useWiredNativeVariables:()=>({}),useAchievements:()=>({enabledWiredAchievements:['ACH_Test']}),useMessageEvent:()=>{},useNotification:()=>({showConfirm:state.confirm,simpleAlert:state.alert,showSingleBubble:vi.fn()})}));
vi.mock('@volt/renderer',()=>({WiredGenerateWebApiKeyComposer:class {constructor(public id:number,public read:boolean){}},WiredWebApiKeyResultEvent:class {}}));
vi.mock('../../../../common',()=>({Text:({children}:PropsWithChildren)=><span>{children}</span>}));
vi.mock('../WiredText',()=>({WiredText:({text,soft,color}:{text:string;soft?:boolean;color?:number})=><span data-soft={soft} data-color={color}>{text}</span>}));
vi.mock('../../../mod-tools/native/NativeSkinView',()=>({NativeSkinView:()=>null}));
vi.mock('../WiredShellHeaderView',()=>({WiredShellButton:({children,shellStyle,...props}:PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>&{shellStyle:string}>)=><button {...props}>{children}</button>}));
const Base=({children,selectionPreview,save,cardStyle,footer,validate}:PropsWithChildren<{selectionPreview?:ReactNode;save:()=>void;cardStyle?:unknown;footer?:ReactNode;validate?:()=>boolean}>)=><WiredNativeContext.Provider value={true}><div data-testid="editor" data-width={String(cardStyle)}>{children}{footer}{selectionPreview}<button disabled={validate && !validate()} onClick={save}>Save</button></div></WiredNativeContext.Provider>;
vi.mock('./WiredExtraBaseView',()=>({WiredExtraBaseView:(props:any)=><Base {...props}/>}));
vi.mock('../triggers/WiredTriggerBaseView',()=>({WiredTriggerBaseView:(props:any)=><Base {...props}/>}));
vi.mock('../actions/WiredActionBaseView',()=>({WiredActionBaseView:(props:any)=><Base {...props}/>}));
vi.mock('../conditions/WiredConditionBaseView',()=>({WiredConditionBaseView:(props:any)=><Base {...props}/>}));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: ()=>null, WiredHolderSourceSection: ({ scope }: any) => <span>{`holder ${scope}`}</span>, WiredMergedSourceSection: ({ scope, bare, disabled, furniSlot = 0, userSlot = 0, furniSource, userSource, onChangeFurni, onChangeUsers }: any) => { const content = scope === 'global' || scope === 'context' ? <span>{`holder ${scope}`}</span> : <input aria-label={`Merged ${scope === 'furni' ? 'furni' : 'user'} ${scope === 'furni' ? furniSlot : userSlot}${bare ? ' bare' : ''}`} value={scope === 'furni' ? furniSource : userSource} onChange={event => (scope === 'furni' ? onChangeFurni : onChangeUsers)(Number(event.target.value))} />; return disabled ? <fieldset disabled>{content}</fieldset> : content; } }));
vi.mock('../WiredVariablePicker',()=>({WiredVariablePicker:()=>null}));
vi.mock('../WiredVariablePickerData',()=>({buildWiredVariablePickerEntries:()=>[],flattenWiredVariablePickerEntries:()=>[],createFallbackVariableEntry:()=>null}));
vi.mock('../WiredDropdown',()=>({WiredDropdown:({options,value,onChange,caption}:any)=><select aria-label={caption} value={value} onChange={event=>onChange(Number(event.target.value))}>{options.map((option:any)=><option key={option.id} value={option.id}>{option.label}</option>)}</select>}));
import { WiredActionToggleFurniStateView } from '../actions/WiredActionToggleFurniStateView';
import { WiredConditionActorIsOnFurniView } from '../conditions/WiredConditionActorIsOnFurniView';
import { WiredVisualizationAudienceSection } from '../actions/WiredFurniVisualizationParts';
import { WiredActionProgressAchievementNativeView } from '../actions/WiredActionProgressAchievementNativeView';
import { WiredActionProgressRewardTrackNativeView } from '../actions/WiredActionProgressRewardTrackNativeView';
import { WiredExtraVariablesWebApiNativeView } from './WiredExtraVariablesWebApiNativeView';
import { WiredExtraAchievementEnablerNativeView } from './WiredExtraAchievementEnablerNativeView';
import { WiredTriggerRoomInitializedView } from '../triggers/WiredTriggerRoomInitializedView';
import { WiredTriggerReceiveLinkMessageView } from '../triggers/WiredTriggerReceiveLinkMessageView';

describe('AIR catalogue native editor controls',()=>{
    beforeEach(()=>{vi.clearAllMocks();state.trigger={id:55,stringData:'read\twrite',intData:[1],furniSources:[100],userSources:[0],variableIds:['n']};});
    afterEach(cleanup);
    it('renders Web API button rows above 30px wrapped read-only key fields with no forced width',()=>{
        const {container}=render(<WiredExtraVariablesWebApiNativeView/>);
        expect(screen.getByTestId('editor').getAttribute('data-width')).toBe('undefined');
        for(const name of ['Read key','Write key']) {
            const field=screen.getByRole('textbox',{name});
            expect(field.tagName).toBe('TEXTAREA');expect(field).toHaveProperty('readOnly',true);
            expect(field.getAttribute('wrap')).toBe('soft');
            const frame=field.parentElement!;expect(frame.style.height).toBe('30px');
            expect(frame.previousElementSibling!.querySelectorAll('button')).toHaveLength(3);
        }
        expect(container.querySelector('[data-color="15544371"]')).not.toBeNull();
    });
    it('keeps key generation direction and clearing permissions intact',()=>{
        render(<WiredExtraVariablesWebApiNativeView/>);
        fireEvent.click(screen.getAllByRole('button',{name:'Regenerate'})[0]);
        expect(state.send.mock.lastCall![0]).toMatchObject({id:55,read:true});
        fireEvent.click(screen.getAllByRole('button',{name:'Clear'})[1]);
        expect(screen.getByRole('checkbox')).toHaveProperty('disabled',true);
        fireEvent.click(screen.getByRole('button',{name:'Save'}));
        expect(state.setStringParam).toHaveBeenLastCalledWith('read\t');expect(state.setIntParams).toHaveBeenLastCalledWith([0]);
    });
    it('keeps achievement names multiline in a 60px native field with a 2000-character limit',()=>{
        state.trigger.stringData='ACH_Game\nACH_Race';render(<WiredExtraAchievementEnablerNativeView/>);
        const field=screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(field.parentElement!.style.height).toBe('60px');expect(field.maxLength).toBe(2000);
        expect(field.wrap).toBe('off');
        fireEvent.change(field,{target:{value:'ACH_New\nACH_Race'}});fireEvent.click(screen.getByText('Save'));
        expect(state.setStringParam).toHaveBeenLastCalledWith('ACH_New\nACH_Race');expect(state.setIntParams).toHaveBeenLastCalledWith([]);
    });
    it('shows initialization UsageInfo with the native soft body',()=>{
        render(<WiredTriggerRoomInitializedView/>);
        expect(screen.getByText('wiredfurni.params.general_box_info')).toBeTruthy();
        expect(screen.getByText('wiredfurni.params.room_initialized.usage_info').getAttribute('data-soft')).toBe('true');
        fireEvent.click(screen.getByText('Save'));expect(state.setIntParams).toHaveBeenLastCalledWith([]);
    });
    it('shows only one endpoints section without generic pick instructions',()=>{
        render(<WiredTriggerReceiveLinkMessageView/>);
        expect(screen.getAllByText('wiredfurni.params.link.endpoints')).toHaveLength(1);
        expect(screen.queryByText('wiredfurni.pickfurnis.desc')).toBeNull();
        fireEvent.click(screen.getByText('Save'));expect(state.setStringParam).toHaveBeenLastCalledWith('');
    });
    it('uses native toggle radios while preserving toggle mode and source',()=>{
        const {container}=render(<WiredActionToggleFurniStateView/>);
        expect(container.querySelector('.volt-wired__options')).not.toBeNull();
        fireEvent.click(screen.getAllByRole('radio')[0]);fireEvent.click(screen.getByText('Save'));
        expect(state.setIntParams).toHaveBeenLastCalledWith([0]);expect(state.setFurniSources).toHaveBeenLastCalledWith([100]);
    });
    it('uses the native actor quantifier and preserves both sources',()=>{
        render(<WiredConditionActorIsOnFurniView negative/>);
        fireEvent.click(screen.getAllByRole('radio')[0]);fireEvent.click(screen.getByText('Save'));
        expect(state.setQuantifier).toHaveBeenLastCalledWith(0);expect(state.setIntParams).toHaveBeenLastCalledWith([]);
        expect(state.setUserSources).toHaveBeenLastCalledWith([0]);expect(state.setFurniSources).toHaveBeenLastCalledWith([100]);
    });
    it('shows the everyone information as a one-time alert rather than permanent form content',()=>{
        const change=vi.fn();const {rerender}=render(<WiredNativeContext.Provider value={true}><WiredVisualizationAudienceSection audience={0} onChange={change}/></WiredNativeContext.Provider>);
        fireEvent.change(screen.getByRole('combobox'),{target:{value:'1'}});
        expect(state.alert).toHaveBeenCalledTimes(1);expect(change).toHaveBeenCalledWith(1);
        rerender(<WiredNativeContext.Provider value={true}><WiredVisualizationAudienceSection audience={1} onChange={change}/></WiredNativeContext.Provider>);
        fireEvent.change(screen.getByRole('combobox'),{target:{value:'0'}});fireEvent.change(screen.getByRole('combobox'),{target:{value:'1'}});
        expect(state.alert).toHaveBeenCalledTimes(1);expect(screen.queryByText('Keep this effect visible after reloads')).toBeNull();
    });
    it('blocks saving invalid native achievement progress and preserves valid payload order',()=>{
        state.trigger.stringData='ACH_Test';state.trigger.intData=[1,0,7,1];render(<WiredActionProgressAchievementNativeView/>);
        const field=screen.getByRole('textbox',{name:'Select progress:'});
        fireEvent.change(field,{target:{value:'-1'}});expect(screen.getByText('Save')).toHaveProperty('disabled',true);
        fireEvent.change(field,{target:{value:'23'}});fireEvent.click(screen.getByText('Save'));
        expect(state.setIntParams).toHaveBeenLastCalledWith([1,0,23,1]);expect(state.setStringParam).toHaveBeenLastCalledWith('ACH_Test');
    });
    it.each([['achievement',WiredActionProgressAchievementNativeView],['reward track',WiredActionProgressRewardTrackNativeView]] as const)('draws the claimed merged [[0,1]] holder in the %s value popup and writes only its slot when edited',(_name,View)=>{
        state.trigger.stringData='ACH_Test';state.trigger.intData=[1,0,7,1];state.trigger.furniSources=[100];state.trigger.userSources=[0,201];render(<View/>);
        expect(screen.queryByRole('textbox',{name:'Merged user 1 bare'})).toBeNull();
        fireEvent.click(screen.getByRole('button',{name:'Choose variable'}));
        expect(screen.getByRole('textbox',{name:'Merged user 1 bare'})).toHaveProperty('value','201');
        fireEvent.click(screen.getByText('Save'));expect(state.setUserSources).not.toHaveBeenCalled();
        fireEvent.change(screen.getByRole('textbox',{name:'Merged user 1 bare'}),{target:{value:'200'}});fireEvent.click(screen.getByText('Save'));
        expect(state.setUserSources).toHaveBeenLastCalledWith([0,200]);expect(state.setFurniSources).toHaveBeenLastCalledWith([100]);
    });

});
