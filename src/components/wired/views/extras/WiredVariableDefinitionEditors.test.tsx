import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';
const state = vi.hoisted(() => ({ trigger: { intData: [11, 1], stringData: 'Game Score', variableIds: [] as string[], contexts: [] as any[] }, setIntParams: vi.fn(), setStringParam: vi.fn(), setVariableIds: vi.fn() }));
vi.mock('../../../../api', async () => ({
    ...(await vi.importActual('../../../../api/wired/WiredVariableName')),
    WIRED_VARIABLE_ABSENT: 'n', WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 },
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback: string, names: string[] = [], values: string[] = []) => names.reduce((text, name, index) => text.replace(`%${name}%`, values[index]), fallback || key)
}));
vi.mock('../../../../hooks', () => ({ useWired: () => state, useNotificationActions: () => ({ showConfirm: vi.fn() }) }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredDropdown', () => ({ WiredDropdown: ({ options, value, caption, disabled, onChange }: any) => <select aria-label={caption} disabled={disabled} value={value} onChange={event => onChange(Number(event.target.value))}><option value={-1}>{caption}</option>{options.map((option: any) => <option key={option.id} value={option.id}>{option.label}</option>)}</select> }));
vi.mock('./WiredExtraBaseView', () => ({ WiredExtraBaseView: ({ children, save, validate, nativeLayout, cardStyle }: PropsWithChildren<{ save: () => void; validate?: () => boolean; nativeLayout: boolean; cardStyle?: unknown }>) => <WiredNativeContext.Provider value={nativeLayout}><div data-testid="editor" data-native={String(nativeLayout)} data-width={String(cardStyle)}>{children}<button disabled={validate ? !validate() : false} onClick={save}>Save</button></div></WiredNativeContext.Provider> }));
import { WiredExtraUserVariableView } from './WiredExtraUserVariableView';
import { WiredExtraFurniVariableView } from './WiredExtraFurniVariableView';
import { WiredExtraRoomVariableView } from './WiredExtraRoomVariableView';
import { WiredExtraContextVariableView } from './WiredExtraContextVariableView';
import { WiredExtraVariableReferenceView } from './WiredExtraVariableReferenceView';
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
const sharedContext = { type: 4, shared: [
    { roomId: 99, roomName: 'Zoo', variable: { variableId: 'opaque:z:one', variableName: 'score_z' } },
    { roomId: 42, roomName: 'Arena', variable: { variableId: 'opaque:a:one', variableName: 'score_a' } },
    { roomId: 42, roomName: 'Arena', variable: { variableId: 'opaque:a:two', variableName: 'other_score' } }
] };
describe('Active native variable definition editors (registry 0–4)', () => {
    beforeEach(() => { vi.clearAllMocks(); state.trigger = { intData: [11, 1], stringData: 'Game Score', variableIds: [], contexts: [] }; });
    afterEach(cleanup);
    it.each([
        [WiredExtraUserVariableView, [11, 1], [11, 0], 3, 3],
        [WiredExtraFurniVariableView, [1, 10], [0, 10], 3, 2],
        [WiredExtraContextVariableView, [1], [0], 2, 0]
    ] as const)('uses native definition controls and retains each owned-field order', (View, ints, saved, sections, radios) => {
        state.trigger.intData = [...ints]; const { container } = render(<View />);
        expect(screen.getByTestId('editor').getAttribute('data-native')).toBe('true');
        expect(screen.getByTestId('editor').getAttribute('data-width')).toBe('undefined');
        expect(container.querySelectorAll('.volt-wired__native-section')).toHaveLength(sections);
        expect(screen.queryAllByRole('radio')).toHaveLength(radios);
        const name = screen.getByRole('textbox'); expect(name).toHaveProperty('value', 'game_score'); expect(name).toHaveProperty('maxLength', 40);
        fireEvent.change(name, { target: { value: 'Next Score' } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'wiredfurni.params.variables.settings.has_value' })); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([...saved]); expect(state.setStringParam).toHaveBeenLastCalledWith('next_score');
    });
    it('shows the room current value from context without writing it into definition fields', () => {
        state.trigger.intData = [11]; state.trigger.contexts = [{ type: 3, value: -12345, variable: { variableId: 'room-counter' } }];
        const { container } = render(<WiredExtraRoomVariableView />);
        expect(container.querySelectorAll('.volt-wired__native-section')).toHaveLength(3); expect(screen.getByText('Current value: -12345')).toBeTruthy();
        fireEvent.click(screen.getByRole('radio', { name: 'wiredfurni.params.variables.availability.10' })); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([10]); expect(state.setStringParam).toHaveBeenLastCalledWith('game_score');
    });
    it('does not invent a room value when inspection context is absent', () => {
        render(<WiredExtraRoomVariableView />); expect(screen.getByText('Current value: —')).toBeTruthy();
    });
    it('preserves the saved reference ID, read-only flag, and name while showing sorted rooms', () => {
        state.trigger = { intData: [1], stringData: 'my_alias', variableIds: ['opaque:a:two'], contexts: [sharedContext] };
        const { container } = render(<WiredExtraVariableReferenceView />);
        expect(container.querySelectorAll('.volt-wired__native-section')).toHaveLength(4);
        const room = screen.getByRole('combobox', { name: 'wiredfurni.params.variables.room_selection.tooltip' }) as HTMLSelectElement;
        expect(room.value).toBe('42'); expect(Array.from(room.options).map(option => option.text)).toEqual(['wiredfurni.params.variables.room_selection.tooltip', 'Arena', 'Zoo']);
        expect(screen.getByRole('combobox', { name: 'wiredfurni.params.variables.variable_selection.tooltip' })).toHaveProperty('value', '1');
        fireEvent.click(screen.getByRole('checkbox', { name: 'wiredfurni.params.variables.settings.read_only' })); save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([0]); expect(state.setVariableIds).toHaveBeenLastCalledWith(['opaque:a:two']); expect(state.setStringParam).toHaveBeenLastCalledWith('my_alias');
    });
    it('autonames only an unchanged/empty reference name and blocks absent references', () => {
        state.trigger = { intData: [0], stringData: 'score_a', variableIds: ['opaque:a:one'], contexts: [sharedContext] }; render(<WiredExtraVariableReferenceView />);
        const picker = screen.getByRole('combobox', { name: 'wiredfurni.params.variables.variable_selection.tooltip' });
        fireEvent.change(picker, { target: { value: '1' } }); expect(screen.getByRole('textbox')).toHaveProperty('value', 'other_score');
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Custom Alias' } }); fireEvent.change(picker, { target: { value: '0' } });
        expect(screen.getByRole('textbox')).toHaveProperty('value', 'custom_alias'); save(); expect(state.setVariableIds).toHaveBeenLastCalledWith(['opaque:a:one']);
        fireEvent.change(screen.getByRole('combobox', { name: 'wiredfurni.params.variables.room_selection.tooltip' }), { target: { value: '99' } });
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        expect(screen.getByRole('textbox')).toHaveProperty('value', 'custom_alias');
    });
    it('disables reference editing without the shared-variable context instead of silently clearing its ID', () => {
        state.trigger = { intData: [1], stringData: 'saved_alias', variableIds: ['saved:opaque:id'], contexts: [] }; render(<WiredExtraVariableReferenceView />);
        expect(screen.getByRole('textbox')).toHaveProperty('disabled', true);
        for (const dropdown of screen.getAllByRole('combobox')) expect(dropdown).toHaveProperty('disabled', true);
        expect(screen.getByRole('checkbox')).toHaveProperty('disabled', true); save(); expect(state.setVariableIds).not.toHaveBeenCalled();
        cleanup(); state.trigger = { intData: [1], stringData: 'empty_alias', variableIds: ['n'], contexts: [sharedContext] }; render(<WiredExtraVariableReferenceView />);
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
    });
});
