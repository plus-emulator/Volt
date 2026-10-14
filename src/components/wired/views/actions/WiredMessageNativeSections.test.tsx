import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const setIntParams = vi.fn(), setStringParam = vi.fn(), setFurniSources = vi.fn(), setUserSources = vi.fn();
let trigger: { code: number; intData: number[]; stringData: string; furniSources: number[]; userSources: number[]; inputSources: unknown };
let base: { save: () => void; nativeLayout: boolean };
vi.mock('../../../../hooks', () => ({ useWired: () => ({ trigger, setIntParams, setStringParam, setFurniSources, setUserSources }) }));
vi.mock('../../../../api', async original => ({ ...await original<object>(), LocalizeText: (key: string) => key, localizeWithFallback: (_key: string, fallback: string) => fallback }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: () => null }));
vi.mock('../common/WiredMessageEditor', () => ({ WIRED_MESSAGE_EDITOR_MAX_LENGTH: 400, getWiredTextPlaceholderNames: () => [], WiredMessageEditor: ({ value, onChange, previewType }: { value: string; onChange: (value: string) => void; previewType: number }) => <textarea aria-label="message" data-preview-type={previewType} value={value} onChange={event => onChange(event.target.value)} /> }));
vi.mock('./WiredActionBaseView', () => ({ WiredActionBaseView: (props: PropsWithChildren<typeof base>) => {
    base = props; return <WiredNativeContext.Provider value={true}>{props.children}</WiredNativeContext.Provider>;
} }));
import { WiredActionChatView } from './WiredActionChatView';
import { WiredActionBotTalkView } from './WiredActionBotTalkView';
import { WiredActionBotTalkToAvatarView } from './WiredActionBotTalkToAvatarView';
import { WiredActionControlClockView } from './WiredActionControlClockView';
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); trigger = { code: 7, intData: [1, 211, -1], stringData: 'Saved message', furniSources: [100], userSources: [0], inputSources: { usersAllowed: [[0, 11, 200, 201]], userDefaults: [0] } }; });

describe('AIR message and clock sections', () => {
    it('opens show-message with native collapsed options while preserving their saved values', () => {
        const { container } = render(<WiredActionChatView />);
        expect(base.nativeLayout).toBe(true);
        expect(container.querySelectorAll('.volt-wired__native-section')).toHaveLength(5);
        expect(container.querySelectorAll('.volt-wired__section-toggle[aria-expanded="false"]')).toHaveLength(4);
        fireEvent.change(screen.getByRole('textbox', { name: 'message' }), { target: { value: 'Changed' } });
        act(() => base.save());
        expect(setIntParams).toHaveBeenLastCalledWith([1, 211, -1]);
        expect(setStringParam).toHaveBeenLastCalledWith('Changed');
        fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.show_message.visibility_selection.title' }));
        fireEvent.click(screen.getByRole('radio', { name: 'wiredfurni.params.show_message.visibility_selection.0' }));
        act(() => base.save()); expect(setIntParams).toHaveBeenLastCalledWith([0, 211, -1]);
    });
    it.each([[WiredActionBotTalkView, 2], [WiredActionBotTalkToAvatarView, 1]] as const)('keeps bot talk options with the message and clears a missing message on reopen', (View, previewType) => {
        trigger = { ...trigger, code: 23, intData: [1, -1, 0], stringData: 'Bot\tHello', userSources: [100, 201], inputSources: { usersAllowed: [[100, 0, 200, 201], [0, 201]], userDefaults: [100, 0] } };
        const { container, rerender } = render(<View />);
        expect(base.nativeLayout).toBe(true);
        const message = screen.getByRole('textbox', { name: 'message' });
        expect(message).toHaveAttribute('data-preview-type', String(previewType));
        expect(message.closest('.volt-wired__native-section')?.querySelectorAll('input[type="radio"]')).toHaveLength(2);
        fireEvent.click(screen.getByRole('checkbox')); act(() => base.save());
        expect(setIntParams).toHaveBeenLastCalledWith([1, -1, 1]);
        expect(setStringParam).toHaveBeenLastCalledWith('Bot\tHello');
        expect(container.querySelector('button[aria-expanded="false"]')).toBeTruthy();
        trigger = { ...trigger, stringData: 'OtherBot' }; rerender(<View />);
        expect(screen.getByRole('textbox', { name: 'message' })).toHaveValue('');
    });
    it('shows the native clock title and five options without changing its source slot', () => {
        trigger = { ...trigger, intData: [3] };
        render(<WiredActionControlClockView />);
        expect(screen.getByText('wiredfurni.params.clock_control')).toBeTruthy();
        fireEvent.click(screen.getByRole('radio', { name: 'wiredfurni.params.clock_control.4' })); act(() => base.save());
        expect(setIntParams).toHaveBeenLastCalledWith([4]); expect(setFurniSources).toHaveBeenLastCalledWith([100]);
    });
});
