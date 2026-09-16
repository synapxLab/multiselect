# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.0] — 2026-09-16

### Added

- Vanilla TypeScript multi-select, zero runtime dependency, as a progressive enhancement of a native `<select>` (`multiple` or single): the select stays in the DOM, hidden by the `sxms-native` class, and keeps the form value; every change writes `option.selected` and dispatches native `input` and `change` (bubbling)
- Field with chips (label + remove button), placeholder and chevron; `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls`, `aria-labelledby`; the `<label for>` of the select opens the component
- Popover rendered in `document.body` (or a custom `container`) with `position: fixed`, never clipped by `overflow`/`transform` ancestors, positioned by the pure, exported `computePosition()` (flip above, horizontal clamp, `maxHeight` constraint — never off-screen); repositioning on scroll (capture, passive), resize and `ResizeObserver`, deduplicated through `requestAnimationFrame`; a single popover open at a time
- Search bar with accent- and case-insensitive filtering (`normalize()` — NFD + diacritics stripped + lowercase), “Select all” acting on the visible rows (multiple only), “No results” row, “selected first” sort toggle (`sortSelectedFirst`, hideable with `showSort: false`)
- Row animation: invisible checkbox marker and label shifted by `-2rem`; on selection the row takes the primary color, the marker fades in and the label slides into place (`0.3s` transitions, `translate`)
- Single mode: same styling, one value, closes on choice, no “Select all”
- Mobile (< 640 px, `mobileBreakpoint`): full-screen sheet with a close header and a “Done” footer; no virtual keyboard on coarse pointers
- Keyboard: `Enter`/`Space`/`ArrowDown` open, `Backspace` removes the last chip; in the popover `ArrowUp/Down`, `Home/End`, `Enter`/`Space` toggle, `Escape` and `Tab` close and return focus; `aria-activedescendant` on the search input
- Options: `placeholder`, `searchable`, `selectAll`, `showSort`, `sortSelectedFirst`, `closeOnSelect`, `maxItems`, `container`, `zIndex`, `width` (px or `'anchor'`), `maxHeight`, `offset`, `viewportMargin`, `placement`, `mobileBreakpoint`, `strings`, `locale` (`fr` | `en`, defaults from the document language), `renderOption`, `onChange` / `onOpen` / `onClose`
- DOM events `multiselect:open`, `multiselect:close`, `multiselect:change` (bubbling `CustomEvent`, `detail: { values, instance }`)
- Methods: `getValue`, `setValue(values, { silent })`, `open`, `close`, `toggle`, `isOpen`, `refresh`, `setOptions`, `enable`, `disable`, `isDisabled`, `destroy`; statics `MultiSelect.init`, `MultiSelect.get`, `MultiSelect.version`
- Inline SVG icons built through the DOM (`createElementNS`) — no icon font, no `innerHTML`
- SCSS with `sxms-` prefix, `--sxms-*` custom properties, no `!important`, dark theme via `prefers-color-scheme`, `[data-bs-theme="dark"]` and `[data-theme="dark"]`
- ESM + UMD (`window.SynapxMultiSelect`) builds via Vite lib mode, `dist/style.css` exported as `./style`, TypeScript declarations
