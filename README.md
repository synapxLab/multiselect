# @synapxlab/multiselect

> Chip-based multi-select with search and popover — vanilla TypeScript, zero dependency, progressive enhancement of a native `<select>`.

The component attaches to an existing `<select multiple>` (or a plain `<select>`). The native element stays in the DOM, hidden, and keeps holding the value: the form posts it as-is, with no server-side JavaScript. Everything the component does — a click on an option, `setValue`, a keyboard toggle — writes `option.selected` and dispatches `change` on the select.

[Version française](README.fr.md)

---

## Why not select2?

- No jQuery.
- The popover is rendered in `document.body` with `position: fixed`: it is never clipped by an `overflow: hidden` container, a scrollable table, or a `transform`ed modal.
- Full keyboard support and ARIA (`combobox`, `listbox`, `option`, `aria-selected`, `aria-activedescendant`).
- Dark theme through CSS custom properties, no rebuild of a jQuery UI theme.

---

## The selection effect

The checkbox marker of an option is invisible until the option is selected. On click the row takes the primary color as a border, the marker fades in, and the label slides over to make room for it — everything animated in `.3s`. Inspired by the form component of the inwink platform.

---

## Features

- Attaches to `<select multiple>` (chips, search, "select all") or a plain `<select>` (single value, closes on choice)
- Search bar, filtering as you type, accent- and case-insensitive
- "Select all" scoped to the currently filtered rows
- Optional sort toggle: selected options first
- Chips in the closed field, each removable with its own button, without opening the popover
- Popover in `document.body`, `position: fixed`, repositioned on scroll and resize, clamped to the viewport
- One popover open at a time; closes on outside click, `Escape`, or a "Validate" button on mobile
- Mobile layout (configurable breakpoint): the popover becomes a full-screen sheet with a header and a footer
- Full keyboard control and ARIA roles
- Dark theme via CSS custom properties, `prefers-color-scheme`, `[data-bs-theme="dark"]` and `[data-theme="dark"]`
- Native `change` and `input` events on the select, plus bubbling `multiselect:*` custom events
- ESM + UMD builds, TypeScript types, no runtime dependency

---

## Installation

```bash
npm install @synapxlab/multiselect
```

---

## Quick start

### ESM

```ts
import { MultiSelect } from '@synapxlab/multiselect';
import '@synapxlab/multiselect/style';

const ms = new MultiSelect(document.querySelector('select[name=attentes]'), {
  searchable: true,
  onChange(values) {
    console.log('selected', values);
  },
});
```

### `<script>` (UMD, no bundler)

```html
<link rel="stylesheet" href="node_modules/@synapxlab/multiselect/dist/style.css" />
<script src="node_modules/@synapxlab/multiselect/dist/multiselect.umd.cjs"></script>
<script>
  const { MultiSelect } = window.SynapxMultiSelect;
  MultiSelect.init('select[data-multiselect]');
</script>
```

### Plain `<select>`

A `<select>` without `multiple` gets the same look and feel, as a single-value dropdown: no chips, no "select all", closes on choice by default.

```html
<select name="country">
  <option value="fr">France</option>
  <option value="be">Belgium</option>
</select>
```

```ts
new MultiSelect(document.querySelector('select[name=country]'));
```

---

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `string` | `strings.placeholder` | Text shown in the empty field |
| `searchable` | `boolean` | `true` | `false` removes the search bar |
| `selectAll` | `boolean` | `true` | "Select all" row (multiple only) |
| `showSort` | `boolean` | `true` | Sort toggle button next to the search bar |
| `sortSelectedFirst` | `boolean` | `false` | Initial state of the sort toggle |
| `closeOnSelect` | `boolean` | `true` in single mode, `false` in multiple | Close the popover right after a choice |
| `maxItems` | `number` | — | Selection limit (multiple only) |
| `container` | `HTMLElement` | `document.body` | Parent of the popover. Pass an open `<dialog>` so the popover lives in the top layer |
| `zIndex` | `number` | `1060` | Popover z-index |
| `width` | `number \| 'anchor'` | `400` | Popover width in px, or `'anchor'` to match the field width. Clamped to the viewport |
| `maxHeight` | `number` | `300` | Max height of the option list (px) |
| `offset` | `number` | — | Gap between field and popover (px) |
| `viewportMargin` | `number` | — | Minimum distance from the viewport edges (px) |
| `placement` | `'auto' \| 'top' \| 'bottom'` | `'auto'` | Preferred side |
| `mobileBreakpoint` | `number` | `640` | Width below which the popover becomes a full-screen sheet |
| `strings` | `Partial<MultiSelectStrings>` | locale default | Labels, see the table below |
| `locale` | `'fr' \| 'en'` | document language if French, else English | Selects the built-in string set |
| `renderOption` | `(item, el) => void` | — | Hook called on each option row before it is inserted |
| `onChange` | `(values: string[], instance) => void` | — | Selection changed |
| `onOpen` / `onClose` | `(instance) => void` | — | Popover opened / closed |

### Strings

Built-in locales: `en` and `fr`. Any key can be overridden through `strings`.

| Key | `en` | `fr` |
|---|---|---|
| `placeholder` | Click to select an item | Cliquez pour sélectionner un élément |
| `search` | Search... | Recherche... |
| `selectAll` | Select all | Tout sélectionner |
| `noResults` | No results | Aucun résultat |
| `remove` | Remove | Supprimer |
| `sortSelectedFirst` | Selected first | Sélectionnés en premier |
| `close` | Close | Fermer |
| `validate` | Done | Valider |
| `listLabel` | Options | Options |

---

## Methods

| Method | Description |
|---|---|
| `MultiSelect.init(selector, options)` | Creates one instance per matching `<select>` (idempotent), returns them |
| `MultiSelect.get(select)` | Instance attached to a select |
| `getValue(): string[]` | Current value |
| `setValue(values: string[])` | Writes the native select, dispatches `change` |
| `open()` / `close()` / `toggle()` / `isOpen` | Popover control |
| `refresh()` | Re-reads the `<option>` elements from the DOM |
| `setOptions(items)` | Rewrites the `<option>` elements from `{ value, label, disabled?, selected? }[]` |
| `disable()` / `enable()` | Disables / enables the field |
| `destroy()` | Removes every element and listener, restores the native select |

---

## Events

Custom events bubble on the native select, each with `detail: { values, instance }`.

| Event | When |
|---|---|
| `multiselect:open` | Popover opened |
| `multiselect:close` | Popover closed |
| `multiselect:change` | Selection changed |

Each change also dispatches native `change` and `input` on the select, so forms, validation libraries and frameworks react as if the user had used the native control.

```ts
select.addEventListener('multiselect:change', (e) => {
  console.log(e.detail.values, e.detail.instance);
});
```

---

## Styling

All colors and metrics go through custom properties, prefix `sxms-`:

```css
.sxms-field,
.sxms-popup {
  --sxms-bg: #f9f9f9;               /* field background */
  --sxms-border: #dadada;
  --sxms-border-hover: #7c8592;
  --sxms-text: #212e44;
  --sxms-muted: #7c8592;            /* placeholder, arrow, icons */
  --sxms-chip-bg: #f1f3f6;
  --sxms-chip-text: #7c8592;
  --sxms-primary: #e94c1e;          /* selected row border/text, marker */
  --sxms-primary-text: #ffffff;     /* check mark on the marker */
  --sxms-popup-bg: #ffffff;
  --sxms-item-bg: #fafafb;
  --sxms-item-hover: #f1f3f6;
  --sxms-item-hover-border: #bcbeca;
  --sxms-radius: 4px;
  --sxms-shadow: 1px 1px 12px rgba(0, 0, 0, 0.15);
  --sxms-font: 14px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
  --sxms-transition: all 0.3s ease;
  --sxms-focus: #0d6efd;
}
```

The dark palette applies under `@media (prefers-color-scheme: dark)`, and under `[data-bs-theme="dark"]` or `[data-theme="dark"]` on any ancestor. No `!important` anywhere: override the variables in your own stylesheet. All icons (chevron, cross, check, search, sort) are inline SVG built by the DOM, not an icon font, so they inherit `currentColor` without extra markup.

Class prefix is `sxms-`.

### Plain native select, same look

For a `<select>` that does not need the component, the class `sxms-select` gives it the same field, chevron and tokens, with no JavaScript. Handy to keep a form visually consistent.

```html
<select name="country" class="sxms-select">
  <option value="fr">France</option>
</select>
```

---

## Accessibility

- Field: `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls`, `aria-disabled`. Clicking the `<label for="...">` of the native select still opens the component.
- List: `role="listbox"`, `aria-multiselectable`, rows `role="option"` with `aria-selected` and `aria-disabled`, `aria-activedescendant` tracks the active row from the search input.
- Keyboard on the field: `Enter` / `Space` / `ArrowDown` open the popover, `Backspace` removes the last chip.
- Keyboard in the popover: `ArrowUp` / `ArrowDown` move, `Enter` / `Space` toggle, `Escape` closes, `Tab` closes and restores focus, `Home` / `End` jump to the ends of the list.
- Search input gets focus on open, except on touch, where the list gets focus instead so the virtual keyboard does not pop up.
- Focus returns to the field on close. Only one popover is open at a time.

---

## Browser support

Requires ES2020, the CSS `:has()` selector and CSS `translate`: Chrome/Edge 105+, Safari 15.4+, Firefox 121+.

---

## License

MIT — © synapxLab.
