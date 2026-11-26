import { FC, PointerEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LocalizeText, useVoltLayout } from '../../../../../api';

const CLOSE_DRAG_PX = 72;

interface TouchInfoSheetViewProps {
    title: ReactNode;
    className?: string;
    onClose: () => void;
    children?: ReactNode;
}

/** The touch InfoStand: a bottom sheet (phone) or touch-sized panel (tablet) with the 44 px AIR header. */
export const TouchInfoSheetView: FC<TouchInfoSheetViewProps> = ({ title, className = '', onClose, children }) => {
    const fromRight = useVoltLayout() === 'phone-landscape';
    const [dragDistance, setDragDistance] = useState(0);
    const sheetRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ pointerId: number; start: number } | null>(null);
    const exitRef = useRef<Animation | null>(null);

    useEffect(() => () => exitRef.current?.cancel(), []);

    const close = () => {
        const sheet = sheetRef.current;

        if (!sheet || exitRef.current) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            onClose();
            return;
        }

        sheet.inert = true;
        const animation = sheet.animate(
            [{ transform: getComputedStyle(sheet).transform }, { transform: 'var(--volt-info-exit)' }],
            { duration: 160, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' }
        );

        exitRef.current = animation;
        animation.onfinish = onClose;
    };

    const pointerPosition = (event: PointerEvent<HTMLDivElement>) => fromRight ? event.clientX : event.clientY;

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest('button')) return;

        dragRef.current = { pointerId: event.pointerId, start: pointerPosition(event) };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;

        if (drag?.pointerId !== event.pointerId) return;
        setDragDistance(Math.max(0, pointerPosition(event) - drag.start));
    };

    const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;

        if (drag?.pointerId !== event.pointerId) return;
        dragRef.current = null;

        if (event.type === 'pointerup' && pointerPosition(event) - drag.start > CLOSE_DRAG_PX) close();
        else setDragDistance(0);
    };

    return createPortal(
        <div
            className={`volt-touch-infosheet ${className}`}
            ref={sheetRef}
            data-dragging={dragDistance > 0 ? '' : undefined}
            style={dragDistance > 0 ? { transform: `translate${fromRight ? 'X' : 'Y'}(${dragDistance}px)` } : undefined}
        >
            <div
                className="volt-touch-infosheet__header"
                onLostPointerCapture={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
            >
                <span className="volt-touch-infosheet__title">{title}</span>
                <button type="button" className="volt-touch-infosheet__close" aria-label={LocalizeText('generic.close')} onClick={close} />
            </div>
            <div className="volt-touch-infosheet__body">{children}</div>
        </div>,
        document.body
    );
};

interface TouchSheetButtonProps {
    icon?: string;
    onClick: () => void;
    children: ReactNode;
}

export const TouchSheetButton: FC<TouchSheetButtonProps> = ({ icon = null, onClick, children }) => (
    <button type="button" className="volt-touch-black-button" onClick={onClick}>
        {icon && <img alt="" draggable={false} src={icon} />}
        <span>{children}</span>
    </button>
);
