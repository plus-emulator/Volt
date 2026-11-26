import { FC, ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DraggableWindow } from '../../../../common';

const MODAL_ORIGIN = { x: 0, y: 0 };

// v75 qhe: a modal dialog sits centred on the desktop (rounded to whole pixels) over a background that darkens everything below to 25%.
// baseWidth/baseHeight centre a window that grows after it was placed (the popup grows when its link or action is shown). offsetY is the layout frame's own y (the notification popup layout declares y=14).
// keepOnTop keeps the modal above every window opened after it, like a widget modal that later alerts open behind.
export const NativeModalView: FC<{ children: ReactNode; offsetY?: number; baseWidth?: number; baseHeight?: number; keepOnTop?: boolean }> = ({
    children,
    offsetY = 0,
    baseWidth = 0,
    baseHeight = 0,
    keepOnTop = false
}) => {
    const slotRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useLayoutEffect(() => {
        const slot = slotRef.current;

        if (!slot) return;

        const place = () => setPosition({ x: Math.round((window.innerWidth - (baseWidth || slot.offsetWidth)) / 2), y: Math.round((window.innerHeight - (baseHeight || slot.offsetHeight)) / 2) + offsetY });
        const observer = new ResizeObserver(place);

        place();
        observer.observe(slot);
        window.addEventListener('resize', place);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', place);
        };
    }, [offsetY, baseWidth, baseHeight]);

    const modal = (
        <div className={keepOnTop ? 'volt-native-modal is-on-top' : 'volt-native-modal'}>
            <div aria-hidden="true" className="volt-native-modal-dim" />
            <div ref={slotRef} className="volt-native-modal-slot" style={{ left: position.x, top: position.y }}>
                {children}
            </div>
        </div>
    );

    if (keepOnTop) return createPortal(modal, document.getElementById('draggable-windows-container') ?? document.body);

    return (
        <DraggableWindow disableDrag initialPosition={MODAL_ORIGIN} unconstrainedPosition>
            {modal}
        </DraggableWindow>
    );
};
