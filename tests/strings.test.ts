import { describe, expect, it } from 'vitest';
import { locales, resolveStrings } from '../src/strings';

describe('resolveStrings', () => {
  it('base en par défaut, surcharge partielle, chaîne vide ignorée', () => {
    expect(resolveStrings(undefined)).toEqual(locales.en);
    const s = resolveStrings({ placeholder: 'Choisir', search: '' }, locales.fr);
    expect(s.placeholder).toBe('Choisir');
    expect(s.search).toBe('Recherche...');
    expect(s.selectAll).toBe('Tout sélectionner');
  });

  it('les deux locales ont les mêmes clés', () => {
    expect(Object.keys(locales.fr).sort()).toEqual(Object.keys(locales.en).sort());
  });
});
