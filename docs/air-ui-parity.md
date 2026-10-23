# Porting UI from Habbo AIR 1:1

Every Volt window, bubble, menu and catalog page must look and behave like the official Habbo AIR client, down to the pixel. This guide is the method. Follow it for every UI change, new or fixed.

## 1. Ground truth

- Only the official AIR client is evidence. Use the newest AIR build you have. Never copy a look from another client or emulator, and never guess.
- You need three parts of the AIR export:
  - `binaryData/`: layout XMLs (`<name>_xml`), skin XMLs (`habbo_skin_*_xml`), the element registry (`habbo_element_description_xml`), the bubble/button window layouts (`habbo_window_layout_*_xml`) and the text styles (`styles_css`).
  - `images/`: the skin atlases (`habbo_skin_ubuntu_png`, `habbo_icons_png`, …) and other bitmaps.
  - The decompiled AS3 scripts: the view class that builds the layout and handles its events.
- If something is not in these sources, say so. Do not fill the gap with a guess.

## 2. Find the sources for the element

1. Find the layout XML the AIR view loads. Search the AS3 for `getAssetByName("<layout>")` or `buildFromXML`. Example: `DecorateModeView` loads `own_avatar_decorating`.
2. Read the AS3 view class completely. It decides what the XML cannot:
   - which children are shown or hidden, and when;
   - texts and localization keys set at runtime;
   - hover, pressed and click handling, including icon style swaps;
   - position: `getOffset`, maximum vertical lead, freeze while hovered;
   - opacity: `blend` and `maximumBlend`, and fading.
3. For every element in the XML, look up its `type` + `style` in `habbo_element_description_xml`. That gives the skin XML and the window layout. The XML ids alone do not tell you the look.

## 3. Geometry

- Use the absolute coordinates and sizes from the XML. A child's position is its parent's position plus its own.
- Add the offsets that the window layouts add:
  - **Bubble (style 0):** the skin body sits 6 px inside the bubble box. The content area starts 8 px inside it, unless the bubble sets `margin_*` variables (the avatar menus use 4). The 13×9 pointer sits at the bottom centre.
  - **Buttons and frames:** check their `habbo_window_layout_*_xml` for caption margins.
- For resizable parts, follow the `scale` rules in the skin and window layouts (`fixed`, `move`, `strech`).
- Text fields: `auto_size`, `word_wrap` and the field width decide the wrapping. Copy them.

## 4. Skins and bitmaps

- Cut every skin piece from the AIR atlas with a script, at the rectangle the skin XML gives. Never redraw a skin by hand. Never imitate it with CSS colours, gradients, shadows or rounded corners.
- An element `color` tints its skin. The tint is an RGB multiply that truncates (`channel * tint / 255`) and keeps alpha. `colorize` defaults to true. Example: the friend request bubble is the grey bubble skin multiplied by `#fac919`.
- Check your script first: it must reproduce an existing Volt slice byte for byte.
- Draw 9-slices with `border-image` and `image-rendering: pixelated`.
- Record where every new bitmap comes from: atlas name, rectangle and tint. Write this in the folder's README or in `src/assets/images/habbo-skin/slices/widget-skins.md`.
- Reuse the existing slices in `src/assets/images/habbo-skin/slices/` and `src/assets/images/avatar-menu/air/` before you add new ones.

## 5. Text

- AIR text is not browser text. Use the native text renderer (`NativeText`) for text fields. It draws AIR glyphs pixel-exact.
- Take the font, size, weight, colour, `sharpness` and `thickness` from the `text_style` in `styles_css`. A `font_size` or `text_color` variable on the element overrides the style.
- When a text must stay browser text (HTML with links, user input), say so in the PR and in the report as a known difference.

## 6. Behaviour

- Copy the AS3 behaviour, not only the look. Show and hide what AIR shows and hides, react on the same events, and keep the same states.
- Remove Volt-only extras that AIR does not have. Example: a bubble that AIR never opens. Keep an extra only when the owner asks for it, and mark it in a code comment.
- Cite the AIR source in code comments when the reason is not obvious, for example `// AIR DecorateModeView: maximumBlend 0.8`.

## 7. Verify pixel for pixel

A successful build is not proof. Compare pixels.

1. Build an AIR reference image from the AIR skins and the AIR text renderer, at the XML positions.
2. Take a Volt screenshot of the same element at device scale factor 1, with the same origin.
   - AIR screenshots taken at 2x are an exact nearest-neighbour upscale. Scale them down by 2 before you compare.
3. Diff the two images. Count pixels that differ at all, and pixels that differ by more than 12 per channel.
4. The target is 0 pixels above 12. Explain every remaining difference: where it is, how many pixels, and why.
5. When the test hotel has no page or state that shows the element, say "checked against the AIR XML only". Never report it as pixel-checked.
6. Check every state: default, hover, pressed, disabled, selected, open, empty, and long texts.

## 8. Report and PR

- Name the AIR layout, skin and AS3 class you followed, for example "Observed on AIR: `instant_friend_request_xml`, `FriendRequestDialog`".
- List what is still different and what you could not check.
- Follow the commit and PR rules in `AGENTS.md`.
