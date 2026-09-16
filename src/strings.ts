/** Libellés affichés par le composant. */
export interface MultiSelectStrings {
  /** Texte du champ vide. */
  placeholder: string;
  /** Placeholder de la barre de recherche. */
  search: string;
  /** Ligne « Tout sélectionner » (mode multiple). */
  selectAll: string;
  /** Message quand le filtre ne laisse aucune ligne. */
  noResults: string;
  /** Libellé aria de la croix d'une chip (préfixe, suivi du libellé de l'option). */
  remove: string;
  /** Libellé aria du bouton de tri « sélectionnés d'abord ». */
  sortSelectedFirst: string;
  /** Bouton fermer de l'en-tête mobile. */
  close: string;
  /** Bouton du pied mobile. */
  validate: string;
  /** Libellé aria de la liste. */
  listLabel: string;
}

export const locales: Readonly<Record<'en' | 'fr', MultiSelectStrings>> = {
  en: {
    placeholder: 'Click to select an item',
    search: 'Search...',
    selectAll: 'Select all',
    noResults: 'No results',
    remove: 'Remove',
    sortSelectedFirst: 'Selected first',
    close: 'Close',
    validate: 'Done',
    listLabel: 'Options',
  },
  fr: {
    placeholder: 'Cliquez pour sélectionner un élément',
    search: 'Recherche...',
    selectAll: 'Tout sélectionner',
    noResults: 'Aucun résultat',
    remove: 'Supprimer',
    sortSelectedFirst: 'Sélectionnés en premier',
    close: 'Fermer',
    validate: 'Valider',
    listLabel: 'Options',
  },
};

/** Fusionne les libellés fournis avec la locale de base ; une chaîne vide garde la valeur de base. */
export function resolveStrings(
  input: Partial<MultiSelectStrings> | undefined,
  base: MultiSelectStrings = locales.en,
): MultiSelectStrings {
  const out: MultiSelectStrings = { ...base };
  if (input) {
    for (const key of Object.keys(out) as (keyof MultiSelectStrings)[]) {
      const v = input[key];
      if (typeof v === 'string' && v !== '') out[key] = v;
    }
  }
  return out;
}
