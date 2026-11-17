import { FC, MouseEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CreateLinkEvent, LocalizeText, SanitizeHtml } from '../../../../../api';
import { ChestText } from './ChestAirParts';

const LOCK_RULES = [1, 2, 3, 4, 5, 6, 7].map((n) => `wiredchests.lock_info.rule_${n}`);
const CAPACITY_RULES = [1, 2, 3, 4].map((n) => `wiredchests.capacity_info.rule_${n}`);

/** An html text window: AIR follows `event:` links through the link handler. */
const HtmlRule: FC<{ textKey: string }> = ({ textKey }) => {
    const onClick = (event: MouseEvent<HTMLDivElement>) => {
        const link = (event.target as HTMLElement).closest('a');
        const href = link?.getAttribute('href') ?? '';
        if (!href.startsWith('event:')) return;

        event.preventDefault();
        CreateLinkEvent(href.slice('event:'.length));
    };

    return <div className="volt-chest-air__bubble-rule" dangerouslySetInnerHTML={{ __html: SanitizeHtml(LocalizeText(textKey)) }} onClick={onClick} />;
};

interface ChestLockInfoBubbleProps {
    /** The info button the bubble points at. */
    anchor: HTMLElement;
    onClose: () => void;
}

/**
 * lock_info_bubble (bubble style 7, pointer left) lives on the desktop: its window opens 3px right of the info button, vertically
 * centred on it (WiredChestWrapperView.relocateBubbleFocus), with the skin box 6px inside the window. It hides when it loses focus.
 */
export const ChestLockInfoBubble: FC<ChestLockInfoBubbleProps> = ({ anchor, onClose }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ left: number; top: number }>(null);

    useLayoutEffect(() => {
        const bubble = ref.current;
        if (!bubble) return;

        const button = anchor.getBoundingClientRect();
        setPosition({ left: Math.trunc(button.left + button.width + 9), top: Math.trunc(button.top + 10 - bubble.offsetHeight / 2) });
    }, [anchor]);

    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            if (ref.current?.contains(event.target as Node) || anchor.contains(event.target as Node)) return;

            onClose();
        };

        document.addEventListener('pointerdown', onPointerDown, true);

        return () => document.removeEventListener('pointerdown', onPointerDown, true);
    }, [anchor, onClose]);

    return (
        <div ref={ref} className="volt-chest-air__bubble" role="tooltip" style={position ?? { visibility: 'hidden' }}>
            <span aria-hidden className="volt-chest-air__bubble-pointer" />
            <div className="volt-chest-air__bubble-texts">
                <ChestText background={0xe9e9e1} className="volt-chest-air__bubble-title" text={LocalizeText('wiredchests.lock_info.title')} size={14} textStyle="u_bold" />
                <ChestText background={0xe9e9e1} maxWidth={353} text={LocalizeText('wiredchests.lock_info.desc')} />
                {LOCK_RULES.map((key) => (
                    <HtmlRule key={key} textKey={key} />
                ))}
                <ChestText background={0xe9e9e1} className="volt-chest-air__bubble-title is-capacity" size={14} text={LocalizeText('wiredchests.capacity_info.title')} textStyle="u_bold" />
                <ChestText background={0xe9e9e1} maxWidth={353} text={LocalizeText('wiredchests.capacity_info.desc')} />
                {CAPACITY_RULES.map((key) => (
                    <HtmlRule key={key} textKey={key} />
                ))}
            </div>
        </div>
    );
};
