---
paths:
  - "projects/wm-core/src/localization/**"
  - "projects/wm-core/src/pipes/**"
  - "projects/wm-core/src/search-bar/**"
---

# Trappole: lingua attiva

Contesto e perché: [docs/knowledge/8958-nomenclatura-regioni-su-filtri.md](../../docs/knowledge/8958-nomenclatura-regioni-su-filtri.md).

- **Al primo avvio `currentLang` è `undefined`**: chi calcola testi per lingua fuori da `wmtrans` usa `currentLang ?? defaultLang` e ascolta anche `onFallbackLangChange` (oc:8958)
