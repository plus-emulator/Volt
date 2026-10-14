import type { IWiredLabelData } from '@volt/renderer';

/** FurnitureLabelSettingsView.as L17 COLORS (WIN63-202610131318): the colour dropdown index picks one of these. */
export const FURNITURE_LABEL_COLORS: readonly number[] = [4278912, 2651759, 4157508, 8416562, 8409402, 8404554, 6834048, 5592405];

/** widget.furniture_label.settings.color.* keys, in the same order as FURNITURE_LABEL_COLORS. */
export const FURNITURE_LABEL_COLOR_KEYS: readonly string[] = ['blue', 'teal', 'green', 'gold', 'orange', 'red', 'purple', 'charcoal'];

export const FURNITURE_LABEL_VISIBILITY_EVERYONE = 0;
export const FURNITURE_LABEL_VISIBILITY_WIRED = 1;

/** FurnitureLabelWidget.as canView L255: a type 0 label is shown to everyone when visibility is 0, otherwise only to users with wired read rights. */
export const canViewWiredLabel = (label: IWiredLabelData, canRead: boolean): boolean => label.visibility === FURNITURE_LABEL_VISIBILITY_EVERYONE || canRead;

/** The bubble colour as a CSS colour; the packet value is 0xRRGGBB. */
export const wiredLabelBubbleColor = (color: number): string => `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;
