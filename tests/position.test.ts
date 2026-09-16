import { describe, expect, it } from 'vitest';
import { computePosition, type AnchorRect, type PopupSize, type Viewport } from '../src/position';

const popup: PopupSize = { width: 220, height: 260 };
const viewport: Viewport = { width: 1280, height: 720 };
const opts = { offset: 4, margin: 8 };

function inViewport(anchor: AnchorRect, size: PopupSize, vp: Viewport): void {
  const r = computePosition(anchor, size, vp, opts);
  const h = r.maxHeight ?? size.height;
  expect(r.top).toBeGreaterThanOrEqual(0);
  expect(r.left).toBeGreaterThanOrEqual(0);
  expect(r.left + size.width).toBeLessThanOrEqual(vp.width);
  expect(r.top + h).toBeLessThanOrEqual(vp.height);
}

describe('computePosition', () => {
  it('ancre en haut à gauche → dessous, alignée à gauche', () => {
    const r = computePosition({ top: 20, left: 30, width: 120, height: 24 }, popup, viewport, opts);
    expect(r.placement).toBe('bottom');
    expect(r.top).toBe(20 + 24 + 4);
    expect(r.left).toBe(30);
    expect(r.maxHeight).toBeUndefined();
  });

  it('ancre en bas à droite → au-dessus et recalée à gauche', () => {
    const r = computePosition({ top: 690, left: 1200, width: 60, height: 24 }, popup, viewport, opts);
    expect(r.placement).toBe('top');
    expect(r.top).toBe(690 - 4 - 260);
    expect(r.left).toBe(1280 - 220 - 8);
  });

  it('viewport plus petit que la popup → maxHeight et top >= margin', () => {
    const small: Viewport = { width: 300, height: 200 };
    const r = computePosition({ top: 10, left: 10, width: 50, height: 20 }, popup, small, opts);
    expect(r.maxHeight).toBeDefined();
    expect(r.top).toBeGreaterThanOrEqual(8);
    expect(r.top + (r.maxHeight ?? 0)).toBeLessThanOrEqual(200);
    expect(r.left + popup.width).toBeLessThanOrEqual(300 + 0); // largeur > viewport : le bord gauche reste visible
  });

  it('pas de place des deux côtés → côté le plus grand + maxHeight', () => {
    const r = computePosition({ top: 400, left: 0, width: 50, height: 20 }, popup, { width: 800, height: 600 }, opts);
    // dessous : 600-420-12 = 168 ; dessus : 400-12 = 388 → au-dessus, contraint à 388 ? non : 260 <= 388 tient.
    expect(r.placement).toBe('top');
    expect(r.maxHeight).toBeUndefined();
    const r2 = computePosition({ top: 300, left: 0, width: 50, height: 20 }, { width: 220, height: 500 }, { width: 800, height: 600 }, opts);
    // dessous : 600-320-12 = 268 ; dessus : 288 → dessus, maxHeight 288
    expect(r2.placement).toBe('top');
    expect(r2.maxHeight).toBe(288);
    expect(r2.top).toBe(300 - 4 - 288);
  });

  it('placement forcé respecté quand la place existe', () => {
    const r = computePosition({ top: 400, left: 100, width: 50, height: 20 }, popup, viewport, { ...opts, placement: 'top' });
    expect(r.placement).toBe('top');
    const r2 = computePosition({ top: 20, left: 100, width: 50, height: 20 }, popup, viewport, { ...opts, placement: 'bottom' });
    expect(r2.placement).toBe('bottom');
  });

  it('ancre hors écran → jamais de coordonnée négative', () => {
    inViewport({ top: -100, left: -50, width: 60, height: 24 }, popup, viewport);
    inViewport({ top: 900, left: 2000, width: 60, height: 24 }, popup, viewport);
  });

  it('balayage : jamais hors viewport', () => {
    const vps: Viewport[] = [{ width: 1280, height: 720 }, { width: 375, height: 667 }, { width: 240, height: 180 }];
    for (const vp of vps) {
      for (let top = -50; top <= vp.height + 50; top += 37) {
        for (let left = -50; left <= vp.width + 50; left += 41) {
          inViewport({ top, left, width: 40, height: 20 }, popup, vp);
        }
      }
    }
  });
});
