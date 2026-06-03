> Ticket: oc:7646

# ECPOI filtro POI type — estensione ai related POI (wm-core)

## Cosa cambia
In `geobox-map.component.html` viene aggiunto il binding `[wmMapPoisFilters]="poiFilterIdentifiers$|async"` alla directive `wmMapTrackRelatedPois`, così lo stesso observable già usato per i POI globali alimenta anche il filtro dei related POI.

## Perché
Senza questo binding il nuovo input `wmMapPoisFilters` di `WmMapTrackRelatedPoisDirective` non riceve mai i valori dal store, rendendo il filtro inutile a runtime.

## Requisiti
- [ ] `geobox-map.component.html`: aggiunto `[wmMapPoisFilters]="poiFilterIdentifiers$|async"` sull'elemento che porta `wmMapTrackRelatedPois`

## Rischi
- **Deployment sincrono con map-core**: questa modifica è inutile (o potenzialmente instabile) se map-core non è già aggiornato con il nuovo input. Le due PR devono essere mergeate e deployate insieme.
- **`null` da async pipe**: gestito lato map-core (la directive tratta `null` come array vuoto).

## Out of scope
- Logica di filtro (in map-core)
- Configurazione backend

## Moduli toccati
- `core/src/app/shared/wm-core/projects/wm-core/src/geobox-map/geobox-map.component.html`
