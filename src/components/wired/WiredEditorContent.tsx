import '../../css/WiredView.css';
import { ConditionDefinition, TriggerDefinition, WiredActionDefinition, WiredAddonDefinition, WiredSelectorDefinition, WiredVariableDefinition } from '@volt/renderer';
import { FC, Fragment, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useWired } from '../../hooks';
import { WiredTouchCollapseContext } from './views/WiredNativeContext';
import { NativeWiredActionLayoutView, NativeWiredAddonLayoutView, NativeWiredSelectorLayoutView, NativeWiredVariableLayoutView } from './views/WiredNativeLayoutViews';
import { WiredConditionLayoutView } from './views/conditions/WiredConditionLayoutView';
import { WiredTriggerLayoutView } from './views/triggers/WiredTriggerLayoutView';

export const WiredEditorContent: FC<{}> = () => {
    const { trigger = null } = useWired();
    const [areaSelection, setAreaSelectionState] = useState<{ active: boolean; onCancel: (() => void) | null }>({ active: false, onCancel: null });
    const [roomPickCollapsed, setRoomPickCollapsed] = useState(false);

    useEffect(() => {
        setAreaSelectionState({ active: false, onCancel: null });
        setRoomPickCollapsed(false);
    }, [trigger]);

    const setAreaSelection = useCallback((active: boolean, onCancel?: () => void) => {
        setAreaSelectionState({ active, onCancel: active ? (onCancel ?? null) : null });
    }, []);

    const touchCollapse = useMemo(
        () => ({
            areaSelectionActive: areaSelection.active,
            cancelAreaSelection: areaSelection.onCancel,
            setAreaSelection,
            roomPickCollapsed,
            setRoomPickCollapsed
        }),
        [areaSelection.active, areaSelection.onCancel, setAreaSelection, roomPickCollapsed]
    );

    if (!trigger) return null;

    let content: ReactNode = null;

    if (trigger instanceof WiredActionDefinition) {
        content = <Fragment key={`wired-action-${trigger.id}-${trigger.code}`}>{NativeWiredActionLayoutView(trigger.code)}</Fragment>;
    } else if (trigger instanceof WiredSelectorDefinition) {
        content = <Fragment key={`wired-selector-${trigger.id}-${trigger.code}`}>{NativeWiredSelectorLayoutView(trigger.code)}</Fragment>;
    } else if (trigger instanceof WiredAddonDefinition) {
        content = <Fragment key={`wired-addon-${trigger.id}-${trigger.code}`}>{NativeWiredAddonLayoutView(trigger.code)}</Fragment>;
    } else if (trigger instanceof WiredVariableDefinition) {
        content = <Fragment key={`wired-variable-${trigger.id}-${trigger.code}`}>{NativeWiredVariableLayoutView(trigger.code)}</Fragment>;
    } else if (trigger instanceof TriggerDefinition) {
        content = <Fragment key={`wired-trigger-${trigger.id}-${trigger.code}`}>{WiredTriggerLayoutView(trigger.code)}</Fragment>;
    } else if (trigger instanceof ConditionDefinition) {
        content = <Fragment key={`wired-condition-${trigger.id}-${trigger.code}`}>{WiredConditionLayoutView(trigger.code)}</Fragment>;
    }

    if (!content) return null;

    return <WiredTouchCollapseContext.Provider value={touchCollapse}>{content}</WiredTouchCollapseContext.Provider>;
};
