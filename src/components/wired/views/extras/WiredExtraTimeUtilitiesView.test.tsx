import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { WiredNativeContext } from '../WiredNativeContext';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeTimeUtilMask, normalizeTimeUtilMode, setTimeUtilSubVariableSelected } from './timeUtilitiesParams';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let nativeCatalog: any = null;
let trigger: { stringData: string; intData: number[] } | null = null;

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, nativeCatalog, setIntParams, setStringParam })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredText', () => ({ WiredText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('../WiredDropdown', () => ({ WiredDropdown: ({ caption, options, value, onChange }: any) => <select aria-label={caption} value={value} onChange={event => onChange(Number(event.target.value))}>{options.map((option: any) => <option key={option.id} value={option.id}>{option.label}</option>)}</select> }));

vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: ({ children, save, nativeLayout }: PropsWithChildren<{ save: () => void; nativeLayout: boolean }>) => (
        <WiredNativeContext.Provider value={nativeLayout}><div data-testid="editor" data-native={String(nativeLayout)}>
            {children}
            <button type="button" onClick={save}>
                Save
            </button>
        </div></WiredNativeContext.Provider>
    )
}));

import { WiredExtraTimeUtilitiesView } from './WiredExtraTimeUtilitiesView';

describe('timeUtilitiesParams', () => {
    it('keeps only the calendar and unit bits', () => {
        expect(normalizeTimeUtilMask(-1)).toBe(0x7fe | 0x7f00000);
        expect(normalizeTimeUtilMask(1)).toBe(0);
        expect(normalizeTimeUtilMask(Number.NaN)).toBe(0);
        expect(setTimeUtilSubVariableSelected(0, 11, true)).toBe(0);
        expect(setTimeUtilSubVariableSelected(1 << 4, 4, false)).toBe(0);
    });

    it('falls back to the value mode', () => {
        expect(normalizeTimeUtilMode(2)).toBe(2);
        expect(normalizeTimeUtilMode(3)).toBe(0);
        expect(normalizeTimeUtilMode(-1)).toBe(0);
    });
});

describe('WiredExtraTimeUtilitiesView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        nativeCatalog = null;
        setIntParams.mockClear();
        setStringParam.mockClear();
        trigger = { stringData: '', intData: [(1 << 4) | (1 << 24), 1] };
    });

    it('shows the saved selection and mode', () => {
        render(<WiredExtraTimeUtilitiesView />);

        expect((screen.getByRole('combobox', { name: 'Read the variable as:' }) as HTMLSelectElement).value).toBe('1');
        expect((screen.getByRole('checkbox', { name: 'Hour of the day' }) as HTMLInputElement).checked).toBe(true);
        expect((screen.getByRole('checkbox', { name: 'Year' }) as HTMLInputElement).checked).toBe(false);
        expect(screen.getByTestId('editor').getAttribute('data-native')).toBe('true');
        expect(screen.getByDisplayValue('hour_of_day')).toHaveProperty('readOnly', true);
        expect(screen.getByDisplayValue('hour_of_day').parentElement!.style.width).toBe('93px');
        expect(screen.queryByRole('checkbox', { name: 'Days' })).toBeNull();
    });

    it('saves the mask and the mode', () => {
        render(<WiredExtraTimeUtilitiesView />);

        fireEvent.click(screen.getByRole('checkbox', { name: 'Year' }));
        fireEvent.click(screen.getByRole('button', { name: /Advanced sub-variables/ }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Days' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Months' }));
        fireEvent.change(screen.getByRole('combobox', { name: 'Read the variable as:' }), { target: { value: '2' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(setIntParams).toHaveBeenCalledWith([(1 << 4) | (1 << 10) | (1 << 26), 2]);
        expect(setStringParam).toHaveBeenCalledWith('');
    });

    it('filters unavailable catalog capabilities while retaining the saved mode', () => {
        nativeCatalog = { rows: new Map([['x', { variable: { hasValue: true, canReadCreationTime: false, canReadLastUpdateTime: false } }]]) };
        render(<WiredExtraTimeUtilitiesView />);
        expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['Variable value', 'Creation time']);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(setIntParams).toHaveBeenCalledWith([(1 << 4) | (1 << 24), 1]);
        fireEvent.change(screen.getByRole('combobox', { name: 'Read the variable as:' }), { target: { value: '0' } });
        expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['Variable value', 'Creation time']);
    });

    it('starts a new box with nothing selected', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredExtraTimeUtilitiesView />);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(setIntParams).toHaveBeenCalledWith([0, 0]);
    });
});
