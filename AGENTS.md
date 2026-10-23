# Volt — agent instructions

## Tests

- Never write new tests in this repo: no Vitest unit, component, hook or renderer tests, and no new `*.test.ts(x)` files. Verify a change by building it and checking it in the running client.

## UI must match Habbo AIR 1:1

Every window, bubble, menu and catalog page must match the official Habbo AIR client pixel for pixel. Follow `docs/air-ui-parity.md` for every UI change. The short version:

- Work only from the AIR export: the layout XML, the AS3 view class that loads it, `habbo_element_description_xml` (type + style to skin), the skin XMLs and atlases, and `styles_css`. Never guess, and never copy another client.
- Use the XML positions and sizes, plus the window layout offsets (for example, a bubble's content starts 8 px inside it unless it sets margins).
- Cut skins from the AIR atlases with a script. An element `color` tints its skin by RGB multiply. Never imitate skins with CSS colours, gradients or rounded corners. Record where each new bitmap comes from.
- Draw AIR text with `NativeText`, not CSS fonts.
- Copy the AS3 behaviour too: visibility, hover and pressed states, offsets, blend. Remove Volt-only extras that AIR does not have.
- Prove it: diff an AIR reference image against a Volt screenshot at scale 1, aim for 0 pixels that differ by more than 12, and explain every pixel that still differs. If the test hotel cannot show the element, report "checked against the AIR XML only".

## Commits and pull requests

- Titles use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, e.g. `fix(wired): re-stack a furni_to_furni mover already on its target`.
- Keep descriptions short: what was wrong and what changed.
- Cite Habbo evidence as "Observed on AIR `<build>`" or with the AIR path and line. Don't name rooms, runs or test sessions.
- No test counts, suite results, lint or code-style status, checklists or long tables.
- No "Generated with" footers and no AI co-author trailers.
- Never mention other emulators or clients (for example Turbo or Habz) in titles, descriptions, commit messages or code comments. Only official Habbo behaviour is evidence.
