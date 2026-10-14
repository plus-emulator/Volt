import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { code: number; stringData: string; intData: number[] };
let baseProps: { save: () => void; validate?: () => boolean; nativeLayout?: boolean };
vi.mock('../../../../hooks', () => ({ useWired: () => ({ trigger, setIntParams, setStringParam }) }));
vi.mock('../../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<typeof baseProps>) => {
        baseProps = props;
        return <div>{props.children}</div>;
    }
}));
import { WiredActionWriteToLogsView } from './WiredActionWriteToLogsView';

describe('native Write to Logs / negative Write to Logs (AIR class_3502)', () => {
    afterEach(cleanup);
    beforeEach(() => vi.clearAllMocks());

    it('allows the empty message AIR accepts and uses a 400-character single-line input', () => {
        trigger = { code: 49, stringData: '', intData: [] };
        const { container } = render(<WiredActionWriteToLogsView />);
        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.tagName).toBe('INPUT');
        expect(input.maxLength).toBe(400);
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('0');
        expect(baseProps.nativeLayout).toBe(true);
        expect(container.querySelectorAll('.volt-wired__section')).toHaveLength(2);
        expect(baseProps.validate?.() ?? true).toBe(true);
        baseProps.save();
        expect(setIntParams).toHaveBeenCalledWith([0]);
        expect(setStringParam).toHaveBeenCalledWith('');
    });

    it.each([49, 50])('round-trips code %i owned level and literal message without adding a source integer', code => {
        trigger = { code, stringData: 'door opened', intData: [2] };
        render(<WiredActionWriteToLogsView />);
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('2');
        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('door opened');
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '3' } });
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '  boss escaped  ' } });
        baseProps.save();
        expect(setIntParams).toHaveBeenCalledWith([3]);
        expect(setStringParam).toHaveBeenCalledWith('  boss escaped  ');
    });
});
