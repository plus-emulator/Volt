# Widget skin sources

Official AIR build: `WIN63-202609091217-117204808`. Source exports live in
`polaris/reference/habbo-air-WIN63-202609091217-117204808/decompiled`.

The four `button-black-{default,hover,pressed,disabled}.png` assets follow
`habbo_skin_button_default_black_xml`, on `habbo_blue_skin_png`
(`2378_class_840.png`). They retain the 3px corners and compress the repeatable
center to one pixel, yielding 7x7 nine-slices. Default origin is (89,100);
state rectangles come directly from the skin templates. Registry
`2319_class_836.bin` maps button style 1 to this skin. `941_class_629.bin` and
`1103_class_1322.bin` use it for furniture and pet actions. The text layout
`2928_button_black_xml` specifies white Volter 9 and margins 8/4/8/4.

Group neutral shiny-thick slices already exist. Registry button_thick style 3
maps to `habbo_skin_button_shiny_thick_xml`, five-pixel caps with Ubuntu Bold 12.
The room-info control is 175x29 at (10,79) in `1188_class_760.bin`.

The group popup backgrounds are whole images, not nine-slices:
`groups/swf/group_bg.png` is the 195x119 `guilds/group_bg.png` image named by
`1188_class_760.bin`; `groups/swf/event_bg_contracted.png` is the 195x25
`Events/event_bg_contracted.png` image named by the same layout. These external
c_images assets retain their original decoded pixels and alpha.

Frame 3 provenance and tint verification are recorded in `frame-ubuntu-3.md`.

Furniture `border-colorless-3d3d3d.png` is a 13x13 compact nine-slice from
`2939_class_848.bin` (6px corners, one-pixel center, atlas y=229/235/241,
x=0/6/12), RGB multiplied by the furniture widget's default #3d3d3d.
`close-black.png` already exactly matches atlas (377,116,15,15), specified by
`2559_class_855.bin`; default, active and pressed share this template.
The bitmap is at control (0,0), unscaled, inside the 18x16 hit area.

`border-6-79756e.png` is the ubuntu atlas rectangle (80,10,20,20), with 8px
caps and a 4px center (`2727_habbo_skin_border_6_xml`), multiplied by the
Me menu window color #79756e. `class_4233.as:171` defaults a missing colorize
attribute to true. RGB multiplication truncates channel values and preserves
alpha; no CSS tint or rounded rectangle is layered over these bitmaps.

Catalog info group slices, rendered from the AIR skins with `/tmp/catlay/tools/skinpng.py` and checked as nine-slices:
- `border-6.png`: 17x17 `habbo_skin_border_6_xml` (border style 6, 8px caps), untinted, for the opaque grid borders
  of layout_single_bundle and the AIR priceDisplayWidget.
- `border-colorless-{cccccc,d8d8d8,fbc362,ff3300}.png`: 13x13 `habbo_skin_border_colorless_xml` (border style 2,
  6px caps) tinted for layout_soundmachine, layout_info_rentables, layout_recycler_info and the gridItem multiContainer.
- `border-slot-e0e0e0.png`: 7x7 `habbo_skin_border_slot_xml` (border style 3, 3px caps) tinted #e0e0e0 for
  layout_single_bundle.
- `button-group-{left,center,right}-{default,selected,hover}.png`: 7x21 `habbo_skin_button_group_*_xml` templates
  (3px caps) for the layout_spaces_new tabs.

Catalog Bc group slices, rendered with `/tmp/catlay/tools/skinpng.py` and checked as nine-slices:
- `border-colorless-d7d7cf.png`: 13x13 `habbo_skin_border_colorless_xml` (border style 2, 6px caps) tinted #d7d7cf for
  the layout_builders_club_loyalty / layout_builders_club_addons rows.
- `border-slot-afafa9.png`: 7x7 `habbo_skin_border_slot_xml` (border style 3, 3px caps) tinted #afafa9 for the headers
  of those rows.

Catalog Pets group slices, rendered with `/tmp/catlay/tools/skinpng.py` and checked as nine-slices:
- `border-colorless-8899a2.png`: 13x13 `habbo_skin_border_colorless_xml` (border style 2, 6px caps) tinted #8899a2 for
  the layout_pets2 and layout_pets3 panel.
- `border-4-cccccc.png`: 13x13 `habbo_skin_border_4_xml` (border style 4, 6px caps) tinted #cccccc for the layout_pets
  name box.
- `border-6-{e4c57d,abc6d7,89d3c8}.png`: 17x17 `habbo_skin_border_6_xml` (8px caps) tinted like
  HabboCatalogUtils.showPriceOnProduct colours the priceDisplayWidget: credits only, duckets only, other points only.
- `droplist-frame.png`: 7x7 nine-slice (3px caps) of `habbo_skin_droplist_xml` template `droplist_frame_default` on
  `habbo_blue_skin_png` (corners at (164,0), (185,0), (164,19), centre (167,3)). Droplist style 3 has no registry entry,
  so it falls back to style 0 (SkinContainer). Used by the catalog guild selector.
- `droplist-arrow.png`: the 16x16 droplist `arrow` entity, atlas (168,1), drawn at (width - 21, 2).
- `border-colorless-5ea1ab.png`: 13x13 `habbo_skin_border_colorless_xml` (border style 2, 6px caps) tinted #5ea1ab for
  the guildSelectorWidget members_only box.

Catalog market group slices (marketplace and recycler pages):
- `illumina-border-etched.png`: the 9x9 `illumina_light_border_etched_png` atlas itself. `illumina_light_skin_border_xml`
  (border style 100) maps its 3px pieces 1:1 and draws no centre, so it is a 3px border-image without `fill`.
- `button-shiny-{default,hover,pressed,disabled}-h{24,25,30}.png` and `button-shiny-green-*-h30.png`: 11px wide
  `habbo_skin_button_shiny_default_xml` renders at 24, 25 and 30px (green: 0x00aa00, button style 6). The 22px skins
  stretch their 12px middle rows; a skin at the button's own height keeps every row as AIR draws it.
- `border-slot-888888.png`: 7x7 `habbo_skin_border_slot_xml` (border style 3, 3px caps) tinted #888888 for the recycler
  disabled_border.
