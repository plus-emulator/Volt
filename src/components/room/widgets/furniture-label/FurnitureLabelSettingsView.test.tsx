import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { send, close, label } = vi.hoisted(() => ({
    send: vi.fn(), close: vi.fn(),
    label: { furnitureId: 731, bubbleColor: 4278912, visibility: 1, alwaysOpen: true }
}));
vi.mock('@volt/renderer', () => ({ WiredLabelSaveSettingsComposer: class { constructor(...args: unknown[]) { Object.assign(this, { args }); } } }));
vi.mock('../../../../api', () => ({ SendMessageComposer: send, localizeWithFallback: (_key: string, fallback: string) => fallback }));
vi.mock('../../../../common', () => ({ DraggableWindow: ({ children }: PropsWithChildren) => children }));
vi.mock('../../../../common/native-text/NativeText', () => ({ NativeText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../../../../hooks', () => ({ useWiredToolsState: () => ({ roomSettings: { canModify: true } }) }));
vi.mock('../../../../hooks/rooms/widgets/useWiredLabelsState', () => ({
    useWiredLabelsStore: (select: (state: unknown) => unknown) => select({ settingsFurniId: 731, labels: { 731: label }, closeSettings: close })
}));
vi.mock('./FurnitureLabelColorPreview', () => ({ FurnitureLabelColorPreview: () => null }));
import { FurnitureLabelSettingsView } from './FurnitureLabelSettingsView';

beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ measureText: (text: string) => ({ width: text.length * 6 }) } as never); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('AIR furniture label settings', () => {
    it('keeps restricted labels closed when saving, even if their stored always-open flag was set', () => {
        render(<FurnitureLabelSettingsView />);
        expect(screen.getByRole('checkbox')).toBeDisabled();
        expect(screen.getByRole('checkbox').closest('label')).toHaveAttribute('aria-disabled', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Ready' }));
        expect(send.mock.calls[0][0].args).toEqual([731, 4278912, 1, false]);
        expect(close).toHaveBeenCalledOnce();
    });
    it('dismisses an opened menu without saving on Escape or an outside click', () => {
        render(<FurnitureLabelSettingsView />);
        const color = screen.getByRole('combobox', { name: 'Label color' });
        fireEvent.click(color);
        expect(screen.getByRole('listbox')).toBeInTheDocument();
        fireEvent.keyDown(color, { key: 'Escape' });
        expect(screen.queryByRole('listbox')).toBeNull();
        fireEvent.click(color);
        fireEvent.pointerDown(document.body);
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(send).not.toHaveBeenCalled();
    });
    it('saves the chosen colour and Everyone visibility, and lets Cancel discard edits', () => {
        render(<FurnitureLabelSettingsView />);
        fireEvent.click(screen.getByRole('combobox', { name: 'Label color' }));
        fireEvent.pointerDown(screen.getByRole('option', { name: 'Red' }), { button: 0 });
        fireEvent.click(screen.getByRole('combobox', { name: 'Who can see this label?' }));
        fireEvent.pointerDown(screen.getByRole('option', { name: 'Everyone' }), { button: 0 });
        expect(screen.getByRole('checkbox')).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: 'Ready' }));
        expect(send.mock.calls[0][0].args).toEqual([731, 8404554, 0, true]);
        send.mockClear();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(send).not.toHaveBeenCalled();
    });
});
