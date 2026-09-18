---
paths:
  - "projects/wm-core/src/geobox-map/**"
  - "projects/wm-core/src/modal-ugc-uploader/**"
---

# Convenzione: ordine degli attributi su `<wm-map>`

Il componente e le direttive vengono da `map-core`, che porta la stessa regola per i propri
template di demo. Qui vale per i due template che montano la mappa.

**Un singolo binding raggiunge tutte le direttive** che sullo stesso host element espongono quel
nome di `@Input()`: non duplicarlo mai per farlo arrivare a più direttive.

L'ordine degli attributi segnala se un input è condiviso o dedicato:

1. **Input condivisi** — alla fine del gruppo generale, subito prima del primo selettore di
   direttiva; fra loro, i nomi più corti e generici prima.
2. **Selettore di direttiva** (es. `wmMapPois`).
3. **Input di quella sola direttiva** — subito dopo il suo selettore.

```html
<wm-map
    [wmMapConf]="..."               ← generico
    [wmMapPadding]="..."
    [wmMapPoisFilters]="..."        ← condiviso (wmMapPois + wmMapTrackRelatedPois)
    wmMapPois                       ← selettore
    [wmMapPoisPois]="..."           ← solo wmMapPois
    wmMapTrackRelatedPois
    [wmTrackRelatedPoiIcons]="..."  ← solo wmMapTrackRelatedPois
>
```

Un binding condiviso messo dentro il blocco di una direttiva specifica è fuorviante: dice che
appartiene a quella direttiva quando invece le raggiunge tutte.
