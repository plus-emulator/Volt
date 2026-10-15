import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const state=vi.hoisted(()=>({ trigger:{intData:[] as number[]}, setIntParams:vi.fn() }));
vi.mock('../../../../hooks',()=>({useWired:()=>state}));
vi.mock('../../../../api',async()=>({
    ...(await vi.importActual('../../../../api/wired/WiredDateToString')),
    LocalizeText:(key:string)=>key,
    WiredFurniType:{STUFF_SELECTION_OPTION_NONE:0}
}));
vi.mock('../../../../common',()=>({Text:({children}:PropsWithChildren)=><span>{children}</span>}));
vi.mock('../WiredText',()=>({WiredText:({text}:{text:string})=><span>{text}</span>}));
vi.mock('./WiredConditionBaseView',()=>({WiredConditionBaseView:({children,save,nativeLayout}:PropsWithChildren<{save:()=>void;nativeLayout:boolean}>)=><WiredNativeContext.Provider value={nativeLayout}>{children}<button onClick={save}>Save</button></WiredNativeContext.Provider>}));
import { WiredDateToString } from '../../../../api/wired/WiredDateToString';
import { WiredConditionDateRangeView } from './WiredConditionDateRangeView';
describe('Date range initial fields',()=>{
    afterEach(()=>{cleanup();vi.clearAllMocks();});
    it('leaves unconfigured fields empty and keeps finite save values',()=>{
        state.trigger={intData:[]};render(<WiredConditionDateRangeView/>);
        expect(screen.getAllByRole('textbox').map(input=>(input as HTMLInputElement).value)).toEqual(['','']);
        fireEvent.click(screen.getByText('Save'));expect(state.setIntParams).toHaveBeenLastCalledWith([0,0]);
    });
    it('renders a present Unix zero while leaving an absent end empty',()=>{
        state.trigger={intData:[0]};render(<WiredConditionDateRangeView/>);
        expect(screen.getAllByRole('textbox').map(input=>(input as HTMLInputElement).value)).toEqual([WiredDateToString(new Date(0)),'']);
    });
});
