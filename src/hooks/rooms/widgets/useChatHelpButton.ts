import { useCallback, useEffect, useRef, useState } from 'react';

/** AIR RoomChatInputView.startHelpButtonHideTimer: `new Timer(400)`. */
export const CHAT_HELP_BUTTON_HIDE_DELAY_MS = 400;

/**
 * Visibility of the chat bar's "?" button (AIR `helpbutton`, chatinput_window_new).
 *
 * AIR builds the button hidden and only shows it while the pointer is over the input bubble
 * (`helpbutton_show_hover_region` plus the `chat_input` field) or over the button itself. Leaving
 * either starts a 400 ms timer that hides the button unless the pointer is on the button by then.
 * Mirrors onInputHoverRegionMouseEvent / onHelpButtonMouseEvent / onHelpButtonHideTimer.
 */
export const useChatHelpButton = () => {
    const [isHelpButtonVisible, setIsHelpButtonVisible] = useState(false);
    const isOverHelpButtonRef = useRef(false);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

    const stopHideTimer = useCallback(() => {
        if (hideTimerRef.current === null) return;

        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
    }, []);

    const startHideTimer = useCallback(() => {
        stopHideTimer();

        hideTimerRef.current = setTimeout(() => {
            hideTimerRef.current = null;

            if (!isOverHelpButtonRef.current) setIsHelpButtonVisible(false);
        }, CHAT_HELP_BUTTON_HIDE_DELAY_MS);
    }, [stopHideTimer]);

    useEffect(() => stopHideTimer, [stopHideTimer]);

    const onHoverRegionEnter = useCallback(() => {
        setIsHelpButtonVisible(true);
        stopHideTimer();
    }, [stopHideTimer]);

    const onHoverRegionLeave = useCallback(() => {
        if (!isOverHelpButtonRef.current) startHideTimer();
    }, [startHideTimer]);

    const onHelpButtonEnter = useCallback(() => {
        setIsHelpButtonVisible(true);
        isOverHelpButtonRef.current = true;
        stopHideTimer();
    }, [stopHideTimer]);

    const onHelpButtonLeave = useCallback(() => {
        isOverHelpButtonRef.current = false;
        startHideTimer();
    }, [startHideTimer]);

    return {
        isHelpButtonVisible,
        hoverRegionProps: { onMouseEnter: onHoverRegionEnter, onMouseLeave: onHoverRegionLeave },
        helpButtonProps: { onMouseEnter: onHelpButtonEnter, onMouseLeave: onHelpButtonLeave }
    };
};
