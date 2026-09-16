/**
 * Calcul de position de la popup — fonction pure, sans DOM, testable seule.
 *
 * Le widget d'origine posait la palette en `absolute` sous l'input : elle
 * sortait de l'écran ou se faisait couper par un parent `overflow`. Ici la
 * popup est en `position: fixed` dans body et sa position se calcule dans le
 * repère du viewport, avec ces règles :
 *   - par défaut sous l'ancre, alignée à gauche ;
 *   - pas la place dessous ET plus de place dessus → au-dessus ;
 *   - clamp horizontal dans [margin, viewport.width - popup.width - margin] ;
 *   - popup plus haute que l'espace des deux côtés → côté le plus grand et
 *     `maxHeight` (la popup devient scrollable en interne) ;
 *   - jamais de coordonnée négative ni au-delà du viewport.
 */

export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface PopupSize {
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export type Placement = 'auto' | 'bottom' | 'top';

export interface PositionOptions {
  /** Espace entre l'ancre et la popup (px). */
  offset?: number;
  /** Marge minimale avec les bords du viewport (px). */
  margin?: number;
  placement?: Placement;
}

export interface PositionResult {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
  /** Présent seulement si la popup doit être contrainte en hauteur. */
  maxHeight?: number;
}

function clamp(v: number, min: number, max: number): number {
  // Si l'intervalle est inversé (viewport plus petit que la popup), on
  // privilégie la borne basse : le bord haut/gauche reste visible.
  if (max < min) return min;
  return Math.min(Math.max(v, min), max);
}

export function computePosition(
  anchor: AnchorRect,
  popup: PopupSize,
  viewport: Viewport,
  options: PositionOptions = {},
): PositionResult {
  const offset = options.offset ?? 4;
  const margin = options.margin ?? 8;
  const wanted = options.placement ?? 'auto';

  const anchorBottom = anchor.top + anchor.height;
  // L'ancre peut être partiellement ou totalement hors écran (scroll) : les
  // espaces disponibles se mesurent dans les limites du viewport, pas au-delà.
  const spaceBelow = Math.max(0, viewport.height - Math.max(anchorBottom, 0) - offset - margin);
  const spaceAbove = Math.max(0, Math.min(anchor.top, viewport.height) - offset - margin);

  let placement: 'top' | 'bottom';
  if (wanted === 'top' || wanted === 'bottom') {
    placement = wanted;
  } else if (popup.height <= spaceBelow) {
    placement = 'bottom';
  } else if (spaceAbove > spaceBelow) {
    placement = 'top';
  } else {
    placement = 'bottom';
  }

  const space = placement === 'bottom' ? spaceBelow : spaceAbove;
  const result: PositionResult = { top: 0, left: 0, placement };
  let height = popup.height;
  if (height > space) {
    // Pas la place : on contraint la hauteur plutôt que de déborder (un
    // placement forcé y passe aussi — c'est l'engagement « jamais hors écran »).
    // Si le côté choisi est quasi nul (ancre collée au bord, ou hors écran),
    // la popup recouvre l'ancre et prend toute la hauteur utile du viewport.
    const MIN_USABLE = 40;
    const constrained = space >= MIN_USABLE ? space : Math.max(0, viewport.height - 2 * margin);
    result.maxHeight = constrained;
    height = constrained;
  }

  const top = placement === 'bottom' ? anchorBottom + offset : anchor.top - offset - height;
  result.top = Math.max(0, clamp(top, margin, viewport.height - height - margin));
  result.left = Math.max(0, clamp(anchor.left, margin, viewport.width - popup.width - margin));
  return result;
}
