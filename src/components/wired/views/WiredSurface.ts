import { createContext } from 'react';

/** IlluminaWiredStyle.frameColor; the advanced settings wrapper paints advancedBackgroundColor (0xCCCCCC). */
export const WIRED_SURFACE_COLOR = 0xe2e2e2;
export const WIRED_ADVANCED_SURFACE_COLOR = 0xcccccc;
/** IlluminaWiredStyle.softTextColor. */
export const WIRED_SOFT_TEXT_COLOR = 0x444444;

/** The colour native text is composited on: the surface the text sits on. */
export const WiredSurfaceContext = createContext(WIRED_SURFACE_COLOR);
