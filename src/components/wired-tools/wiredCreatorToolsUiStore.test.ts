import { beforeEach, describe, expect, it } from 'vitest';
import { openWiredMenuLink, useWiredCreatorToolsUiStore } from './wiredCreatorToolsUiStore';

const INITIAL = {
    isVisible: false,
    activeTab: 'monitor' as const,
    inspectionType: 'furni' as const,
    variablesType: 'furni' as const,
    isInspectionGiveOpen: false,
    isVariableManageOpen: false,
    isManagedGiveOpen: false,
    isRoomLogsOpen: false,
    isSelfDonationOpen: false,
    selectedFurni: null,
    selectedFurniLiveState: null,
    selectedUser: null,
    selectedUserLiveState: null,
    selectedUserActionVersion: 0,
    isVariableHighlightActive: false,
    variableHighlightOverlays: [],
    editingVariable: null,
    editingValue: '',
    editingManagedHolderVariableId: 0,
    editingManagedHolderValue: '',
    selectedInspectionVariableKeys: { furni: '', user: '', global: '' },
    selectedVariableKeys: { furni: '', user: '', global: '', context: '' },
    inspectionGiveVariableId: '',
    inspectionGiveValue: '0',
    selectedManagedVariableEntry: null,
    selectedManagedHolderVariableId: 0,
    managedGiveVariableItemId: 0,
    managedGiveValue: '0'
};

describe('useWiredCreatorToolsUiStore', () => {
    beforeEach(() => {
        useWiredCreatorToolsUiStore.setState(INITIAL);
    });

    it('exposes the documented defaults', () => {
        const state = useWiredCreatorToolsUiStore.getState();

        expect(state.isVisible).toBe(false);
        expect(state.activeTab).toBe('monitor');
        expect(state.inspectionType).toBe('furni');
        expect(state.variablesType).toBe('furni');
        expect(state.isInspectionGiveOpen).toBe(false);
        expect(state.isVariableManageOpen).toBe(false);
        expect(state.isManagedGiveOpen).toBe(false);
        expect(state.isRoomLogsOpen).toBe(false);
        expect(state.isSelfDonationOpen).toBe(false);
        expect(state.selectedFurni).toBeNull();
        expect(state.selectedFurniLiveState).toBeNull();
        expect(state.selectedUser).toBeNull();
        expect(state.selectedUserLiveState).toBeNull();
        expect(state.selectedUserActionVersion).toBe(0);
        expect(state.isVariableHighlightActive).toBe(false);
        expect(state.variableHighlightOverlays).toEqual([]);
        expect(state.editingVariable).toBeNull();
        expect(state.editingValue).toBe('');
        expect(state.editingManagedHolderVariableId).toBe(0);
        expect(state.editingManagedHolderValue).toBe('');
        expect(state.selectedInspectionVariableKeys).toEqual({ furni: '', user: '', global: '' });
        expect(state.selectedVariableKeys).toEqual({ furni: '', user: '', global: '', context: '' });
        expect(state.inspectionGiveVariableId).toBe('');
        expect(state.inspectionGiveValue).toBe('0');
        expect(state.selectedManagedVariableEntry).toBeNull();
        expect(state.selectedManagedHolderVariableId).toBe(0);
        expect(state.managedGiveVariableItemId).toBe(0);
        expect(state.managedGiveValue).toBe('0');
    });

    describe('setIsVisible', () => {
        it('accepts a direct boolean', () => {
            useWiredCreatorToolsUiStore.getState().setIsVisible(true);
            expect(useWiredCreatorToolsUiStore.getState().isVisible).toBe(true);
        });

        it('accepts a functional updater (toggle pattern)', () => {
            useWiredCreatorToolsUiStore.getState().setIsVisible((prev) => !prev);
            expect(useWiredCreatorToolsUiStore.getState().isVisible).toBe(true);

            useWiredCreatorToolsUiStore.getState().setIsVisible((prev) => !prev);
            expect(useWiredCreatorToolsUiStore.getState().isVisible).toBe(false);
        });
    });

    describe('setActiveTab', () => {
        it('switches the active tab', () => {
            useWiredCreatorToolsUiStore.getState().setActiveTab('variables');
            expect(useWiredCreatorToolsUiStore.getState().activeTab).toBe('variables');

            useWiredCreatorToolsUiStore.getState().setActiveTab('inspection');
            expect(useWiredCreatorToolsUiStore.getState().activeTab).toBe('inspection');
        });
    });

    describe('setInspectionType / setVariablesType', () => {
        it('updates the inspection element type', () => {
            useWiredCreatorToolsUiStore.getState().setInspectionType('user');
            expect(useWiredCreatorToolsUiStore.getState().inspectionType).toBe('user');
        });

        it('updates the variables element type (including context)', () => {
            useWiredCreatorToolsUiStore.getState().setVariablesType('context');
            expect(useWiredCreatorToolsUiStore.getState().variablesType).toBe('context');
        });
    });

    describe('modal/popover flags', () => {
        it('setIsInspectionGiveOpen accepts a functional updater', () => {
            useWiredCreatorToolsUiStore.getState().setIsInspectionGiveOpen((prev) => !prev);
            expect(useWiredCreatorToolsUiStore.getState().isInspectionGiveOpen).toBe(true);

            useWiredCreatorToolsUiStore.getState().setIsInspectionGiveOpen((prev) => !prev);
            expect(useWiredCreatorToolsUiStore.getState().isInspectionGiveOpen).toBe(false);
        });

        it('setIsVariableManageOpen takes a direct boolean', () => {
            useWiredCreatorToolsUiStore.getState().setIsVariableManageOpen(true);
            expect(useWiredCreatorToolsUiStore.getState().isVariableManageOpen).toBe(true);
        });

        it('setIsManagedGiveOpen accepts a functional updater', () => {
            useWiredCreatorToolsUiStore.getState().setIsManagedGiveOpen((prev) => !prev);
            expect(useWiredCreatorToolsUiStore.getState().isManagedGiveOpen).toBe(true);
        });
    });

    describe('variable manage UI', () => {
        it('setIsRoomLogsOpen takes a direct boolean', () => {
            useWiredCreatorToolsUiStore.getState().setIsRoomLogsOpen(true);
            expect(useWiredCreatorToolsUiStore.getState().isRoomLogsOpen).toBe(true);
        });
    });

    describe('inspection selection', () => {
        const furniSelection = {
            objectId: 42,
            category: 10,
            info: { id: 42, name: 'sofa', description: '', image: null } as never
        };
        const userSelection = {
            kind: 'user' as const,
            roomIndex: 7,
            name: 'simoleo',
            figure: 'hd-180-1.lg-3023-110',
            gender: 'M',
            userId: 99,
            level: 12,
            posture: 'std'
        } as never;

        it('setSelectedFurni stores the picked furni selection', () => {
            useWiredCreatorToolsUiStore.getState().setSelectedFurni(furniSelection);

            expect(useWiredCreatorToolsUiStore.getState().selectedFurni).toEqual(furniSelection);
        });

        it('setSelectedFurni(null) clears the selection (deselect path)', () => {
            useWiredCreatorToolsUiStore.getState().setSelectedFurni(furniSelection);
            useWiredCreatorToolsUiStore.getState().setSelectedFurni(null);

            expect(useWiredCreatorToolsUiStore.getState().selectedFurni).toBeNull();
        });

        it('setSelectedFurniLiveState accepts a functional updater', () => {
            const initial = { positionX: 1, positionY: 2, altitude: 3, rotation: 4, state: 5 };
            useWiredCreatorToolsUiStore.getState().setSelectedFurniLiveState(initial);

            useWiredCreatorToolsUiStore.getState().setSelectedFurniLiveState((prev) => (prev ? { ...prev, state: prev.state + 1 } : null));

            expect(useWiredCreatorToolsUiStore.getState().selectedFurniLiveState).toEqual({ ...initial, state: 6 });
        });

        it('setSelectedUser + setSelectedUserLiveState write the user selection / live state', () => {
            useWiredCreatorToolsUiStore.getState().setSelectedUser(userSelection);
            useWiredCreatorToolsUiStore.getState().setSelectedUserLiveState({ positionX: 5, positionY: 6, altitude: 0, direction: 2 });

            expect(useWiredCreatorToolsUiStore.getState().selectedUser).toEqual(userSelection);
            expect(useWiredCreatorToolsUiStore.getState().selectedUserLiveState).toEqual({ positionX: 5, positionY: 6, altitude: 0, direction: 2 });
        });

        it('setSelectedUserActionVersion bumps the monotonic counter via functional updater', () => {
            useWiredCreatorToolsUiStore.getState().setSelectedUserActionVersion((prev) => prev + 1);
            useWiredCreatorToolsUiStore.getState().setSelectedUserActionVersion((prev) => prev + 1);
            useWiredCreatorToolsUiStore.getState().setSelectedUserActionVersion((prev) => prev + 1);

            expect(useWiredCreatorToolsUiStore.getState().selectedUserActionVersion).toBe(3);
        });

        it('the selection persists across the panel close/reopen lifecycle', () => {
            useWiredCreatorToolsUiStore.getState().setSelectedFurni(furniSelection);
            useWiredCreatorToolsUiStore.getState().setIsVisible(false);
            useWiredCreatorToolsUiStore.getState().setIsVisible(true);

            expect(useWiredCreatorToolsUiStore.getState().selectedFurni).toEqual(furniSelection);
        });
    });

    describe('variable highlight', () => {
        const overlay = { itemId: 1, key: 'foo', x: 100, y: 200, screenX: 100, screenY: 200, value: '42', objectId: 7, category: 10 } as never;

        it('setIsVariableHighlightActive accepts a direct boolean and a toggle updater', () => {
            useWiredCreatorToolsUiStore.getState().setIsVariableHighlightActive(true);
            expect(useWiredCreatorToolsUiStore.getState().isVariableHighlightActive).toBe(true);

            useWiredCreatorToolsUiStore.getState().setIsVariableHighlightActive((prev) => !prev);
            expect(useWiredCreatorToolsUiStore.getState().isVariableHighlightActive).toBe(false);

            useWiredCreatorToolsUiStore.getState().setIsVariableHighlightActive((prev) => !prev);
            expect(useWiredCreatorToolsUiStore.getState().isVariableHighlightActive).toBe(true);
        });

        it('setVariableHighlightOverlays replaces the overlay array', () => {
            useWiredCreatorToolsUiStore.getState().setVariableHighlightOverlays([overlay]);
            expect(useWiredCreatorToolsUiStore.getState().variableHighlightOverlays).toEqual([overlay]);

            useWiredCreatorToolsUiStore.getState().setVariableHighlightOverlays([]);
            expect(useWiredCreatorToolsUiStore.getState().variableHighlightOverlays).toEqual([]);
        });

        it('the highlight survives a panel close/reopen lifecycle', () => {
            useWiredCreatorToolsUiStore.getState().setIsVariableHighlightActive(true);
            useWiredCreatorToolsUiStore.getState().setVariableHighlightOverlays([overlay]);

            useWiredCreatorToolsUiStore.getState().setIsVisible(false);
            useWiredCreatorToolsUiStore.getState().setIsVisible(true);

            expect(useWiredCreatorToolsUiStore.getState().isVariableHighlightActive).toBe(true);
            expect(useWiredCreatorToolsUiStore.getState().variableHighlightOverlays).toEqual([overlay]);
        });
    });

    describe('inline editor', () => {
        it('setEditingVariable + setEditingValue track the in-flight edit', () => {
            useWiredCreatorToolsUiStore.getState().setEditingVariable('@state');
            useWiredCreatorToolsUiStore.getState().setEditingValue('3');

            expect(useWiredCreatorToolsUiStore.getState().editingVariable).toBe('@state');
            expect(useWiredCreatorToolsUiStore.getState().editingValue).toBe('3');
        });

        it('setEditingVariable(null) clears the edit (commit / cancel path)', () => {
            useWiredCreatorToolsUiStore.getState().setEditingVariable('@state');
            useWiredCreatorToolsUiStore.getState().setEditingValue('3');

            useWiredCreatorToolsUiStore.getState().setEditingVariable(null);
            useWiredCreatorToolsUiStore.getState().setEditingValue('');

            expect(useWiredCreatorToolsUiStore.getState().editingVariable).toBeNull();
            expect(useWiredCreatorToolsUiStore.getState().editingValue).toBe('');
        });

        it('managed-holder editor pair uses 0 as "no row being edited"', () => {
            useWiredCreatorToolsUiStore.getState().setEditingManagedHolderVariableId(42);
            useWiredCreatorToolsUiStore.getState().setEditingManagedHolderValue('15');

            expect(useWiredCreatorToolsUiStore.getState().editingManagedHolderVariableId).toBe(42);
            expect(useWiredCreatorToolsUiStore.getState().editingManagedHolderValue).toBe('15');

            // Reset path used after commit / on blur.
            useWiredCreatorToolsUiStore.getState().setEditingManagedHolderVariableId(0);
            useWiredCreatorToolsUiStore.getState().setEditingManagedHolderValue('');

            expect(useWiredCreatorToolsUiStore.getState().editingManagedHolderVariableId).toBe(0);
            expect(useWiredCreatorToolsUiStore.getState().editingManagedHolderValue).toBe('');
        });
    });

    describe('variable-key records', () => {
        it('setSelectedInspectionVariableKeys accepts the updater shape used by give/remove handlers', () => {
            useWiredCreatorToolsUiStore.getState().setSelectedInspectionVariableKeys((prev) => ({ ...prev, furni: '@state' }));
            expect(useWiredCreatorToolsUiStore.getState().selectedInspectionVariableKeys).toEqual({ furni: '@state', user: '', global: '' });

            useWiredCreatorToolsUiStore.getState().setSelectedInspectionVariableKeys((prev) => ({ ...prev, user: 'username' }));
            expect(useWiredCreatorToolsUiStore.getState().selectedInspectionVariableKeys).toEqual({ furni: '@state', user: 'username', global: '' });
        });

        it('setSelectedVariableKeys preserves untouched keys when patching a single type', () => {
            useWiredCreatorToolsUiStore.getState().setSelectedVariableKeys((prev) => ({ ...prev, furni: '@state', user: 'level' }));
            useWiredCreatorToolsUiStore.getState().setSelectedVariableKeys((prev) => ({ ...prev, context: 'hotel.uptime' }));

            expect(useWiredCreatorToolsUiStore.getState().selectedVariableKeys).toEqual({
                furni: '@state',
                user: 'level',
                global: '',
                context: 'hotel.uptime'
            });
        });

        it('setSelectedVariableKeys accepts a direct record (definition-sync write path)', () => {
            useWiredCreatorToolsUiStore.getState().setSelectedVariableKeys({
                furni: '~teleport.target_id',
                user: 'username',
                global: 'hotel.uptime',
                context: 'event.type'
            });

            expect(useWiredCreatorToolsUiStore.getState().selectedVariableKeys.furni).toBe('~teleport.target_id');
            expect(useWiredCreatorToolsUiStore.getState().selectedVariableKeys.context).toBe('event.type');
        });

        it('variable-key records persist across the panel close/reopen lifecycle', () => {
            useWiredCreatorToolsUiStore.getState().setSelectedVariableKeys((prev) => ({ ...prev, furni: '@state' }));
            useWiredCreatorToolsUiStore.getState().setSelectedInspectionVariableKeys((prev) => ({ ...prev, user: 'level' }));

            useWiredCreatorToolsUiStore.getState().setIsVisible(false);
            useWiredCreatorToolsUiStore.getState().setIsVisible(true);

            expect(useWiredCreatorToolsUiStore.getState().selectedVariableKeys.furni).toBe('@state');
            expect(useWiredCreatorToolsUiStore.getState().selectedInspectionVariableKeys.user).toBe('level');
        });
    });

    describe('inspection give pickers', () => {
        it('setInspectionGiveVariableId / setInspectionGiveValue write the picker pair', () => {
            useWiredCreatorToolsUiStore.getState().setInspectionGiveVariableId('user:42');
            useWiredCreatorToolsUiStore.getState().setInspectionGiveValue('150');

            expect(useWiredCreatorToolsUiStore.getState().inspectionGiveVariableId).toBe('user:42');
            expect(useWiredCreatorToolsUiStore.getState().inspectionGiveValue).toBe('150');
        });

        it('reset path uses "" / "0" as the sentinel-empty pair (post-action and target-change paths)', () => {
            useWiredCreatorToolsUiStore.getState().setInspectionGiveVariableId('user:42');
            useWiredCreatorToolsUiStore.getState().setInspectionGiveValue('150');

            useWiredCreatorToolsUiStore.getState().setInspectionGiveVariableId('');
            useWiredCreatorToolsUiStore.getState().setInspectionGiveValue('0');

            expect(useWiredCreatorToolsUiStore.getState().inspectionGiveVariableId).toBe('');
            expect(useWiredCreatorToolsUiStore.getState().inspectionGiveValue).toBe('0');
        });
    });

    describe('managed holder give pickers', () => {
        const entry = { entityId: 7, entityName: 'fountain', categoryLabel: 'Furni', value: '12' } as never;

        it('setSelectedManagedVariableEntry writes the picked entry; null clears (reset path)', () => {
            useWiredCreatorToolsUiStore.getState().setSelectedManagedVariableEntry(entry);
            expect(useWiredCreatorToolsUiStore.getState().selectedManagedVariableEntry).toEqual(entry);

            useWiredCreatorToolsUiStore.getState().setSelectedManagedVariableEntry(null);
            expect(useWiredCreatorToolsUiStore.getState().selectedManagedVariableEntry).toBeNull();
        });

        it('the holder + give picker chain writes through cleanly', () => {
            useWiredCreatorToolsUiStore.getState().setSelectedManagedHolderVariableId(11);
            useWiredCreatorToolsUiStore.getState().setManagedGiveVariableItemId(33);
            useWiredCreatorToolsUiStore.getState().setManagedGiveValue('75');

            const state = useWiredCreatorToolsUiStore.getState();
            expect(state.selectedManagedHolderVariableId).toBe(11);
            expect(state.managedGiveVariableItemId).toBe(33);
            expect(state.managedGiveValue).toBe('75');
        });

        it('post-give-action reset returns the give-side back to its 0 / "0" sentinels', () => {
            useWiredCreatorToolsUiStore.getState().setSelectedManagedHolderVariableId(11);
            useWiredCreatorToolsUiStore.getState().setManagedGiveVariableItemId(33);
            useWiredCreatorToolsUiStore.getState().setManagedGiveValue('75');

            // Matches the post-action path at WiredCreatorToolsView.tsx:2400-2402:
            //   setSelectedManagedHolderVariableId(newId);
            //   setManagedGiveValue('0');
            useWiredCreatorToolsUiStore.getState().setSelectedManagedHolderVariableId(99);
            useWiredCreatorToolsUiStore.getState().setManagedGiveValue('0');

            expect(useWiredCreatorToolsUiStore.getState().selectedManagedHolderVariableId).toBe(99);
            expect(useWiredCreatorToolsUiStore.getState().managedGiveValue).toBe('0');
        });

        it('the managed picker chain persists across the panel close/reopen lifecycle', () => {
            useWiredCreatorToolsUiStore.getState().setSelectedManagedHolderVariableId(11);
            useWiredCreatorToolsUiStore.getState().setManagedGiveVariableItemId(33);

            useWiredCreatorToolsUiStore.getState().setIsVisible(false);
            useWiredCreatorToolsUiStore.getState().setIsVisible(true);

            const state = useWiredCreatorToolsUiStore.getState();
            expect(state.selectedManagedHolderVariableId).toBe(11);
            expect(state.managedGiveVariableItemId).toBe(33);
        });
    });
});


describe('native Wired editor menu links', () => {
    const definitions = { furni: [], user: [], global: [], context: [{ key: '@event.transaction_failed.reason' }] };
    beforeEach(() => useWiredCreatorToolsUiStore.setState(INITIAL));
    it('opens the existing menu and focuses the transaction failure reason in context variables', () => {
        expect(openWiredMenuLink('wiredmenu/open/variable_overview/@event.transaction_failed.reason', definitions)).toBe(true);
        const state = useWiredCreatorToolsUiStore.getState();
        expect(state.isVisible).toBe(true);
        expect(state.activeTab).toBe('variables');
        expect(state.variablesType).toBe('context');
        expect(state.selectedVariableKeys.context).toBe('@event.transaction_failed.reason');
    });
    it('opens the editor header menu link without losing the existing tab or accepting unrelated links', () => {
        useWiredCreatorToolsUiStore.getState().setActiveTab('settings');
        expect(openWiredMenuLink('wiredmenu/open', definitions)).toBe(true);
        expect(useWiredCreatorToolsUiStore.getState().activeTab).toBe('settings');
        expect(openWiredMenuLink('other/open', definitions)).toBe(false);
    });
});
