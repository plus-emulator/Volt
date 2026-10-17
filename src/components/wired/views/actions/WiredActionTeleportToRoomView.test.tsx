import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setFurniSources = vi.fn();
const setUserSources = vi.fn();
const setStringParam = vi.fn();
let trigger: { stringData: string; intData: number[]; furniSources: number[]; userSources: number[] } | null = null;
let furniIds: number[] = [];
let baseProps: { save: () => void; validate?: () => boolean } | null = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ setFurniSources, setUserSources, trigger, furniIds, setIntParams, setStringParam })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: () => <div>sources</div>
}));

vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

import { WiredActionTeleportToRoomView } from './WiredActionTeleportToRoomView';

describe('WiredActionTeleportToRoomView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        baseProps = null;
        furniIds = [];
    });

    it('uses only the native source selectors and saves no invented room-id input', () => {
        trigger = { stringData: '', intData: [], furniSources: [100], userSources: [201] };
        render(<WiredActionTeleportToRoomView />);
        expect(screen.queryByRole('textbox')).toBeNull();
        baseProps.save();
        expect(setStringParam).toHaveBeenCalledWith('');
        expect(setIntParams).toHaveBeenCalledWith([]);
        expect(setFurniSources).toHaveBeenCalledWith([100]);
        expect(setUserSources).toHaveBeenCalledWith([201]);
    });
});
