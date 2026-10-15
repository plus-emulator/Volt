import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHAT_HELP_BUTTON_HIDE_DELAY_MS, useChatHelpButton } from './useChatHelpButton';

describe('useChatHelpButton (AIR helpbutton hover visibility)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts hidden and shows while the hover region is entered', () => {
        const { result } = renderHook(() => useChatHelpButton());

        expect(result.current.isHelpButtonVisible).toBe(false);

        act(() => result.current.hoverRegionProps.onMouseEnter());

        expect(result.current.isHelpButtonVisible).toBe(true);
    });

    it('hides 400 ms after the pointer leaves the hover region', () => {
        expect(CHAT_HELP_BUTTON_HIDE_DELAY_MS).toBe(400);

        const { result } = renderHook(() => useChatHelpButton());

        act(() => result.current.hoverRegionProps.onMouseEnter());
        act(() => result.current.hoverRegionProps.onMouseLeave());
        act(() => vi.advanceTimersByTime(CHAT_HELP_BUTTON_HIDE_DELAY_MS - 1));

        expect(result.current.isHelpButtonVisible).toBe(true);

        act(() => vi.advanceTimersByTime(1));

        expect(result.current.isHelpButtonVisible).toBe(false);
    });

    it('cancels the pending hide when the region is re-entered', () => {
        const { result } = renderHook(() => useChatHelpButton());

        act(() => result.current.hoverRegionProps.onMouseEnter());
        act(() => result.current.hoverRegionProps.onMouseLeave());
        act(() => vi.advanceTimersByTime(300));
        act(() => result.current.hoverRegionProps.onMouseEnter());
        act(() => vi.advanceTimersByTime(1000));

        expect(result.current.isHelpButtonVisible).toBe(true);
    });

    it('stays visible while the pointer moves from the region onto the button', () => {
        const { result } = renderHook(() => useChatHelpButton());

        act(() => result.current.hoverRegionProps.onMouseEnter());
        act(() => {
            result.current.hoverRegionProps.onMouseLeave();
            result.current.helpButtonProps.onMouseEnter();
        });
        act(() => vi.advanceTimersByTime(1000));

        expect(result.current.isHelpButtonVisible).toBe(true);

        act(() => result.current.helpButtonProps.onMouseLeave());
        act(() => vi.advanceTimersByTime(CHAT_HELP_BUTTON_HIDE_DELAY_MS - 1));

        expect(result.current.isHelpButtonVisible).toBe(true);

        act(() => vi.advanceTimersByTime(1));

        expect(result.current.isHelpButtonVisible).toBe(false);
    });

    it('does not start a hide timer when the region reports a leave while the button is hovered', () => {
        const { result } = renderHook(() => useChatHelpButton());

        act(() => result.current.helpButtonProps.onMouseEnter());
        act(() => result.current.hoverRegionProps.onMouseLeave());
        act(() => vi.advanceTimersByTime(1000));

        expect(result.current.isHelpButtonVisible).toBe(true);
    });

    it('clears a pending hide timer on unmount', () => {
        const { result, unmount } = renderHook(() => useChatHelpButton());

        act(() => result.current.hoverRegionProps.onMouseEnter());
        act(() => result.current.hoverRegionProps.onMouseLeave());

        expect(vi.getTimerCount()).toBe(1);

        unmount();

        expect(vi.getTimerCount()).toBe(0);
    });
});
