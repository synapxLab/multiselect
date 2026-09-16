import { describe, expect, it } from 'vitest';
import { icon } from '../src/icons';

describe('icon', () => {
  it('construit un SVG par le DOM, aria-hidden, sans innerHTML', () => {
    const svg = icon('check', 'extra');
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('class')).toBe('sxms-icon sxms-icon--check extra');
    expect(svg.querySelectorAll('path').length).toBe(1);
    expect(icon('sort').querySelectorAll('path').length).toBe(4);
    expect(icon('cross').getAttribute('stroke')).toBe('currentColor');
  });
});
