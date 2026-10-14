import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { registerSharedHook, SharedHookRegistry, useSharedHook } from './useSharedHook';

describe('useSharedHook', () => {
    it('publishes a nested dependency chain without waiting for Suspense retry timers', async () => {
        vi.useFakeTimers();
        try {
            const useFirst = () => ({ value: 7 });
            const useSecond = () => ({ value: useSharedHook(useFirst).value + 1 });
            const useThird = () => ({ value: useSharedHook(useSecond).value + 1 });
            registerSharedHook(useThird);
            registerSharedHook(useSecond);
            registerSharedHook(useFirst);
            const Consumer = () => <span data-testid="chain">{useSharedHook(useThird).value}</span>;

            await act(async () => {
                render(<SharedHookRegistry fallback={<span>waiting</span>}><Consumer /></SharedHookRegistry>);
            });
            expect(screen.getByTestId('chain')).toHaveTextContent('9');
        } finally {
            cleanup();
            vi.useRealTimers();
        }
    });

    it('runs the source hook once and shares its Zustand-backed snapshot', async () => {
        const mounted = vi.fn();

        const useCounterSource = () => {
            const [count, setCount] = useState(0);

            useEffect(() => {
                mounted();
            }, []);

            return { count, setCount };
        };

        const Counter = ({ label }: { label: string }) => {
            const { count, setCount } = useSharedHook(useCounterSource);

            return (
                <button data-testid={label} onClick={() => setCount((value) => value + 1)}>
                    {count}
                </button>
            );
        };

        registerSharedHook(useCounterSource);

        const view = render(
            <SharedHookRegistry fallback={<span>loading</span>}>
                <span>shell</span>
            </SharedHookRegistry>
        );

        await waitFor(() => expect(mounted).toHaveBeenCalledTimes(1));

        view.rerender(
            <SharedHookRegistry fallback={<span>loading</span>}>
                <Counter label="first" />
                <Counter label="second" />
            </SharedHookRegistry>
        );

        expect(screen.queryByText('loading')).not.toBeInTheDocument();
        expect(screen.getByTestId('first')).toHaveTextContent('0');
        expect(screen.getByTestId('second')).toHaveTextContent('0');
        expect(mounted).toHaveBeenCalledTimes(1);

        act(() => screen.getByTestId('first').click());

        expect(screen.getByTestId('first')).toHaveTextContent('1');
        expect(screen.getByTestId('second')).toHaveTextContent('1');
    });
});
