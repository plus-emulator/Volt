// Generated from AIR WIN63-202610151745-318700621: chatstyles_xml (HabboFreeFlowChatCom.as:27) and the
// style_<assetId>_regpoints / _chat_bubble_* / _icon assets read by ChatStyleLibrary.as:38-123.

export interface AirChatStyleFlags
{
    id: number;
    system?: boolean;
    hcOnly?: boolean;
    staffOverrideable?: boolean;
    ambassadorOnly?: boolean;
    purchasable?: boolean;
}

export interface AirChatBubbleStyle
{
    id: number;
    base: string;
    size: [number, number];
    /** 9sliceXY + 9sliceWH */
    slice: [number, number, number, number];
    /** chat_bubble_pointer; y is pointerY, margins is pointerXMargins (left, right) */
    pointer?: { image: string; size: [number, number]; y: number; margins?: [number, number] };
    /** faceXY: centre of the face (or style icon) */
    face?: [number, number];
    /** textFieldMargins: x, y, width, height */
    margins: [number, number, number, number];
    color: string;
    fontSize: number;
    emblem?: { image: string; position: [number, number] };
    emblemMultiline?: { image: string; position: [number, number] };
    icon?: { image: string; size: [number, number] };
    /** chat_bubble_color: tinted by the avatar colour and drawn with DARKEN (ChatStyle.as:102-122) */
    tint?: string;
    notification?: boolean;
    system?: boolean;
    pixelPerfect?: boolean;
}

// Library order (chatstyles_xml order).
export const AIR_CHAT_STYLE_FLAGS: AirChatStyleFlags[] = [
    { id: 0, staffOverrideable: true },
    { id: 1, system: true },
    { id: 2, system: true },
    { id: 3, staffOverrideable: true },
    { id: 4, staffOverrideable: true },
    { id: 5, staffOverrideable: true },
    { id: 6, staffOverrideable: true },
    { id: 7, staffOverrideable: true },
    { id: 8, system: true },
    { id: 9, hcOnly: true, staffOverrideable: true },
    { id: 10, hcOnly: true, staffOverrideable: true },
    { id: 11, hcOnly: true, staffOverrideable: true },
    { id: 12, hcOnly: true, staffOverrideable: true },
    { id: 13, hcOnly: true, staffOverrideable: true },
    { id: 14, hcOnly: true, staffOverrideable: true },
    { id: 15, hcOnly: true, staffOverrideable: true },
    { id: 16, hcOnly: true, staffOverrideable: true },
    { id: 17, hcOnly: true, staffOverrideable: true },
    { id: 19, hcOnly: true, staffOverrideable: true },
    { id: 20, hcOnly: true, staffOverrideable: true },
    { id: 21, hcOnly: true, staffOverrideable: true },
    { id: 22, hcOnly: true, staffOverrideable: true },
    { id: 23, staffOverrideable: true },
    { id: 24, hcOnly: true, staffOverrideable: true },
    { id: 25, hcOnly: true, staffOverrideable: true },
    { id: 26, hcOnly: true, staffOverrideable: true },
    { id: 27, hcOnly: true, staffOverrideable: true },
    { id: 28, system: true },
    { id: 29, hcOnly: true, staffOverrideable: true },
    { id: 30, system: true },
    { id: 31, system: true },
    { id: 32, system: true },
    { id: 33, system: true },
    { id: 34, system: true },
    { id: 35, system: true },
    { id: 36, system: true },
    { id: 37, staffOverrideable: true, ambassadorOnly: true },
    { id: 38, system: true },
    { id: 120, system: true },
    { id: 121, system: true },
    { id: 130, system: true },
    { id: 131, system: true },
    { id: 132, system: true },
    { id: 133, system: true },
    { id: 200, system: true },
    { id: 201, system: true },
    { id: 202, system: true },
    { id: 210, system: true },
    { id: 211, system: true },
    { id: 212, system: true },
    { id: 220, system: true },
    { id: 221, system: true },
    { id: 222, system: true },
    { id: 223, system: true },
    { id: 224, system: true },
    { id: 225, system: true },
    { id: 226, system: true },
    { id: 227, system: true },
    { id: 228, system: true },
    { id: 229, system: true },
    { id: 250, system: true },
    { id: 251, system: true },
    { id: 252, system: true },
    { id: 253, system: true },
    { id: 1000 },
    { id: 1001 },
    { id: 1002 },
    { id: 1003 },
    { id: 1004 },
    { id: 1005 },
    { id: 1006 },
    { id: 1007 },
    { id: 1010 },
    { id: 1011 },
    { id: 1012 },
    { id: 1013 },
    { id: 1014 },
    { id: 1015 },
    { id: 1016 },
    { id: 1017 },
    { id: 1018 },
    { id: 1019 },
    { id: 1020 },
    { id: 1021 },
    { id: 1022 },
    { id: 1023 },
    { id: 1024 },
    { id: 1025 },
    { id: 1026 },
    { id: 1027 },
    { id: 1028 },
    { id: 10000, purchasable: true },
    { id: 10001, purchasable: true }
];

export const AIR_CHAT_BUBBLE_STYLES: Record<number, AirChatBubbleStyle> = {
    0: { id: 0, base: 'normal_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'normal_pointer.png', size: [9, 6], y: 23 }, face: [13, 12], margins: [28, 4, 12, 7], color: '#000000', fontSize: 12, tint: 'normal_color.png' },
    1: { id: 1, base: 'generic_base.png', size: [51, 25], slice: [28, 18, 1, 1], margins: [28, 5, 12, 7], color: '#000000', fontSize: 12, system: true },
    2: { id: 2, base: 'bot_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'bot_pointer.png', size: [9, 7], y: 22 }, margins: [28, 4, 12, 7], color: '#ffffff', fontSize: 12, system: true },
    3: { id: 3, base: 'normal_red_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'normal_red_pointer.png', size: [9, 6], y: 23 }, face: [13, 12], margins: [28, 4, 12, 7], color: '#000000', fontSize: 12 },
    4: { id: 4, base: 'normal_blue_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'normal_blue_pointer.png', size: [9, 6], y: 23 }, face: [13, 12], margins: [28, 4, 12, 7], color: '#000000', fontSize: 12 },
    5: { id: 5, base: 'normal_yellow_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'normal_yellow_pointer.png', size: [9, 6], y: 23 }, face: [13, 12], margins: [28, 4, 12, 7], color: '#000000', fontSize: 12 },
    6: { id: 6, base: 'normal_green_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'normal_green_pointer.png', size: [9, 6], y: 23 }, face: [13, 12], margins: [28, 4, 12, 7], color: '#000000', fontSize: 12 },
    7: { id: 7, base: 'normal_grey_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'normal_grey_pointer.png', size: [9, 6], y: 23 }, face: [13, 12], margins: [28, 4, 12, 7], color: '#000000', fontSize: 12 },
    8: { id: 8, base: 'fortune_teller_base.png', size: [51, 27], slice: [27, 20, 1, 1], pointer: { image: 'fortune_teller_pointer.png', size: [9, 6], y: 26 }, margins: [26, 7, 12, 7], color: '#ffffff', fontSize: 12, system: true },
    9: { id: 9, base: 'zombie_hand_base.png', size: [62, 30], slice: [30, 17, 1, 1], pointer: { image: 'zombie_hand_pointer.png', size: [7, 10], y: 26 }, face: [19, 18], margins: [31, 10, 17, 7], color: '#000000', fontSize: 12 },
    10: { id: 10, base: 'skeleton_base.png', size: [58, 38], slice: [34, 29, 1, 1], pointer: { image: 'skeleton_pointer.png', size: [7, 8], y: 32 }, face: [19, 24], margins: [32, 16, 15, 9], color: '#ffffff', fontSize: 12 },
    11: { id: 11, base: 'normal_sky_blue_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'normal_sky_blue_pointer.png', size: [9, 6], y: 23 }, face: [13, 12], margins: [28, 4, 12, 7], color: '#000000', fontSize: 12 },
    12: { id: 12, base: 'normal_pink_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'normal_pink_pointer.png', size: [9, 6], y: 23 }, face: [13, 12], margins: [28, 4, 12, 7], color: '#000000', fontSize: 12 },
    13: { id: 13, base: 'normal_purple_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'normal_purple_pointer.png', size: [9, 6], y: 23 }, face: [13, 12], margins: [28, 4, 12, 7], color: '#ffffff', fontSize: 12 },
    14: { id: 14, base: 'normal_dark_yellow_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'normal_dark_yellow_pointer.png', size: [9, 6], y: 23 }, face: [13, 12], margins: [28, 4, 12, 7], color: '#ffffff', fontSize: 12 },
    15: { id: 15, base: 'normal_dark_turquoise_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'normal_dark_turquoise_pointer.png', size: [9, 6], y: 23 }, face: [13, 12], margins: [28, 4, 12, 7], color: '#ffffff', fontSize: 12 },
    16: { id: 16, base: 'hearts_base.png', size: [52, 27], slice: [31, 15, 1, 1], pointer: { image: 'hearts_pointer.png', size: [9, 6], y: 26 }, face: [14, 15], margins: [29, 7, 12, 7], color: '#000000', fontSize: 12 },
    17: { id: 17, base: 'gothicrose_base.png', size: [56, 33], slice: [36, 24, 1, 1], pointer: { image: 'gothicrose_pointer.png', size: [9, 6], y: 30 }, face: [19, 19], margins: [35, 11, 10, 9], color: '#000000', fontSize: 12 },
    19: { id: 19, base: 'piglet_base.png', size: [52, 27], slice: [30, 17, 1, 1], pointer: { image: 'piglet_pointer.png', size: [9, 6], y: 26 }, face: [20, 15], margins: [29, 7, 12, 7], color: '#000000', fontSize: 12 },
    20: { id: 20, base: 'sausagedog_base.png', size: [52, 27], slice: [30, 18, 1, 1], pointer: { image: 'sausagedog_pointer.png', size: [8, 8], y: 24 }, face: [20, 15], margins: [29, 7, 12, 7], color: '#000000', fontSize: 12 },
    21: { id: 21, base: 'firingmylazer_base.png', size: [53, 37], slice: [32, 22, 1, 1], pointer: { image: 'firingmylazer_pointer.png', size: [9, 6], y: 34 }, face: [15, 23], margins: [25, 15, 12, 9], color: '#000000', fontSize: 12 },
    22: { id: 22, base: 'dragon_base.png', size: [57, 31], slice: [35, 18, 1, 1], pointer: { image: 'dragon_pointer.png', size: [9, 6], y: 29 }, face: [19, 18], margins: [28, 9, 12, 9], color: '#330000', fontSize: 12 },
    23: { id: 23, base: 'staff_base.png', size: [54, 31], slice: [39, 15, 1, 1], pointer: { image: 'staff_pointer.png', size: [9, 7], y: 25 }, face: [16, 15], margins: [33, 7, 17, 11], color: '#000000', fontSize: 12, emblem: { image: 'staff_emblem.png', position: [0, 0] }, emblemMultiline: { image: 'staff_emblem_multiline.png', position: [0, 0] }, pixelPerfect: true },
    24: { id: 24, base: 'bats_base.png', size: [61, 30], slice: [40, 22, 1, 1], pointer: { image: 'bats_pointer.png', size: [9, 6], y: 28 }, face: [22, 17], margins: [38, 9, 12, 8], color: '#ffffff', fontSize: 12 },
    25: { id: 25, base: 'console_base.png', size: [51, 30], slice: [28, 18, 1, 1], pointer: { image: 'console_pointer.png', size: [9, 9], y: 26 }, face: [15, 15], margins: [28, 7, 12, 10], color: '#ffffff', fontSize: 12 },
    26: { id: 26, base: 'steampunk_pipe_base.png', size: [51, 26], slice: [30, 16, 1, 1], pointer: { image: 'steampunk_pipe_pointer.png', size: [9, 10], y: 20 }, face: [13, 13], margins: [28, 4, 12, 9], color: '#cc9933', fontSize: 12 },
    27: { id: 27, base: 'storm_base.png', size: [58, 31], slice: [36, 24, 1, 1], pointer: { image: 'storm_pointer.png', size: [9, 6], y: 30 }, face: [20, 19], margins: [35, 11, 12, 7], color: '#ffffff', fontSize: 12 },
    28: { id: 28, base: 'parrot_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'parrot_pointer.png', size: [9, 6], y: 23 }, margins: [25, 4, 15, 7], color: '#000000', fontSize: 12, system: true },
    29: { id: 29, base: 'pirate_base.png', size: [53, 26], slice: [32, 10, 1, 1], pointer: { image: 'pirate_pointer.png', size: [9, 6], y: 24 }, face: [15, 13], margins: [32, 5, 10, 8], color: '#000000', fontSize: 12 },
    30: { id: 30, base: 'bot_guide_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'bot_guide_pointer.png', size: [9, 7], y: 22 }, margins: [28, 4, 12, 7], color: '#031a26', fontSize: 12, system: true },
    31: { id: 31, base: 'bot_rentable_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'bot_rentable_pointer.png', size: [9, 7], y: 22 }, face: [16, 10], margins: [28, 4, 12, 7], color: '#ffffff', fontSize: 12, icon: { image: 'bot_rentable_icon.png', size: [20, 11] }, notification: true, system: true },
    32: { id: 32, base: 'skelestock_base.png', size: [51, 24], slice: [29, 16, 1, 1], pointer: { image: 'skelestock_pointer.png', size: [9, 6], y: 22 }, margins: [28, 4, 12, 7], color: '#000000', fontSize: 12, system: true },
    33: { id: 33, base: 'bot_frank_large_base.png', size: [63, 22], slice: [38, 7, 1, 1], pointer: { image: 'bot_frank_large_pointer.png', size: [9, 6], y: 21 }, face: [19, 13], margins: [38, 2, 12, 6], color: '#000000', fontSize: 17, icon: { image: 'bot_frank_large_icon.png', size: [19, 19] }, system: true },
    35: { id: 35, base: 'goat_base.png', size: [51, 26], slice: [29, 19, 1, 1], pointer: { image: 'goat_pointer.png', size: [9, 6], y: 25 }, margins: [28, 6, 12, 7], color: '#000000', fontSize: 12, system: true },
    36: { id: 36, base: 'santa_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'santa_pointer.png', size: [9, 6], y: 23 }, face: [11, 12], margins: [28, 4, 12, 7], color: '#000000', fontSize: 12, icon: { image: 'santa_icon.png', size: [13, 18] }, system: true },
    37: { id: 37, base: 'ambassador_base.png', size: [54, 28], slice: [32, 21, 1, 1], pointer: { image: 'ambassador_pointer.png', size: [9, 6], y: 27 }, face: [17, 16], margins: [31, 8, 12, 7], color: '#000000', fontSize: 12 },
    38: { id: 38, base: 'radio_base.png', size: [51, 24], slice: [29, 17, 1, 1], pointer: { image: 'radio_pointer.png', size: [9, 6], y: 23 }, face: [11, 12], margins: [28, 4, 12, 7], color: '#000000', fontSize: 12, icon: { image: 'radio_icon.png', size: [19, 19] }, system: true },
    130: { id: 130, base: 'wired_team_red_base.png', size: [59, 27], slice: [42, 20, 1, 1], pointer: { image: 'wired_team_red_pointer.png', size: [9, 6], y: 26, margins: [36, 15] }, face: [21, 15], margins: [36, 7, 12, 7], color: '#000000', fontSize: 12, system: true },
    131: { id: 131, base: 'wired_team_blue_base.png', size: [59, 27], slice: [42, 20, 1, 1], pointer: { image: 'wired_team_blue_pointer.png', size: [9, 6], y: 26, margins: [36, 15] }, face: [21, 15], margins: [36, 7, 12, 7], color: '#000000', fontSize: 12, system: true },
    132: { id: 132, base: 'wired_team_yellow_base.png', size: [59, 27], slice: [42, 20, 1, 1], pointer: { image: 'wired_team_yellow_pointer.png', size: [9, 6], y: 26, margins: [36, 15] }, face: [21, 15], margins: [36, 7, 12, 7], color: '#000000', fontSize: 12, system: true },
    133: { id: 133, base: 'wired_team_green_base.png', size: [59, 27], slice: [42, 20, 1, 1], pointer: { image: 'wired_team_green_pointer.png', size: [9, 6], y: 26, margins: [36, 15] }, face: [21, 15], margins: [36, 7, 12, 7], color: '#000000', fontSize: 12, system: true }
};
