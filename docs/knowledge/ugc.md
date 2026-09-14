# UGC: form di segnalazione, foto e condivisione

## Come funziona oggi

**Il layer si pre-seleziona da GPS, e non lo fa il componente form.** La pipeline ha tre stadi:

1. `WmMapLayerDirective.refreshFeaturesInLocationRange(location)` (map-core) fetcha le tile PBF a zoom fisso via `loadVectorTileFeaturesForLocation`, indipendentemente dallo zoom corrente della mappa.
2. `GeoboxMapComponent.featuresInLocationRange(features)` chiama `GeoutilsService.pickNearestLayerFromFeatures()` e dispatcha `setNearbyLayerId`.
3. `WmSelectNearbyLayerComponent` legge da `combineLatest([confHOMELayers, currentEcLayer, nearbyLayerId])` con priorità `currentEcLayer` → `nearbyLayerId`.

**Le foto sono condivise fra editing POI e track** tramite `UgcPropertiesBaseComponent`, una classe astratta plain-TS senza decoratori né template, che espone `_photos`, `photosChanged()` e il getter `photos`.

**La condivisione social è un contratto Output/Input**, non un dispatch NgRx: `@Output('share-track')` emette la traccia al tap e al retry, `@Input('shareResult')` riceve `{success, errorMessage?}` — `null` è un no-op. Il pulsante resta disabilitato finché `isTrackSynced$` non conferma che la traccia ha un `id` dal backend.

## Perché così

- **Non `source.getFeaturesInExtent()`** (oc:7639): legge solo le tile già renderizzate in viewport, quindi a zoom alto o con il modale aperto prima del render le feature non ci sono. `loadVectorTileFeaturesForLocation` fetcha a zoom fisso basso, a prescindere dal viewport.
- **Il buffer da 1500 m si applica prima di scegliere le tile** (oc:7639): se il GPS è sul bordo, l'extent espanso sconfina nella tile adiacente e `getTilesForExtent` le include entrambe. Una feature a 50 m in una tile vicina viene trovata anche se la tile del punto GPS contiene solo roba lontana. L'unico limite è il raggio: oltre 1500 m non si cerca, per design.
- **`featuresInLocationRangeEVT` emette `{features, location}`, non solo le feature** (oc:7639): la location viaggia con le feature invece di stare in `_lastLocationRangeRefresh`, un campo di classe che chiamate concorrenti potevano sovrascrivere.
- **Una classe astratta invece di un servizio iniettato** per le foto (oc:5125): lo stato è per-istanza (POI contro track), non cross-cutting.
- **Il gating della condivisione usa `confOPTIONS$` direttamente** (oc:8183), con `(confOPTIONS$|async)?.ugcTrackShareEnabled`, invece di introdurre un selettore dedicato come in oc:8177.
- **Nessun default client-side per `ugcTrackShareEnabled`** in `conf.reducer.ts` (oc:8183): il flag resta `undefined` finché un backend non lo abilita via `config.json`. Deliberato per una feature nuova e non ancora pronta ovunque — al contrario di `showTrackRemainingDistance`, che ne aveva uno temporaneo per i test.
- **Nessun banner di successo** (oc:8183): l'errore apre un `AlertController` nativo, come `deleteTrack()`; la chiusura del native share sheet è già segnale sufficiente. Gli stati `SUCCESS`/`ERROR` restano nella state machine `shareState$`, semplicemente non renderizzati.
- **Guardia doppio tap a due livelli** (oc:8183): `triggerShare()` non fa nulla se lo stato è già `GENERATING`, oltre al `[disabled]` sul bottone.

## Trappole verificate

- **Il metodo si chiama `pickNearestLayerFromFeatures(features, location, homeLayers)`**, non `getNearestLayer`, non riceve `OlMap`, e gestisce `RenderFeature` con `toFeature()` (oc:7639).
- **Il selettore è `currentEcLayer` in `user-activity.selector.ts`**: `currentLayer` non esiste (oc:7639).
- **Un CVA deve propagare il valore anche a form ricreato** (oc:7639): quando `WmFormComponent.setForm()` ricrea il `FormGroup`, Angular chiama `registerOnChange(newFn)`; se il `combineLatest` dello store non ri-emette, la nuova funzione non viene mai chiamata. `registerOnChange` propaga subito se `_lastResolvedLayer` è noto, e `_applyPreselection` chiama sempre `_onChange`, non solo quando il layer cambia visivamente.
- **`layer_id` top-level va estratto in tutti i componenti di salvataggio** (oc:7639): il flusso POI segnalazione usa `ModalSaveComponent`, non `ModalUgcUploaderComponent`. Entrambi devono usare `...(formValue?.layer_id != null && {layer_id: formValue.layer_id})`, per non mandare `layer_id: null` al backend.
- **`WmFormComponent.confPOIFORMS` accetta `null`** (oc:7639), dichiarato `any[] | null` con guard `if (forms == null) return`: in strict template `X | async` produce `T | null`, e tutti i template che usano `[confPOIFORMS]="obs$|async"` senza `?? []` dipendono da questo.
- **In `setForm()` il form group va costruito fuori dal `forEach`** (oc:7639): `this.formGroup = this._fb.group(formObj)`, `formGroupEvt.emit` e `isInvalidEvt.emit` stanno **dopo** il ciclo; dentro si accumula solo `formObj[field.name]`.
- **Subscription con `takeUntil(this._destroy$)`** in `WmFormComponent` (oc:7639): la gestione manuale con `Subscription` perdeva memoria, perché le vecchie `formGroup.valueChanges` non venivano mai chiuse al cambio form.
- **Test come istanza TS pura, non `TestBed`** (oc:8183): `ugc-track-properties.component.spec.ts` costruisce il componente con `new`, evitando il crash `NG0201` per `APP_TRANSLATION` mancante in DI (oc:8023). Con `new` però `ngOnInit()` non parte da solo: gli spec lo chiamano esplicitamente dopo aver impostato `instance.track`.
- **`_buildFormData()` gestisce già foto locali miste a foto sincronizzate** (oc:5125): filtra `media.filter(p => !p.id)` e le allega come `images[]` multipart nella stessa richiesta di update. Non serve logica aggiuntiva nella classe base.

## Fuori scope, per ragioni che restano valide

- **`draw-ugc.component.ts`** (oc:5125) usa `Photo[]` di Capacitor — foto locali mai sincronizzate — invece di `Media[]`: unificarlo forzerebbe un'astrazione fra tipi semanticamente distinti.
- **Il ticket oc:5125 citava componenti che non esistevano più**: `ModalSaveComponent` nel repo principale era già unificato con un flag `isWaypoint`, e la duplicazione vera era nel flusso di *editing* di UGC già sincronizzati.

## Debito noto

- **`slideOptions`, `isEditing$`, `confOPTIONS$`, `deletePoi()`/`deleteTrack()` restano duplicati identici** fra `ugc-poi-properties` e `ugc-track-properties` (oc:5125): il ticket copriva solo AddPhotos.
- **Il contratto Output/Input della condivisione non è stato validato contro `share.service.ts`** del repo principale (oc:8183): è una proposta lato wm-core.
