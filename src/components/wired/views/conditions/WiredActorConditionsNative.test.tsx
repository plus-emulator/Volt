import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';

const state = vi.hoisted(() => ({
    trigger: { intData: [129], userSources: [201], stringData: '' }, quantifier: 1,
    setIntParams: vi.fn(), setUserSources: vi.fn(), setQuantifier: vi.fn(), setStringParam: vi.fn()
}));
vi.mock('../../../../api', () => ({ LocalizeText: (key: string) => key, WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 } }));
vi.mock('../../../../hooks', () => ({ useWired: () => state }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: () => null }));
vi.mock('./WiredConditionBaseView', () => ({ WiredConditionBaseView: ({ children, footer, nativeLayout, save }: PropsWithChildren<{ footer: ReactNode; nativeLayout: boolean; save: () => void }>) => <WiredNativeContext.Provider value={true}><div data-testid="editor" data-native-layout={nativeLayout}>{children}{footer}<button onClick={save}>Save</button></div></WiredNativeContext.Provider> }));
import { WiredConditionActorDirView } from './WiredConditionActorDirView';
import { WiredConditionTeamHasRankView } from './WiredConditionTeamHasRankView';
import { WiredConditionTriggererMatchView } from './WiredConditionTriggererMatchView';
const save = () => fireEvent.click(screen.getByText('Save'));

// AIR25 class_4200, class_4120 and TriggererMatches. Actual native controls exercise the saved wire values.
describe('native actor condition layouts', () => {
    afterEach(cleanup);
    beforeEach(() => { vi.clearAllMocks(); state.trigger = { intData: [129], userSources: [201], stringData: '' }; });
    it('lists all eight direction icons in four columns and retains mask/source/quantifier', () => {
        render(<WiredConditionActorDirView />);
        expect(screen.getByTestId('editor')).toHaveAttribute('data-native-layout', 'true');
        const checks = screen.getAllByRole('checkbox'); expect(checks).toHaveLength(8);
        expect(checks[0].parentElement?.parentElement).toHaveStyle({ gridTemplateColumns: 'repeat(4, 1fr)' });
        checks.forEach((check, i) => expect(check.parentElement?.querySelector('img')?.getAttribute('src')).toContain(`move_${i}.png`));
        expect(checks[0]).toBeChecked(); expect(checks[7]).toBeChecked();
        fireEvent.click(checks[1]); fireEvent.click(checks[7]); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([3]);
        expect(state.setUserSources).toHaveBeenLastCalledWith([201]); expect(state.setQuantifier).toHaveBeenLastCalledWith(1);
    });
    it('puts triggerer on its own team row and uses two/four columns without changing rank indices', () => {
        state.trigger.intData = [3, 2]; render(<WiredConditionTeamHasRankView />);
        const triggerer = screen.getByRole('radio', { name: 'wiredfurni.params.team.triggerer' });
        expect(triggerer.closest('.volt-wired__option-cell')).toHaveStyle({ gridColumn: '1 / -1' });
        expect(triggerer.closest('.volt-wired__options')?.getAttribute('style')).toContain('repeat(2,');
        const place = screen.getByRole('radio', { name: 'wiredfurni.params.placement.4' });
        expect(place.closest('.volt-wired__options')?.getAttribute('style')).toContain('repeat(4,');
        expect(screen.getByRole('radio', { name: 'wiredfurni.params.team.3' })).toBeChecked();
        fireEvent.click(place); fireEvent.click(screen.getByRole('radio', { name: 'wiredfurni.params.team.4' })); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([4, 3]); expect(state.setUserSources).toHaveBeenLastCalledWith([201]);
    });
    it('attaches the 32-character username field beneath its native radio and preserves negative metadata', () => {
        state.trigger = { intData: [4], userSources: [200, 101], stringData: 'Example' };
        render(<WiredConditionTriggererMatchView negative />);
        const input = screen.getByRole('textbox'); expect(input).toHaveAttribute('maxLength', '32'); expect(input).toHaveValue('Example'); expect(input.closest('.volt-wired__option-extra')).not.toBeNull();
        expect(screen.getByRole('radio', { name: 'wiredfurni.params.usertype.4' })).toBeChecked();
        expect(screen.getByRole('radio', { name: 'wiredfurni.params.quantifier.users.neg.1' })).toBeChecked();
        fireEvent.change(input, { target: { value: 'Other' } }); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([4]); expect(state.setUserSources).toHaveBeenLastCalledWith([200, 101]); expect(state.setStringParam).toHaveBeenLastCalledWith('Other');
    });
    it('keeps the username field visible but disabled for any-avatar mode', () => {
        state.trigger.intData = [1]; render(<WiredConditionTriggererMatchView />);
        expect(screen.getByRole('textbox')).toBeDisabled();
        fireEvent.click(screen.getByRole('radio', { name: 'wiredfurni.params.certainavatar' })); expect(screen.getByRole('textbox')).toBeEnabled();
    });
});
