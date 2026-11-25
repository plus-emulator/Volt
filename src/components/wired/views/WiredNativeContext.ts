import { createContext, useContext } from 'react';

/** True while the open Wired frame is drawn with the native Illumina section kit. */
export const WiredNativeContext = createContext(false);

export const useWiredNative = () => useContext(WiredNativeContext);

export interface WiredTouchCollapseContextValue {
    areaSelectionActive: boolean;
    cancelAreaSelection: (() => void) | null;
    setAreaSelection: (active: boolean, onCancel?: () => void) => void;
    roomPickCollapsed: boolean;
    setRoomPickCollapsed: (collapsed: boolean) => void;
}

const NOOP_TOUCH_COLLAPSE: WiredTouchCollapseContextValue = {
    areaSelectionActive: false,
    cancelAreaSelection: null,
    setAreaSelection: () => undefined,
    roomPickCollapsed: false,
    setRoomPickCollapsed: () => undefined
};

export const WiredTouchCollapseContext = createContext<WiredTouchCollapseContextValue>(NOOP_TOUCH_COLLAPSE);

export const useWiredTouchCollapse = () => useContext(WiredTouchCollapseContext);
