import { describe, expect, it } from 'vitest';
import { matches, normalize } from '../src/normalize';

describe('normalize', () => {
  it('retire les accents, passe en minuscules, réduit les espaces', () => {
    expect(normalize('Économie Sociale')).toBe('economie sociale');
    expect(normalize('  Réseau\t  social ')).toBe('reseau social');
    expect(normalize('Ça — déjà, naïve, Œuvre')).toBe('ca — deja, naive, œuvre');
  });

  it('matches : insensible casse/accents, requête vide matche tout', () => {
    expect(matches('Développement, Croissance', 'DEVELOP')).toBe(true);
    expect(matches('Entrepreneuriat féminin', 'feminin')).toBe(true);
    expect(matches('Entrepreneuriat feminin', 'FÉMININ')).toBe(true);
    expect(matches('Franchise', 'zzz')).toBe(false);
    expect(matches('Franchise', '')).toBe(true);
    expect(matches('Franchise', '   ')).toBe(true);
  });
});
