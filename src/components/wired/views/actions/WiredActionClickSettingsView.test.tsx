import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const setIntParams = vi.fn();
const setUserSources = vi.fn();
let trigger: { code: number; intData: number[]; userSources: number[] };
let baseProps: { save: () => void; nativeLayout?: boolean };
vi.mock('../../../../hooks', () => ({ useWired: () => ({ trigger, setIntParams, setUserSources }) }));
vi.mock('../../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: () => null }));
vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<typeof baseProps>) => {
        baseProps = props;
        return <div>{props.children}</div>;
    }
}));
import { WiredActionClickSettingsView } from './WiredActionClickSettingsView';

describe('native Click Settings (AIR class_4037)', () => {
    afterEach(cleanup);
    beforeEach(() => vi.clearAllMocks());
    it.each([[1, 200], [0, 1]])('keeps furniture mode %i independent of user source %i on open/save', (furni, source) => {
        trigger = { code: 54, intData: [2, furni], userSources: [source] };
        const { container } = render(<WiredActionClickSettingsView />);
        expect((screen.getByRole('combobox', { name: 'Clicking a furni' }) as HTMLSelectElement).value).toBe(String(furni));
        expect(baseProps.nativeLayout).toBe(true);
        expect(container.querySelectorAll('.volt-wired__section')).toHaveLength(2);
        baseProps.save();
        expect(setIntParams).toHaveBeenCalledWith([2, furni]);
        expect(setUserSources).toHaveBeenCalledWith([source]);
    });
    it('edits the two click modes without rewriting the separately owned user source', () => {
        trigger = { code: 54, intData: [0, 0], userSources: [201] };
        render(<WiredActionClickSettingsView />);
        fireEvent.change(screen.getByRole('combobox', { name: 'Clicking a user' }), { target: { value: '1' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Clicking a furni' }), { target: { value: '1' } });
        baseProps.save();
        expect(setIntParams).toHaveBeenCalledWith([1, 1]);
        expect(setUserSources).toHaveBeenCalledWith([201]);
    });
});
