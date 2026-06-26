# wm-core — CLAUDE.md

## Test E2E con Cypress — pattern standard

I test Cypress vivono in `wm-webapp/cypress/e2e/`. Per ogni feature di wm-core che tocca la UI:

### Regola generale

**Usare sempre `cy.intercept()` con fixture** — mai dipendere da API reali in test di logica UI.

### Come catturare le fixture

Eseguire una volta con il backend reale, salvare in `cypress/fixtures/`:

```bash
curl -sL "https://<shard>.maphub.it/api/v2/elasticsearch?app=geohub_app_<id>&query=<termine>" \
  -o cypress/fixtures/elastic-<termine>.json

curl -sL "https://wmfe.s3.eu-central-1.amazonaws.com/<shard>/<id>/config.json" \
  -o cypress/fixtures/conf-<id>.json
```

### Template di test

```typescript
const ELASTIC_URL = '**/api/v2/elasticsearch*';
const CONF_URL    = '**/config.json';

const setupIntercepts = (elasticFixture = 'elastic-init') => {
  cy.intercept('GET', CONF_URL,    {fixture: 'conf-1.json'}).as('conf');
  cy.intercept('GET', ELASTIC_URL, {fixture: elasticFixture}).as('elastic');
};

// Setta privacy-accepted prima che Angular si avvii → nessun modal backdrop
const visitWithPrivacy = (url: string) => {
  cy.visit(url, {
    onBeforeLoad(win) {
      win.localStorage.setItem('privacy-accepted', 'true');
    },
  });
};

const waitForApp = () => {
  cy.wait('@conf');
  cy.wait('@elastic');
};
```

### Perché `onBeforeLoad` e non `dismissModal`

La privacy modal appare quando `localStorage.privacy-accepted` è assente.
`clearTestState()` cancella il localStorage → il modal riappare a ogni test.
Settare `privacy-accepted` in `onBeforeLoad` previene l'apertura prima ancora che Angular si avvii, eliminando `{force: true}` e `cy.wait()` arbitrari.

### Vantaggi rispetto ai test con API reali

| | API reali | Fixture + intercept |
|---|---|---|
| Velocità | ~51s | ~13s |
| Flakiness | Alta (backend, dati) | Zero |
| `cy.wait()` arbitrari | Necessari (debounce + network) | Eliminati |
| Dipendenza da ID specifici | Sì (`layer=55`) | No (fixture mockabili) |
| CI senza backend | No | Sì |

### Quando usare API reali

Solo per smoke test ("il sistema è su e risponde"), non per test di logica UI.

## Features implementate

| Feature | Ticket | Moduli toccati | Note |
|---|---|---|---|
| PostHog tracking utente online | oc:8127 | `geolocation.service.ts`, `posthog-context.service.ts` | Evento `userMoved` ad ogni aggiornamento GPS con campo `mode` (GeolocationMode) |
| Fix regex hostname 5 parti | oc:8031 | `environment.service.ts`, `environment.service.spec.ts` | Regex aggiornata a `(?:\.[^.]+)+` per supportare domini Surge preview a N parti |
| Ricerca per layer/cammino nella home | oc:7643 | `home-result`, `ec` store (actions/reducer/effects/selectors), `layer-box`, `layer-features-counter-badge`, `user-activity.reducer` | |
| Selezione cammino nel form UGC segnalazione | oc:7639 | `select-nearby-layer` (nuovo), `form.component`, `geobox-map`, `modal-ugc-uploader`, `geoutils.service`, `user-activity` store (`nearbyLayerId`), `map-core/layer.directive`, `map-core/ol.ts` | Test E2E: `core/cypress/e2e/app_52/ugc-segnalazione-layer-selection.cy.ts` |

## Decisioni architetturali

### PostHog tracking utente online (oc:8127)
- **`capture('userMoved')` in `GeolocationService._onLocationUpdate()`**: elimina la dipendenza circolare alla radice. `GeolocationService` ha già `_mode` e `_posthogClient` — non serve nessun workaround lazy. L'evento si attiva ad ogni aggiornamento GPS; il foreground/background è implicito nel watcher.
- **`GeolocationMode` in wm-types**: tipo condiviso `'navigation' | 'recording' | 'stopped'` estratto in `wm-types/user-activity.ts`. Usato da `GeolocationService` e `WmPosthogProps.mode` per evitare la union literal ripetuta.

### Fix regex hostname 5 parti (oc:8031)

- **`(?:\.[^.]+)+` invece di gruppi opzionali fissi**: accetta N parti TLD senza dover patchare la regex ad ogni nuovo provider o variante di dominio (es. Surge preview `pr-N.surge.sh`)
- **Test spec su regex privata via `(service as any)`**: proprietà mantenuta `private`; guard `expect(regex).toBeDefined()` cattura rename silenziosi
- **Rischio preesistente non affrontato**: `_assignApi()` crasha se `shardName` non è in `environment.shards` — da tracciare in ticket separato

### Tab layers nella home (oc:7643)

**Store**

- `HomeResultTab` (`wm-types`) include `'layers' | null` — `null` come stato iniziale distingue "nessuna scelta utente" da "utente ha cliccato tracks esplicitamente"
- `homeResultTabSelected` si resetta a `null` ad ogni `inputTyped` — permette al default di tornare a `'layers'` dopo ogni nuova digitazione
- `ecTracksInitAggregationsSuccess` è un'azione dedicata che aggiorna **solo** `initialAggregations` nello store — non tocca `hits` né `aggregations` per non sporcare i risultati di ricerca correnti
- L'effetto `initLayerAggregations$` si attiva su `loadConfSuccess` e chiama `ecSvc.getQuery({})` senza parametri per ottenere le aggregazioni iniziali non filtrate

**Selettori**

- `layerFeaturesTotalCount` usa `initialAggregationBucketsLayers` (da `initialAggregations`) — il contatore badge non cambia al variare della query di ricerca
- `layerFeaturesCount` usa le aggregazioni filtrate correnti — usato ovunque tranne che nella tab layers della home

**Componente home-result**

- `normalizeString()` è una funzione pura a livello di modulo (non metodo di classe) per evitare problemi con gli initializer delle property che non possono chiamare metodi di istanza
- `filteredLayers$`, `countLayers$`, `showResultTabSelected$` sono inizializzati nel costruttore (non come property initializer) per lo stesso motivo
- `ecLayer` è aggiunto al `combineLatest` con `.pipe(startWith(null))` — senza questo, la prima emissione veniva bloccata finché `ecLayer` non emetteva
- Logica `showResultTabSelected$`:
  1. Se l'utente ha cliccato esplicitamente un tab valido → mostra quel tab
  2. Se ci sono layer disponibili (e nessun layer aperto) → mostra `'layers'`
  3. Fallback: `'tracks'` → `'pois'` → `null`

**i18n**

- Chiave `'layers'` con traduzione di default `'Layers'` in tutti i file i18n
- Il backend fa override via `wmlang` per ogni app (es. "Cammini", "Percorsi", "Itinerari")
- `LangService.instant(layer.title as any)` risolve sia stringhe che oggetti `{it: '...', en: '...'}` — necessario perché i titoli dei layer dalla conf sono oggetti i18n, non stringhe

**layer-box**

- `@Input() showBadge = true` — permette di nascondere il badge (usato in altri contesti)
- `@Input() useTotal = false` — quando `true` il badge usa `layerFeaturesTotalCount` (non filtrato)

### Selezione layer nel form UGC segnalazione (oc:7639)

**Pipeline pre-selezione GPS**

La pre-selezione non avviene nel componente form. Segue una pipeline in tre stadi:
1. `WmMapLayerDirective.refreshFeaturesInLocationRange(location)` fetcha tile PBF a zoom fisso via `loadVectorTileFeaturesForLocation` (map-core) — indipendente dallo zoom corrente della mappa
2. `GeoboxMapComponent.featuresInLocationRange(features)` chiama `GeoutilsService.pickNearestLayerFromFeatures()` e dispatcha `setNearbyLayerId` allo store
3. `WmSelectNearbyLayerComponent` legge da `combineLatest([confHOMELayers, currentEcLayer, store.select(nearbyLayerId)])` e applica priorità: `currentEcLayer` → `nearbyLayerId`

**Perché non `source.getFeaturesInExtent()`**

`getFeaturesInExtent()` legge solo tile già renderizzati in viewport: se la mappa è a zoom alto o il modal si apre prima del render, le feature non ci sono. `loadVectorTileFeaturesForLocation` fetcha i tile a zoom fisso basso indipendentemente dallo stato del viewport.

**Comportamento al confine tra tile PBF — gestito correttamente**

Il buffer da 1500m viene applicato **prima** di calcolare quali tile fetchare. Se il GPS è vicino al bordo di una tile, l'extent espanso sconfina nella tile adiacente e `getTilesForExtent` include entrambe nel fetch. Una feature nella tile adiacente a 50m viene trovata correttamente anche se la tile del punto GPS contiene solo feature lontane. L'unico limite è il raggio: feature oltre 1500m non vengono cercate per design.

**`pickNearestLayerFromFeatures` vs `getNearestLayer`**

Il metodo in `GeoutilsService` si chiama `pickNearestLayerFromFeatures(features, location, homeLayers)` — non `getNearestLayer`. Non riceve `OlMap` come parametro. Gestisce `RenderFeature` con `toFeature()`.

**`currentEcLayer` non `currentLayer`**

Il selettore corretto è `currentEcLayer` da `user-activity.selector.ts`. Il selettore `currentLayer` non esiste.

**`featuresInLocationRangeEVT` emette `{features, location}` non solo `features`**

La location viaggia con le feature per evitare stato condiviso fragile (`_lastLocationRangeRefresh` era un campo di classe che poteva essere sovrascritto tra chiamate concorrenti). `GeoboxMapComponent.featuresInLocationRange` usa `async`/`firstValueFrom` invece di `subscribe` imperativo.

**CVA `WmSelectNearbyLayerComponent` — propagazione al form ricreato**

Quando `WmFormComponent.setForm()` ricrea il `FormGroup`, Angular chiama `registerOnChange(newFn)`. Se il combineLatest dello store non ri-emette, `_onChange` non verrebbe mai chiamato con il nuovo form control. Fix: `registerOnChange` propaga immediatamente il valore se `_lastResolvedLayer` è noto; `_applyPreselection` chiama sempre `_onChange` (non solo quando il layer cambia visivamente).

**`layer_id` top-level va estratto in tutti i componenti di salvataggio**

Il flusso POI segnalazione usa `ModalSaveComponent` (non `ModalUgcUploaderComponent`). Entrambi devono usare `...(formValue?.layer_id != null && {layer_id: formValue.layer_id})` per non inviare `layer_id: null` al backend.

**`WmFormComponent.confPOIFORMS` setter accetta `null`**

Il setter è dichiarato `any[] | null` con guard `if (forms == null) return`. Necessario perché `X | async` in strict Angular template produce `T | null` — senza il `null` nel tipo il compiler segnala un errore. Tutti i template che usano `[confPOIFORMS]="obs$|async"` senza `?? []` dipendono da questo.

**`WmFormComponent.setForm()` — il form group va costruito fuori dal forEach**

Le righe `this.formGroup = this._fb.group(formObj)`, `formGroupEvt.emit`, `isInvalidEvt.emit` devono stare **dopo** il `forEach` sui campi, non dentro. Dentro il loop accumulare solo `formObj[field.name]`.

**Subscription management in `WmFormComponent`**

Usare `takeUntil(this._destroy$)` con un `Subject<void>` per tutte le subscription (sia `formIdGroup.valueChanges` che `formGroup.valueChanges`). La gestione manuale con `Subscription` causava leak perché le subscription vecchie di `formGroup.valueChanges` non venivano mai chiuse al cambio form.
