import { FC, PropsWithChildren, useLayoutEffect, useRef, useState } from 'react';

/**
 * A label window with relative_horizontal_scale_center: the text field keeps its own width and sits at
 * floor((width - field width) / 2), so the caption lands on the same whole pixel as in AIR.
 */
export const NativeCenteredField: FC<PropsWithChildren<{ width: number; className?: string }>> = ({ width, className, children }) => {
    const fieldRef = useRef<HTMLSpanElement>(null);
    const [left, setLeft] = useState(0);

    useLayoutEffect(() => {
        const field = fieldRef.current;

        if (!field) return;

        const place = () => setLeft(Math.floor((width - field.offsetWidth) / 2));
        const observer = new ResizeObserver(place);

        place();
        observer.observe(field);

        return () => observer.disconnect();
    }, [width]);

    return (
        <span ref={fieldRef} className={className} style={{ display: 'inline-block', position: 'absolute', left }}>
            {children}
        </span>
    );
};
