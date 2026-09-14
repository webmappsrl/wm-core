# Profilo altimetrico, distanza dalla posizione e dislivello

## Come funziona oggi

**Due badge nelle righe Partenza/Arrivo**, non una card dedicata. `wm-track-live-distance-badge` (componente condiviso) mostra la distanza dalla posizione GPS corrente alla partenza (`trackDistanceCovered`) e all'arrivo (`trackRemainingDistance`), integrati in `tab-detail.component.html`: il sentiero si può percorrere in entrambe le direzioni. Se `properties.from`/`to` mancano ma il flag è attivo e il dato GPS c'è, le righe restano visibili col solo badge.

**La proiezione GPS→traccia è scritta a mano**, in `GeoutilsService`: `_closestPointOnSegment`/`_findClosestPointAlongLine` lavorano su coordinate riproiettate in EPSG:3857. Il contesto geometrico (riproiezione + distanze cumulative) si calcola una volta per traccia e lo cachea il chiamante (`UserActivityEffects._currentTrackContext`).

**Il totale viene da una sola fonte**: `SlopeChartComponent` chiama `GeoutilsService.getHaversineTrackLength()` invece di accumularlo internamente.

**Su percorsi ad anello l'etichetta del dislivello è generica**: il valore resta sempre `properties.ascent`, cambia solo la chiave i18n (`slope` invece di `ascent`). Il numero non cambia.

La registrazione UGC riusa tutto questo senza nuovi calcoli: `UserActivityEffects.trackRemainingDistance$` non ha mai avuto un gate su `onRecord`. oc:8284 ha solo estratto il selettore condiviso `trackLiveDistanceVm` e alzato `REMAINING_DISTANCE_MAX_SPEED_MS` da 3 a 8 m/s.

## Perché così

- **Proiezione a mano invece di `LineString.getClosestPoint()` di OL** (oc:8177): serve l'indice di segmento e la possibilità di vincolare la ricerca a una finestra attorno all'ultimo `trackProgress` noto, per evitare oscillazioni su tracce ad anello o con tratti sovrapposti — comuni nei Cammini d'Italia. `getClosestPoint()` non espone né l'indice né un modo per limitare la ricerca.
- **Il contesto va cacheato** (oc:8177): passare la geometria grezza ad ogni fix GPS ripete O(n) di lavoro a ogni aggiornamento.
- **Palette blu fissa `#4285F4` per gli indicatori GPS live**, non `--wm-color-primary` (oc:8177): il marker "sei qui" sulla mappa è un PNG a colore fisso in `map-core`; un colore theme-driven altrove creerebbe incoerenza fra istanze con brand diversi. Lo stato "GPS non aggiornato" resta invece su `--wm-color-warning`, che è semantica e non brand.
- **La chiave `slope` è allineata alla radice di `ascent`/`descent`, non a quella di `pendenza`** (oc:8493): la prima traduzione copiava la parola già usata per il gradiente istantaneo del grafico in 5 lingue su 7, reintroducendo esattamente l'ambiguità che il ticket voleva togliere. Trovato in review adversariale. Corretto con de→`Höhenunterschied`, es→`Desnivel`, fr→`Dénivelé`, pr→`Elevação`, sq→`Lartësia`; it ed en erano già coerenti.
- **Chiavi i18n in italiano** (oc:8177): `'al termine del percorso'`, `'del percorso completato'`, `'Posizione GPS non aggiornata'` usano il testo italiano come chiave, non la forma inglese — pattern già presente (`'Filtri'`, `'Cerca'`) e richiesta esplicita.
- **Interfacce senza prefisso `I`** (oc:8177): `RemainingDistanceContext`, `RemainingDistanceResult`. Il team sta rimuovendo gradualmente la vecchia convenzione.

## Trappole verificate

- **Avvolgere `ion-note` in un `<div>` gli fa perdere il font-size ridotto** (oc:8177): Ionic lo applica solo ai figli diretti di `ion-item`. E `align-items:flex-start` va forzato via `::part(native)`, non sull'host.
- **Tre bug di Chart.js con una sola causa** (oc:8177): `options.events` non includeva `touchend`/`mouseout`, quindi il tooltip restava bloccato attivo. Da lì il marker GPS nascosto per sempre dopo un tocco (il timer di dismissal va agganciato a `onHover`, non a `beforeTooltipDraw`, che si rifà anche sugli update programmatici), la posizione errata da `CategoryScale.getPixelForValue()` che ignora l'indice (va letta da `chart.getDatasetMeta(0).data[index]`), e il pallino hover mai rimosso sulla mappa — quest'ultimo corretto in `map-core`.

## Debito noto

- **`OPTIONS.showTrackRemainingDistance` copre solo la card**, non marker e pendenza sul grafico (oc:8177), e ha un default client-side temporaneo `true` in `conf.reducer.ts` marcato `TODO(oc:8177)`: va portato a `false` prima del rollout definitivo.
- **Nessuna guardia runtime sull'invariante `ascent≈descent`** (oc:8493): un layer marcato `roundtrip:true` per errore editoriale fa implicare un'equivalenza che non c'è. Il flag è responsabilità del backoffice, non validato lato frontend.
- **Collisione inglese preesistente** (oc:8493): `pendenza`="Slope" e `ascent`="Slope +" condividevano già la parola prima del ticket. Non aggravata, non risolta.
- **`ugc-track-data.component.html` mostra sempre "ascent"** senza gestione `roundtrip` (oc:8493): contesto diverso, tracce utente invece di layer editoriali.
