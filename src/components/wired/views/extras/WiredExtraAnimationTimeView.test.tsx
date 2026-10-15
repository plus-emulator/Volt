import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger = { intData: [575] };

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key === 'wiredfurni.params.setanimationtime2' ? 'Animation time (ms):' : key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WIRED_SLIDER_ECHO: { precision: 0, endsWithFive: false, toString: String },
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));
vi.mock('../../../../hooks', () => ({ useWired: () => ({ trigger, setIntParams, setStringParam }) }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredShellHeaderView', () => ({
    WiredShellButton: ({ children, onClick, disabled }: PropsWithChildren<{ onClick: () => void; disabled: boolean }>) => <button disabled={disabled} onClick={onClick}>{children}</button>
}));
vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: ({ children, save }: PropsWithChildren<{ save: () => void }>) => <div>{children}<button onClick={save}>Save</button></div>
}));
import { WiredExtraAnimationTimeView } from './WiredExtraAnimationTimeView';

describe('AIR Animation Time input', () => {
    afterEach(cleanup);
    beforeEach(() => { vi.clearAllMocks(); trigger = { intData: [575] }; });

    it('opens and saves an exact saved millisecond value without snapping to the thumb step', () => {
        render(<WiredExtraAnimationTimeView />);
        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('575');
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(setIntParams).toHaveBeenCalledWith([575]);
    });

    it('accepts typed milliseconds while the arrows step by 50ms', () => {
        render(<WiredExtraAnimationTimeView />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '725' } });
        fireEvent.click(screen.getAllByRole('button')[1]);
        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('775');
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(setIntParams).toHaveBeenCalledWith([775]);
        expect(setStringParam).toHaveBeenCalledWith('');
    });

    it('keeps the last valid value when the typed text is outside the native range', () => {
        render(<WiredExtraAnimationTimeView />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '2001' } });
        expect(screen.getByRole('textbox').parentElement?.className).toContain('is-invalid');
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(setIntParams).toHaveBeenCalledWith([575]);
    });
});
