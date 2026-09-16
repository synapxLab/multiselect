import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiSelect } from '../src/MultiSelect';

const LABELS = [
  'Aides, Subventions, Business plan, Financement',
  'Communication, Networking, Prospection, Réseau',
  'Développement, Croissance, International',
  'Economie Sociale et Solidaire, Impact positif',
  'Entrepreneuriat féminin',
  'Franchise',
];

function mountSelect(multiple = true, values: string[] = []): HTMLSelectElement {
  const s = document.createElement('select');
  s.name = 'attentes';
  s.multiple = multiple;
  LABELS.forEach((label, i) => {
    const o = document.createElement('option');
    o.value = 'v' + i;
    o.textContent = label;
    if (values.includes(o.value)) o.selected = true;
    s.appendChild(o);
  });
  document.body.appendChild(s);
  return s;
}

function field(s: HTMLSelectElement): HTMLElement {
  return s.nextElementSibling as HTMLElement;
}

function popup(): HTMLElement | null {
  return document.querySelector('.sxms-popup');
}

function rows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.sxms-popup .sxms-item--option'));
}

function rowLabels(): string[] {
  return rows().map((r) => r.querySelector('.sxms-label')?.textContent ?? '');
}

function chips(s: HTMLSelectElement): string[] {
  return Array.from(field(s).querySelectorAll<HTMLElement>('.sxms-chip')).map((c) => c.dataset['value'] ?? '');
}

function search(): HTMLInputElement {
  return popup()!.querySelector('.sxms-search') as HTMLInputElement;
}

function type(text: string): void {
  const input = search();
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function key(target: Element, k: string): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  target.dispatchEvent(e);
  return e;
}

/**
 * jsdom ne fait pas de layout : getBoundingClientRect renvoie des zéros. On
 * simule des géométries pour vérifier que le calcul est bien branché au DOM.
 */
function mockRect(el: Element, r: { top: number; left: number; width: number; height: number }): void {
  el.getBoundingClientRect = () => ({ ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top, toJSON: () => r }) as DOMRect;
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('lang');
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('création', () => {
  it('select multiple : natif masqué, champ combobox, placeholder, registry', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s);
    expect(s.classList.contains('sxms-native')).toBe(true);
    expect(s.parentElement).toBe(document.body);
    const f = field(s);
    expect(f.classList.contains('sxms-field')).toBe(true);
    expect(f.classList.contains('sxms-field--multiple')).toBe(true);
    expect(f.getAttribute('role')).toBe('combobox');
    expect(f.getAttribute('aria-expanded')).toBe('false');
    expect(f.getAttribute('aria-haspopup')).toBe('listbox');
    expect(f.getAttribute('aria-controls')).toBe(f.id + '-popup');
    expect(f.querySelector('.sxms-placeholder')?.textContent).toBe('Click to select an item');
    expect(f.querySelector('.sxms-arrow svg')).not.toBeNull();
    expect(f.innerHTML).not.toContain('<i ');
    expect(ms.multiple).toBe(true);
    expect(MultiSelect.get(s)).toBe(ms);
    expect(ms.getValue()).toEqual([]);
    ms.destroy();
  });

  it('select simple : une seule valeur, pas de « Tout sélectionner », fermeture au choix', () => {
    const s = mountSelect(false);
    const ms = new MultiSelect(s);
    expect(ms.multiple).toBe(false);
    expect(field(s).classList.contains('sxms-field--single')).toBe(true);
    // Un select simple a toujours une valeur (la première option) : chip présente.
    expect(chips(s)).toEqual(['v0']);
    ms.open();
    expect(popup()!.querySelector('.sxms-item--all')).toBeNull();
    expect(popup()!.querySelector('.sxms-list')!.getAttribute('aria-multiselectable')).toBe('false');
    rows()[2]!.click();
    expect(ms.getValue()).toEqual(['v2']);
    expect(s.value).toBe('v2');
    expect(popup()).toBeNull();
    expect(chips(s)).toEqual(['v2']);
    ms.destroy();
  });

  it('lit les options : libellés, disabled, préselection', () => {
    const s = mountSelect(true, ['v1', 'v3']);
    (s.options[4] as HTMLOptionElement).disabled = true;
    const ms = new MultiSelect(s);
    expect(ms.getValue()).toEqual(['v1', 'v3']);
    expect(chips(s)).toEqual(['v1', 'v3']);
    expect(field(s).querySelector('.sxms-placeholder')).toBeNull();
    ms.open();
    expect(rowLabels()).toEqual(LABELS);
    const r = rows();
    expect(r[1]!.classList.contains('sxms-item--selected')).toBe(true);
    expect(r[1]!.getAttribute('aria-selected')).toBe('true');
    expect(r[0]!.getAttribute('aria-selected')).toBe('false');
    expect(r[4]!.getAttribute('aria-disabled')).toBe('true');
    r[4]!.click();
    expect(ms.getValue()).toEqual(['v1', 'v3']);
    ms.destroy();
  });

  it('locale fr depuis lang du document, strings partielles', () => {
    document.documentElement.lang = 'fr';
    const s = mountSelect();
    const ms = new MultiSelect(s, { strings: { search: 'Filtrer' } });
    expect(field(s).querySelector('.sxms-placeholder')?.textContent).toBe('Cliquez pour sélectionner un élément');
    ms.open();
    expect(search().placeholder).toBe('Filtrer');
    expect(popup()!.querySelector('.sxms-item--all .sxms-label')?.textContent).toBe('Tout sélectionner');
    ms.destroy();
    const s2 = mountSelect();
    const ms2 = new MultiSelect(s2, { locale: 'en', placeholder: 'Pick' });
    expect(field(s2).querySelector('.sxms-placeholder')?.textContent).toBe('Pick');
    ms2.destroy();
  });

  it('init() par sélecteur, idempotent, ignore les non-select', () => {
    mountSelect().dataset['multiselect'] = '';
    mountSelect(false).dataset['multiselect'] = '';
    const div = document.createElement('div');
    div.dataset['multiselect'] = '';
    document.body.appendChild(div);
    const list = MultiSelect.init('[data-multiselect]');
    expect(list.length).toBe(2);
    expect(MultiSelect.init('[data-multiselect]')).toEqual(list);
    list.forEach((m) => m.destroy());
  });

  it('refuse un élément non select et une double instance', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s);
    expect(() => new MultiSelect(s)).toThrow(/already attached/);
    expect(() => new MultiSelect(document.createElement('div') as unknown as HTMLSelectElement)).toThrow(/<select>/);
    ms.destroy();
  });
});

describe('sélection', () => {
  it('clic sur une ligne écrit option.selected, dispatch change/input natifs et multiselect:change', () => {
    const s = mountSelect();
    const onChange = vi.fn();
    const ms = new MultiSelect(s, { onChange });
    const order: string[] = [];
    s.addEventListener('multiselect:change', (e) => order.push('ms:' + (e as CustomEvent).detail.values.join(',')));
    s.addEventListener('input', () => order.push('input'));
    s.addEventListener('change', () => order.push('change'));
    const bubbled = vi.fn();
    document.body.addEventListener('change', bubbled);
    ms.open();
    rows()[0]!.click();
    expect((s.options[0] as HTMLOptionElement).selected).toBe(true);
    expect(order).toEqual(['ms:v0', 'input', 'change']);
    expect(bubbled).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['v0'], ms);
    expect(popup()).not.toBeNull(); // multiple : reste ouvert
    expect(rows()[0]!.classList.contains('sxms-item--selected')).toBe(true);
    expect(chips(s)).toEqual(['v0']);
    // Désélection
    rows()[0]!.click();
    expect((s.options[0] as HTMLOptionElement).selected).toBe(false);
    expect(chips(s)).toEqual([]);
    expect(field(s).querySelector('.sxms-placeholder')).not.toBeNull();
    ms.destroy();
  });

  it('la croix d\'une chip retire la valeur sans ouvrir', () => {
    const s = mountSelect(true, ['v0', 'v2']);
    const ms = new MultiSelect(s);
    const change = vi.fn();
    s.addEventListener('change', change);
    const rm = field(s).querySelector('.sxms-chip[data-value="v0"] .sxms-chip-remove') as HTMLButtonElement;
    expect(rm.type).toBe('button');
    expect(rm.getAttribute('aria-label')).toBe('Remove ' + LABELS[0]);
    rm.click();
    expect(ms.getValue()).toEqual(['v2']);
    expect(chips(s)).toEqual(['v2']);
    expect(change).toHaveBeenCalledTimes(1);
    expect(popup()).toBeNull();
    ms.destroy();
  });

  it('« Tout sélectionner » porte sur les lignes filtrées, et se dé-coche', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s);
    ms.open();
    type('eco'); // Economie…
    expect(rowLabels()).toEqual([LABELS[3]]);
    const all = popup()!.querySelector('.sxms-item--all') as HTMLElement;
    all.click();
    expect(ms.getValue()).toEqual(['v3']);
    expect(all.classList.contains('sxms-item--selected')).toBe(true);
    type('');
    expect(rows().length).toBe(6);
    (popup()!.querySelector('.sxms-item--all') as HTMLElement).click();
    expect(ms.getValue()).toEqual(['v0', 'v1', 'v2', 'v3', 'v4', 'v5']);
    (popup()!.querySelector('.sxms-item--all') as HTMLElement).click();
    expect(ms.getValue()).toEqual([]);
    ms.destroy();
  });

  it('selectAll:false retire la ligne', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s, { selectAll: false });
    ms.open();
    expect(popup()!.querySelector('.sxms-item--all')).toBeNull();
    ms.destroy();
  });

  it('maxItems bloque au-delà de la limite', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s, { maxItems: 2 });
    ms.open();
    rows()[0]!.click();
    rows()[1]!.click();
    rows()[2]!.click();
    expect(ms.getValue()).toEqual(['v0', 'v1']);
    expect(rows()[2]!.getAttribute('aria-disabled')).toBe('true');
    expect(rows()[1]!.getAttribute('aria-disabled')).toBeNull();
    (popup()!.querySelector('.sxms-item--all') as HTMLElement).click();
    expect(ms.getValue()).toEqual(['v0', 'v1']);
    ms.destroy();
  });

  it('closeOnSelect:true en multiple ferme après un choix', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s, { closeOnSelect: true });
    ms.open();
    rows()[0]!.click();
    expect(popup()).toBeNull();
    expect(ms.getValue()).toEqual(['v0']);
    ms.destroy();
  });
});

describe('recherche et tri', () => {
  it('filtre insensible à la casse et aux accents, « Aucun résultat »', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s);
    ms.open();
    type('DEVELOPPEMENT');
    expect(rowLabels()).toEqual([LABELS[2]]);
    type('féminin');
    expect(rowLabels()).toEqual([LABELS[4]]);
    type('feminin');
    expect(rowLabels()).toEqual([LABELS[4]]);
    type('zzz');
    expect(rows().length).toBe(0);
    expect(popup()!.querySelector('.sxms-item--all')).toBeNull();
    expect(popup()!.querySelector('.sxms-noresults')?.textContent).toBe('No results');
    type('');
    expect(rows().length).toBe(6);
    ms.destroy();
  });

  it('searchable:false : pas de barre, la liste prend le focus', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s, { searchable: false, showSort: false });
    ms.open();
    expect(popup()!.querySelector('.sxms-searchbar')).toBeNull();
    expect(document.activeElement).toBe(popup()!.querySelector('.sxms-list'));
    ms.destroy();
  });

  it('tri « sélectionnés d\'abord » : toggle, aria-pressed, ordre stable, état initial par option', () => {
    const s = mountSelect(true, ['v4', 'v1']);
    const ms = new MultiSelect(s);
    ms.open();
    const sort = popup()!.querySelector('.sxms-sort') as HTMLButtonElement;
    expect(sort.getAttribute('aria-pressed')).toBe('false');
    expect(rowLabels()).toEqual(LABELS);
    sort.click();
    expect(sort.getAttribute('aria-pressed')).toBe('true');
    expect(rowLabels()).toEqual([LABELS[1], LABELS[4], LABELS[0], LABELS[2], LABELS[3], LABELS[5]]);
    sort.click();
    expect(rowLabels()).toEqual(LABELS);
    ms.destroy();
    const s2 = mountSelect(true, ['v5']);
    const ms2 = new MultiSelect(s2, { sortSelectedFirst: true });
    ms2.open();
    expect(rowLabels()[0]).toBe(LABELS[5]);
    ms2.destroy();
    const s3 = mountSelect();
    const ms3 = new MultiSelect(s3, { showSort: false });
    ms3.open();
    expect(popup()!.querySelector('.sxms-sort')).toBeNull();
    ms3.destroy();
  });
});

describe('popover', () => {
  it('rendu dans body en position fixed hors de l\'arbre du select, un seul ouvert', () => {
    const box = document.createElement('div');
    box.style.overflow = 'hidden';
    document.body.appendChild(box);
    const s = document.createElement('select');
    s.multiple = true;
    box.appendChild(s);
    const ms = new MultiSelect(s);
    const s2 = mountSelect();
    const ms2 = new MultiSelect(s2);
    ms.open();
    const p = popup() as HTMLElement;
    expect(p.parentElement).toBe(document.body);
    expect(box.contains(p)).toBe(false);
    expect(p.style.position).toBe('fixed');
    expect(p.style.zIndex).toBe('1060');
    expect(p.id).toBe(field(s).getAttribute('aria-controls'));
    expect(field(s).getAttribute('aria-expanded')).toBe('true');
    expect(ms.isOpen).toBe(true);
    ms2.open();
    expect(document.querySelectorAll('.sxms-popup').length).toBe(1);
    expect(ms.isOpen).toBe(false);
    expect(ms2.isOpen).toBe(true);
    expect(field(s).getAttribute('aria-expanded')).toBe('false');
    ms.destroy();
    ms2.destroy();
  });

  it('container personnalisé et zIndex', () => {
    const dialog = document.createElement('div');
    document.body.appendChild(dialog);
    const s = mountSelect();
    const ms = new MultiSelect(s, { container: dialog, zIndex: 42 });
    ms.open();
    expect(popup()?.parentElement).toBe(dialog);
    expect(popup()?.style.zIndex).toBe('42');
    ms.destroy();
  });

  it('position calculée depuis les rects : largeur 400 bornée, bascule au-dessus près du bas', () => {
    vi.stubGlobal('innerWidth', 1000);
    vi.stubGlobal('innerHeight', 600);
    const s = mountSelect();
    const ms = new MultiSelect(s);
    mockRect(field(s), { top: 560, left: 700, width: 250, height: 40 });
    ms.open();
    const p = popup() as HTMLElement;
    expect(p.style.width).toBe('400px');
    mockRect(p, { top: 0, left: 0, width: 400, height: 300 });
    window.dispatchEvent(new Event('resize'));
    expect(p.style.top).toBe(`${560 - 4 - 300}px`);
    expect(p.style.left).toBe(`${1000 - 400 - 8}px`);
    expect(p.classList.contains('sxms-popup--top')).toBe(true);
    ms.destroy();
    const s2 = mountSelect();
    const ms2 = new MultiSelect(s2, { width: 'anchor' });
    mockRect(field(s2), { top: 10, left: 10, width: 250, height: 40 });
    ms2.open();
    expect(popup()!.style.width).toBe('250px');
    expect(popup()!.style.top).toBe('54px');
    expect(popup()!.classList.contains('sxms-popup--bottom')).toBe(true);
    ms2.destroy();
  });

  it('mobile (< 640) : feuille plein écran, en-tête fermer et pied valider', () => {
    vi.stubGlobal('innerWidth', 400);
    const s = mountSelect();
    const ms = new MultiSelect(s);
    ms.open();
    const p = popup() as HTMLElement;
    expect(p.classList.contains('sxms-popup--mobile')).toBe(true);
    expect(p.style.top).toBe('');
    (p.querySelector('.sxms-close') as HTMLButtonElement).click();
    expect(popup()).toBeNull();
    ms.open();
    rows()[1]!.click();
    (popup()!.querySelector('.sxms-validate') as HTMLButtonElement).click();
    expect(popup()).toBeNull();
    expect(ms.getValue()).toEqual(['v1']);
    ms.destroy();
  });

  it('pointerdown hors du popover ferme ; sur le champ non (le click bascule)', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s);
    ms.open();
    popup()!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(popup()).not.toBeNull();
    field(s).dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(popup()).not.toBeNull();
    field(s).click();
    expect(popup()).toBeNull();
    ms.open();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(popup()).toBeNull();
    ms.destroy();
  });

  it('open/close : événements et callbacks, clic sur le chevron ouvre', () => {
    const s = mountSelect();
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const ms = new MultiSelect(s, { onOpen, onClose });
    const events: string[] = [];
    s.addEventListener('multiselect:open', () => events.push('open'));
    s.addEventListener('multiselect:close', () => events.push('close'));
    (field(s).querySelector('.sxms-arrow') as HTMLElement).click();
    expect(popup()).not.toBeNull();
    expect(onOpen).toHaveBeenCalledTimes(1);
    ms.close();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['open', 'close']);
    ms.toggle();
    expect(ms.isOpen).toBe(true);
    ms.toggle();
    expect(ms.isOpen).toBe(false);
    ms.destroy();
  });

  it('le <label for> du select ouvre le composant', () => {
    const s = mountSelect();
    s.id = 'attentes';
    const label = document.createElement('label');
    label.htmlFor = 'attentes';
    label.id = 'lbl';
    label.textContent = 'Attentes';
    document.body.prepend(label);
    const ms = new MultiSelect(s);
    expect(field(s).getAttribute('aria-labelledby')).toBe('lbl');
    label.click();
    expect(popup()).not.toBeNull();
    ms.destroy();
  });

  it('renderOption est appelé sur chaque ligne', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s, { renderOption: (item, row) => { row.dataset['hook'] = item.value; } });
    ms.open();
    expect(rows().map((r) => r.dataset['hook'])).toEqual(['v0', 'v1', 'v2', 'v3', 'v4', 'v5']);
    ms.destroy();
  });
});

describe('clavier', () => {
  it('Enter / Space / ArrowDown sur le champ ouvrent, la recherche a le focus', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s);
    for (const k of ['Enter', ' ', 'ArrowDown']) {
      const e = key(field(s), k);
      expect(e.defaultPrevented).toBe(true);
      expect(popup()).not.toBeNull();
      expect(document.activeElement).toBe(search());
      ms.close();
    }
    ms.destroy();
  });

  it('Backspace sur le champ retire la dernière chip', () => {
    const s = mountSelect(true, ['v0', 'v3']);
    const ms = new MultiSelect(s);
    key(field(s), 'Backspace');
    expect(ms.getValue()).toEqual(['v0']);
    key(field(s), 'Backspace');
    expect(ms.getValue()).toEqual([]);
    key(field(s), 'Backspace');
    expect(ms.getValue()).toEqual([]);
    ms.destroy();
  });

  it('navigation : flèches, Home/End, aria-activedescendant, Enter bascule', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s);
    ms.open();
    const input = search();
    const all = popup()!.querySelector('.sxms-item--all') as HTMLElement;
    expect(input.getAttribute('aria-activedescendant')).toBe(all.id);
    key(input, 'ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe(rows()[0]!.id);
    expect(rows()[0]!.classList.contains('sxms-item--active')).toBe(true);
    key(input, 'ArrowDown');
    key(input, 'Enter');
    expect(ms.getValue()).toEqual(['v1']);
    expect(popup()).not.toBeNull();
    key(input, 'ArrowUp');
    key(input, 'ArrowUp');
    expect(input.getAttribute('aria-activedescendant')).toBe(all.id);
    key(input, 'ArrowUp');
    expect(input.getAttribute('aria-activedescendant')).toBe(all.id);
    // Espace dans la recherche : saisie, pas de bascule.
    key(input, ' ');
    expect(ms.getValue()).toEqual(['v1']);
    // Home/End hors de la recherche.
    const list = popup()!.querySelector('.sxms-list') as HTMLElement;
    key(list, 'End');
    expect(input.getAttribute('aria-activedescendant')).toBe(rows()[5]!.id);
    key(list, ' ');
    expect(ms.getValue()).toEqual(['v1', 'v5']);
    key(list, 'Home');
    key(list, 'Enter'); // « Tout sélectionner »
    expect(ms.getValue()).toEqual(['v0', 'v1', 'v2', 'v3', 'v4', 'v5']);
    ms.destroy();
  });

  it('le filtre remet la ligne active sur la première ligne visible', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s, { selectAll: false });
    ms.open();
    type('fran');
    expect(search().getAttribute('aria-activedescendant')).toBe(rows()[0]!.id);
    key(search(), 'Enter');
    expect(ms.getValue()).toEqual(['v5']);
    ms.destroy();
  });

  it('Escape ferme et rend le focus au champ ; Tab ferme aussi', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s);
    ms.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(popup()).toBeNull();
    expect(document.activeElement).toBe(field(s));
    ms.open();
    key(search(), 'Tab');
    expect(popup()).toBeNull();
    expect(document.activeElement).toBe(field(s));
    ms.destroy();
  });

  it('mode simple au clavier : Enter choisit et ferme', () => {
    const s = mountSelect(false);
    const ms = new MultiSelect(s);
    key(field(s), 'ArrowDown');
    key(search(), 'ArrowDown');
    key(search(), 'ArrowDown');
    key(search(), 'Enter');
    expect(ms.getValue()).toEqual(['v2']);
    expect(popup()).toBeNull();
    expect(document.activeElement).toBe(field(s));
    ms.destroy();
  });
});

describe('API', () => {
  it('setValue / getValue écrivent le select et émettent change ; silent n\'émet rien', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s);
    const change = vi.fn();
    s.addEventListener('change', change);
    ms.setValue(['v2', 'v4', 'inconnu']);
    expect(ms.getValue()).toEqual(['v2', 'v4']);
    expect(Array.from(s.selectedOptions).map((o) => o.value)).toEqual(['v2', 'v4']);
    expect(chips(s)).toEqual(['v2', 'v4']);
    expect(change).toHaveBeenCalledTimes(1);
    ms.setValue([], { silent: true });
    expect(ms.getValue()).toEqual([]);
    expect(change).toHaveBeenCalledTimes(1);
    ms.destroy();
    const s2 = mountSelect(false);
    const ms2 = new MultiSelect(s2);
    ms2.setValue(['v3', 'v4']);
    expect(ms2.getValue()).toEqual(['v3']); // simple : une seule valeur
    ms2.destroy();
  });

  it('setValue pendant l\'ouverture patche les lignes sans les reconstruire', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s);
    ms.open();
    const before = rows()[1]!;
    ms.setValue(['v1']);
    expect(rows()[1]).toBe(before);
    expect(before.classList.contains('sxms-item--selected')).toBe(true);
    ms.destroy();
  });

  it('refresh relit les options modifiées dans le DOM', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s);
    (s.options[2] as HTMLOptionElement).selected = true;
    (s.options[2] as HTMLOptionElement).textContent = 'Modifié';
    const o = document.createElement('option');
    o.value = 'v9';
    o.textContent = 'Nouveau';
    s.appendChild(o);
    expect(chips(s)).toEqual([]);
    ms.refresh();
    expect(chips(s)).toEqual(['v2']);
    expect(field(s).querySelector('.sxms-chip-label')?.textContent).toBe('Modifié');
    ms.open();
    expect(rowLabels().length).toBe(7);
    ms.refresh();
    expect(rowLabels()[6]).toBe('Nouveau');
    ms.destroy();
  });

  it('setOptions réécrit les <option>', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s);
    ms.setOptions([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Bêta', selected: true },
      { value: 'c', label: 'Gamma', disabled: true },
    ]);
    expect(s.options.length).toBe(3);
    expect((s.options[2] as HTMLOptionElement).disabled).toBe(true);
    expect(ms.getValue()).toEqual(['b']);
    expect(chips(s)).toEqual(['b']);
    ms.open();
    expect(rowLabels()).toEqual(['Alpha', 'Bêta', 'Gamma']);
    ms.destroy();
  });

  it('disable ferme et bloque, enable rouvre ; select disabled à la création', () => {
    const s = mountSelect();
    const ms = new MultiSelect(s);
    ms.open();
    ms.disable();
    expect(popup()).toBeNull();
    expect(ms.isDisabled).toBe(true);
    expect(s.disabled).toBe(true);
    expect(field(s).getAttribute('aria-disabled')).toBe('true');
    expect(field(s).getAttribute('tabindex')).toBe('-1');
    ms.open();
    expect(popup()).toBeNull();
    key(field(s), 'Enter');
    expect(popup()).toBeNull();
    ms.enable();
    expect(s.disabled).toBe(false);
    expect(field(s).getAttribute('tabindex')).toBe('0');
    ms.open();
    expect(popup()).not.toBeNull();
    ms.destroy();
    const s2 = mountSelect(true, ['v0']);
    s2.disabled = true;
    const ms2 = new MultiSelect(s2);
    expect(ms2.isDisabled).toBe(true);
    expect(field(s2).querySelector('.sxms-chip-remove')).toBeNull();
    ms2.destroy();
  });
});

describe('destroy', () => {
  it('retire le champ et les écouteurs, rend le select visible, réinstanciable', () => {
    const form = document.createElement('form');
    document.body.appendChild(form);
    const s = document.createElement('select');
    s.multiple = true;
    s.id = 'x';
    const label = document.createElement('label');
    label.htmlFor = 'x';
    form.append(label, s);
    const ms = new MultiSelect(s);
    ms.open();
    const addSpy = vi.spyOn(document, 'addEventListener');
    ms.destroy();
    expect(popup()).toBeNull();
    expect(s.classList.contains('sxms-native')).toBe(false);
    expect(s.getAttribute('aria-hidden')).toBeNull();
    expect(form.querySelector('.sxms-field')).toBeNull();
    expect(s.parentElement).toBe(form);
    expect(MultiSelect.get(s)).toBeUndefined();
    label.click();
    expect(popup()).toBeNull();
    expect(addSpy).not.toHaveBeenCalled();
    ms.destroy(); // idempotent
    const ms2 = new MultiSelect(s);
    ms2.destroy();
  });
});
