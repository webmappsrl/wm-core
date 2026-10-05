# Passaporto del camminatore

## Come funziona oggi

Nell'istanza camminiditalia (app e webapp) la home del layer mostra l'avanzamento del cammino in
due punti: un **anello attorno al logo** e un **badge** «X% completato · N/M tappe percorse». I
numeri sono le tappe che il gestore ha riconosciuto all'utente (oc:8676). Il tap sul badge apre una
**modale a tutto schermo** con il dettaglio del cammino: le tappe con ✓ e data per quelle percorse,
e il tocco su una tappa apre la sua pagina con stato e distanza. Se
il cammino non è completato e non c'è una richiesta in attesa, c'è il pulsante **«Richiedi
certificazione»**: porta a un form con 1-6 foto della credenziale cartacea, il numero seriale
(opzionale) e un disclaimer. Dopo l'invio il dettaglio mostra «In revisione»; quando il gestore
decide in Nova mostra l'esito, «Approvata» o «Non accettata», con la data, la nota del gestore se
c'è e il bottone «Invia una nuova richiesta» (dopo un'approvazione solo se il cammino non è
completo). La UI segue il wireframe `webmapp-app/docs/features/passaporto-camminatore-wireframe.html`
(viste 1, V0b-V3; gli esiti, viste E1–E5, oc:8671; il dettaglio con le tappe e la pagina della
tappa, viste 2 e 3, oc:8676).

Tutto il codice sta in `projects/wm-core/src/passport/`:

- **`PassportService`** è l'unico punto che parla con il backend. Stato e invio della richiesta
  usano le rotte di camminiditalia (`GET` e `POST /api/layer/{layer}/certification`, `auth:api`).
  Il `GET` restituisce l'**ultima** richiesta in qualunque stato: `none`, `pending`, `approved`,
  `rejected`, con `submitted_at`, `decided_at` e `decision_note`. Un 409 sul `POST` vuol dire
  richiesta già in attesa e l'app mostra «In revisione». Il `POST`, e solo quello, porta `Accept-Language` con la lingua
  scelta nell'app: il backend la salva sulla richiesta e la usa per la mail di esito. Il contratto
  è tipizzato in `@wm-types/passport`.
- **Progresso delle tappe** (oc:8676): `GET /api/layer/{layer}/progress`. Ogni tappa del cammino
  arriva con nome tradotto, distanza, `status` (`validated` / `not_validated`), `progress` 0-100,
  `validated_at` e `source`. I conteggi (`validated`, `total`, `percentage`, `completed`) li calcola
  il backend e l'app non li ricalcola. `not_validated` con `progress` > 0 diventa «in corso»: è la
  predisposizione per il GPS di oc:8165.
- **`progress$(layerId)`** è uno stream condiviso per layer (`shareReplay` con `refCount`):
  badge, anello e dettaglio fanno una sola richiesta. Si rilegge al `resume`, con
  `refreshProgress(layerId)` (chiusura della modale, rilettura del dettaglio) e quando qualcuno
  torna a guardarlo. Se una lettura fallisce riemette l'ultimo valore letto nella sessione, che si
  svuota al logout. Niente cache persistente.
- **Rilettura dello stato:** il dettaglio rilegge la richiesta all'apertura, al rientro dal form e
  a ogni `resume` dell'app (`PassportService.appResume$()`, su `@capacitor/app`). Tornando dalla
  pagina di una tappa non rilegge nulla. Un errore del `GET` resta dentro la singola rilettura: si
  tiene l'ultimo stato noto, e se fallisce la prima lettura la zona di stato resta vuota. Senza
  progresso il dettaglio mostra «Impossibile caricare le tappe» con «Riprova». Cosa mostrare (CTA,
  esito, rimando all'email, nuovo invio) lo decide il vm, non il template; il completamento viene
  da `completed` del backend.
- **Ordine delle tappe:** il backend non ha un ordine di percorrenza, quindi il dettaglio ordina
  per nome tradotto con confronto naturale (`sortStages`), e riordina al cambio lingua.
- **Pagina della tappa:** `wm-passport-stage-detail`, spinta nell'`ion-nav` come il form
  (`openStage`). Non è il dettaglio tappa della mappa (`wm-track-properties`), che lo stato non lo
  mostra ancora.
- **Nota del gestore:** `wm-passport-note`; aperta scorre al suo interno, perché il dettaglio non
  scorre e il bottone di nuovo invio deve restare visibile.
- **`visibleProgress(layerId)`** è l'unica regola di visibilità: `null` se l'utente non è loggato,
  se il layer non ha tappe o se non c'è mai stata una lettura riuscita. La usano badge e anello.
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
- **Dopo un nuovo invio l'app mostra solo l'ultima richiesta** (oc:8671): dell'approvazione
  precedente resta traccia nelle tappe riconosciute, non nello stato della richiesta.
- **Nome e distanza delle tappe nella risposta del progresso** (oc:8676): l'app non ha l'elenco
  completo delle tappe di un layer. Le `hits` di elastic sono il risultato dell'ultima ricerca, e
  con un testo o un filtro attivo restano poche tappe.
- **Contano tutte le tappe del cammino** (oc:8676, decisione del dev): il backend non esclude più le
  tappe con un proprietario diverso da quello del layer (oc:8314), che durante il lavoro arrivavano
  come `not_validatable`. È un errore di dati, che non
  deve pesare sull'utente finale. Le varianti contano nel totale: la regola di completamento è
  rimandata a oc:8165, e l'app non costruisce logiche proprie sulle varianti.
- **«Percorsa il …» con la data di validazione** (oc:8676, come nel wireframe): `validated_at` è il
  momento in cui il gestore approva, non quello della percorrenza. Con il GPS le due date
  coincideranno.
- **Stream condiviso senza cache persistente** (oc:8676): badge e anello restano autonomi, senza
  toccare la variante `home-layer.camminiditalia`. L'ultimo valore in memoria evita che offline il
  badge sparisca; si svuota al logout, altrimenti un secondo utente sullo stesso dispositivo
  vedrebbe le tappe del precedente.
- **Chiave di ordinamento con i due punti come spazi, non `ignorePunctuation`** (oc:8676):
  `ignorePunctuation` ignora anche gli spazi, e l'ordine fra tappa e variante dipendeva dalla
  parola che segue.
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
- **Progresso mockato** (oc:8166, superato da oc:8676): totale preso dal conteggio delle track del
  layer, tappe percorse decise da `layerId % 3`, nomi inventati («Tappa 01»). Sostituito dalla
  rotta `/progress` del backend.
- **Rimando all'email dopo un'approvazione** (oc:8671, superato da oc:8676): serviva perché le tappe
  riconosciute non erano esposte. Resta solo per il rifiuto senza nota.
- **«Nessuna tappa registrata via GPS»** (oc:8166, superato da oc:8676): con i dati veri le tappe
  arrivano solo dalla credenziale cartacea. Ora è «Nessuna tappa ancora riconosciuta».
