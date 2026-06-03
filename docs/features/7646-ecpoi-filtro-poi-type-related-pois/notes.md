> Ticket: oc:7646

# Notes — ECPOI filtro POI type: estensione ai related POI (wm-core)

## Deviazioni dal piano

### Nessuna modifica al template
Il piano prevedeva di aggiungere `[wmMapPoisFilters]` su `wmMapTrackRelatedPois`. Non è stato necessario: Angular propaga automaticamente un `@Input()` binding a tutte le direttive sullo stesso host element con lo stesso nome. Il binding esistente raggiunge già entrambe le direttive.

La modifica effettiva è stata un **riposizionamento** del binding esistente: spostato alla fine del gruppo degli attributi generali (prima dei selettori di direttiva) per rispettare la convenzione di leggibilità del progetto.

## Decisioni

- **Convenzione binding multi-direttiva documentata in CLAUDE.md di map-core**: input condivisi tra più direttive vanno posizionati alla fine del gruppo generale, prima del primo selettore di direttiva; input dedicati vanno dopo il selettore della loro direttiva.

## Follow-up

Nessuno.
