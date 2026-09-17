# @synapxlab/multiselect

> Sélecteur multiple à chips, recherche et popover — TypeScript vanilla, zéro dépendance, amélioration progressive d'un `<select>` natif.

Le composant s'attache à un `<select multiple>` existant (ou à un `<select>` simple). L'élément natif reste dans le DOM, masqué, et continue de porter la valeur : le formulaire le poste tel quel, sans JavaScript côté serveur. Chaque action du composant — clic sur une option, `setValue`, bascule au clavier — écrit `option.selected` et déclenche `change` sur le select.

[English version](README.md)

---

## Pourquoi pas select2 ?

- Pas de jQuery.
- Le popover est rendu dans `document.body` en `position: fixed` : il n'est jamais coupé par un conteneur `overflow: hidden`, un tableau scrollable ou une modale avec `transform`.
- Clavier et ARIA complets (`combobox`, `listbox`, `option`, `aria-selected`, `aria-activedescendant`).
- Thème sombre par custom properties CSS, sans reconstruire un thème jQuery UI.

---

## L'effet de sélection

La case à cocher d'une option est invisible tant qu'elle n'est pas choisie. Au clic, la ligne prend la couleur primaire en bordure, la case apparaît en fondu et le libellé glisse pour lui laisser la place — le tout animé en `.3s`. Inspiré du composant de formulaire de la plateforme inwink.

---

## Fonctionnalités

- S'attache à un `<select multiple>` (chips, recherche, « Tout sélectionner ») ou à un `<select>` simple (valeur unique, fermeture au choix)
- Barre de recherche, filtrage en direct, insensible à la casse et aux accents
- « Tout sélectionner » limité aux lignes actuellement filtrées
- Bascule de tri facultative : options sélectionnées en premier
- Chips dans le champ fermé, chacune retirable par son propre bouton, sans ouvrir le popover
- Popover dans `document.body`, `position: fixed`, repositionné au scroll et au redimensionnement, recalé dans le viewport
- Un seul popover ouvert à la fois ; fermeture au clic extérieur, `Échap`, ou bouton « Valider » en mobile
- Mise en page mobile (seuil configurable) : le popover devient une feuille plein écran avec en-tête et pied
- Pilotage clavier complet et rôles ARIA
- Thème sombre par custom properties CSS, `prefers-color-scheme`, `[data-bs-theme="dark"]` et `[data-theme="dark"]`
- Événements natifs `change` et `input` sur le select, plus des événements `multiselect:*` qui remontent
- Builds ESM + UMD, types TypeScript, aucune dépendance à l'exécution

---

## Installation

```bash
npm install @synapxlab/multiselect
```

---

## Démarrage rapide

### ESM

```ts
import { MultiSelect } from '@synapxlab/multiselect';
import '@synapxlab/multiselect/style';

const ms = new MultiSelect(document.querySelector('select[name=attentes]'), {
  searchable: true,
  onChange(values) {
    console.log('sélection', values);
  },
});
```

### `<script>` (UMD, sans bundler)

```html
<link rel="stylesheet" href="node_modules/@synapxlab/multiselect/dist/style.css" />
<script src="node_modules/@synapxlab/multiselect/dist/multiselect.umd.cjs"></script>
<script>
  const { MultiSelect } = window.SynapxMultiSelect;
  MultiSelect.init('select[data-multiselect]');
</script>
```

### `<select>` simple

Un `<select>` sans `multiple` reçoit le même habillage, en dropdown à valeur unique : pas de chips, pas de « Tout sélectionner », fermeture au choix par défaut.

```html
<select name="country">
  <option value="fr">France</option>
  <option value="be">Belgique</option>
</select>
```

```ts
new MultiSelect(document.querySelector('select[name=country]'));
```

---

## Options

| Option | Type | Défaut | Description |
|---|---|---|---|
| `placeholder` | `string` | `strings.placeholder` | Texte affiché quand le champ est vide |
| `searchable` | `boolean` | `true` | `false` retire la barre de recherche |
| `selectAll` | `boolean` | `true` | Ligne « Tout sélectionner » (multiple seulement) |
| `showSort` | `boolean` | `true` | Bouton de tri à côté de la barre de recherche |
| `sortSelectedFirst` | `boolean` | `false` | État initial de la bascule de tri |
| `closeOnSelect` | `boolean` | `true` en simple, `false` en multiple | Ferme le popover juste après un choix |
| `maxItems` | `number` | — | Limite de sélection (multiple seulement) |
| `container` | `HTMLElement` | `document.body` | Parent du popover. Passer un `<dialog>` ouvert pour que le popover vive dans le top-layer |
| `zIndex` | `number` | `1060` | z-index du popover |
| `width` | `number \| 'anchor'` | `400` | Largeur du popover en px, ou `'anchor'` pour reprendre la largeur du champ. Recalée dans le viewport |
| `maxHeight` | `number` | `300` | Hauteur max de la liste d'options (px) |
| `offset` | `number` | — | Espace entre le champ et le popover (px) |
| `viewportMargin` | `number` | — | Distance minimale aux bords du viewport (px) |
| `placement` | `'auto' \| 'top' \| 'bottom'` | `'auto'` | Côté préféré |
| `mobileBreakpoint` | `number` | `640` | Largeur en dessous de laquelle le popover devient une feuille plein écran |
| `strings` | `Partial<MultiSelectStrings>` | défaut de la locale | Libellés, voir le tableau ci-dessous |
| `locale` | `'fr' \| 'en'` | langue du document si français, sinon anglais | Choisit le jeu de libellés intégré |
| `renderOption` | `(item, el) => void` | — | Hook appelé sur chaque ligne d'option avant son insertion |
| `onChange` | `(values: string[], instance) => void` | — | Sélection modifiée |
| `onOpen` / `onClose` | `(instance) => void` | — | Popover ouvert / fermé |

### Libellés

Locales intégrées : `en` et `fr`. Chaque clé se surcharge par `strings`.

| Clé | `en` | `fr` |
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

## Méthodes

| Méthode | Description |
|---|---|
| `MultiSelect.init(sélecteur, options)` | Crée une instance par `<select>` correspondant (idempotent), les renvoie |
| `MultiSelect.get(select)` | Instance attachée à un select |
| `getValue(): string[]` | Valeur courante |
| `setValue(values: string[])` | Écrit le select natif, déclenche `change` |
| `open()` / `close()` / `toggle()` / `isOpen` | Pilotage du popover |
| `refresh()` | Relit les éléments `<option>` depuis le DOM |
| `setOptions(items)` | Réécrit les `<option>` depuis `{ value, label, disabled?, selected? }[]` |
| `disable()` / `enable()` | Désactive / réactive le champ |
| `destroy()` | Retire tout élément et écouteur, rend le select natif visible |

---

## Événements

Les événements personnalisés remontent sur le select natif, chacun avec `detail: { values, instance }`.

| Événement | Quand |
|---|---|
| `multiselect:open` | Popover ouvert |
| `multiselect:close` | Popover fermé |
| `multiselect:change` | Sélection modifiée |

Chaque changement déclenche aussi les événements natifs `change` et `input` sur le select : formulaires, bibliothèques de validation et frameworks réagissent comme avec le contrôle natif.

```ts
select.addEventListener('multiselect:change', (e) => {
  console.log(e.detail.values, e.detail.instance);
});
```

---

## Style

Toutes les couleurs et mesures passent par des custom properties, préfixe `sxms-` :

```css
.sxms-field,
.sxms-popup {
  --sxms-bg: #f9f9f9;               /* fond du champ */
  --sxms-border: #dadada;
  --sxms-border-hover: #7c8592;
  --sxms-text: #212e44;
  --sxms-muted: #7c8592;            /* placeholder, chevron, icônes */
  --sxms-chip-bg: #f1f3f6;
  --sxms-chip-text: #7c8592;
  --sxms-primary: #e94c1e;          /* bordure et texte de la ligne cochée, marqueur */
  --sxms-primary-text: #ffffff;     /* coche sur le marqueur */
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

La palette sombre s'applique sous `@media (prefers-color-scheme: dark)`, et sous `[data-bs-theme="dark"]` ou `[data-theme="dark"]` sur n'importe quel ancêtre. Aucun `!important` : surchargez les variables dans votre feuille de style. Toutes les icônes (chevron, croix, coche, loupe, tri) sont des SVG en ligne construits par le DOM, pas une police d'icônes : elles héritent de `currentColor` sans balisage supplémentaire.

Préfixe de classes `sxms-`.

### Select natif, même habillage

Pour un `<select>` qui n'a pas besoin du composant, la classe `sxms-select` lui donne le même champ, le même chevron et les mêmes tokens, sans JavaScript. Pratique pour garder un formulaire homogène.

```html
<select name="pays" class="sxms-select">
  <option value="fr">France</option>
</select>
```

---

## Accessibilité

- Champ : `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls`, `aria-disabled`. Le clic sur le `<label for="...">` du select natif continue d'ouvrir le composant.
- Liste : `role="listbox"`, `aria-multiselectable`, lignes `role="option"` avec `aria-selected` et `aria-disabled`, `aria-activedescendant` suit la ligne active depuis le champ de recherche.
- Clavier sur le champ : `Entrée` / `Espace` / `Flèche bas` ouvrent le popover, `Retour arrière` retire la dernière chip.
- Clavier dans le popover : `Flèche haut` / `Flèche bas` déplacent, `Entrée` / `Espace` basculent, `Échap` ferme, `Tab` ferme et rend le focus, `Origine` / `Fin` sautent aux extrémités de la liste.
- Le champ de recherche reçoit le focus à l'ouverture, sauf au tactile, où c'est la liste qui le reçoit pour ne pas ouvrir le clavier virtuel.
- Le focus revient au champ à la fermeture. Un seul popover est ouvert à la fois.

---

## Compatibilité navigateurs

Nécessite ES2020, le sélecteur CSS `:has()` et la propriété CSS `translate` : Chrome/Edge 105+, Safari 15.4+, Firefox 121+.

---

## Licence

MIT — © synapxLab.
