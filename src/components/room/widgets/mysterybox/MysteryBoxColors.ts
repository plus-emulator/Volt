const KEY_COLORS: Record<string, number> = {
    purple: 0x903b62,
    blue: 0x3b6290,
    green: 0x62903b,
    yellow: 0xa2a129,
    lilac: 0x693f8c,
    orange: 0xa56c25,
    turquoise: 0x289aa2,
    red: 0x9a3031
};

/** The tint of a box or key colour. An empty colour has no tint, and an unknown colour is black. */
export const mysteryBoxTint = (color: string): number | null => (color ? (KEY_COLORS[color.toLowerCase()] ?? 0) : null);
