# @synapxlab/multiselect — spécification v0.1

Composant de sélection multiple **vanilla TypeScript, zéro dépendance**, qui remplace select2 dans
nos projets. Modèle observé le 16/09/2026 sur le formulaire d'inscription GO Entrepreneurs
(plateforme inwink, champ « Quelles sont vos attentes de l'événement ? »). Captures dans
`docs/reference/` : `open.png` (popover vide), `selected-open.png` (popover avec sélection),
`selected-closed.png` (champ fermé rempli de chips).

Le gabarit technique (Vite lib ESM+UMD, vitest/jsdom, SCSS, préfixe de classes, thème sombre par
custom properties, popup `position: fixed` dans body avec `computePosition`) est celui de
`/data/vhosts/@synapxlab/colorpicker` — même auteur, même licence MIT : **imiter, ne pas réinventer**.

## 1. Principe : amélioration progressive d'un `<select>` natif

Le composant s'attache à un `<select>` existant (`multiple` ou non). Le select natif reste dans le
DOM, masqué (`hidden`/`display:none` via classe), et **porte la valeur** : le formulaire le poste
tel quel, sans JS côté serveur. Toute sélection écrit `option.selected` puis dispatch `change`
(bubbles) et `input` sur le select. Les options viennent des `<option>` (valeur, libellé,
`disabled`, `selected`) ; `refresh()` relit le DOM ; `setOptions(items)` réécrit les `<option>`.

Un `<select>` sans `multiple` donne un **dropdown simple** avec le même habillage (une seule
valeur, fermeture au choix, pas de « Tout sélectionner ») — c'est ce que fait la référence pour
ses listes simples.

## 2. Anatomie observée (référence inwink) et transposition

### 2.1 Champ fermé

```html
<div tabindex="0" class="dropdownmultiple-items items pseudoinput clickable"
     role="combobox" aria-expanded="false" aria-haspopup="listbox">
  <div class="items-container">
    <!-- vide : -->
    <div class="remark">Cliquez pour sélectionner un élément</div>
    <!-- rempli : une chip par valeur -->
    <div data-selected-item="aides" class="item">
      <span>Aides, Subventions, Business plan, Financement</span>
      <button type="button" class="deletebtn" tabindex="-1" title="Supprimer"><i class="inwink-dialog-cancel"></i></button>
    </div>
  </div>
  <span class="arrow"><i class="inwink-chevron-down"></i></span>
</div>
```

CSS observé (à transposer avec le préfixe `sxms-` et des `--sxms-*`) :

```css
.dropdownmultiple-items.items.pseudoinput { display:flex; flex-flow:wrap; align-items:center; gap:.5rem; padding:4px .5em;
  background:#f9f9f9; border:1px solid #dadada; border-radius:4px; transition:all .3s ease; }
.dropdownmultiple-items.items.pseudoinput.clickable:hover { background:#fafafb; border-color:#7c8592; }
.dropdownmultiple-items.items.pseudoinput .item { display:flex; align-items:center; gap:.5rem; min-height:30px; max-width:100%;
  padding:4px .5em; border-radius:4px; background:#f1f3f6; color:#7c8592; font:600 1rem var(--basefont); }
.dropdownmultiple-items.items.pseudoinput .item button.deletebtn { width:20px; height:20px; padding:0; border-radius:50%;
  background:transparent; border-color:transparent; transition:all .3s ease; }
.dropdownmultiple-items.items.pseudoinput .remark { color:#7c8592; font:500 1rem; font-style:italic; opacity:.4; }
.dropdownmultiple-items.items.pseudoinput .arrow { margin-left:auto; display:flex; align-items:center; justify-content:center;
  height:20px; aspect-ratio:1/1; border-radius:4px; background:#f1f3f6; color:#7c8592; }
```

Dans la capture `selected-closed.png` les chips sont **blanches sur fond gris clair** (surcharge du
site : `.dropdownmultiple-items { background:#f6f6f6; border:none }`). Notre défaut : fond de champ
`#f9f9f9` bordé, chips `#f1f3f6`, tout surchargeable.

Transposition :

```html
<div class="sxms-field" role="combobox" tabindex="0" aria-expanded="false" aria-haspopup="listbox" aria-controls="sxms-popup-1">
  <div class="sxms-chips">
    <span class="sxms-placeholder">Cliquez pour sélectionner un élément</span>
    <!-- ou -->
    <span class="sxms-chip" data-value="aides"><span class="sxms-chip-label">…</span>
      <button type="button" class="sxms-chip-remove" tabindex="-1" aria-label="Supprimer Aides…">✕(svg)</button></span>
  </div>
  <span class="sxms-arrow">(svg chevron)</span>
</div>
```

### 2.2 Popover

```html
<div class="popover-shell with-overlay popover-dropdownmultiple">
  <div class="popover-overlay"></div>
  <div class="popover-content" style="left:555px; top:515px; width:400px">
    <div class="popover-dropdownmultiple-wrapper">
      <div class="dropdownmultiple-mobileheader"><button class="dropdownmultiple-closebtn" aria-label="Fermer">✕</button></div>
      <div class="searchbar-wrapper-component"><div class="entityfield-searchbar-component">
        <div class="searchbar-box"><input class="searchbar-input" type="search" placeholder="Recherche..."><i class="inwink-search"></i></div>
        <i class="inwink-importexport"></i>   <!-- bouton de tri -->
      </div></div>
      <div class="popover-dropdownmultiple-content" role="listbox" aria-multiselectable="true">
        <div data-action="selectall" tabindex="0" class="item clickable"><div class="marker"></div><span>Tout sélectionner</span></div>
        <div data-key="aides" tabindex="0" role="option" aria-selected="false" class="item clickable [selected]">
          <div class="pseudoinput"><div class="marker"><i class="inwink-checked"></i></div><div class="label">Aides, …</div></div>
        </div>
        …
        <div class="noresults">Aucun résultat</div>
      </div>
      <div class="dropdownmultiple-mobilefooter"><button class="dropdownmultiple-validatebtn">Valider</button></div>
    </div>
  </div>
</div>
```

CSS observé :

```css
.popover-content { position:absolute; background:#fff; box-shadow:1px 1px 12px rgba(0,0,0,.15); border-radius:4px; overflow:hidden; }
.entityfield-searchbar-component { display:flex; align-items:center; gap:.5rem; padding:10px; }
.searchbar-box { display:flex; align-items:center; gap:.5rem; width:100%; padding:.5rem; border:1px solid #7c8592; border-radius:4px; background:#fafafb; }
.searchbar-box .searchbar-input { border:none; background:#fafafb; width:100%; }  /* :focus-visible { outline:none } */
.searchbar-box .inwink-search { order:-1; color:#7c8592; }
.entityfield-searchbar-component i { font-size:18px; color:#7c8592; cursor:pointer; }
.popover-dropdownmultiple-content { display:flex; flex-direction:column; gap:.5rem; width:400px; max-height:300px; overflow:auto; padding:10px; }
.popover-dropdownmultiple-content .item { display:flex; align-items:flex-start; gap:.5rem; width:100%; padding:.5rem .75rem;
  background:#fafafb; border:2px solid transparent; border-radius:4px; color:#212e44; font:500 1rem; transition:all .3s ease; }
.popover-dropdownmultiple-content .item .pseudoinput { display:flex; align-items:center; gap:.5rem; }
.popover-dropdownmultiple-content .item .marker { width:20px; height:20px; display:flex; align-items:center; justify-content:center;
  border:2px solid #212e44; border-radius:4px; background:#e94c1e; color:#fff; opacity:0; transition:all .3s ease; }
.popover-dropdownmultiple-content .item:has(.marker) .label { translate:-2rem; transition:all .3s ease; }   /* case invisible, libellé décalé */
.popover-dropdownmultiple-content .item.selected { border-color:#e94c1e; color:#e94c1e; }
.popover-dropdownmultiple-content .item.selected .marker { opacity:1; background:#e94c1e; border-color:#e94c1e; }
.popover-dropdownmultiple-content .item.selected:has(.marker) .label { translate:0; }                      /* la case apparaît, le libellé glisse */
.popover-dropdownmultiple-content .item.clickable:hover, .item.clickable:focus { background:#f1f3f6; }
.popover-dropdownmultiple-content .item.clickable:hover:not(.selected) { border-color:#bcbeca; }
.popover-dropdownmultiple-content .noresults { display:flex; justify-content:center; margin:auto; color:#7c8592; }
.dropdownmultiple-mobileheader, .dropdownmultiple-mobilefooter { display:none; }   /* affichés en mobile */
```

**L'effet « sympa »** est précisément là : la case à cocher est invisible et le libellé est décalé
de `-2rem` ; au clic, la ligne prend une bordure de couleur primaire, la case apparaît en fondu et
le libellé glisse vers la droite pour lui laisser la place. Tout en transition `.3s`. À reproduire
tel quel (`translate`, pas `transform`, et `:has()` acceptable — cible es2020/navigateurs 2023+).

Comportements observés :
- Clic sur le champ (n'importe où, y compris le chevron) → ouvre. Clic sur la croix d'une chip →
  retire la valeur sans ouvrir.
- Recherche : filtre les lignes en direct (insensible casse/accents), « Tout sélectionner » porte
  sur les lignes visibles ; aucune ligne → « Aucun résultat ».
- Bouton de tri (icône ↕ à droite de la recherche) : sur la référence, le comportement exact n'a
  pas pu être établi (le clic ferme le popover en headless). **Décision** : c'est un toggle
  « sélectionnés en premier » (option `sortSelectedFirst`, bouton masquable par `showSort:false`).
- Le popover reste ouvert après chaque clic en mode multiple ; fermeture par clic extérieur,
  `Escape`, ou bouton « Valider » (mobile). En mode simple, fermeture au choix.
- Mobile (largeur < 640 px) : le popover devient une feuille plein écran avec en-tête (bouton
  fermer) et pied (« Valider »).

## 3. API

```ts
import { MultiSelect } from '@synapxlab/multiselect';
import '@synapxlab/multiselect/style';

const ms = new MultiSelect(document.querySelector('select[name=attentes]'), {
  placeholder?: string,          // défaut : strings.placeholder
  searchable?: boolean,          // défaut true ; false = pas de barre de recherche
  selectAll?: boolean,           // défaut true (multiple seulement)
  showSort?: boolean,            // défaut true
  sortSelectedFirst?: boolean,   // défaut false (état initial du toggle)
  closeOnSelect?: boolean,       // défaut : true en simple, false en multiple
  maxItems?: number,             // limite de sélection (multiple)
  container?: HTMLElement,       // parent du popover, défaut document.body (passer un <dialog> ouvert)
  zIndex?: number,               // défaut 1060
  width?: number | 'anchor',     // largeur du popover : px, ou 'anchor' = largeur du champ ; défaut 400 borné au viewport
  maxHeight?: number,            // hauteur max de la liste, défaut 300
  offset?: number, viewportMargin?: number, placement?: 'auto'|'top'|'bottom',
  mobileBreakpoint?: number,     // défaut 640
  strings?: Partial<Strings>,    // ou locale 'fr' | 'en'
  locale?: 'fr' | 'en',          // défaut : lang du document si fr, sinon en
  renderOption?: (item, el) => void,  // hook facultatif sur la ligne
  onChange?: (values: string[], instance) => void,
  onOpen?, onClose?,
});

MultiSelect.init('select[data-multiselect]', opts): MultiSelect[];   // idempotent
MultiSelect.get(select): MultiSelect | undefined;
ms.getValue(): string[];         ms.setValue(values: string[]): void;   // écrit le select, dispatch change
ms.open(); ms.close(); ms.toggle(); ms.isOpen;
ms.refresh();                    // relit les <option>
ms.setOptions([{ value, label, disabled?, selected? }]);
ms.disable(); ms.enable();
ms.destroy();                    // rend le select natif visible, retire tout
```

Événements custom bubbling sur le select : `multiselect:open`, `multiselect:close`,
`multiselect:change` (`detail: { values, instance }`). Plus les natifs `change` et `input`.

## 4. Accessibilité et clavier

- Champ : `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls`,
  `aria-disabled`. Le `<label for=select>` doit continuer à fonctionner : au clic sur le label
  du select natif, ouvrir le composant (écouter `click` sur les labels associés).
- Liste : `role="listbox"`, `aria-multiselectable`, lignes `role="option"` + `aria-selected`,
  `aria-disabled`. `aria-activedescendant` sur le champ de recherche pour la ligne active.
- Clavier sur le champ : `Enter`/`Space`/`ArrowDown` ouvrent ; `Backspace` retire la dernière
  chip. Dans le popover : `ArrowUp/Down` déplacent, `Enter`/`Space` basculent, `Escape` ferme,
  `Tab` ferme et rend le focus, `Home/End`. La recherche a le focus à l'ouverture (pas en mobile
  tactile : ne pas ouvrir le clavier virtuel, focus sur la liste).
- Focus rendu au champ à la fermeture.
- Un seul popover ouvert à la fois. Repositionnement sur scroll (capture, passive) et resize ;
  `computePosition` porté depuis colorpicker (fonction pure, testée).

## 5. Style

Fichier `src/MultiSelect.scss`, préfixe `sxms-`, aucun `!important`, tout en custom properties :
`--sxms-bg`, `--sxms-border`, `--sxms-text`, `--sxms-muted`, `--sxms-chip-bg`, `--sxms-chip-text`,
`--sxms-primary`, `--sxms-primary-text`, `--sxms-item-bg`, `--sxms-item-hover`, `--sxms-radius`,
`--sxms-shadow`, `--sxms-font`, `--sxms-transition`. Thème sombre par `prefers-color-scheme`,
`[data-bs-theme="dark"]` et `[data-theme="dark"]`, même mécanique que colorpicker.
Icônes : SVG inline construits par le DOM (chevron, croix, coche, loupe, tri) — aucune police
d'icônes, aucun `innerHTML`.

## 6. Preuves attendues

- `npm run typecheck`, `npm test` (vitest/jsdom) verts, `npm run build:lib` produit `dist/`.
- Tests persistants dans `tests/` : création sur select multiple et simple, lecture des
  options, chips, suppression par croix, sélection/désélection écrit `option.selected` et
  dispatch `change`, `select all` sur lignes filtrées, filtre insensible aux accents, tri
  « sélectionnés d'abord », clavier (ouverture, navigation, Escape, Backspace), un seul ouvert,
  `setValue`/`getValue`/`refresh`/`setOptions`/`destroy`, `computePosition`, `disabled`.
- Démo `index.html` + `src/demo.ts` : cas multiple avec 15 options (celles de la référence),
  simple, préselection, désactivé, dans un conteneur `overflow:hidden`, dans une fausse modale,
  bascule thème sombre, log des événements.
- Capture d'écran de la démo via `/data/Microservices/playwright/pw.js` sur le serveur `vite`
  (port de dev : joindre en `http://127.0.0.1:<port>`), états fermé / ouvert / sélection, jointes
  au compte rendu.
