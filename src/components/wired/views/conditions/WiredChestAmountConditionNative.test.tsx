import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';

const state = vi.hoisted(() => ({
    trigger: { intData: [23, 0, 1, 2], furniSources: [100, 101, 301], userSources: [202], variableIds: ['n'] },
    setIntParams: vi.fn(), setFurniSources: vi.fn(), setUserSources: vi.fn(), setVariableIds: vi.fn()
}));
vi.mock('../../../../api', async () => ({
    ...(await vi.importActual('../../../../api/wired/WiredNativeVariables')),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_BY_ID: 1 }
}));
vi.mock('../../../../hooks', () => ({ useWired: () => state, useWiredNativeVariables: () => ({}) }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('./WiredVariableConditionParts', () => ({ FurniPickSlotButtons: () => null }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: () => null, WiredMergedSourceSection: ({ scope, bare, furniSlot, userSlot, furniSource, userSource, onChangeFurni, onChangeUsers }: any) => scope === 'global' || scope === 'context' ? <span>{`holder ${scope}`}</span> : <input aria-label={`Merged ${scope} ${scope === 'furni' ? furniSlot : userSlot}${bare ? ' bare' : ''}`} value={scope === 'furni' ? furniSource : userSource} onChange={event => (scope === 'furni' ? onChangeFurni : onChangeUsers)(Number(event.target.value))} /> }));
vi.mock('../WiredSourceTypeSelector', () => ({ WiredSourceTypeSelector: ({ types, onChange }: { types: string[]; onChange: (value: string) => void }) => <div>{types.map(type => <button key={type} onClick={() => onChange(type)}>{type}</button>)}</div> }));
vi.mock('../WiredVariablePickerData', () => ({
    buildWiredVariablePickerEntries: () => [
        { token: 'custom:pay', displayLabel: 'payment_amount', selectable: true },
        { token: 'custom:reward', displayLabel: 'reward_amount', selectable: true }
    ],
    flattenWiredVariablePickerEntries: (entries: unknown[]) => entries,
    createFallbackVariableEntry: () => null
}));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: ({ entries, onSelect }: { entries: { token: string; displayLabel: string }[]; onSelect: (entry: unknown) => void }) => <div>{entries.map(entry => <button key={entry.token} onClick={() => onSelect(entry)}>{entry.displayLabel}</button>)}</div> }));
vi.mock('./WiredConditionBaseView', () => ({ WiredConditionBaseView: ({ children, save, validate, nativeLayout, cardStyle }: PropsWithChildren<{ save: () => void; validate: () => boolean; nativeLayout: boolean; cardStyle: unknown }>) => <WiredNativeContext.Provider value={true}><div data-testid="editor" data-native={String(nativeLayout)} data-width={String(cardStyle)}>{children}<button disabled={!validate()} onClick={save}>Save</button></div></WiredNativeContext.Provider> }));

vi.mock('../actions/WiredChestRewardForm', () => ({ AMOUNT_TARGETS: [{target:'user',code:1},{target:'furni',code:0},{target:'global',code:-10},{target:'context',code:-20}] }));
import { WiredChestAmountCondition } from './WiredChestAmountCondition';

describe('Chest conditions native amount input', () => {
    beforeEach(() => { vi.clearAllMocks(); state.trigger = { intData:[23,0,1,2], furniSources:[100,101,301], userSources:[202], variableIds:['n'] }; });
    afterEach(cleanup);
    it.each([false,true])('keeps comparison and chest selectors when changing a literal (%s)', itemTypes => {
        render(<WiredChestAmountCondition itemTypes={itemTypes} />);
        expect(screen.getByTestId('editor').getAttribute('data-native')).toBe('true');
        expect(screen.getAllByRole('radio')).toHaveLength(6);
        const amount=screen.getByRole('textbox',{name:'Compare value:'});
        fireEvent.change(amount,{target:{value:'0x20'}});
        fireEvent.click(screen.getByRole('button',{name:'Save'}));
        expect(state.setIntParams).toHaveBeenLastCalledWith([32,0,1,2]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['n']);
        expect(state.setFurniSources).toHaveBeenLastCalledWith(itemTypes?[100,101,0]:[100,0,301]);
        expect(state.setUserSources).toHaveBeenLastCalledWith([0]);
        fireEvent.change(amount,{target:{value:'1000001'}});
        expect(screen.getByRole('button',{name:'Save'})).toHaveProperty('disabled',true);
    });
    it('keeps a chosen variable and its active holder source in the saved payload', () => {
        render(<WiredChestAmountCondition itemTypes={true} />);
        fireEvent.click(screen.getByRole('button',{name:'Choose variable'}));
        fireEvent.click(screen.getByRole('button',{name:'payment_amount'}));
        fireEvent.click(screen.getByRole('button',{name:'Save'}));
        expect(state.setIntParams).toHaveBeenLastCalledWith([23,1,1,2]);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['pay']);
        expect(state.setUserSources).toHaveBeenLastCalledWith([202]);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100,101,0]);
    });
    it.each([false,true])('draws the claimed reference holder in the popup for every holder type (AIR ChestHasAmount [[1,0]] / class_4163 [[2,0]], itemTypes=%s)', itemTypes => {
        render(<WiredChestAmountCondition itemTypes={itemTypes} />);
        expect(screen.queryByRole('textbox',{name:'Merged user 0 bare'})).toBeNull();
        fireEvent.click(screen.getByRole('button',{name:'Choose variable'}));
        const popup=screen.getByRole('dialog');
        expect(within(popup).getByRole('textbox',{name:'Merged user 0 bare'})).toHaveProperty('value','202');
        fireEvent.click(within(popup).getByRole('button',{name:'furni'}));
        expect(within(popup).getByRole('textbox',{name:`Merged furni ${itemTypes?2:1} bare`})).toBeTruthy();
        fireEvent.click(within(popup).getByRole('button',{name:'global'}));
        expect(within(popup).getByText('holder global')).toBeTruthy();
    });
});
