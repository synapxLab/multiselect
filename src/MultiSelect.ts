import { icon } from './icons';
import { matches } from './normalize';
import { computePosition, type Placement } from './position';
import { locales, resolveStrings, type MultiSelectStrings } from './strings';

export type Locale = 'fr' | 'en';

/** Une option telle que lue dans le `<select>` ou passée à `setOptions()`. */
export interface MultiSelectItem {
  value: string;
  label: string;
  disabled?: boolean;
  selected?: boolean;
}

export interface MultiSelectEventDetail {
  values: string[];
  instance: MultiSelect;
}

export interface MultiSelectOptions {
  /** Texte du champ vide (défaut : `strings.placeholder`). */
  placeholder?: string;
  /** Barre de recherche dans le popover (défaut true). */
  searchable?: boolean;
  /** Ligne « Tout sélectionner » — mode multiple seulement (défaut true). */
  selectAll?: boolean;
  /** Bouton de tri « sélectionnés en premier » (défaut true). */
  showSort?: boolean;
  /** État initial du tri (défaut false). */
  sortSelectedFirst?: boolean;
  /** Fermer après un choix (défaut : true en simple, false en multiple). */
  closeOnSelect?: boolean;
  /** Nombre maximal de valeurs (multiple). */
  maxItems?: number;
  /** Parent du popover (défaut `document.body`) — passer un `<dialog>` ouvert. */
  container?: HTMLElement;
  zIndex?: number;
  /** Largeur du popover en px, ou `'anchor'` = largeur du champ (défaut 400, borné au viewport). */
  width?: number | 'anchor';
  /** Hauteur max de la liste (défaut 300). */
  maxHeight?: number;
  /** Espace champ → popover (défaut 4 px). */
  offset?: number;
  /** Marge avec les bords du viewport (défaut 8 px). */
  viewportMargin?: number;
  placement?: Placement;
  /** Largeur sous laquelle le popover devient une feuille plein écran (défaut 640). */
  mobileBreakpoint?: number;
  strings?: Partial<MultiSelectStrings>;
  /** Défaut : `fr` si la langue du document commence par fr, sinon `en`. */
  locale?: Locale;
  /** Hook sur chaque ligne construite. */
  renderOption?: (item: MultiSelectItem, el: HTMLElement) => void;
  onChange?: (values: string[], instance: MultiSelect) => void;
  onOpen?: (instance: MultiSelect) => void;
  onClose?: (instance: MultiSelect) => void;
}

interface Resolved {
  placeholder: string;
  searchable: boolean;
  selectAll: boolean;
  showSort: boolean;
  closeOnSelect: boolean;
  maxItems: number | null;
  container: HTMLElement;
  zIndex: number;
  width: number | 'anchor';
  maxHeight: number;
  offset: number;
  viewportMargin: number;
  placement: Placement;
  mobileBreakpoint: number;
}

/** Option lue dans le DOM, liée à son `<option>`. */
interface Entry extends MultiSelectItem {
  option: HTMLOptionElement;
}

/** Ligne rendue dans la liste : une option, ou la ligne « Tout sélectionner ». */
interface Row {
  el: HTMLElement;
  entry: Entry | null;
}

const VERSION = '0.1.0';
let uid = 0;

/** Petit constructeur d'élément : jamais d'innerHTML, tout passe par le DOM. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className: string, label: string): HTMLButtonElement {
  const b = el('button', className);
  b.type = 'button';
  b.setAttribute('aria-label', label);
  b.title = label;
  return b;
}

export class MultiSelect {
  static readonly version = VERSION;

  private static registry = new WeakMap<Element, MultiSelect>();
  private static openInstance: MultiSelect | null = null;

  /** Instancie sur chaque `<select>` trouvé ; un select déjà équipé rend son instance. */
  static init(target: string | Element[] | NodeListOf<Element> | NodeList, options: MultiSelectOptions = {}): MultiSelect[] {
    const list: Element[] = typeof target === 'string'
      ? Array.from(document.querySelectorAll(target))
      : Array.from(target as ArrayLike<Node>).filter((n): n is Element => n instanceof Element);
    return list
      .filter((n): n is HTMLSelectElement => n instanceof HTMLSelectElement)
      .map((node) => MultiSelect.get(node) ?? new MultiSelect(node, options));
  }

  static get(element: Element): MultiSelect | undefined {
    return MultiSelect.registry.get(element);
  }

  readonly select: HTMLSelectElement;
  readonly strings: MultiSelectStrings;
  readonly multiple: boolean;

  private readonly opts: Resolved;
  private readonly callbacks: Pick<MultiSelectOptions, 'onChange' | 'onOpen' | 'onClose' | 'renderOption'>;
  private readonly id: string;

  private field: HTMLElement | null = null;
  private chips: HTMLElement | null = null;
  private popup: HTMLElement | null = null;
  private search: HTMLInputElement | null = null;
  private sortButton: HTMLButtonElement | null = null;
  private list: HTMLElement | null = null;

  private entries: Entry[] = [];
  private rows: Row[] = [];
  private activeIndex = -1;
  private query = '';
  private sortSelectedFirst: boolean;

  private disabled = false;
  private opened = false;
  private destroyed = false;
  private emitting = false;

  /** Écouteurs de vie de l'instance (champ, labels) — coupés par destroy(). */
  private lifetime = new AbortController();
  /** Écouteurs du popover ouvert (document, window) — coupés par close(). */
  private session: AbortController | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private rafId = 0;
  private rafPending = false;

  constructor(select: HTMLSelectElement, options: MultiSelectOptions = {}) {
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error('MultiSelect: expected a <select> element');
    }
    if (MultiSelect.registry.has(select)) {
      throw new Error('MultiSelect: instance already attached to this element');
    }
    this.select = select;
    this.multiple = select.multiple;
    this.id = 'sxms-' + (++uid);

    const docLang = (select.closest('[lang]') as HTMLElement | null)?.lang ?? document.documentElement.lang;
    const locale: Locale = options.locale ?? (docLang.toLowerCase().startsWith('fr') ? 'fr' : 'en');
    this.strings = resolveStrings(options.strings, locales[locale]);

    this.opts = {
      placeholder: options.placeholder ?? this.strings.placeholder,
      searchable: options.searchable ?? true,
      selectAll: this.multiple && (options.selectAll ?? true),
      showSort: options.showSort ?? true,
      closeOnSelect: options.closeOnSelect ?? !this.multiple,
      maxItems: this.multiple && options.maxItems !== undefined && options.maxItems > 0 ? options.maxItems : null,
      container: options.container ?? document.body,
      zIndex: options.zIndex ?? 1060,
      width: options.width ?? 400,
      maxHeight: options.maxHeight ?? 300,
      offset: options.offset ?? 4,
      viewportMargin: options.viewportMargin ?? 8,
      placement: options.placement ?? 'auto',
      mobileBreakpoint: options.mobileBreakpoint ?? 640,
    };
    this.sortSelectedFirst = options.sortSelectedFirst ?? false;
    this.callbacks = {
      ...(options.onChange ? { onChange: options.onChange } : {}),
      ...(options.onOpen ? { onOpen: options.onOpen } : {}),
      ...(options.onClose ? { onClose: options.onClose } : {}),
      ...(options.renderOption ? { renderOption: options.renderOption } : {}),
    };

    MultiSelect.registry.set(select, this);
    this.mount();
    this.readEntries();
    this.renderChips();
    if (select.disabled) this.disable();
  }

  // ---------------------------------------------------------------- API publique

  get isOpen(): boolean {
    return this.opened;
  }

  get isDisabled(): boolean {
    return this.disabled;
  }

  getValue(): string[] {
    return this.entries.filter((e) => e.option.selected).map((e) => e.value);
  }

  /** Écrit `option.selected` puis émet `multiselect:change`, `input` et `change` (sauf `silent`). */
  setValue(values: string[], opts: { silent?: boolean } = {}): void {
    const wanted = new Set(values);
    let first = true;
    for (const e of this.entries) {
      const on = wanted.has(e.value) && (this.multiple || first);
      if (on) first = false;
      e.option.selected = on;
    }
    this.commit(opts.silent === true);
  }

  /** Relit les `<option>` du select (libellés, disabled, selected). */
  refresh(): void {
    this.readEntries();
    this.renderChips();
    if (this.opened) this.renderList();
  }

  /** Remplace les `<option>` du select par `items`, puis relit. */
  setOptions(items: MultiSelectItem[]): void {
    this.select.replaceChildren();
    for (const it of items) {
      const o = document.createElement('option');
      o.value = it.value;
      o.textContent = it.label;
      if (it.disabled) o.disabled = true;
      if (it.selected) o.selected = true;
      this.select.appendChild(o);
    }
    this.refresh();
  }

  open(): void {
    if (this.destroyed || this.disabled || this.opened) return;
    if (MultiSelect.openInstance && MultiSelect.openInstance !== this) MultiSelect.openInstance.close();
    MultiSelect.openInstance = this;
    this.opened = true;
    this.query = '';
    this.activeIndex = -1;

    const popup = el('div', 'sxms-popup');
    popup.id = this.id + '-popup';
    popup.style.position = 'fixed';
    popup.style.zIndex = String(this.opts.zIndex);
    popup.style.visibility = 'hidden';
    this.popup = popup;
    this.buildPopup(popup);
    this.opts.container.appendChild(popup);
    this.field?.setAttribute('aria-expanded', 'true');
    this.field?.classList.add('sxms-field--open');

    this.session = new AbortController();
    const { signal } = this.session;
    // pointerdown plutôt que click : on ferme avant qu'un autre widget ne
    // réagisse ; un pointerdown sur le champ est ignoré, le click qui suit bascule.
    document.addEventListener('pointerdown', (e) => {
      const t = e.target as Node;
      if (popup.contains(t) || this.field?.contains(t)) return;
      this.close();
    }, { capture: true, signal });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.close({ restoreFocus: true });
      }
    }, { capture: true, signal });
    window.addEventListener('scroll', () => this.scheduleReposition(), { capture: true, passive: true, signal });
    window.addEventListener('resize', () => this.scheduleReposition(), { passive: true, signal });
    if (typeof ResizeObserver !== 'undefined') {
      // Le champ aussi : il grandit quand des chips s'ajoutent, le popover doit suivre.
      this.resizeObserver = new ResizeObserver(() => this.scheduleReposition());
      this.resizeObserver.observe(popup);
      if (this.field) this.resizeObserver.observe(this.field);
    }

    this.renderList();
    this.reposition();
    popup.style.visibility = '';
    this.focusInitial();
    this.emit('multiselect:open');
    this.callbacks.onOpen?.(this);
  }

  close(opts: { restoreFocus?: boolean } = {}): void {
    if (!this.opened) return;
    const hadFocus = this.popup?.contains(document.activeElement) ?? false;
    this.opened = false;
    if (MultiSelect.openInstance === this) MultiSelect.openInstance = null;
    this.session?.abort();
    this.session = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.rafPending = false;
    this.popup?.remove();
    this.popup = this.search = this.list = null;
    this.sortButton = null;
    this.rows = [];
    this.field?.setAttribute('aria-expanded', 'false');
    this.field?.classList.remove('sxms-field--open');
    if ((opts.restoreFocus || hadFocus) && this.field?.isConnected) this.field.focus({ preventScroll: true });
    this.emit('multiselect:close');
    this.callbacks.onClose?.(this);
  }

  toggle(): void {
    if (this.opened) this.close();
    else this.open();
  }

  enable(): void {
    this.disabled = false;
    this.select.disabled = false;
    this.field?.classList.remove('sxms-field--disabled');
    this.field?.removeAttribute('aria-disabled');
    this.field?.setAttribute('tabindex', '0');
    this.renderChips();
  }

  disable(): void {
    this.disabled = true;
    this.close();
    this.select.disabled = true;
    this.field?.classList.add('sxms-field--disabled');
    this.field?.setAttribute('aria-disabled', 'true');
    this.field?.setAttribute('tabindex', '-1');
    this.renderChips();
  }

  /** Retire le champ et les écouteurs ; le select natif redevient visible. */
  destroy(): void {
    if (this.destroyed) return;
    this.close();
    this.lifetime.abort();
    this.field?.remove();
    this.field = this.chips = null;
    this.select.classList.remove('sxms-native');
    this.select.removeAttribute('aria-hidden');
    MultiSelect.registry.delete(this.select);
    this.destroyed = true;
  }

  // ---------------------------------------------------------------- Montage du champ

  private mount(): void {
    const s = this.select;
    s.classList.add('sxms-native');
    s.setAttribute('aria-hidden', 'true');
    // tabindex -1 : un select display:none n'est pas focalisable, mais si un
    // style tiers le réaffiche, il ne doit pas doubler le champ dans l'ordre Tab.
    s.tabIndex = -1;

    const field = el('div', 'sxms-field' + (this.multiple ? ' sxms-field--multiple' : ' sxms-field--single'));
    field.id = this.id;
    field.setAttribute('role', 'combobox');
    field.setAttribute('tabindex', '0');
    field.setAttribute('aria-expanded', 'false');
    field.setAttribute('aria-haspopup', 'listbox');
    field.setAttribute('aria-controls', this.id + '-popup');
    const labelledBy = Array.from(s.labels ?? []).map((l) => l.id).filter((id) => id !== '');
    if (labelledBy.length > 0) field.setAttribute('aria-labelledby', labelledBy.join(' '));

    const chips = el('div', 'sxms-chips');
    const arrow = el('span', 'sxms-arrow');
    arrow.appendChild(icon('chevron'));
    field.append(chips, arrow);
    s.insertAdjacentElement('afterend', field);
    this.field = field;
    this.chips = chips;

    const { signal } = this.lifetime;
    field.addEventListener('click', (e) => {
      if ((e.target as Element).closest('.sxms-chip-remove')) return;
      this.toggle();
    }, { signal });
    field.addEventListener('keydown', (e) => this.onFieldKeydown(e), { signal });

    // Le <label for=select> doit ouvrir le composant : le select est masqué.
    for (const label of Array.from(s.labels ?? [])) {
      label.addEventListener('click', (e) => {
        if (this.destroyed) return;
        e.preventDefault();
        this.open();
      }, { signal });
    }
  }

  private onFieldKeydown(e: KeyboardEvent): void {
    if (this.disabled) return;
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        e.preventDefault();
        this.open();
        break;
      case 'Backspace': {
        const selected = this.entries.filter((en) => en.option.selected && !en.disabled);
        const last = selected[selected.length - 1];
        if (last) {
          e.preventDefault();
          last.option.selected = false;
          this.commit();
        }
        break;
      }
      default:
        break;
    }
  }

  // ---------------------------------------------------------------- Données

  private readEntries(): void {
    this.entries = Array.from(this.select.options).map((option) => ({
      value: option.value,
      label: option.label || option.textContent || option.value,
      disabled: option.disabled,
      selected: option.selected,
      option,
    }));
  }

  private selectedEntries(): Entry[] {
    return this.entries.filter((e) => e.option.selected);
  }

  private atLimit(): boolean {
    return this.opts.maxItems !== null && this.selectedEntries().length >= this.opts.maxItems;
  }

  /** Après toute écriture dans le select : chips, lignes, événements. */
  private commit(silent = false): void {
    for (const e of this.entries) e.selected = e.option.selected;
    this.renderChips();
    this.updateRows();
    if (silent) return;
    this.emit('multiselect:change');
    this.callbacks.onChange?.(this.getValue(), this);
    if (!this.emitting) {
      this.emitting = true;
      try {
        this.select.dispatchEvent(new Event('input', { bubbles: true }));
        this.select.dispatchEvent(new Event('change', { bubbles: true }));
      } finally {
        this.emitting = false;
      }
    }
  }

  private toggleEntry(entry: Entry): void {
    if (this.disabled || entry.disabled) return;
    if (this.multiple) {
      if (!entry.option.selected && this.atLimit()) return;
      entry.option.selected = !entry.option.selected;
    } else {
      if (entry.option.selected) {
        if (this.opts.closeOnSelect) this.close({ restoreFocus: true });
        return;
      }
      this.select.value = entry.value;
    }
    this.commit();
    if (this.opts.closeOnSelect) this.close({ restoreFocus: true });
  }

  /** « Tout sélectionner » porte sur les lignes visibles (filtrées) et actives. */
  private toggleAll(): void {
    if (this.disabled) return;
    const visible = this.rows.map((r) => r.entry).filter((e): e is Entry => e !== null && !e.disabled);
    if (visible.length === 0) return;
    const allOn = visible.every((e) => e.option.selected);
    if (allOn) {
      for (const e of visible) e.option.selected = false;
    } else {
      for (const e of visible) {
        if (e.option.selected) continue;
        if (this.atLimit()) break;
        e.option.selected = true;
      }
    }
    this.commit();
  }

  // ---------------------------------------------------------------- Rendu du champ

  private renderChips(): void {
    const box = this.chips;
    if (!box) return;
    box.replaceChildren();
    const selected = this.selectedEntries();
    if (selected.length === 0) {
      box.appendChild(el('span', 'sxms-placeholder', this.opts.placeholder));
      this.field?.classList.remove('sxms-field--filled');
      return;
    }
    this.field?.classList.add('sxms-field--filled');
    // Pas de signal ici : les boutons partent avec replaceChildren(), et un
    // AbortSignal retiendrait chaque écouteur jusqu'à destroy().
    for (const e of selected) {
      const chip = el('span', 'sxms-chip');
      chip.dataset['value'] = e.value;
      chip.appendChild(el('span', 'sxms-chip-label', e.label));
      if (!e.disabled && !this.disabled) {
        const rm = button('sxms-chip-remove', `${this.strings.remove} ${e.label}`);
        rm.tabIndex = -1;
        rm.appendChild(icon('cross'));
        rm.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (this.disabled) return;
          e.option.selected = false;
          this.commit();
        });
        chip.appendChild(rm);
      }
      box.appendChild(chip);
    }
  }

  // ---------------------------------------------------------------- Popover

  private isMobile(): boolean {
    return window.innerWidth < this.opts.mobileBreakpoint;
  }

  private buildPopup(popup: HTMLElement): void {
    const s = this.strings;
    popup.classList.toggle('sxms-popup--mobile', this.isMobile());

    const header = el('div', 'sxms-mobile-header');
    const closeBtn = button('sxms-close', s.close);
    closeBtn.appendChild(icon('cross'));
    closeBtn.addEventListener('click', () => this.close({ restoreFocus: true }));
    header.appendChild(closeBtn);
    popup.appendChild(header);

    if (this.opts.searchable || this.opts.showSort) {
      const bar = el('div', 'sxms-searchbar');
      if (this.opts.searchable) {
        const box = el('div', 'sxms-search-box');
        box.appendChild(icon('search'));
        const input = el('input', 'sxms-search');
        input.type = 'search';
        input.placeholder = s.search;
        input.autocomplete = 'off';
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-expanded', 'true');
        input.setAttribute('aria-controls', this.id + '-list');
        input.addEventListener('input', () => {
          this.query = input.value;
          this.renderList();
        });
        box.appendChild(input);
        bar.appendChild(box);
        this.search = input;
      }
      if (this.opts.showSort) {
        const sort = button('sxms-sort', s.sortSelectedFirst);
        sort.setAttribute('aria-pressed', String(this.sortSelectedFirst));
        sort.appendChild(icon('sort'));
        sort.addEventListener('click', () => {
          this.sortSelectedFirst = !this.sortSelectedFirst;
          sort.setAttribute('aria-pressed', String(this.sortSelectedFirst));
          sort.classList.toggle('sxms-sort--on', this.sortSelectedFirst);
          this.renderList();
        });
        sort.classList.toggle('sxms-sort--on', this.sortSelectedFirst);
        bar.appendChild(sort);
        this.sortButton = sort;
      }
      popup.appendChild(bar);
    }

    const list = el('div', 'sxms-list');
    list.id = this.id + '-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', s.listLabel);
    list.setAttribute('aria-multiselectable', String(this.multiple));
    list.tabIndex = -1;
    list.style.setProperty('--sxms-list-max-height', `${this.opts.maxHeight}px`);
    list.addEventListener('mouseover', (e) => {
      const row = (e.target as Element).closest<HTMLElement>('.sxms-item');
      if (!row) return;
      const i = this.rows.findIndex((r) => r.el === row);
      if (i !== -1) this.setActive(i, false);
    });
    popup.appendChild(list);
    this.list = list;

    const footer = el('div', 'sxms-mobile-footer');
    const ok = el('button', 'sxms-validate', s.validate);
    ok.type = 'button';
    ok.addEventListener('click', () => this.close({ restoreFocus: true }));
    footer.appendChild(ok);
    popup.appendChild(footer);

    popup.addEventListener('keydown', (e) => this.onPopupKeydown(e));
  }

  /** Reconstruit les lignes selon le filtre et le tri ; l'état coché est ensuite patché sur place. */
  private renderList(): void {
    const list = this.list;
    if (!list) return;
    list.replaceChildren();
    this.rows = [];

    let visible = this.entries.filter((e) => matches(e.label, this.query));
    if (this.sortSelectedFirst) {
      // Tri stable : les cochés remontent, l'ordre d'origine est conservé dans chaque groupe.
      visible = visible
        .map((e, i) => ({ e, i }))
        .sort((a, b) => Number(b.e.option.selected) - Number(a.e.option.selected) || a.i - b.i)
        .map((x) => x.e);
    }

    if (this.opts.selectAll && visible.length > 0) {
      const row = el('div', 'sxms-item sxms-item--all');
      row.id = `${this.id}-all`;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');
      row.tabIndex = -1;
      row.appendChild(el('span', 'sxms-label', this.strings.selectAll));
      row.addEventListener('click', () => this.toggleAll());
      list.appendChild(row);
      this.rows.push({ el: row, entry: null });
    }

    visible.forEach((entry, i) => {
      const row = el('div', 'sxms-item sxms-item--option');
      row.id = `${this.id}-opt-${i}`;
      row.setAttribute('role', 'option');
      row.tabIndex = -1;
      row.dataset['value'] = entry.value;
      const marker = el('span', 'sxms-marker');
      marker.appendChild(icon('check'));
      row.append(marker, el('span', 'sxms-label', entry.label));
      row.addEventListener('click', () => this.toggleEntry(entry));
      this.callbacks.renderOption?.(entry, row);
      list.appendChild(row);
      this.rows.push({ el: row, entry });
    });

    if (visible.length === 0) {
      list.appendChild(el('div', 'sxms-noresults', this.strings.noResults));
    }

    this.updateRows();
    // La ligne active suit la première option quand on retape ; la première
    // ligne quand on vient d'ouvrir, pour que ArrowDown parte d'un état visible.
    this.setActive(this.rows.length > 0 ? 0 : -1, false);
    this.scheduleReposition();
  }

  /** Patch des classes/aria sans reconstruire : c'est ce qui laisse jouer la transition. */
  private updateRows(): void {
    const limit = this.atLimit();
    const visible = this.rows.map((r) => r.entry).filter((e): e is Entry => e !== null && !e.disabled);
    const allOn = visible.length > 0 && visible.every((e) => e.option.selected);
    for (const { el: row, entry } of this.rows) {
      if (!entry) {
        row.classList.toggle('sxms-item--selected', allOn);
        row.setAttribute('aria-selected', String(allOn));
        continue;
      }
      const on = entry.option.selected;
      row.classList.toggle('sxms-item--selected', on);
      row.setAttribute('aria-selected', String(on));
      const blocked = entry.disabled || (limit && !on);
      row.classList.toggle('sxms-item--disabled', blocked);
      if (blocked) row.setAttribute('aria-disabled', 'true');
      else row.removeAttribute('aria-disabled');
    }
  }

  private setActive(index: number, scroll = true): void {
    const prev = this.rows[this.activeIndex];
    prev?.el.classList.remove('sxms-item--active');
    this.activeIndex = index;
    const row = this.rows[index];
    const owner = this.search ?? this.list;
    if (!row) {
      owner?.removeAttribute('aria-activedescendant');
      return;
    }
    row.el.classList.add('sxms-item--active');
    owner?.setAttribute('aria-activedescendant', row.el.id);
    if (scroll && typeof row.el.scrollIntoView === 'function') row.el.scrollIntoView({ block: 'nearest' });
  }

  private moveActive(delta: number): void {
    if (this.rows.length === 0) return;
    const next = this.activeIndex === -1
      ? (delta > 0 ? 0 : this.rows.length - 1)
      : Math.min(Math.max(this.activeIndex + delta, 0), this.rows.length - 1);
    this.setActive(next);
  }

  private onPopupKeydown(e: KeyboardEvent): void {
    const inSearch = e.target === this.search;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); this.moveActive(1); break;
      case 'ArrowUp': e.preventDefault(); this.moveActive(-1); break;
      case 'Home': if (!inSearch) { e.preventDefault(); this.setActive(0); } break;
      case 'End': if (!inSearch) { e.preventDefault(); this.setActive(this.rows.length - 1); } break;
      case ' ':
        // Dans la recherche, l'espace fait partie de la saisie.
        if (inSearch) return;
        e.preventDefault();
        this.activateRow();
        break;
      case 'Enter':
        e.preventDefault();
        this.activateRow();
        break;
      case 'Tab':
        // Le focus revient au champ ; le Tab natif poursuit depuis là.
        this.close({ restoreFocus: true });
        break;
      default:
        break;
    }
  }

  private activateRow(): void {
    const row = this.rows[this.activeIndex];
    if (!row) return;
    if (row.entry) this.toggleEntry(row.entry);
    else this.toggleAll();
  }

  private focusInitial(): void {
    // Mobile tactile : pas de clavier virtuel à l'ouverture, le focus va à la liste.
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const target = this.search && !(this.isMobile() && coarse) ? this.search : this.list;
    target?.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- Positionnement

  private scheduleReposition(): void {
    if (!this.opened || this.rafPending) return;
    // Drapeau séparé de l'identifiant : un rAF synchrone (tests) exécuterait le
    // callback avant l'affectation de rafId et bloquerait tout appel suivant.
    this.rafPending = true;
    this.rafId = requestAnimationFrame(() => {
      this.rafPending = false;
      this.reposition();
    });
  }

  private reposition(): void {
    const popup = this.popup;
    const anchor = this.field;
    if (!popup || !anchor || !this.opened) return;
    const mobile = this.isMobile();
    popup.classList.toggle('sxms-popup--mobile', mobile);
    if (mobile) {
      // Feuille plein écran : tout est posé par le CSS.
      popup.style.top = popup.style.left = popup.style.width = popup.style.maxHeight = '';
      popup.classList.remove('sxms-popup--top', 'sxms-popup--bottom');
      return;
    }
    const a = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const wanted = this.opts.width === 'anchor' ? a.width : this.opts.width;
    const width = Math.max(0, Math.min(wanted, vw - 2 * this.opts.viewportMargin));
    popup.style.width = `${width}px`;
    // On libère la contrainte de hauteur avant de mesurer, sinon un popover
    // déjà réduit ne reprend jamais sa taille quand la place revient.
    popup.style.maxHeight = '';
    const p = popup.getBoundingClientRect();
    const pos = computePosition(
      { top: a.top, left: a.left, width: a.width, height: a.height },
      { width: p.width || width, height: p.height },
      { width: vw, height: vh },
      { offset: this.opts.offset, margin: this.opts.viewportMargin, placement: this.opts.placement },
    );
    popup.style.top = `${pos.top}px`;
    popup.style.left = `${pos.left}px`;
    popup.style.maxHeight = pos.maxHeight !== undefined ? `${pos.maxHeight}px` : '';
    popup.classList.toggle('sxms-popup--top', pos.placement === 'top');
    popup.classList.toggle('sxms-popup--bottom', pos.placement === 'bottom');
  }

  // ---------------------------------------------------------------- Utilitaires

  private emit(type: string): void {
    const detail: MultiSelectEventDetail = { values: this.getValue(), instance: this };
    this.select.dispatchEvent(new CustomEvent<MultiSelectEventDetail>(type, { bubbles: true, detail }));
  }
}
