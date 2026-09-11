> Ticket: oc:8159

# Notes — Tracciamento bacino di utenza per cammino — user_id in PosthogContextService (wm-core)

## Deviazioni dal piano

- **Fix di isolamento test non previsto dal piano**, scoperto durante lo Step 4 del Task 2 (esecuzione della suite completa): i 3 test scritti nel Task 1 passavano da soli ma fallivano (2× `Cannot configure the test module when the test module has already been instantiated`, 1× `TypeError` a catena) quando eseguiti dentro l'intera suite di 226 test. Causa: `posthog-capacitor.client.spec.ts` (unico altro spec del repo) chiama `TestBed.resetTestingModule()` manualmente in un punto atipico (dentro il corpo sincrono di un `it()`, non in un hook), lasciando il `TestBed` in uno stato che il nuovo `describe` eredita come "già istanziato". Verificato con evidenza diretta (instrumentazione diagnostica temporanea, poi rimossa) che il problema è indipendente dalla logica `user_id` (riprodotto identico stashando l'implementazione). Fix: una riga difensiva `TestBed.resetTestingModule()` a inizio `beforeEach` nel nuovo file soltanto — nessuna modifica al file preesistente. Verificato 226/226 su più run, incluso ordine random di default.
- **NEEDS_CONTEXT nel Task 1**: il brief originale non anticipava che `GeolocationService` (`providedIn: 'root'`) avrebbe fatto fallire il `TestBed` con `NG0201` (catena `GeolocationService → DeviceService → APP_VERSION` non risolvibile in un `TestBed` isolato) — `Injector.get(GeolocationService, null)` non ritorna il default quando un provider reale esiste. Risolto fornendo uno stub diretto (`{provide: GeolocationService, useValue: {location: null}}`) invece di mockare l'intera catena di dipendenze transitive.

## Bug trovati

Il problema di isolamento `TestBed` sopra descritto è un bug pre-esistente nella suite di test di wm-core (non introdotto da questa feature, ma mai emerso prima perché nessun altro spec file era mai stato eseguito subito dopo `posthog-capacitor.client.spec.ts` in un ordine che lo esponesse). Mitigato localmente; non risolto alla radice nel file preesistente (vedi Follow-up).

## Decisioni

Tutte le decisioni seguenti sono state prese esplicitamente dal developer durante `reverse-interaction`/`challenge` di `wm-plan`, prima dell'implementazione — riportate qui per traccia, coerenti con `overview.md`:

- **Niente `identify()` in questo ciclo** — solo un commento `TODO(oc:8159)` nel punto pertinente. Valutato e scartato dopo discussione su vantaggi (merge cross-device) vs costo (grafo di identità persistente in PostHog).
- **Scope volutamente ampio**: `user_id` popolato nel `combineLatest` condiviso (`_buildContext()`), quindi si applica a **tutti** gli eventi capturati, non solo `userMoved`/GPS. Confermato esplicitamente dal developer dopo che l'analisi adversariale ha quantificato l'ampiezza reale (22 call site di `capture()` coinvolti, verificato in review finale).
- **Nessuna modifica ad `AnalyticsService`/query HogQL lato `wm-package`** — il dato non viene consumato da nessuna query in questo ciclo (chiarito esplicitamente dopo un'iniziale ambiguità nel dialogo: la richiesta era "aggiungere `user_id` alle properties di PostHog", non "cambiare il conteggio del bacino di utenza").
- **Nessun gate di consenso privacy dedicato** (`hasPrivacyAgree`) — coerente con l'assenza di gate su tutto il resto di PostHog nell'app oggi. Riconfermato esplicitamente anche dopo che l'analisi adversariale ha quantificato l'ampiezza dello scope (punto sopra), che ne aumenta il peso.
- **Nessun flag `OPTIONS` di gating per-shard** — il campo è sempre attivo su tutte le istanze, non solo `camminiditalia` (da cui è nata la richiesta in call).
- **Comportamento reattivo istante-per-istante, nessuna gestione speciale** per il rehydrate asincrono dello store `auth` all'avvio né per un login/logout a metà di una traccia GPS — accettato come comportamento naturale del pattern `combineLatest`/snapshot esistente.
- **Nessuna azione per device condivisi/multi-account** (limitazione nota, accettata, collegata al TODO `identify()`).

## Follow-up

- **Rischio di privacy/de-anonimizzazione della vista live-position** (Nova/wm-package): il ticket originale oc:8159 promette "marker anonimi" per quella vista; `user_id` la rende potenzialmente de-anonimizzabile lato backend per gli utenti loggati. Nessuna mitigazione in questo ciclo (decisione esplicita) — da ridiscutere quando/se wm-package arriverà a consumare questo campo.
- **`posthog-capacitor.client.spec.ts` resta l'unico file della suite con un pattern di `TestBed.resetTestingModule()` atipico** (dentro il corpo sincrono di un `it()`). Non toccato in questo ciclo (fix minimo nel file nuovo sufficiente, nessun altro file replica il pattern). Da normalizzare in un ciclo futuro se altri nuovi spec dovessero manifestare lo stesso sintomo.
- **Copertura di test opzionale non aggiunta** (segnalata in review finale, non bloccante): un test che verifichi esplicitamente la precedenza delle props esplicite su `user_id` di contesto in caso di override accidentale, e un test che verifichi la coesistenza di `user_id` con `layer_id`/`track_id` nello stesso evento.
- `CLAUDE.md` del repo aggiornato con la riga "Feature disponibili" e una voce "Decisioni architetturali" per oc:8159 in questo stesso ciclo (vedi Fase: update-context).
