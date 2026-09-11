> Ticket: oc:8147

# Notes — Filtrare i POI per layer ID nella home

## Deviazioni dal piano

Nessuna deviazione significativa. Il piano è stato seguito esattamente.

## Bug trovati

Nessuno durante l'implementazione.

## Decisioni

- **`hasLayerIdData` usa `allEcpoiFeatures` non `taxonomyFiltered`**: il check della presenza di `properties.layers` viene fatto sulla collezione originale non filtrata. Questo garantisce che il rilevamento del tipo di server non sia influenzato dal risultato del taxonomy filter (che potrebbe restituire 0 elementi su un server nuovo con un layer senza tassonomie).
- **Test non eseguibili in isolamento**: `posthog-capacitor.client.spec.ts` ha errori TS preesistenti causati da una modifica al submodule `wm-types` (campo `appName` rimosso da `WmPosthogProps`). Questo impedisce di eseguire `ng test wm-core` localmente. Il file `utils.spec.ts` è stato verificato tramite ispezione logica e compilazione parziale — le aspettative coprono i 4 scenari principali (new server, legacy, guard NaN, multi-layer POI).

## Follow-up

- Il bug in `posthog-capacitor.client.spec.ts` (campo `appName` non più presente in `WmPosthogProps`) va risolto in un ticket separato o nella PR corrente del submodule `wm-types`.
- Valutare se aggiungere test Cypress E2E per verificare che selezionando un layer nella home i POI mostrati corrispondano esattamente a quelli associati per ID.
