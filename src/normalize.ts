/**
 * Normalisation d'une chaîne pour la recherche : décomposition NFD, suppression
 * des diacritiques (U+0300–U+036F), minuscules, espaces réduits.
 * `Économie` et `economie` donnent la même clé.
 */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Vrai si `haystack` contient `needle` une fois les deux normalisés ; une requête vide matche tout. */
export function matches(haystack: string, needle: string): boolean {
  const q = normalize(needle);
  if (q === '') return true;
  return normalize(haystack).includes(q);
}
