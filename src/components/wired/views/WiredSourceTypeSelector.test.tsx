import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { planNativeSkin } from '../../mod-tools/native/NativeSkin';

vi.mock('../../../api', () => ({ localizeWithFallback: (_key: string, fallback: string) => fallback }));
vi.mock('../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: ({ skin, layout, state, width, height, color }: Parameters<typeof import('../../mod-tools/native/NativeSkinView').NativeSkinView>[0]) => {
    const plan = planNativeSkin(skin, layout, state, width, height);
    return <span data-testid="native-skin" data-state={state} data-color={color} data-width={width} data-draws={plan.draws.length} />;
} }));

import { WiredSourceTypeSelector, wiredSourceSplitterColor, wiredSourceTypeColor } from './WiredSourceTypeSelector';

describe('AIR source type selector', () => {
    afterEach(cleanup);

    it('uses the extracted three-part skins and official four-button dimensions', () => {
        const onChange = vi.fn();
        render(<WiredSourceTypeSelector types={['furni', 'user', 'global', 'context']} value="furni" onChange={onChange} />);
        const buttons = screen.getAllByRole('button');
        expect(buttons.map(button => button.style.width)).toEqual(['17px', '14px', '14px', '17px']);
        expect(buttons.every(button => button.style.height === '19px')).toBe(true);
        expect(screen.getAllByTestId('native-skin').every(skin => Number(skin.dataset.draws) > 0)).toBe(true);
        expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: 'Context' }));
        expect(onChange).toHaveBeenCalledWith('context');
    });

    it('uses AIR active and hover colours, retaining active colour on hover', () => {
        render(<WiredSourceTypeSelector types={['furni', 'user']} value="furni" onChange={vi.fn()} />);
        const [selected, other] = screen.getAllByTestId('native-skin');
        expect(selected.dataset.state).toBe('pressed');
        expect(Number(selected.dataset.color)).toBe(0xe5be21);
        fireEvent.mouseEnter(screen.getByRole('button', { name: 'Users' }));
        expect(other.dataset.state).toBe('hovering');
        expect(Number(other.dataset.color)).toBe(0x48ce4b);
        fireEvent.mouseLeave(screen.getByRole('button', { name: 'Users' }));
        expect(other.dataset.state).toBe('default');
        expect(Number(other.dataset.color)).toBe(0xffffff);
        expect(wiredSourceTypeColor('furni', true, true)).toBe(0xe5be21);
    });

    it('keeps the divider owned by its active neighbour instead of the hovered neighbour', () => {
        expect(wiredSourceSplitterColor('furni', 'user', 'user', 'furni')).toBe(0x1b651d);
        expect(wiredSourceSplitterColor('furni', 'user', 'furni', 'user')).toBe(0x826c12);
    });

    it('does not hover or select a disabled control', () => {
        const onChange = vi.fn();
        render(<WiredSourceTypeSelector types={['furni', 'user']} value="furni" onChange={onChange} disabled />);
        const button = screen.getByRole('button', { name: 'Users' });
        fireEvent.mouseEnter(button);
        fireEvent.click(button);
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getAllByTestId('native-skin')[1].dataset.state).toBe('disabled');
        expect(Number(screen.getAllByTestId('native-skin')[1].dataset.color)).toBe(0xffffff);
    });
});
