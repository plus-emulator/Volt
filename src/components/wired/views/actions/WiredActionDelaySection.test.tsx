import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiredNativeContext } from '../WiredNativeContext';

vi.mock('../../../../api', async () => ({
    ...(await vi.importActual('../../../../api/wired/WiredSliderConverters')),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span>, Slider: () => null }));
vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredShellHeaderView', () => ({ WiredShellButton: ({ children, onClick }: PropsWithChildren<{ onClick: () => void }>) => <button onClick={onClick}>{children}</button> }));
vi.mock('../../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: () => null }));
vi.mock('../../../../common/native-text/NativeText', () => ({ NativeText: ({ text }: { text: string }) => <span>{text}</span> }));

import { WiredActionDelaySection } from './WiredActionDelaySection';

const renderSection = (value: number, onChange = vi.fn()) => {
    render(<WiredNativeContext.Provider value={true}><WiredActionDelaySection value={value} onChange={onChange} /></WiredNativeContext.Provider>);
    return onChange;
};

describe('ActionDelaySection (AIR WIN63-202610131318-860371703)', () => {
    beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ measureText: (text: string) => ({ width: text.length * 6 }) } as unknown as ReturnType<HTMLCanvasElement['getContext']>); });
    afterEach(() => { cleanup(); vi.restoreAllMocks(); });

    it('shows "Delay (seconds):" with the value in a number input and the mode under an icon button', () => {
        renderSection(3);
        expect(screen.getByText('Delay (seconds):')).toBeTruthy();
        expect(screen.getByRole('textbox', { name: 'Delay (seconds):' })).toHaveProperty('value', '1.5');
        expect(screen.getByRole('button', { name: 'Standard (per 0.5s)' })).toBeTruthy();
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('opens the Standard/Precise menu from the icon button and encodes precise delays as minus milliseconds', () => {
        const onChange = renderSection(0);
        fireEvent.click(screen.getByRole('button', { name: 'Standard (per 0.5s)' }));
        const options = screen.getAllByRole('option').map(option => option.textContent);
        expect(options).toEqual(['Standard (per 0.5s)', 'Precise (per 0.05s)']);
        fireEvent.pointerUp(screen.getAllByRole('option')[1], { button: 0 });
        expect(onChange).toHaveBeenLastCalledWith(-0);
        expect(screen.getByRole('button', { name: 'Precise (per 0.05s)' })).toBeTruthy();
        fireEvent.change(screen.getByRole('textbox', { name: 'Delay (seconds):' }), { target: { value: '0.25' } });
        expect(onChange).toHaveBeenLastCalledWith(-250);
    });

    it('reads a precise delay from the wire and types standard delays in half seconds', () => {
        renderSection(-1500);
        expect(screen.getByRole('textbox', { name: 'Delay (seconds):' })).toHaveProperty('value', '1.5');
        cleanup();
        const onChange = renderSection(0);
        fireEvent.change(screen.getByRole('textbox', { name: 'Delay (seconds):' }), { target: { value: '2.5' } });
        expect(onChange).toHaveBeenLastCalledWith(5);
    });
});
