import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const state = vi.hoisted(() => ({
    trigger: { intData: [1, 0, 0, ...Array(14).fill(0)], userSources: [201], furniSources: [100], inputSources: { usersAllowed: [[0, 200, 201]], furniAllowed: [[100, 200, 201]] } },
    filter: true, inverse: true, setFilter: vi.fn(), setInverse: vi.fn(), setIntParams: vi.fn(), setUserSources: vi.fn(), setFurniSources: vi.fn(), clearHighlight: vi.fn(), deactivate: vi.fn()
}));
vi.mock('@volt/renderer', () => ({ GetRoomEngine: () => ({ areaSelectionManager: { clearHighlight: state.clearHighlight, deactivate: state.deactivate } }) }));
vi.mock('../../../../api', () => ({ LocalizeText: (key: string) => key, localizeWithFallback: (key: string) => key, WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 } }));
vi.mock('../../../../hooks', () => ({ useWired: () => state }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: () => null }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredShellHeaderView', () => ({ WiredShellButton: ({ children, shellStyle, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { shellStyle: string }>) => <button {...props}>{children}</button> }));
vi.mock('../WiredSourcesSelector', () => ({ CLICKED_USER_SOURCE_VALUE: 11, nativeSourceOptions: (values: number[] = [], kind: string) => values.map(value => ({ value, label: `${kind}.${value}` })), useAvailableUserSources: (_: unknown, values: unknown[]) => values }));
vi.mock('./WiredSelectorBaseView', () => ({ WiredSelectorBaseView: ({ children, footer, save, nativeLayout, widthMultiplier }: PropsWithChildren<{ footer: ReactNode; save: () => void; nativeLayout: boolean; widthMultiplier: number }>) => <WiredNativeContext.Provider value={nativeLayout}><div data-testid="editor" data-native={String(nativeLayout)} data-width-multiplier={widthMultiplier}>{children}{footer}<button onClick={save}>Save</button></div></WiredNativeContext.Provider> }));
import { WiredNeighborhoodSelectorView } from './WiredNeighborhoodSelectorView';
const tile = (x: number, y: number) => document.querySelector(`[data-tile="${x},${y}"] polygon`)!;
const paint = (x: number, y: number) => { fireEvent.mouseDown(tile(x, y), { button: 0, buttons: 1 }); fireEvent.mouseUp(window); };
const save = () => fireEvent.click(screen.getByText('Save'));

describe('AIR neighborhood controls and selection contract', () => {
    beforeEach(() => { vi.clearAllMocks(); state.trigger = { intData: [1, 0, 0, ...Array(14).fill(0)], userSources: [201], furniSources: [100], inputSources: { usersAllowed: [[0, 200, 201]], furniAllowed: [[100, 200, 201]] } }; });
    afterEach(cleanup);
    it('starts small and edits the saved root in the full -64..64 domain', () => {
        render(<WiredNeighborhoodSelectorView />);
        expect(screen.getByTestId('editor').getAttribute('data-native')).toBe('true');
        expect(screen.getByTestId('neighborhood-grid').getAttribute('data-radius')).toBe('5');
        expect(document.querySelectorAll('[data-tile]')).toHaveLength(121);
        expect(screen.getByTestId('editor').getAttribute('data-width-multiplier')).toBe('1');
        fireEvent.change(screen.getByRole('textbox', { name: 'Root x' }), { target: { value: '64' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Root y' }), { target: { value: '-64' } }); save();
        expect(state.setIntParams.mock.lastCall![0]).toEqual([1, 64, -64, ...Array(14).fill(0)]);
        expect(state.setUserSources).toHaveBeenLastCalledWith([201]); expect(state.setFurniSources).toHaveBeenLastCalledWith([100]);
        expect(screen.getByRole('textbox', { name: 'Root x' }).parentElement!.style.width).toBe('28px');
        expect(document.querySelector('[data-root]')).toBeNull();
    });
    it('uses explicit add/remove/root tools and does not invert the saved drawing', () => {
        render(<WiredNeighborhoodSelectorView />);
        expect(document.querySelector('[data-tile="0,0"]')!.getAttribute('data-selected')).toBe('false');
        paint(0, 0); paint(0, 0); save(); expect(state.setIntParams.mock.lastCall![0][3]).toBe(1);
        fireEvent.click(screen.getByRole('button', { name: 'Remove tiles' })); paint(0, 0); save(); expect(state.setIntParams.mock.lastCall![0][3]).toBe(0);
        fireEvent.click(screen.getByRole('button', { name: 'Set root tile' })); paint(-2, 3);
        expect(screen.getByRole('textbox', { name: 'Root x' })).toHaveProperty('value', '-2'); expect(screen.getByRole('textbox', { name: 'Root y' })).toHaveProperty('value', '3');
        save(); expect(state.setIntParams.mock.lastCall![0].slice(0, 3)).toEqual([1, -2, 3]); expect(state.setIntParams.mock.lastCall![0][3]).toBe(0);
    });
    it('expands to 441 tiles and disallows shrinking while outer cells are selected', () => {
        render(<WiredNeighborhoodSelectorView />); fireEvent.click(screen.getByRole('button', { name: 'Large neighborhood' }));
        expect(screen.getByTestId('editor').getAttribute('data-width-multiplier')).toBe('1.7'); expect(document.querySelectorAll('[data-tile]')).toHaveLength(441);
        paint(8, -9); save(); const saved = state.setIntParams.mock.lastCall![0];
        expect(screen.getByRole('button', { name: 'Small neighborhood' })).toHaveProperty('disabled', true);
        cleanup(); state.trigger.intData = saved; render(<WiredNeighborhoodSelectorView />);
        expect(screen.getByTestId('neighborhood-grid').getAttribute('data-radius')).toBe('10');
        expect(document.querySelector('[data-tile="8,-9"]')!.getAttribute('data-selected')).toBe('true'); save(); expect(state.setIntParams.mock.lastCall![0]).toEqual(saved);
        fireEvent.click(screen.getByRole('button', { name: 'Remove tiles' })); paint(8, -9);
        expect(screen.getByRole('button', { name: 'Small neighborhood' })).toHaveProperty('disabled', false);
        fireEvent.click(screen.getByRole('button', { name: 'Small neighborhood' })); expect(document.querySelectorAll('[data-tile]')).toHaveLength(121);
    });
    it('supports rectangular shift drawing without toggling existing tiles or losing the spiral order', () => {
        render(<WiredNeighborhoodSelectorView />);
        fireEvent.mouseDown(tile(0, 0), { button: 0, buttons: 1, shiftKey: true });
        fireEvent.mouseEnter(tile(2, 2), { buttons: 1 });
        expect(document.querySelectorAll('[data-selected="true"]')).toHaveLength(9);
        fireEvent.mouseEnter(tile(1, 1), { buttons: 1 }); fireEvent.mouseUp(window);
        expect(document.querySelectorAll('[data-selected="true"]')).toHaveLength(4); save();
        expect(state.setIntParams.mock.lastCall![0][3]).toBe(387); // spiral positions 0,1,7,8
    });
    it('retains native source switching and category flags outside owned ints', () => {
        render(<WiredNeighborhoodSelectorView />);
        fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.sourcetype.furni' }));
        fireEvent.click(screen.getByRole('button', { name: 'Next source' })); save();
        expect(state.setIntParams.mock.lastCall![0][0]).toBe(0); expect(state.setUserSources).toHaveBeenLastCalledWith([0]); expect(state.setFurniSources).toHaveBeenLastCalledWith([200]);
        expect(screen.getByRole('checkbox', { name: 'wiredfurni.params.selector_option.1' })).toHaveProperty('checked', true);
        expect(state.setIntParams.mock.lastCall![0]).toHaveLength(17);
    });
});
