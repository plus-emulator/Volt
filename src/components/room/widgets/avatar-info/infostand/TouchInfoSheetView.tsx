import { FC, PointerEvent, ReactNode, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LocalizeText } from '../../../../../api';

/** Dragging the header further down than this closes the sheet. */
const CLOSE_DRAG_PX = 72;

interface TouchInfoSheetViewProps {
    title: ReactNode;
    className?: string;
    onClose: () => void;
    children?: ReactNode;
}

/** The touch InfoStand: a bottom sheet (phone) or touch-sized panel (tablet) with the 44 px AIR header. */
export const TouchInfoSheetView: FC<TouchInfoSheetViewProps> = ({ title, className = '', onClose, children }) => {
    const [dragY, setDragY] = useState(0);
    const dragStartRef = useRef<number>(null);

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if ((event.target as HTMLElement).closest('button')) return;

        dragStartRef.current = event.clientY;
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (dragStartRef.current === null) return;

        setDragY(Math.max(0, event.clientY - dragStartRef.current));
    };

    const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
        if (dragStartRef.current === null) return;

        const distance = event.clientY - dragStartRef.current;

        dragStartRef.current = null;
        setDragY(0);

        if (event.type === 'pointerup' && distance > CLOSE_DRAG_PX) onClose();
    };

    return createPortal(
        <div
            className={`volt-touch-infosheet ${className}`}
            data-dragging={dragY > 0 ? '' : undefined}
            style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        >
            <div
                className="volt-touch-infosheet__header"
                onPointerCancel={onPointerEnd}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
            >
                <span className="volt-touch-infosheet__title">{title}</span>
                <button type="button" className="volt-touch-infosheet__close" aria-label={LocalizeText('generic.close')} onClick={onClose} />
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
