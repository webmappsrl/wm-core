# Passaporto del camminatore

## Come funziona oggi

Nell'istanza camminiditalia (app e webapp) la home del layer mostra l'avanzamento del cammino in
due punti: un **anello attorno al logo** e un **badge** «X% completato · N/M tappe percorse». Il
tap sul badge apre una **modale a tutto schermo** con il dettaglio del cammino (tappe e stato) e,
se il cammino non è completato e non c'è una richiesta in attesa, il pulsante **«Richiedi
certificazione»**: porta a un form con 1-6 foto della credenziale cartacea, il numero seriale
(opzionale) e un disclaimer. Dopo l'invio il dettaglio mostra «In revisione»; quando il gestore
decide in Nova mostra l'esito, «Approvata» o «Non accettata», con la data, la nota del gestore se
c'è e il bottone «Invia una nuova richiesta» (dopo un'approvazione solo se il cammino non è
completo). La UI segue il wireframe `webmapp-app/docs/features/passaporto-camminatore-wireframe.html`
(viste 1, V0b-V3; gli esiti, viste E1–E5, oc:8671).

Tutto il codice sta in `projects/wm-core/src/passport/`:

- **`PassportService`** è l'unico punto che parla con il backend. Stato e invio della richiesta
  usano le rotte di camminiditalia (`GET` e `POST /api/layer/{layer}/certification`, `auth:api`).
  Il `GET` restituisce l'**ultima** richiesta in qualunque stato: `none`, `pending`, `approved`,
  `rejected`, con `submitted_at`, `decided_at` e `decision_note`. Un 409 sul `POST` vuol dire
  richiesta già in attesa e l'app mostra «In revisione». Il `POST`, e solo quello, porta `Accept-Language` con la lingua
  scelta nell'app: il backend la salva sulla richiesta e la usa per la mail di esito. Il
  **progresso delle tappe è ancora un mock** (deterministico per id del layer), perché il backend
  non ha la rotta. Il contratto è tipizzato in `@wm-types/passport`.
- **Rilettura dello stato:** il dettaglio rilegge la richiesta all'apertura, al rientro nell'`ion-nav`
  e a ogni `resume` dell'app (`PassportService.appResume$()`, su `@capacitor/app`). Un errore del
  `GET` resta dentro la singola rilettura: si tiene l'ultimo stato noto, e se fallisce la prima
  lettura la zona di stato resta vuota. Cosa mostrare (CTA, esito, rimando all'email, nuovo invio)
  lo decide il vm, non il template.
- **Nota del gestore:** `wm-passport-note`; aperta scorre al suo interno, perché il dettaglio non
  scorre e il bottone di nuovo invio deve restare visibile.
- **`visibleProgress(layerId)`** è l'unica regola di visibilità: `null` se l'utente non è loggato
  o il layer non ha tappe. La usano badge e anello, e non fa parte del mock.
- **Anello del logo:** direttiva `[wmPassportLogoRing]` sul logo esistente, non un componente che
  lo avvolge; i gradi passano in `--wm-passport-ring-deg`, lo stile sta nello SCSS della variante.
- **Colori, riquadri e mixin dei riquadri di stato** stanno in `passport/_passport-theme.scss`.
- **Modale:** `ion-nav` con il dettaglio come radice e il form sopra. Il back hardware (priorità
  101) chiude prima un eventuale alert aperto, poi dal form torna al dettaglio, poi chiude. Il form
  si registra come guard sulla modale: con foto non inviate ogni uscita chiede conferma.
- **Foto:** `WmImagePickerComponent` con `captureOptions` (1600px, qualità 80, senza accendere il
  GPS); salvataggio in galleria attivo per scelta del developer.

## Perché così

- **Un service unico davanti al backend** (oc:8166, call del 28/09/2026): il frontend è nato con il
  backend mockato; il passaggio alle API vere di stato e invio (29/09) ha toccato solo il service.
- **Nessun flag di attivazione** (oc:8166): la protezione contro l'uscita del mock è il branch
  dedicato `Passaporto`, unito al resto solo a lavoro completo, backend compreso.
- **Solo l'esito, non le tappe riconosciute** (oc:8671): il backend non espone le tappe validate,
  quindi dopo un'approvazione anello e lista non cambiano e il dettaglio rimanda all'email, che le
  elenca. L'endpoint va chiesto insieme alla validazione GPS (oc:8165). Dopo un nuovo invio l'app
  mostra solo l'ultima richiesta, e dell'approvazione precedente non resta traccia in app.
- **`Accept-Language` solo sull'invio** (oc:8671): un header globale cambierebbe le risposte di
  ogni backend e di ogni istanza. Il valore è il codice interno della lingua, quindi `pr` per il
  portoghese, che il backend non supporta comunque (ricade su `it`).
- **`resume` di `@capacitor/app`, non `DeviceService.onForeground`** (oc:8671): `onForeground`
  ascolta `document 'resume'`, che nel browser non arriva, ed è un `ReplaySubject(1)` che
  emetterebbe appena ci si iscrive. L'implementazione web di `@capacitor/app` ascolta
  `visibilitychange`, quindi la rilettura funziona anche sulla webapp.
- **Seriale sempre opzionale** (call del 03/09 con il cliente): non tutti i cammini lo hanno. Nel
  multipart il campo è `serial_number`; il campo libero per «altre informazioni» è stato tolto
  (oc:8166).
- **Direttiva e non componente per l'anello** (oc:8166): i selettori della variante di
  `wm-home-layer` presuppongono il logo figlio diretto di `wm-img`.
- **`ion-nav` con `setRoot()` in `ngAfterViewInit`** (oc:8166): con i binding `[root]`/`[rootParams]`
  il dettaglio a volte nasceva vuoto (vedi la rule `modali-e-ion-nav`).
- **Invio solo online, niente coda** (oc:8166): la richiesta si fa a cammino finito; le foto
  restano nel form se l'invio fallisce.

## Come ci siamo arrivati

- **Il ciclo si chiudeva all'invio** (oc:8166, superata da oc:8671): approvata e rifiutata valevano
  come «nessuna richiesta», e dopo la decisione l'utente rivedeva la CTA iniziale senza sapere che
  il gestore aveva risposto.
- **Chiavi di traduzione `passport.*`** (oc:8166, superata da oc:8671): convertite al testo
  italiano su richiesta del dev, per seguire la convenzione del resto di wm-core.
- **Dettaglio con componenti Ionic standard** (oc:8166, superata): `ion-chip` e `ion-list` non
  seguivano il wireframe; rifatto su V1/V3 dopo la verifica del developer.
- **Certificazione mockata in `localStorage`** (oc:8166, superata il 29/09): sostituita dalle API
  vere del backend camminiditalia, insieme ai comandi di prova da console `wmPassportMock`.
- **`getProgress` con `take(1)`** (oc:8166, superata): se il conteggio delle track non era ancora
  caricato, il badge non compariva più. Lo stream ora resta aperto.
- **Rischio aperto per il backend reale:** badge, anello e dettaglio chiamano ciascuno il
  progresso; con l'HTTP vero servirà una cache o una feature NgRx nel service.
