# Passaporto del camminatore

## Come funziona oggi

Nell'istanza camminiditalia (app e webapp) la home del layer mostra l'avanzamento del cammino in
due punti: un **anello attorno al logo** e un **badge** «X% completato · N/M tappe percorse». Il
tap sul badge apre una **modale a tutto schermo** con il dettaglio del cammino (tappe e stato) e,
se il cammino non è completato e non c'è una richiesta in attesa, il pulsante **«Richiedi
certificazione»**: porta a un form con 1-6 foto della credenziale cartacea, il numero seriale
(opzionale) e un disclaimer. Dopo l'invio il dettaglio mostra «In revisione». La UI segue il
wireframe `webmapp-app/docs/features/passaporto-camminatore-wireframe.html` (viste 1, V0b-V3).

Tutto il codice sta in `projects/wm-core/src/passport/`:

- **`PassportService`** è l'unico punto che parla con il backend. Stato e invio della richiesta
  usano le rotte di camminiditalia (`GET` e `POST /api/layer/{layer}/certification`, `auth:api`):
  un 409 vuol dire richiesta già in attesa e l'app mostra «In revisione». Il **progresso delle
  tappe è ancora un mock** (deterministico per id del layer), perché il backend non ha la rotta.
  Il contratto è tipizzato in `@wm-types/passport`; il frontend converte `submitted_at` in
  `submittedAt`.
- **`visibleProgress(layerId)`** è l'unica regola di visibilità: `null` se l'utente non è loggato
  o il layer non ha tappe. La usano badge e anello, e non fa parte del mock.
- **Anello del logo:** direttiva `[wmPassportLogoRing]` sul logo esistente, non un componente che
  lo avvolge; i gradi passano in `--wm-passport-ring-deg`, lo stile sta nello SCSS della variante.
- **Colori e riquadri** del wireframe stanno in `passport/_passport-theme.scss`.
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
- **Il ciclo si chiude all'invio** (oc:8166): stati di approvazione e rifiuto, e i relativi tipi,
  arrivano con i ticket successivi. Una richiesta resta «In revisione» finché non esistono.
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

- **Dettaglio con componenti Ionic standard** (oc:8166, superata): `ion-chip` e `ion-list` non
  seguivano il wireframe; rifatto su V1/V3 dopo la verifica del developer.
- **Certificazione mockata in `localStorage`** (oc:8166, superata il 29/09): sostituita dalle API
  vere del backend camminiditalia, insieme ai comandi di prova da console `wmPassportMock`.
- **`getProgress` con `take(1)`** (oc:8166, superata): se il conteggio delle track non era ancora
  caricato, il badge non compariva più. Lo stream ora resta aperto.
- **Rischio aperto per il backend reale:** badge, anello e dettaglio chiamano ciascuno il
  progresso; con l'HTTP vero servirà una cache o una feature NgRx nel service.
