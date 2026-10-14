import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    trigger: { intData: [2, 3], furniSources: [100, 101] },
    setIntParams: vi.fn(),
    setFurniSources: vi.fn(),
    setStringParam: vi.fn()
}));

vi.mock('../../../hooks', () => ({ useWired: () => state }));
vi.mock('../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE: 2 },
    WIRED_SLIDER_ECHO: { precision: 0, endsWithFive: false, toString: String }
}));
vi.mock('../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span>, Slider: () => null }));
vi.mock('./WiredText', async () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span>, WiredSurfaceContext: (await import('react')).createContext(0xffffff) }));
vi.mock('./WiredShellHeaderView', () => ({ WiredShellButton: ({ children, onClick }: PropsWithChildren<{ onClick: () => void }>) => <button onClick={onClick}>{children}</button> }));
vi.mock('./WiredSourcesSelector', () => ({ WiredSourcesSelector: () => null }));
vi.mock('./actions/WiredActionBaseView', () => ({ WiredActionBaseView: ({ children, save }: PropsWithChildren<{ save: () => void }>) => <div>{children}<button onClick={save}>Save</button></div> }));
vi.mock('./conditions/WiredConditionBaseView', () => ({ WiredConditionBaseView: ({ children, save }: PropsWithChildren<{ save: () => void }>) => <div>{children}<button onClick={save}>Save</button></div> }));

vi.mock('./extras/WiredExtraBaseView', () => ({ WiredExtraBaseView: ({ children, save }: PropsWithChildren<{ save: () => void }>) => <div>{children}<button onClick={save}>Save</button></div> }));

import { WiredExtraTimeUtilitiesView } from './extras/WiredExtraTimeUtilitiesView';
import { WiredActionMoveFurniToView } from './actions/WiredActionMoveFurniToView';
import { WiredConditionUserLevelNativeView } from './conditions/WiredConditionUserLevelNativeView';
import { WiredNativeContext } from './WiredNativeContext';
import { WiredTextInput } from './WiredTextInput';

describe('AIR editor native controls', () => {
    afterEach(() => { cleanup(); vi.clearAllMocks(); });

    it('lets the user type a level and preserves the comparison when saving', () => {
        state.trigger.intData = [12, 2];
        render(<WiredNativeContext.Provider value={true}><WiredConditionUserLevelNativeView /></WiredNativeContext.Provider>);
        const input = screen.getByRole('textbox');
        expect((input as HTMLInputElement).value).toBe('12');
        fireEvent.change(input, { target: { value: '30' } });
        fireEvent.click(screen.getByText('Save'));
        expect(state.setIntParams).toHaveBeenLastCalledWith([30, 2]);
        fireEvent.change(input, { target: { value: '31' } });
        fireEvent.click(screen.getByText('Save'));
        expect(state.setIntParams).toHaveBeenLastCalledWith([30, 2]);
    });

    it('lets the user type furniture spacing without changing direction or source slots', () => {
        state.trigger.intData = [4, 2];
        render(<WiredNativeContext.Provider value={true}><WiredActionMoveFurniToView /></WiredNativeContext.Provider>);
        const input = screen.getByRole('textbox');
        expect((input as HTMLInputElement).value).toBe('2');
        fireEvent.change(input, { target: { value: '5' } });
        fireEvent.click(screen.getByText('Save'));
        expect(state.setIntParams).toHaveBeenLastCalledWith([4, 5]);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100, 101]);
    });

    it('uses the AIR Time Utilities dropdown and preserves selected subvariables', () => {
        state.trigger.intData = [2, 1];
        render(<WiredNativeContext.Provider value={true}><WiredExtraTimeUtilitiesView /></WiredNativeContext.Provider>);
        const dropdown = screen.getByRole('combobox', { name: 'Read the variable as:' });
        expect((dropdown as HTMLSelectElement).value).toBe('1');
        expect(Array.from(dropdown.querySelectorAll('option')).map((option) => option.textContent)).toEqual(['Variable value', 'Creation time', 'Last update time']);
        fireEvent.change(dropdown, { target: { value: '2' } });
        fireEvent.click(screen.getByText('Save'));
        expect(state.setIntParams).toHaveBeenLastCalledWith([2, 2]);
    });

    it.each([true, false])('preserves variable-name keyboard handlers in the native text input (native=%s)', (native) => {
        const onKeyDown = vi.fn();
        render(<WiredNativeContext.Provider value={native}><WiredTextInput value="daily_task" onChange={vi.fn()} onKeyDown={onKeyDown} /></WiredNativeContext.Provider>);
        fireEvent.keyDown(screen.getByRole('textbox'), { key: ' ' });
        expect(onKeyDown).toHaveBeenCalledOnce();
    });
});
