import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createContext, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';

const state = vi.hoisted(() => ({
    trigger: { intData: [] as number[], furniSources: [100, 301, 302], userSources: [101, 102, 103], variableIds: ['n', 'n'] },
    setIntParams: vi.fn(), setStringParam: vi.fn(), setVariableIds: vi.fn(), setUserSources: vi.fn(), setFurniSources: vi.fn()
}));
vi.mock('../../../../api', async () => ({
    ...(await vi.importActual('../../../../api/wired/WiredProjectile')),
    ...(await vi.importActual('../../../../api/wired/WiredNativeVariables')),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_BY_ID: 1 }
}));
vi.mock('../../../../hooks', () => ({ useWired: () => state, useWiredNativeVariables: () => ({}) }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span>, Slider: () => null }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span>, WiredSurfaceContext: createContext(0) }));
vi.mock('../WiredShellHeaderView', () => ({ WiredShellButton: ({ children, onClick, disabled }: PropsWithChildren<{ onClick: () => void; disabled: boolean }>) => <button disabled={disabled} onClick={onClick}>{children}</button> }));
vi.mock('../WiredDropdown', () => ({ WiredDropdown: ({ caption, value, options, disabled, onChange }: { caption: string; value: number; options: { id: number; label: string }[]; disabled: boolean; onChange: (value: number) => void }) => <select aria-label={caption} value={value} disabled={disabled} onChange={event => onChange(Number(event.target.value))}>{options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select> }));
vi.mock('../WiredFurniSelectorView', () => ({ WiredFurniSelectorView: () => null }));
vi.mock('../WiredSourcesSelector', () => ({ nativeSourceOptions: () => [101, 102, 103, 301, 302].map(value => ({ value, label: String(value) })) }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: () => null }));
vi.mock('../WiredVariablePickerData', () => ({ buildWiredVariablePickerEntries: () => [], flattenWiredVariablePickerEntries: () => [], createFallbackVariableEntry: () => null }));
vi.mock('./WiredProjectileDirectionGrid', () => ({ WiredProjectileDirectionGrid: () => null }));
vi.mock('./WiredExtraBaseView', () => ({ WiredExtraBaseView: ({ children, save, nativeLayout }: PropsWithChildren<{ save: () => void; nativeLayout: boolean }>) => <WiredNativeContext.Provider value={true}><div data-testid="editor" data-native-layout={String(nativeLayout)}>{children}<button onClick={save}>Save</button></div></WiredNativeContext.Provider> }));

import { WiredExtraProjectileView } from './WiredExtraProjectileView';
import { defaultProjectileParams } from '../../../../api/wired/WiredProjectile';

const save = () => fireEvent.click(screen.getByText('Save'));
const saved = () => state.setIntParams.mock.lastCall![0] as number[];
const curveInput = () => document.querySelector<HTMLInputElement>('input[type="text"]')!;

// AIR25 addons/class_3959: trajectory radio chooses whether int[18] is the typed curve or zero.
describe('AIR projectile controls and current packet fields', () => {
    afterEach(cleanup);
    beforeEach(() => {
        vi.clearAllMocks();
        state.trigger = { intData: defaultProjectileParams().slice(0, 19), furniSources: [100, 301, 302], userSources: [101, 102, 103], variableIds: ['n', 'n'] };
    });

    it('opens usage and direction, leaves advanced sections collapsed, and uses native layout', () => {
        render(<WiredExtraProjectileView />);
        expect(screen.getByRole('button', { name: 'wiredfurni.params.general_box_info' }).getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByRole('button', { name: /Projectile direction/ }).getAttribute('aria-expanded')).toBe('true');
        for (const name of [/Animation trajectory/, /Animation time/, /Shift the rotation/, /internal variables/])
            expect(screen.getByRole('button', { name }).getAttribute('aria-expanded')).toBe('false');
        expect(screen.getByTestId('editor').getAttribute('data-native-layout')).toBe('true');
    });

    it('accepts every integer curve, rejects invalid input, and retains the curve when switching straight and back', () => {
        state.trigger.intData[18] = -123;
        render(<WiredExtraProjectileView />);
        fireEvent.click(screen.getByRole('button', { name: /Animation trajectory/ }));
        expect(screen.getByRole('radio', { name: 'Curved' })).toHaveProperty('checked', true);
        expect(curveInput().value).toBe('-123');
        fireEvent.change(curveInput(), { target: { value: '321' } });
        save();
        expect(saved()[18]).toBe(321);
        fireEvent.change(curveInput(), { target: { value: '1001' } });
        save();
        expect(saved()[18]).toBe(321);
        fireEvent.click(screen.getByRole('radio', { name: 'Straight' }));
        expect(curveInput().disabled).toBe(true);
        save();
        expect(saved()[18]).toBe(0);
        fireEvent.click(screen.getByRole('radio', { name: 'Curved' }));
        save();
        expect(saved()[18]).toBe(321);
    });

    it('disables the rotation slider when direction changes are off without discarding its offset', () => {
        state.trigger.intData[0] = 0;
        state.trigger.intData[10] = 5;
        render(<WiredExtraProjectileView />);
        fireEvent.click(screen.getByRole('button', { name: /Shift the rotation by 5/ }));
        const plus = document.querySelector<HTMLButtonElement>('.volt-wired__slider-row button:last-child')!;
        expect(plus.disabled).toBe(true);
        fireEvent.click(plus);
        save();
        expect(saved()[10]).toBe(5);
        fireEvent.click(screen.getByRole('checkbox', { name: 'Rotate the projectile in the moving direction' }));
        fireEvent.click(plus);
        save();
        expect(saved()[10]).toBe(6);
    });

    it('edits distance and animation timing within AIR bounds without changing mode or source tails', () => {
        render(<WiredExtraProjectileView />);
        fireEvent.click(screen.getByRole('button', { name: /Animation trajectory/ }));
        fireEvent.click(screen.getByRole('radio', { name: 'Fly past the target' }));
        const distance = document.querySelectorAll<HTMLInputElement>('input[type="text"]')[1];
        fireEvent.change(distance, { target: { value: '-64' } });
        save();
        expect(saved()[14]).toBe(1);
        expect(saved()[16]).toBe(-64);
        fireEvent.change(distance, { target: { value: '-65' } });
        save();
        expect(saved()[16]).toBe(-64);
        fireEvent.click(screen.getByRole('button', { name: /Animation trajectory/ }));
        fireEvent.click(screen.getByRole('button', { name: /Animation time/ }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Scale the animation time with the distance' }));
        const [time, speed] = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
        fireEvent.change(time, { target: { value: '1' } });
        fireEvent.change(speed, { target: { value: '100000' } });
        save();
        expect(saved()[2]).toBe(1);
        expect(saved()[4]).toBe(1);
        expect(saved()[9]).toBe(100000);
        fireEvent.change(time, { target: { value: '0' } });
        fireEvent.change(speed, { target: { value: '100001' } });
        save();
        expect(saved()[4]).toBe(1);
        expect(saved()[9]).toBe(100000);
        expect(state.setUserSources).toHaveBeenLastCalledWith([101, 102, 103]);
    });

    it('round-trips 19 integers with sources and variable ids in their own packet fields', () => {
        const stored = [1, 3, 1, 1, 250, -10, 1, 1, 1, 75, 6, 5, 1, 1, 2, 1, -12, -10, 417];
        state.trigger.intData = stored;
        state.trigger.variableIds = ['500', '501'];
        render(<WiredExtraProjectileView />);
        save();
        expect(saved()).toEqual(stored);
        expect(state.setVariableIds).toHaveBeenLastCalledWith(['500', '501']);
        expect(state.setUserSources).toHaveBeenLastCalledWith([101, 102, 103]);
        expect(state.setFurniSources).toHaveBeenLastCalledWith([100, 301, 302]);
        expect(state.setStringParam).toHaveBeenLastCalledWith('');
    });
});
