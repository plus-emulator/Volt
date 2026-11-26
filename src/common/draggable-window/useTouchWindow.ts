import { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useVoltLayout, VoltLayout } from '../../api/touch';

/** How a window shows on touch screens. `auto` picks dialog for small windows and a full sheet for the rest. */
export type TouchPresentation = 'auto' | 'full' | 'half' | 'dialog' | 'float';

export type TouchWindowMode = 'float' | 'screen' | 'sheet' | 'dock' | 'dialog';

export type TouchDock = 'right' | 'bottom' | null;

export type SheetSize = 'half' | 'full';

const DIALOG_MAX_WIDTH = 380;
const DIALOG_MAX_HEIGHT = 340;
const SHEET_HALF = 0.55;
const SHEET_CLOSE_BELOW = 0.3;
const DOCK_EDGE_PX = 40;
const CLOSE_SELECTOR = '.volt-card-close-button, .volt-card-header-close, .header-close, .air-frame__close, [name="header_button_close"], [data-volt-close]';

let dockedRight: HTMLElement | null = null;
let dockedBottom: HTMLElement | null = null;

export const CloseTouchWindow = (element: HTMLElement | null) => {
    const close = element?.querySelector<HTMLElement>(CLOSE_SELECTOR);

    close?.click();
};

const resolveMode = (layout: VoltLayout, presentation: TouchPresentation, isSmall: boolean, isWide: boolean, dock: TouchDock): TouchWindowMode => {
    if (layout === 'desktop' || presentation === 'float') return 'float';

    if (presentation === 'full' && layout.startsWith('phone')) return 'screen';

    const wantsDialog = presentation === 'dialog' || (presentation === 'auto' && isSmall);

    switch (layout) {
        case 'phone-portrait':
            return wantsDialog ? 'dialog' : 'sheet';
        case 'phone-landscape':
            return wantsDialog ? 'dialog' : 'dock';
        case 'tablet-portrait':
            if (dock) return 'sheet';
            return !wantsDialog && isWide ? 'sheet' : 'float';
        case 'tablet-landscape':
            return dock ? 'dock' : 'float';
    }

    return 'float';
};

export interface TouchWindowState {
    mode: TouchWindowMode;
    sheetSize: SheetSize;
    sheetHeight: number | null;
    isDockTarget: boolean;
}

interface TouchWindowOptions {
    elementRef: RefObject<HTMLElement>;
    dragHandler: HTMLElement | null;
    presentation: TouchPresentation;
}

export const useTouchWindow = ({ elementRef, dragHandler, presentation }: TouchWindowOptions) => {
    const layout = useVoltLayout();
    const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
    const [dock, setDock] = useState<TouchDock>(null);
    const [sheetSize, setSheetSize] = useState<SheetSize>(presentation === 'half' ? 'half' : 'full');
    const [sheetHeight, setSheetHeight] = useState<number | null>(null);
    const [isDockTarget, setIsDockTarget] = useState(false);
    const sheetDragRef = useRef<{ pointerId: number; startY: number; startHeight: number; active: boolean } | null>(null);

    useLayoutEffect(() => {
        if (natural || !elementRef.current) return;

        const child = elementRef.current.querySelector<HTMLElement>(':scope > :not(.volt-native-frame-shadow)') ?? elementRef.current;

        setNatural({ width: child.offsetWidth, height: child.offsetHeight });
    }, [natural, elementRef]);

    const isSmall = !!natural && natural.width > 0 && natural.width <= DIALOG_MAX_WIDTH && natural.height <= DIALOG_MAX_HEIGHT;
    const isWide = !!natural && natural.width > window.innerWidth * 0.6;
    const mode: TouchWindowMode = natural ? resolveMode(layout, presentation, isSmall, isWide, dock) : 'float';

    useEffect(() => {
        if (layout === 'desktop' || layout.startsWith('phone')) setDock(null);
    }, [layout]);

    useEffect(() => {
        const element = elementRef.current;

        if (!element || !dock) return;

        if (dock === 'right') {
            if (dockedRight && dockedRight !== element) dockedRight.dispatchEvent(new CustomEvent('volt-undock'));
            dockedRight = element;
        } else {
            if (dockedBottom && dockedBottom !== element) dockedBottom.dispatchEvent(new CustomEvent('volt-undock'));
            dockedBottom = element;
        }

        const onUndock = () => setDock(null);

        element.addEventListener('volt-undock', onUndock);

        return () => {
            element.removeEventListener('volt-undock', onUndock);
            if (dockedRight === element) dockedRight = null;
            if (dockedBottom === element) dockedBottom = null;
        };
    }, [dock, elementRef]);

    useEffect(() => {
        if (mode !== 'sheet' || !dragHandler) return;

        const viewportHeight = () => window.visualViewport?.height ?? window.innerHeight;

        const onPointerDown = (event: PointerEvent) => {
            if ((event.target as HTMLElement)?.closest?.('button, input, select, textarea, a, [role="button"], ' + CLOSE_SELECTOR)) return;

            const element = elementRef.current;

            if (!element) return;

            sheetDragRef.current = { pointerId: event.pointerId, startY: event.clientY, startHeight: element.offsetHeight, active: false };

            try {
                dragHandler.setPointerCapture(event.pointerId);
            } catch {}
        };

        const onPointerMove = (event: PointerEvent) => {
            const drag = sheetDragRef.current;

            if (!drag || drag.pointerId !== event.pointerId) return;

            const deltaY = event.clientY - drag.startY;

            if (!drag.active && Math.abs(deltaY) < 6) return;

            drag.active = true;
            setSheetHeight(Math.max(80, Math.min(viewportHeight(), drag.startHeight - deltaY)));
        };

        const onPointerEnd = (event: PointerEvent) => {
            const drag = sheetDragRef.current;

            if (!drag || drag.pointerId !== event.pointerId) return;

            sheetDragRef.current = null;

            try {
                dragHandler.releasePointerCapture(event.pointerId);
            } catch {}

            if (!drag.active) return;

            const ratio = (drag.startHeight - (event.clientY - drag.startY)) / viewportHeight();

            setSheetHeight(null);

            if (ratio < SHEET_CLOSE_BELOW) {
                CloseTouchWindow(elementRef.current);
                return;
            }

            setSheetSize(ratio < (SHEET_HALF + 0.9) / 2 ? 'half' : 'full');
        };

        dragHandler.addEventListener('pointerdown', onPointerDown);
        dragHandler.addEventListener('pointermove', onPointerMove);
        dragHandler.addEventListener('pointerup', onPointerEnd);
        dragHandler.addEventListener('pointercancel', onPointerEnd);

        return () => {
            dragHandler.removeEventListener('pointerdown', onPointerDown);
            dragHandler.removeEventListener('pointermove', onPointerMove);
            dragHandler.removeEventListener('pointerup', onPointerEnd);
            dragHandler.removeEventListener('pointercancel', onPointerEnd);
        };
    }, [mode, dragHandler, elementRef]);

    useEffect(() => {
        if (mode !== 'dock' || dock !== 'right' || !dragHandler) return;

        let start: { pointerId: number; x: number } | null = null;

        const onPointerDown = (event: PointerEvent) => {
            if ((event.target as HTMLElement)?.closest?.('button, input, select, textarea, a, [role="button"], ' + CLOSE_SELECTOR)) return;

            start = { pointerId: event.pointerId, x: event.clientX };
        };

        const onPointerMove = (event: PointerEvent) => {
            if (!start || start.pointerId !== event.pointerId || start.x - event.clientX < 80) return;

            start = null;
            setDock(null);
        };

        const onPointerEnd = () => (start = null);

        dragHandler.addEventListener('pointerdown', onPointerDown);
        dragHandler.addEventListener('pointermove', onPointerMove);
        dragHandler.addEventListener('pointerup', onPointerEnd);
        dragHandler.addEventListener('pointercancel', onPointerEnd);

        return () => {
            dragHandler.removeEventListener('pointerdown', onPointerDown);
            dragHandler.removeEventListener('pointermove', onPointerMove);
            dragHandler.removeEventListener('pointerup', onPointerEnd);
            dragHandler.removeEventListener('pointercancel', onPointerEnd);
        };
    }, [mode, dock, dragHandler]);

    const dockEdgeFor = useCallback(
        (clientX: number, clientY: number): TouchDock => {
            if (layout === 'tablet-landscape' && clientX >= window.innerWidth - DOCK_EDGE_PX) return 'right';
            if (layout === 'tablet-portrait' && clientY >= window.innerHeight - DOCK_EDGE_PX) return 'bottom';

            return null;
        },
        [layout]
    );

    /** Floating drag on tablets: shows the dock target near the edge. */
    const onFloatDragMove = useCallback((clientX: number, clientY: number) => setIsDockTarget(dockEdgeFor(clientX, clientY) !== null), [dockEdgeFor]);

    /** Returns true when the drop docked the window. */
    const onFloatDragEnd = useCallback(
        (clientX: number, clientY: number) => {
            setIsDockTarget(false);

            const edge = dockEdgeFor(clientX, clientY);

            if (!edge) return false;

            setDock(edge);
            setSheetSize(edge === 'bottom' ? 'half' : 'full');

            return true;
        },
        [dockEdgeFor]
    );

    const undock = useCallback(() => setDock(null), []);

    const state: TouchWindowState = { mode, sheetSize, sheetHeight, isDockTarget };

    return { layout, state, dock, undock, onFloatDragMove, onFloatDragEnd };
};
