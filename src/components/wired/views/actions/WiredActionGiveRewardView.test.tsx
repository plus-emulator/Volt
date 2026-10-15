import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const state = vi.hoisted(() => ({ trigger: { stringData: '', intData: [] as number[], userSources: [201] }, setIntParams: vi.fn(), setStringParam: vi.fn(), setUserSources: vi.fn() }));
vi.mock('../../../../api', () => ({ LocalizeText: (key: string) => key, localizeWithFallback: (key: string) => key, WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 } }));
vi.mock('../../../../hooks', () => ({ useWired: () => state }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', () => ({ WiredText: ({ text, color }: { text: string; color?: number }) => <span data-color={color}>{text}</span> }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: () => null }));
vi.mock('./WiredActionBaseView', () => ({ WiredActionBaseView: ({ children, footer, save, validate, nativeLayout }: PropsWithChildren<{ footer: ReactNode; save: () => void; validate: () => boolean; nativeLayout: boolean }>) => <WiredNativeContext.Provider value={nativeLayout}><div data-testid="editor" data-native={String(nativeLayout)}>{children}{footer}<button disabled={!validate()} onClick={save}>Save</button></div></WiredNativeContext.Provider> }));
import { WiredActionGiveRewardView } from './WiredActionGiveRewardView';
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
const edit = (name: string, value: string) => fireEvent.change(screen.getByRole('textbox', { name }), { target: { value } });

describe('AIR Give Reward editor', () => {
    beforeEach(() => { vi.clearAllMocks(); state.trigger = { stringData: '', intData: [], userSources: [201] }; });
    afterEach(cleanup);
    it('opens the native four sections with five empty compact rows and disabled-visible settings', () => {
        const { container } = render(<WiredActionGiveRewardView />);
        expect(screen.getByTestId('editor').getAttribute('data-native')).toBe('true');
        expect(container.querySelectorAll('.volt-wired__native-section')).toHaveLength(4);
        expect(container.querySelectorAll('[data-reward-row]')).toHaveLength(5);
        expect(screen.getByRole('textbox', { name: 'Reward limit' })).toHaveProperty('disabled', true);
        expect(screen.getByRole('textbox', { name: 'Reward limit' }).parentElement!.style.width).toBe('68px');
        expect(screen.getByRole('textbox', { name: 'n =' })).toHaveProperty('disabled', true);
        expect(screen.getByRole('textbox', { name: 'Probability 1' })).toHaveProperty('value', '');
        expect(screen.getByRole('textbox', { name: 'Probability 1' }).parentElement!.style.width).toBe('58px');
        expect((container.querySelector('.volt-wired__options--radio') as HTMLElement).style.gridTemplateColumns).toContain('repeat(2');
        expect(screen.getByText('Reward limit not set. Make sure rewards are badges or non-tradeable items.').getAttribute('data-color')).toBe(String(0xcc0000));
        save(); expect(state.setStringParam).toHaveBeenCalledWith(''); expect(state.setIntParams).toHaveBeenCalledWith([0, 0, 0, 1]);
    });
    it('reads and edits badge/furniture rows without losing codes when badge is toggled', () => {
        state.trigger = { stringData: '0,NL1,50;1,furni#123,50', intData: [2, 0, 5, 3], userSources: [200] }; render(<WiredActionGiveRewardView />);
        expect(screen.getByRole('checkbox', { name: 'Badge 1' })).toHaveProperty('checked', true);
        expect(screen.getByRole('textbox', { name: 'Product/Badge code 1' })).toHaveProperty('value', 'NL1');
        expect(screen.getByRole('textbox', { name: 'Probability 1' })).toHaveProperty('value', '50');
        expect(screen.getByRole('textbox', { name: 'Product/Badge code 2' })).toHaveProperty('value', '123');
        expect(screen.getByRole('radio', { name: '1 / n Hours' })).toHaveProperty('checked', true);
        edit('Product/Badge code 1', 'ADM'); fireEvent.click(screen.getByRole('checkbox', { name: 'Badge 1' }));
        expect(screen.getByRole('textbox', { name: 'Product/Badge code 1' })).toHaveProperty('value', 'ADM');
        fireEvent.click(screen.getByRole('checkbox', { name: 'Badge 1' })); save();
        expect(state.setStringParam).toHaveBeenLastCalledWith('0,ADM,50;1,furni#123,50');
        expect(state.setIntParams).toHaveBeenLastCalledWith([2, 0, 5, 3]); expect(state.setUserSources).toHaveBeenLastCalledWith([200]);
    });
    it('caps Add reward at twenty and clears emptied rows in the save string', () => {
        const { container } = render(<WiredActionGiveRewardView />);
        for (let index = 0; index < 25; index++) fireEvent.click(screen.getByRole('button', { name: 'Add reward' }));
        expect(container.querySelectorAll('[data-reward-row]')).toHaveLength(20);
        fireEvent.click(screen.getByRole('checkbox', { name: 'Badge 1' })); edit('Product/Badge code 1', 'ADM'); edit('Probability 1', '100'); save();
        expect(state.setStringParam).toHaveBeenLastCalledWith('0,ADM,100');
        edit('Product/Badge code 1', ''); save(); expect(state.setStringParam).toHaveBeenLastCalledWith('');
    });
    it('keeps probabilities visible and restores values after toggling unique mode', () => {
        state.trigger.stringData = '0,ADM,50'; render(<WiredActionGiveRewardView />);
        fireEvent.click(screen.getByRole('checkbox', { name: 'Unique Rewards?' }));
        const probability = screen.getByRole('textbox', { name: 'Probability 1' });
        expect(probability).toHaveProperty('disabled', true); expect(probability).toHaveProperty('value', '50'); save();
        expect(state.setStringParam).toHaveBeenLastCalledWith('0,ADM,100');
        fireEvent.click(screen.getByRole('checkbox', { name: 'Unique Rewards?' })); expect(probability).toHaveProperty('disabled', false); save();
        expect(state.setStringParam).toHaveBeenLastCalledWith('0,ADM,50');
    });
    it('preserves code/probability validation and four integer settings', () => {
        render(<WiredActionGiveRewardView />);
        fireEvent.click(screen.getByRole('checkbox', { name: 'wiredfurni.params.prizelimit' })); edit('Reward limit', '999');
        expect(screen.queryByText('Reward limit not set. Make sure rewards are badges or non-tradeable items.')).toBeNull();
        fireEvent.click(screen.getByRole('radio', { name: '1 / n Mins' })); edit('n =', '12');
        edit('Product/Badge code 1', 'chair'); expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        edit('Probability 1', '101'); expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        edit('Probability 1', '60'); edit('Product/Badge code 2', 'table'); edit('Probability 2', '50');
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        edit('Probability 2', '40'); edit('Product/Badge code 1', 'bad,code'); expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        edit('Product/Badge code 1', 'chair'); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([3, 0, 999, 12]); expect(state.setStringParam).toHaveBeenLastCalledWith('1,chair,60;1,table,40');
        fireEvent.click(screen.getByRole('radio', { name: 'Once' })); expect(screen.getByRole('textbox', { name: 'n =' })).toHaveProperty('disabled', true);
        fireEvent.click(screen.getByRole('radio', { name: '1 / n Days' })); expect(screen.getByRole('textbox', { name: 'n =' })).toHaveProperty('value', '12');
    });
});
