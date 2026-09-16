/**
 * Icônes SVG construites par le DOM (createElementNS) : aucune police d'icônes,
 * aucun innerHTML. Tracés 24×24 en `currentColor`, taille fixée par le CSS.
 */
const NS = 'http://www.w3.org/2000/svg';

export type IconName = 'chevron' | 'cross' | 'check' | 'search' | 'sort';

/** Tracés (attribut `d`) en trait, style « Feather ». */
const PATHS: Readonly<Record<IconName, readonly string[]>> = {
  chevron: ['M6 9l6 6 6-6'],
  cross: ['M18 6L6 18', 'M6 6l12 12'],
  check: ['M20 6L9 17l-5-5'],
  search: ['M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z', 'M21 21l-4.35-4.35'],
  sort: ['M8 4v16', 'M4 16l4 4 4-4', 'M16 20V4', 'M12 8l4-4 4 4'],
};

export function icon(name: IconName, className = ''): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '1em');
  svg.setAttribute('height', '1em');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', ('sxms-icon sxms-icon--' + name + ' ' + className).trim());
  for (const d of PATHS[name]) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}
