import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';

const state = vi.hoisted(() => ({
    trigger: { intData: [1], stringData: '', contexts: [{ type: 7, placeholderNames: ['name'] }] },
    setIntParams: vi.fn(), setStringParam: vi.fn()
}));
vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_BY_ID: 1 }
}));
vi.mock('../../../../hooks', () => ({ useWired: () => state }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span>, VoltCardView: ({ children }: PropsWithChildren) => <div>{children}</div> }));
vi.mock('./WiredMessageToolbarButton', () => ({ WiredMessageToolbarButton: ({ text, ...props }: { text: string }) => <button {...props}>{text}</button> }));
vi.mock('./WiredMessagePreview', () => ({ WiredMessagePreview: ({ value, styleId }: { value: string; styleId: number }) => <output data-testid="message-preview" data-style={styleId}>{value}</output> }));
vi.mock('../WiredShellHeaderView', () => ({ WiredShellHeaderView: ({ title, onClose }: { title: string; onClose: () => void }) => <header>{title}<button onClick={onClose}>Close</button></header> }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../actions/WiredActionBaseView', () => ({ WiredActionBaseView: ({ children, save, validate }: PropsWithChildren<{ save: () => void; validate: () => boolean }>) => <WiredNativeContext.Provider value={true}>{children}<button disabled={!validate()} onClick={save}>Save</button></WiredNativeContext.Provider> }));

import { WiredMessageEditor } from './WiredMessageEditor';
import { WiredActionSendLinkMessageView } from '../actions/WiredActionSendLinkMessageView';

const DefaultEditor = () => {
    const [value, setValue] = useState('');
    return <WiredMessageEditor value={value} onChange={setValue} />;
};
const openEditor = () => fireEvent.click(screen.getByRole('button', { name: 'Open the message editor' }));
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));

describe('message editor limits and Send Link save contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.trigger = { intData: [1], stringData: '', contexts: [{ type: 7, placeholderNames: ['name'] }] };
    });
    afterEach(cleanup);

    it('keeps default message editors at 400 characters and eight lines', () => {
        render(<DefaultEditor />);
        const area = screen.getByRole('textbox') as HTMLTextAreaElement;
        fireEvent.change(area, { target: { value: 'x'.repeat(401) } });
        expect(area.value).toHaveLength(400);
        fireEvent.change(area, { target: { value: Array.from({ length: 10 }, (_, i) => `${i}`).join('\n') } });
        expect(area.value.split('\n')).toHaveLength(8);
        openEditor();
        const popup = screen.getAllByRole('textbox')[1] as HTMLTextAreaElement;
        fireEvent.change(popup, { target: { value: 'y'.repeat(401) } });
        expect(popup.value).toHaveLength(400);
    });

    it('uses the 60px Send Link field, permits more than eight lines and caps both editors at 1000 characters', () => {
        render(<WiredActionSendLinkMessageView />);
        const compact = screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(compact.style.height).toBe('60px');
        expect(compact.classList.contains('volt-wired__resizable-textarea')).toBe(false);
        const lines = Array.from({ length: 12 }, () => 'x'.repeat(50)).join('\n');
        fireEvent.change(compact, { target: { value: lines } });
        expect(compact.value).toBe(lines);
        openEditor();
        const popup = screen.getAllByRole('textbox')[1] as HTMLTextAreaElement;
        expect(popup.value).toBe(lines);
        expect(screen.getByTestId('message-preview').getAttribute('data-style')).toBe('211');
        expect(screen.getByTestId('message-preview').textContent).toBe(lines);
        expect(screen.getByText(`${lines.length}/1000`)).toBeTruthy();
        fireEvent.change(popup, { target: { value: 'a'.repeat(1001) } });
        expect(popup.value).toHaveLength(1000);
        expect(compact.value).toHaveLength(1000);
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([1]);
        expect(state.setStringParam).toHaveBeenLastCalledWith('a'.repeat(1000));
    });

    it('applies formatting against the configured limit instead of the old 400-character limit', () => {
        state.trigger.stringData = 'a'.repeat(900);
        render(<WiredActionSendLinkMessageView />);
        openEditor();
        const popup = screen.getAllByRole('textbox')[1] as HTMLTextAreaElement;
        popup.setSelectionRange(0, 1);
        fireEvent.click(screen.getByTitle('Bold'));
        expect(popup.value).toBe('[b]a[/b]' + 'a'.repeat(899));
        fireEvent.change(popup, { target: { value: 'a'.repeat(1000) } });
        popup.setSelectionRange(0, 1);
        fireEvent.click(screen.getByTitle('Bold'));
        expect(popup.value).toBe('a'.repeat(1000));
    });

    it('closes the popup and disables compact editing when trigger-source is selected, retaining the saved text', () => {
        state.trigger.stringData = 'kept';
        render(<WiredActionSendLinkMessageView />);
        openEditor();
        expect(screen.getAllByRole('textbox')).toHaveLength(2);
        fireEvent.click(screen.getByRole('radio', { name: 'From WIRED trigger' }));
        expect(screen.getAllByRole('textbox')).toHaveLength(1);
        expect(screen.getByRole('textbox')).toHaveProperty('disabled', true);
        expect(screen.getByRole('button', { name: 'Open the message editor' })).toHaveProperty('disabled', true);
        save();
        expect(state.setIntParams).toHaveBeenLastCalledWith([0]);
        expect(state.setStringParam).toHaveBeenLastCalledWith('kept');
        fireEvent.click(screen.getByRole('radio', { name: 'Custom message' }));
        expect(screen.getAllByRole('textbox')).toHaveLength(1);
        expect(screen.getByRole('textbox')).toHaveProperty('disabled', false);
    });

    it('blocks UTF-8 payloads above 1000 bytes even when the editor character limit and source allow them', () => {
        render(<WiredActionSendLinkMessageView />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'é'.repeat(501) } });
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        save();
        expect(state.setStringParam).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('radio', { name: 'From WIRED trigger' }));
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
        fireEvent.click(screen.getByRole('radio', { name: 'Custom message' }));
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'é'.repeat(500) } });
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', false);
        save();
        expect(state.setStringParam).toHaveBeenLastCalledWith('é'.repeat(500));
    });
});
