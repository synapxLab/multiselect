# État du projet — @synapxlab/multiselect

Mis à jour le 2026-09-16.

## Avancement

- v0.1.0 implémentée sur la branche `feat/vanilla-v1` : champ à chips, popover avec recherche,
  « Tout sélectionner », tri « sélectionnés d'abord », mode simple, mobile plein écran, clavier
  et ARIA, thème sombre.
- Preuves : typecheck strict vert, 47 tests vitest verts, `dist/` construit (ESM + UMD + CSS +
  types), scénario Chromium joué sur la démo sans erreur console. Captures dans `docs/`.
- README en/fr rédigés et relus contre le code.

## Reste à faire

- Arbitrer la couleur primaire par défaut (`--sxms-primary: #e94c1e`, orange de la référence).
- Décider du comportement du bouton de tri : le composant de référence n'a pas pu être observé
  sur ce point ; v0.1 = toggle « sélectionnés en premier ».
- Test tactile réel (focus liste sans clavier virtuel), non simulé.
- Pas de remote GitHub, pas de publication npm.
- Intégrer dans un premier projet à la place de select2 (pattern-php §JS).

## Bloquants

Aucun.
