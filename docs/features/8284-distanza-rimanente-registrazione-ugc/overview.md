> Ticket: oc:8284

# Distanza rimanente durante la registrazione traccia UGC

## Cosa cambia

Nessuna nuova logica di calcolo in wm-core. Verificato che `UserActivityEffects.trackRemainingDistance$` (oc:8177, `store/user-activity/user-activity.effects.ts`) calcola già `trackDistanceCovered`/`trackRemainingDistance`/`trackPositionStale` combinando `GeolocationService.onLocationChange$` con il selettore `ec.currentEcTrack` — **senza alcun gating su `onRecord`/modalità**: il calcolo è già attivo, live, ogni volta che una traccia è selezionata, indipendentemente dal fatto che l'utente stia registrando, navigando o nient'altro. Il box di registrazione (repo principale) legge quindi direttamente questi selettori già pubblici (`user-activity.selector.ts`), senza alcuna modifica a wm-core per il calcolo delle distanze.

Innalzamento della costante `REMAINING_DISTANCE_MAX_SPEED_MS` (`constants/track-remaining-distance.ts`) da 3 a 8 m/s, per rendere plausibili anche spostamenti in bici durante la registrazione UGC (il repo contiene già un GPX di test per un percorso in bici a 18km/h) — decisione presa in Fase: challenge con lo sviluppatore, non trattata nella call con il CTO ma comunque valida. È una modifica cross-cutting: si applica anche al calcolo esistente in visualizzazione (oc:8177).

**Aggiunta a posteriori (dopo verifica su device reale del box di registrazione, vedi overview lato `core`)**: nuovo `@Input() showSuffix: boolean = true` su `WmTrackLiveDistanceBadgeComponent` (`track-live-distance-badge/`). A `false`, il badge mostra solo la distanza formattata, senza il suffisso `" da te"` che il componente aggiunge di default. Default `true` per non alterare l'unico uso esistente (`tab-detail.component.html`, oc:8177) — nessuna modifica richiesta lì. Il box di registrazione (repo principale) passa `[showSuffix]="false"`, perché l'etichetta "PARTENZA"/"ARRIVO" già dà il contesto e "da te" risultava ridondante.

## Perché

Riuso deliberato dell'architettura esistente invece di introdurne una nuova. Revisione con il CTO (call del 22/07/2026, trascrizione condivisa) ha corretto un'impostazione iniziale eccessivamente elaborata — uno stato dedicato `recordingEcTrackId` con pin/sostituzione-in-corsa/persistenza su localForage/retry automatico — perché il dato necessario è già disponibile e calcolato: l'unico lavoro reale è di visualizzazione (vedi overview lato `core`).

## Requisiti

- [ ] `REMAINING_DISTANCE_MAX_SPEED_MS` (`constants/track-remaining-distance.ts`) alzata da 3 a 8 m/s
- [ ] `WmTrackLiveDistanceBadgeComponent`: nuovo `@Input() showSuffix = true` — a `false` omette il suffisso `" da te"` dal testo del badge, mostrando solo la distanza formattata. Nessun impatto sull'uso esistente in `tab-detail.component.html` (default `true`, nessuna modifica al chiamante)

## Rischi

- **Modifica di `REMAINING_DISTANCE_MAX_SPEED_MS` è cross-cutting** — alzarla per il caso bici della registrazione modifica anche il comportamento esistente in visualizzazione (oc:8177); rischio ritenuto basso (la soglia più alta rende la ricerca locale plausibile più spesso, non introduce falsi negativi), ma da verificare in test manuale su una traccia in visualizzazione dopo il merge, non solo sulla registrazione

## Out of scope

- **Qualsiasi stato dedicato alla registrazione** (pin, sostituzione in corsa, persistenza su localForage, retry automatico, fetch/cache dedicati) — esplicitamente respinto dal CTO in review: "il dato ce l'abbiamo già presente nel dettaglio, non lo dobbiamo calcolare, vogliamo solo visualizzarlo lì". Introdurre questo stato "crea una forte dipendenza da gestire in tutti i casi, altrimenti c'è il bug" (citazione dalla call)
- **Gestione esplicita del cambio/deselezione traccia durante la registrazione** (switch da una tappa all'altra, deselezione manuale, ecc.) — comportamento naturale della cascata di condizioni già esistente sul selettore `currentEcTrack`, nessuna logica ad-hoc. Se l'utente chiude il pannello traccia, i due valori smettono di essere disponibili anche nel box di registrazione — stesso comportamento di oggi in `tab-detail.component.html`, **confermato esplicitamente dallo sviluppatore dopo la call**: nessuna eccezione/persistenza per lo stato di registrazione
- Auto-detezione/suggerimento di tracce nelle vicinanze quando nessuna traccia è selezionata
- Nuova UI di selezione traccia dedicata al flusso di registrazione
- Marker di posizione sul profilo altimetrico durante la registrazione
- Modifica della soglia di 100m (`REMAINING_DISTANCE_OFF_TRACK_THRESHOLD_M`, riusata identica a oc:8177)
- Feature flag/kill-switch runtime
- Qualunque modifica a `GeolocationService`, `store/user-activity/` (oltre a nessuna azione/reducer/selector/effect nuovo), `utils/localForage.ts`, `store/features/ec/ec.effects.ts`

## Moduli toccati

**wm-core (submodule):**
- `projects/wm-core/src/constants/track-remaining-distance.ts` — `REMAINING_DISTANCE_MAX_SPEED_MS` da 3 a 8 m/s
- `projects/wm-core/src/track-live-distance-badge/track-live-distance-badge.component.ts` / `.html` — nuovo `@Input() showSuffix` (aggiunta a posteriori, vedi "Cosa cambia")
