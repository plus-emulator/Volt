import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const setIntParams = vi.fn(), setFurniSources = vi.fn(), setUserSources = vi.fn();
let trigger: { intData: number[]; furniSources: number[]; userSources: number[] };
let base: { save: () => void; nativeLayout: boolean };
vi.mock('../../../../hooks', () => ({ useWired: () => ({ trigger, setIntParams, setFurniSources, setUserSources }) }));
vi.mock('../../../../api', async original => ({ ...await original<object>(), LocalizeText: (key: string) => key }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: () => null }));
vi.mock('./WiredActionBaseView', () => ({ WiredActionBaseView: (props: PropsWithChildren<typeof base>) => {
    base = props; return <WiredNativeContext.Provider value={true}>{props.children}</WiredNativeContext.Provider>;
} }));
import { WiredActionMoveFurniView } from './WiredActionMoveFurniView';
import { WiredActionMoveRotateUserView } from './WiredActionMoveRotateUserView';
import { WiredActionMoveAndRotateFurniView } from './WiredActionMoveAndRotateFurniView';
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); trigger = { intData: [0, 0, 1], furniSources: [200], userSources: [201] }; });
const groups = (container: HTMLElement) => Array.from(container.querySelectorAll('.volt-wired__options--radio'));
const radios = (group: Element) => Array.from(group.querySelectorAll('input'));
describe('AIR movement editor sections and direction ordering', () => {
    it('keeps fixed direction wire values and native diagonal/straight/random order in separate movement and rotation sections', () => {
        const { container } = render(<WiredActionMoveFurniView />);
        expect(base.nativeLayout).toBe(true);
        expect(container.querySelectorAll('.volt-wired__native-section')).toHaveLength(2);
        const [movement, rotation] = groups(container);
        expect(radios(movement)).toHaveLength(12);
        expect(movement.querySelector('.volt-wired__option-cell')).toHaveStyle({ gridColumn: '1 / -1' });
        const expected = [0, 4, 8, 5, 9, 6, 10, 7, 11, 2, 3, 1];
        expected.forEach((value, index) => {
            fireEvent.click(radios(movement)[index]); act(() => base.save());
            expect(setIntParams).toHaveBeenLastCalledWith([value, 0]);
        });
        fireEvent.click(radios(rotation)[2]); act(() => base.save());
        expect(setIntParams).toHaveBeenLastCalledWith([1, 2]);
        expect(setFurniSources).toHaveBeenLastCalledWith([200]);
        expect(rotation.querySelector('img')?.getAttribute('src')).toContain('native/rotate_cw');
    });
    it('uses the native user rotation icons and retains clockwise/counterclockwise codes', () => {
        trigger.intData = [-1, -1];
        const { container } = render(<WiredActionMoveRotateUserView />);
        expect(container.querySelectorAll('.volt-wired__native-section')).toHaveLength(2);
        const [movement, rotation] = groups(container);
        fireEvent.click(radios(movement)[8]); fireEvent.click(radios(rotation)[9]); act(() => base.save());
        expect(setIntParams).toHaveBeenLastCalledWith([7, 9]);
        fireEvent.click(radios(rotation)[10]); act(() => base.save());
        expect(setIntParams).toHaveBeenLastCalledWith([7, 10]);
        expect(setUserSources).toHaveBeenLastCalledWith([201]);
        expect(rotation.querySelectorAll('img')[8]?.getAttribute('src')).toContain('native/rotate_cw');
    });
    it('retains directional movement, turns and collision flag with three AIR sections', () => {
        trigger.intData = [3, 5, 2];
        const { container } = render(<WiredActionMoveAndRotateFurniView />);
        expect(container.querySelectorAll('.volt-wired__native-section')).toHaveLength(3);
        const collision = container.querySelector('input[type="checkbox"]')!;
        expect(collision).toBeChecked();
        const [movement, rotation] = groups(container);
        fireEvent.click(radios(movement)[6]); fireEvent.click(radios(rotation)[4]); fireEvent.click(collision);
        act(() => base.save());
        expect(setIntParams).toHaveBeenLastCalledWith([6, 4, 0]);
        expect(setFurniSources).toHaveBeenLastCalledWith([200]);
    });
});
