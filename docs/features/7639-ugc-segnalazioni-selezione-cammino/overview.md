> Ticket: oc:7639

# UGC segnalazioni: selezione cammino al momento dell'inserimento

## Cosa cambia

Al momento della creazione di una segnalazione UGC, il form mostra sempre un campo autocomplete per selezionare il cammino associato. L'app pre-seleziona automaticamente il layer più rilevante: prima il layer aperto (`currentEcLayer`), poi il layer più vicino calcolato via tile PBF fetchati a zoom fisso. Il `layer_id` scelto viene inviato nel payload della segnalazione verso il backend.

## Perché

Gli enti gestori usano l'app sul campo per segnalare problemi lungo i cammini. Senza associazione al layer, le segnalazioni non sono filtrabili per gestore nel pannello admin, rendendo impossibile la gestione operativa per competenza territoriale.

## Requisiti

- [x] Nuovo tipo di campo `selectNearLayer` nel sistema dei form UGC (`WmFormComponent`)
- [x] Il campo è **sempre visibile** nel form — nessuna logica di visibilità condizionale
- [x] **Pre-selezione automatica** al caricamento del componente:
  - Se c'è un `currentEcLayer` aperto nello store → pre-seleziona quello
  - Altrimenti → usa il `nearbyLayerId` calcolato dalla pipeline GPS/PBF
- [x] **Lista autocomplete** basata su `confHOMELayers` dallo store (i layer visibili in home)
- [x] L'utente può sempre modificare la selezione scrivendo nell'autocomplete
- [x] Il campo è **opzionale**: l'utente può salvare la segnalazione senza selezionare un layer
- [x] Il `layer_id` selezionato finisce in `properties.form.layer_id` (automatico via formGroup) e in `properties.layer_id` top-level (scritto esplicitamente in `modal-ugc-uploader` e `modal-save`)
- [x] Chiave di traduzione `layer` aggiunta in tutte le 7 lingue (`it`, `en`, `de`, `es`, `fr`, `pr`, `sq`) con valore default `Layer`
- [x] [UX] Touch target delle opzioni autocomplete ≥ 44pt
- [x] I titoli dei layer normalizzati con `LangService.instant()` prima del confronto testuale

## Architettura — pipeline pre-selezione GPS

Il calcolo del layer più vicino non avviene dentro il componente form. Segue una pipeline asincrona separata:

```
WmMapLayerDirective
  └─ refreshFeaturesInLocationRange(location)
       └─ _featuresInLocationRange(location)
            └─ loadVectorTileFeaturesForLocation(location, 1500m, tileUrl)
                 // fetch HTTP tile PBF a zoom fisso basso
                 └─ featuresInLocationRangeEVT.emit({features, location})

GeoboxMapComponent
  └─ featuresInLocationRange({features, location})
       └─ GeoutilsService.pickNearestLayerFromFeatures(features, location, homeLayers)
            └─ store.dispatch(setNearbyLayerId({layerId}))

WmSelectNearbyLayerComponent
  └─ combineLatest([confHOMELayers, currentEcLayer, store.select(nearbyLayerId)])
       └─ _resolvePreselectionLayer(current, nearbyId)
            // priorità: currentEcLayer → nearbyLayerId → nessuna pre-selezione
```

### Perché pipeline e non chiamata diretta alla mappa

`source.getFeaturesInExtent()` legge solo i tile già renderizzati in viewport: se la mappa è a zoom alto o il modal si apre prima del render, i tile non ci sono. `loadVectorTileFeaturesForLocation` fetcha i tile a zoom fisso basso, indipendente dallo zoom corrente e dallo stato del viewport.

## Codice esistente riusato / esteso

| Funzione/Classe | File | Modifica |
|---|---|---|
| `WmMapLayerDirective` | `map-core/src/directives/layer.directive.ts` | Aggiunge `refreshFeaturesInLocationRange()`, `_featuresInLocationRange()`, `featuresInLocationRangeEVT` |
| `loadVectorTileFeaturesForLocation` | `map-core/src/utils/ol.ts` | Nuova funzione — fetch HTTP tile PBF a zoom fisso |
| `GeoutilsService` | `wm-core/services/geoutils.service.ts` | Aggiunge `pickNearestLayerFromFeatures(features, location, homeLayers)` — nessun riferimento a OlMap |
| `GeoboxMapComponent` | `wm-core/geobox-map/geobox-map.component.ts` | Aggiunge `featuresInLocationRange()`, inietta `GeoutilsService` |
| `user-activity` store | `wm-core/store/user-activity/` | Aggiunge stato `nearbyLayerId`, azione `setNearbyLayerId`, selettore `nearbyLayerId` |
| `confHOMELayers` selector | `wm-core/store/conf/conf.selector.ts` | Già esistente, usato invariato |
| `currentEcLayer` selector | `wm-core/store/user-activity/user-activity.selector.ts` | Già esistente — `currentLayer` non esiste |


## Test E2E

File: `core/cypress/e2e/app_52/ugc-segnalazione-layer-selection.cy.ts` — **4/4 passanti**

Fixture usate: `conf-camminiditalia-1.json`, `elastic-init.json`. Salvataggio via `localForage` — nessun intercept HTTP necessario per la POST di save.

| Test | Verifica |
|---|---|
| il campo layer è visibile nel form segnalazione | `wm-select-nearby-layer` e `[e2e-form-input="layer"]` esistono |
| il campo layer mostra le opzioni quando si digita | `#wm-layer-listbox` visibile dopo input |
| clearSelection azzera il valore dell'input | input ha `value=""` dopo clear |
| si può salvare senza selezionare un layer | `.webmapp-modalsuccess-footer` visibile |

## Casi di test reali

| GPS (lon, lat) | layer_id atteso | Nome cammino |
|---|---|---|
| `[15, 28]` | `35` | Cammino di Tindari |
| `[14, 37.5]` | `81` | Via dei Frati |
| `[13.1, 37.5]` | `110` | Sulle orme di San Bernardo |

## Decisioni tecniche e bug fix rilevanti

### `featuresInLocationRangeEVT` emette `{features, location}` non solo `features`

La `location` viaggia insieme alle feature nell'evento per evitare stato condiviso fragile (`_lastLocationRangeRefresh`). `GeoboxMapComponent.featuresInLocationRange` distrugge il payload e passa entrambi a `pickNearestLayerFromFeatures`.

### `WmSelectNearbyLayerComponent` — propagazione CVA al form ricreato

Quando `WmFormComponent.setForm()` ricrea il `FormGroup`, Angular chiama `registerOnChange(newFn)` sul CVA. Se il combineLatest dello store non ri-emette (stato invariato), `_onChange` non verrebbe mai chiamato con il nuovo form control — `layer_id` rimarrebbe `null`.

Fix a due livelli:
1. `_applyPreselection` chiama sempre `_onChange` (non solo quando il layer cambia visivamente). La guardia `uiChanged` ottimizza solo il re-render del template.
2. `registerOnChange` propaga immediatamente il valore se `_lastResolvedLayer` è già noto.

### `layer_id` top-level in `modal-save.component.ts`

Il flusso POI segnalazione usa `ModalSaveComponent` (non `ModalUgcUploaderComponent`). Anche in `modal-save.save()` occorre il conditional spread `...(formValue?.layer_id != null && {layer_id: formValue.layer_id})`.

### `form.component.ts` — form group ricostruita N volte nel loop

Le righe `this.formGroup = this._fb.group(formObj)`, `formGroupEvt.emit`, `isInvalidEvt.emit` erano dentro il `forEach` sui campi — il form veniva ricostruito una volta per ogni campo. Spostate fuori dal loop.

### Subscription leak in `form.component.ts`

`formIdGroup.valueChanges` e `formGroup.valueChanges` erano gestite con `Subscription` manuale (solo l'ultima veniva pulita). Sostituite con `takeUntil(this._destroy$)`.

### `pickNearestLayerFromFeatures` — `Set` → `Map`

La lookup `homeLayers.find(l => Number(l.id) === matchingId)` dentro il loop veniva eseguita per ogni feature. Sostituita con `Map<number, ILAYER>` costruita una volta sola. Rimosso il `try/catch` esterno superfluo.

### Codice rimosso da `geoutils.service.ts`

- `getDate(track)` — stub che ignorava il parametro e restituiva sempre `new Date()`.
- `deg2rad(deg)` — metodo privato mai chiamato.

## Rischi

- **GPS non disponibile**: `GeolocationService.location` può essere `null`. In questo caso nessuna pre-selezione — autocomplete vuoto, l'utente sceglie manualmente.
- **Fetch PBF fallisce**: `loadVectorTileFeaturesForLocation` restituisce `[]`. Nessuna pre-selezione.
- **GPS al confine tra tile**: non è un problema — il buffer da 1500m viene applicato prima di calcolare le tile, quindi le tile adiacenti vengono sempre incluse nel fetch. Una feature a 50m nella tile confinante viene trovata correttamente.
- **Feature parsate senza `layers` property**: si ignora e si passa alla successiva.
- **`currentEcLayer` residuo da sessione precedente**: ha sempre priorità sulla prossimità GPS — l'utente è responsabile della correzione.
- **`nearbyLayerId` non resettato tra modal**: il valore nello store persiste tra aperture successive del modal. Da considerare per future UX.

## Out of scope

- Lato admin: gestione e visualizzazione del `layer_id` nelle segnalazioni (oc:7640)
- Modifica del backend: già accetta `properties.layer_id` tramite `UgcObserver`
- Nessuna migration necessaria

## Moduli toccati

**map-core** (`core/src/app/shared/map-core/`):
- `src/directives/layer.directive.ts` — aggiunge `refreshFeaturesInLocationRange`, `_featuresInLocationRange`, `featuresInLocationRangeEVT`
- `src/utils/ol.ts` — aggiunge `loadVectorTileFeaturesForLocation`

**wm-core** (`core/src/app/shared/wm-core/`):
- `projects/wm-core/src/form/select-nearby-layer/` — nuovo componente `WmSelectNearbyLayerComponent`
- `projects/wm-core/src/form/form.component.html` — aggiunge `*ngSwitchCase="'selectNearLayer'"`
- `projects/wm-core/src/form/form.component.ts` — aggiunge caso `selectNearLayer` in `setForm()`
- `projects/wm-core/src/services/geoutils.service.ts` — aggiunge `pickNearestLayerFromFeatures()`
- `projects/wm-core/src/services/geoutils.service.spec.ts` — test con casi GPS reali
- `projects/wm-core/src/geobox-map/geobox-map.component.ts` — aggiunge `featuresInLocationRange()`, inietta `GeoutilsService`
- `projects/wm-core/src/geobox-map/geobox-map.component.html` — binding `(featuresInLocationRangeEVT)`
- `projects/wm-core/src/modal-ugc-uploader/modal-ugc-uploader.component.ts` — aggiunge `layer_id` top-level in `properties` (flusso GPX upload)
- `projects/wm-core/src/store/user-activity/user-activity.action.ts` — aggiunge `setNearbyLayerId`
- `projects/wm-core/src/store/user-activity/user-activity.reducer.ts` — aggiunge stato e handler `nearbyLayerId`
- `projects/wm-core/src/store/user-activity/user-activity.selector.ts` — aggiunge selettore `nearbyLayerId`
- `projects/wm-core/src/wm-core.module.ts` — registra `WmSelectNearbyLayerComponent`

**webmapp-app** (`core/src/app/`):
- `components/shared/modal-save/modal-save.component.ts` — aggiunge `layer_id` top-level in `properties` (flusso POI segnalazione)
- `projects/wm-core/src/localization/i18n/{it,en,de,es,fr,pr,sq}.ts` — chiavi `layer` e `Nessun risultato`
