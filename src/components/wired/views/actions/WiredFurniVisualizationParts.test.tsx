import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../../../api', () => ({ LocalizeText: (key: string) => key, localizeWithFallback: (key: string) => key }));
vi.mock('../../../../hooks', () => ({ useNotification: () => ({ simpleAlert: vi.fn() }) }));
vi.mock('../../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: () => null }));
vi.mock('../WiredSourcesSelector', () => { const WiredSourcesSelector = ({ furniSlot = 0, userSlot = 0, showFurni, furniSource, userSource, furniTitle, usersTitle, headerOption, onChangeFurni, onChangeUsers }: any) => <section aria-label={showFurni ? furniTitle : usersTitle}>{headerOption}<input aria-label={`${showFurni ? 'Furni' : 'User'} source ${showFurni ? furniSlot : userSlot}`} value={showFurni ? furniSource : userSource} onChange={event => (showFurni ? onChangeFurni : onChangeUsers)(Number(event.target.value))} /></section>; const WiredHolderSourceSection = ({ scope }: any) => <span>{`holder ${scope}`}</span>; return { WiredSourcesSelector, WiredHolderSourceSection, WiredMergedSourceSection: ({ scope, disabled, title, ...rest }: any) => { const content = scope === 'global' || scope === 'context' ? <WiredHolderSourceSection scope={scope} /> : <WiredSourcesSelector showFurni={scope === 'furni'} showUsers={scope !== 'furni'} furniTitle={title} usersTitle={title} {...rest} />; return disabled ? <fieldset disabled>{content}</fieldset> : content; } }; });
import { WiredVisualizationSources } from './WiredFurniVisualizationParts';

const props = (overrides: Partial<Parameters<typeof WiredVisualizationSources>[0]> = {}) => ({
    targetUsers: false, onTargetUsersChange: vi.fn(), furniSource: 100, onFurniSourceChange: vi.fn(), userSource: 201, onUserSourceChange: vi.fn(),
    audienceUserSource: 200, onAudienceUserSourceChange: vi.fn(), audienceSourceDisabled: false, ...overrides
});

describe('Furni visualization footer (AIR class_4214 / class_4285 merged [[0,1],[-1,0]])', () => {
    afterEach(cleanup);
    it('shows the "target" section with its furni/users type selector and the audience section', () => {
        const onTargetUsersChange = vi.fn();
        render(<WiredVisualizationSources {...props({ onTargetUsersChange })} />);
        expect(screen.getByRole('region', { name: 'wiredfurni.params.sources.merged.title.target' })).toBeTruthy();
        expect(screen.getByRole('textbox', { name: 'Furni source 0' })).toHaveProperty('value', '100');
        expect(screen.getByRole('region', { name: 'wiredfurni.params.visualization.visibility_audience' })).toBeTruthy();
        expect(screen.getByRole('textbox', { name: 'User source 0' }).closest('fieldset')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.sourcetype.users' }));
        expect(onTargetUsersChange).toHaveBeenLastCalledWith(true);
    });
    it('reads target users from user slot 1 and greys (not hides) the audience while everyone sees the effect', () => {
        render(<WiredVisualizationSources {...props({ targetUsers: true, audienceSourceDisabled: true })} />);
        expect(screen.getByRole('textbox', { name: 'User source 1' })).toHaveProperty('value', '201');
        expect(screen.getByRole('textbox', { name: 'User source 0' }).closest('fieldset')).toHaveProperty('disabled', true);
    });
});
