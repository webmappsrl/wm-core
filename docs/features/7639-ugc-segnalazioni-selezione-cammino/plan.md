> Ticket: oc:7639

# UGC segnalazioni: selezione cammino — Piano di implementazione

**Goal:** Aggiungere al form UGC di creazione segnalazione un campo autocomplete che pre-seleziona il layer (cammino) più vicino alla posizione GPS, permettendo all'utente di associare la segnalazione al cammino corretto.

**Architecture:** La pre-selezione GPS segue una pipeline asincrona in tre stadi: (1) `WmMapLayerDirective` fetcha tile PBF a zoom fisso via `loadVectorTileFeaturesForLocation` e emette `{features, location}` su `featuresInLocationRangeEVT`; (2) `GeoboxMapComponent` riceve il payload, chiama `GeoutilsService.pickNearestLayerFromFeatures()` e dispatcha `setNearbyLayerId` allo store; (3) `WmSelectNearbyLayerComponent` legge `store.select(nearbyLayerId)` combinato con `currentEcLayer` e `confHOMELayers`. Nessun riferimento a `OlMap` nel componente form.

**Tech Stack:** Angular 20, NgRx, OpenLayers 7, Ionic 8, Karma/Jasmine, Cypress 14

---

## File map

| Azione | File | Repo |
|---|---|---|
| Modifica | `src/directives/layer.directive.ts` | map-core |
| Modifica | `src/utils/ol.ts` | map-core |
| Modifica | `projects/wm-core/src/services/geoutils.service.ts` | wm-core |
| Crea | `projects/wm-core/src/services/geoutils.service.spec.ts` | wm-core |
| Crea | `projects/wm-core/src/form/select-nearby-layer/select-nearby-layer.component.ts` | wm-core |
| Crea | `projects/wm-core/src/form/select-nearby-layer/select-nearby-layer.component.html` | wm-core |
| Crea | `projects/wm-core/src/form/select-nearby-layer/select-nearby-layer.component.scss` | wm-core |
| Crea | `projects/wm-core/src/form/select-nearby-layer/select-nearby-layer.component.spec.ts` | wm-core |
| Modifica | `projects/wm-core/src/form/form.component.html` | wm-core |
| Modifica | `projects/wm-core/src/form/form.component.ts` | wm-core |
| Modifica | `projects/wm-core/src/geobox-map/geobox-map.component.ts` | wm-core |
| Modifica | `projects/wm-core/src/geobox-map/geobox-map.component.html` | wm-core |
| Modifica | `projects/wm-core/src/modal-ugc-uploader/modal-ugc-uploader.component.ts` | wm-core |
| Modifica | `projects/wm-core/src/store/user-activity/user-activity.action.ts` | wm-core |
| Modifica | `projects/wm-core/src/store/user-activity/user-activity.reducer.ts` | wm-core |
| Modifica | `projects/wm-core/src/store/user-activity/user-activity.selector.ts` | wm-core |
| Modifica | `projects/wm-core/src/wm-core.module.ts` | wm-core |
| Modifica | `projects/wm-core/src/localization/i18n/{it,en,de,es,fr,pr,sq}.ts` | wm-core |
| Modifica | `components/shared/modal-save/modal-save.component.ts` | webmapp-app |

---

## Task 1: `loadVectorTileFeaturesForLocation` in map-core utils

Aggiunge la funzione che fetcha tile PBF a zoom fisso (indipendente dallo zoom corrente della mappa) e restituisce le feature LineString/MultiLineString nell'area GPS.

**Files:**
- Modify: `src/utils/ol.ts` (map-core)

```typescript
export async function loadVectorTileFeaturesForLocation(
  location: {longitude: number; latitude: number},
  radiusM: number,
  tileUrlTemplate: string,
  zoom: number = LOCATION_RANGE_TILE_ZOOM,
): Promise<FeatureLike[]>
```

---

## Task 2: `refreshFeaturesInLocationRange` in `WmMapLayerDirective`

Aggiunge il metodo pubblico e l'event emitter. L'evento emette `{features, location}` — la location viaggia con le feature per evitare stato condiviso fragile.

**Files:**
- Modify: `src/directives/layer.directive.ts` (map-core)

```typescript
@Output()
featuresInLocationRangeEVT: EventEmitter<{features: FeatureLike[]; location: Location}> =
  new EventEmitter();

refreshFeaturesInLocationRange(location: Location): void {
  void this._featuresInLocationRange(location);
}

private async _featuresInLocationRange(location: Location): Promise<void> {
  const tileUrl = this._dataLayerUrls?.low;
  if (tileUrl == null || location == null) {
    this.featuresInLocationRangeEVT.emit({features: [], location});
    return;
  }
  const features = await loadVectorTileFeaturesForLocation(
    location, WmMapLayerDirective._LOCATION_RANGE_RADIUS_M, tileUrl,
  );
  this.featuresInLocationRangeEVT.emit({features, location});
}
```

In `geobox-map.component.html`:

```html
(featuresInLocationRangeEVT)="featuresInLocationRange($event)"
```

---

## Task 3: `pickNearestLayerFromFeatures` in `GeoutilsService`

Aggiunge il metodo che riceve le feature già fetchate e restituisce il layer home più vicino. Non conosce `OlMap`. Usa `Map<number, ILAYER>` per lookup O(1) invece di `Set` + `find`.

**Files:**
- Modify: `projects/wm-core/src/services/geoutils.service.ts`
- Create: `projects/wm-core/src/services/geoutils.service.spec.ts`

```typescript
pickNearestLayerFromFeatures(
  features: FeatureLike[],
  location: Location | null,
  homeLayers: ILAYER[],
): ILAYER | null {
  if (!features?.length || location == null || !homeLayers?.length) return null;

  const gpsLonLat: [number, number] = [location.longitude, location.latitude];
  const gps3857 = fromLonLat(gpsLonLat);
  const homeLayerById = new Map(homeLayers.map(l => [Number(l.id), l]));
  let bestLayer: ILAYER | null = null;
  let bestDist = Infinity;

  for (const raw of features) {
    const feature = raw instanceof RenderFeature ? toFeature(raw) : raw;
    const rawLayers = feature.get('layers');
    if (rawLayers == null) continue;

    let featureLayerIds: number[];
    try { featureLayerIds = JSON.parse(rawLayers) as number[]; } catch { continue; }

    const matchingId = featureLayerIds.find(id => homeLayerById.has(id));
    if (matchingId == null) continue;

    const geom = feature.getGeometry();
    if (geom == null) continue;
    const closest3857 = geom.getClosestPoint(gps3857);
    const closestLonLat = toLonLat(closest3857) as [number, number];
    const dist = getDistance(gpsLonLat, closestLonLat);

    if (dist < bestDist) {
      bestDist = dist;
      bestLayer = homeLayerById.get(matchingId) ?? null;
    }
  }
  return bestLayer;
}
```

---

## Task 4: `GeoboxMapComponent` — riceve features e calcola il layer

Handler `featuresInLocationRange` che riceve `{features, location}` dalla direttiva, usa `firstValueFrom` per leggere lo store, e dispatcha `setNearbyLayerId`.

**Files:**
- Modify: `projects/wm-core/src/geobox-map/geobox-map.component.ts`

```typescript
async featuresInLocationRange({
  features,
  location,
}: {
  features: FeatureLike[];
  location: Location;
}): Promise<void> {
  const homeLayers = await firstValueFrom(this._store.select(confHOMELayers));
  const layer = this._geoutilsSvc.pickNearestLayerFromFeatures(
    features, location, homeLayers ?? [],
  );
  this._store.dispatch(setNearbyLayerId({layerId: layer?.id ?? null}));
}
```

Note: `_pendingLocationRangeRefresh` è un buffer intenzionale per quando il ViewChild non è ancora pronto all'arrivo dell'azione.

---

## Task 5: Store `nearbyLayerId`

**Files:**
- Modify: `projects/wm-core/src/store/user-activity/user-activity.action.ts`
- Modify: `projects/wm-core/src/store/user-activity/user-activity.reducer.ts`
- Modify: `projects/wm-core/src/store/user-activity/user-activity.selector.ts`

```typescript
// action:
export const setNearbyLayerId = createAction(
  '[UserActivity] Set Nearby Layer Id',
  props<{layerId: string | null}>(),
);

// reducer state + initial:
nearbyLayerId: string | null;  // initial: null

// handler:
on(setNearbyLayerId, (state, {layerId}) => ({...state, nearbyLayerId: layerId})),

// selector:
export const nearbyLayerId = createSelector(userActivity, state => state.nearbyLayerId);
```

---

## Task 6: `WmSelectNearbyLayerComponent`

Componente autocomplete CVA. Legge `store.select(nearbyLayerId)` e `currentEcLayer` per la pre-selezione. Non riceve `OlMap`.

**Files:**
- Create: `projects/wm-core/src/form/select-nearby-layer/select-nearby-layer.component.ts`
- Create: `projects/wm-core/src/form/select-nearby-layer/select-nearby-layer.component.html`
- Create: `projects/wm-core/src/form/select-nearby-layer/select-nearby-layer.component.scss`

Logica chiave:

```typescript
ngOnInit(): void {
  combineLatest([
    this._store.select(confHOMELayers),
    this._store.select(currentEcLayer),
    this._store.select(nearbyLayerId),
  ]).pipe(takeUntil(this._destroy$))
    .subscribe(([homeLayers, current, nearbyId]) => {
      this._allLayers = homeLayers ?? [];
      this.filteredLayers$.next(this._allLayers);
      this._tryApplyPendingControlValue();
      const layer = this._resolvePreselectionLayer(current, nearbyId);
      this._lastResolvedLayer = layer;
      if (layer != null) this._applyPreselection(layer);
    });
}

registerOnChange(fn): void {
  this._onChange = fn;
  // Propaga subito se il form è stato ricreato e il layer è già noto
  if (this._lastResolvedLayer != null) {
    this._onChange(this._lastResolvedLayer.id ?? null);
  }
}

private _applyPreselection(layer: ILAYER): void {
  const title = this._langSvc.instant(layer.title as any);
  const uiChanged =
    String(this.selectedLayer?.id) !== String(layer.id) || this.searchText !== title;
  this.selectedLayer = layer;
  this._onChange(layer.id ?? null);  // sempre — non solo quando cambia visivamente
  if (uiChanged) {
    this.searchText = title;
    this._cdr.markForCheck();
    void this._syncInputElement();
  }
}
```

---

## Task 7: `WmFormComponent` — bug fix e refactor

**Files:**
- Modify: `projects/wm-core/src/form/form.component.ts`
- Modify: `projects/wm-core/src/form/form.component.html`

Fix applicati:
- `formObj['index']`, `formObj['id']`, `this.formGroup = ...`, `formGroupEvt.emit`, `isInvalidEvt.emit` spostati **fuori** dal `forEach` (erano dentro — il form veniva ricostruito N volte per N campi)
- `formIdGroup.valueChanges` e `formGroup.valueChanges` gestite con `takeUntil(this._destroy$)` invece di `Subscription` manuale
- `Subject<void> _destroy$` sostituisce `Subscription = Subscription.EMPTY`
- Template: `(currentForm$|async).fields` → `(currentForm$|async)?.fields`

---

## Task 8: Traduzioni i18n

Aggiunge le chiavi in tutti e 7 i file: `'layer'` e `'Nessun risultato'` (con traduzione locale per ogni lingua).

---

## Task 9: `layer_id` top-level nelle properties

**Due componenti** devono estrarre `layer_id` dal form value a top-level di `properties`:

```typescript
// pattern comune ad entrambi:
...(formValue?.layer_id != null && {layer_id: formValue.layer_id}),
```

| Componente | Flusso |
|---|---|
| `modal-ugc-uploader.component.ts` | Upload GPX/KML/GeoJSON |
| `modal-save.component.ts` (webmapp-app) | Registrazione POI segnalazione |

---

## Task 10: Test Cypress E2E

File: `core/cypress/e2e/app_52/ugc-segnalazione-layer-selection.cy.ts`

Pattern (da `wm-core/CLAUDE.md`):
- `cy.visit()` con `onBeforeLoad` che setta `privacy-accepted` in localStorage
- Intercept login con wildcard `**/api/auth/login`
- Intercept conf per iniettare `poi_acquisition_form` con campo `selectNearLayer`
- Stub `navigator.geolocation.watchPosition` con coordinate fisse

Test cases:
1. `wm-select-nearby-layer` è visibile nel form dopo apertura modal UGC
2. Il dropdown appare digitando nell'input
3. La selezione può essere cancellata
4. Si può salvare senza selezionare un layer
