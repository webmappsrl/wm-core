---
paths:
  - "projects/wm-core/src/box/**"
  - "projects/wm-core/src/home/home-layer/**"
  - "projects/wm-core/src/shared/img/**"
---

# Trappole: box, overlay e `wm-img`

Contesto e perché delle scelte: [docs/knowledge/layer-box-e-home-layer.md](../../docs/knowledge/layer-box-e-home-layer.md).

- **Un overlay nidificato non si posiziona se il suo genitore reale non è `display:grid`.** Gli
  overlay di `.wm-box` condividono una cella di grid (`grid-row:1;grid-column:1`). Se l'overlay
  non è figlio diretto di `.wm-box` — per esempio il logo dentro il `wm-img` della foto — anche
  quel genitore deve diventare `display:grid`, altrimenti `grid-row`/`grid-column` sono
  silenziosamente inerti. Nessun errore: semplicemente non succede nulla.
- **`min-width`/`min-height: 100px` di `wm-img` vince su `width`/`height` più piccoli**, a
  prescindere dalla specificità CSS: è un vincolo di box model, non una regola di cascata. Ogni
  overlay o badge più piccolo di 100px basato su `wm-img` deve sovrascrivere esplicitamente
  anche i `min-*`.
- **Le classi icona del cuoricino sono `icon-fill-heart` e `icon-outline-heart`.** Le
  `webmapp-icon-heart`/`webmapp-icon-heart-outline` che si trovano copiando da webmapp-app **non
  esistono** nell'icon font: l'icona risulta invisibile, senza alcun errore.
- **Cambiare la tecnica di stacking rompe in silenzio gli override di tema per-shard** basati su
  `top`/`right`/`bottom`/`left`: su un elemento `position:static` quelle proprietà sono ignorate.
  I temi vivono nei consumer, che questo repo non vede — quindi la rottura non si manifesta qui.
  L'equivalente corretto è `align-self` più un margine **fisso**: le percentuali su
  `margin-top`/`margin-bottom` si risolvono sulla larghezza del containing block, non
  sull'altezza.
- **`logo_image` è sempre una stringa URL o assente**, mai un oggetto `WmImage` come
  `feature_image`. Non trattarlo con lo stesso pattern per abitudine.
