> Ticket: oc:8166

# Passaporto camminatore: validazione credenziale cartacea

## Cosa cambia

Nell'istanza camminiditalia — app e webapp — la home del layer (cammino) mostra un **badge di
avanzamento** — «X% completato · N/M tappe percorse · tocca per i dettagli» — cliccabile. Il tap
apre una **modale a tutto schermo** con il **dettaglio del cammino**: numero di tappe percorse,
elenco delle tappe con il loro stato e, se il cammino non è completato e non c'è una richiesta in
attesa, il pulsante **«Richiedi certificazione»**.

Il pulsante porta, nella stessa modale, al **form di richiesta**: da 1 a 6 foto della credenziale
cartacea timbrata (fotocamera o galleria), un campo di testo libero opzionale per il seriale o
altre informazioni identificative, una checkbox di accettazione del disclaimer. All'invio la
richiesta parte verso il backend e il dettaglio mostra lo stato **«In revisione»** al posto del
pulsante.

Il ciclo si chiude **all'invio della richiesta**: approvazione, rifiuto e i relativi stati in app
arriveranno con i ticket successivi.

In questo ciclo **il backend non esiste ancora**: badge, dettaglio e form leggono e scrivono
attraverso un **service unico mockato**, con un contratto API ipotizzato e dati variabili, che
verrà sostituito dall'implementazione reale quando il backend camminiditalia (ticket collegato)
sarà pronto.

## Perché

Non tutti i camminatori registrano il percorso con l'app: la credenziale cartacea timbrata alle
tappe è il sistema tradizionale di certificazione, e il passaporto digitale deve poterla
riconoscere. Il flusso è stato validato dal cliente il 03/09 sul wireframe
(`webmapp-app/docs/features/passaporto-camminatore-wireframe.html`, flusso V0–V3; i vincoli del
wireframe su numero di foto e seriale sono superati dalle decisioni sotto).

Nella call del 28/09 si è deciso di partire da questo flusso perché è manuale: permette di
costruire la UI del passaporto senza affrontare subito la logica automatica di completamento
tappe (oc:8165), rimandata a uno step successivo, e di lavorare sul frontend con le chiamate
mockate.

## Requisiti

- [ ] **La UI segue il wireframe** pubblicato su https://webmappsrl.github.io/webmapp-app/index.html
  (copia in `webmapp-app/docs/features/passaporto-camminatore-wireframe.html`), flusso
  «Validazione credenziale cartacea», viste V0b, V1, V2, V3. Fanno eccezione solo il seriale, che
  non è obbligatorio, e il massimo di foto, che è una costante.

### Badge di avanzamento (home del layer, solo camminiditalia)

- [ ] La variante `home-layer.component.camminiditalia.ts` riceve un template proprio,
  `home-layer.component.camminiditalia.html`, sullo schema già usato da `search-bar`: copia del
  template condiviso più il badge. La logica comune resta in `WmHomeLayerBaseComponent`; il
  template condiviso e la classe base restano identici per tutti gli altri shard.
- [ ] Il badge è un **componente autonomo**, che si inietta da sé service e store: il costruttore
  della variante non cambia.
- [ ] Le «tappe» sono le track del layer. In camminiditalia ogni layer con track è un cammino; se
  il layer non ha track il badge non compare.
- [ ] Il badge è visibile solo all'utente loggato (`isLogged`); per l'utente non loggato la home
  del layer resta com'è oggi.
- [ ] Testo: «{percentuale}% completato» e «{percorse}/{totale} tappe percorse · tocca per i
  dettagli», dai dati del service.
- [ ] Tap sul badge → apre la modale di dettaglio del layer corrente.

### Dettaglio del cammino (modale a tutto schermo)

- [ ] Modale Ionic a tutto schermo con `ion-nav` interno: il dettaglio è la radice, il form viene
  spinto sopra; la chiusura riporta alla home del layer intatta.
- [ ] All'apertura il dettaglio **verifica in automatico se esiste una richiesta di
  certificazione inviata** per quel layer (chiamata di stato dedicata, mockata).
- [ ] Mostra nome del cammino, «{percorse} di {totale} tappe» e un sottotitolo che dipende dallo
  stato (nessuna tappa percorsa / tappe restanti).
- [ ] Elenco delle tappe con lo stato di ciascuna: percorsa (con data), in corso (con
  percentuale), non percorsa.
- [ ] Pulsante «Richiedi certificazione» con il testo di supporto del wireframe, visibile solo se
  il cammino non è completato e non c'è una richiesta in attesa.
- [ ] Con una richiesta in attesa: al posto del pulsante un chip «In revisione» con la data di
  invio e l'indicazione che l'esito arriverà via email.
- [ ] Con il cammino completato: nessun pulsante.

### Form di richiesta

- [ ] Upload foto con `WmImagePickerComponent`: minimo **1** foto obbligatoria, massimo **6**, il
  massimo in una costante esportata passata a `maxPhotos`. Il form valida da sé minimo e massimo
  prima di abilitare l'invio.
- [ ] Le foto del form sono acquisite con **larghezza massima 1600px e `quality` 80**, e scattare
  una foto **non accende il GPS**. Il salvataggio in galleria resta attivo, come oggi. Le opzioni
  si passano come parametri opzionali ai metodi di `CameraService`, con default invariati per gli
  altri usi.
- [ ] Campo di testo libero **opzionale** per seriale o informazioni identificative della
  credenziale (decisione del 03/09: il seriale non è mai obbligatorio).
- [ ] Checkbox di accettazione del disclaimer, non preselezionata, obbligatoria per l'invio; il
  testo è una chiave i18n con un contenuto segnaposto, da sostituire con il testo legale quando
  sarà disponibile.
- [ ] Se l'utente non ha dato il consenso privacy generale l'invio è bloccato, usando il selettore
  `needsPrivacyAgree` e `WmPrivacyAgreeButtonComponent` già esistenti.
- [ ] Invio solo online: se la chiamata fallisce, messaggio d'errore generico («riprova») e le
  foto restano nel form; nessuna coda offline.
- [ ] Con foto non inviate, chiudere la modale o tornare al dettaglio chiede conferma; il back
  hardware di Android dal form torna al dettaglio, non chiude la modale. Nessuna persistenza delle
  foto fra sessioni.
- [ ] Dopo l'invio riuscito si torna al dettaglio, che mostra lo stato «In revisione».

### Correzione di `WmImagePickerComponent` (vale anche per gli UGC)

- [ ] `pickImages` riceve un `limit` pari ai posti rimasti.
- [ ] Il controllo sul numero massimo regge anche con più foto scelte insieme dalla galleria e
  vale anche per `takePhoto()`: oggi il limite (`MAX_PHOTOS = 3` negli UGC) si può superare.

### Service del passaporto (mock)

- [ ] Un unico service di wm-core espone tre operazioni, con un contratto API ipotizzato:
  progresso del cammino (tappe percorse, totale, stato di ogni tappa), stato della richiesta di
  certificazione (`GET /api/layer/{layer}/certification`: nessuna richiesta / in attesa, con data
  di invio) e invio (`POST /api/layer/{layer}/certification`, multipart con foto e testo libero).
- [ ] Il contratto è tipizzato in `wm-types` **solo con gli stati usati adesso** (nessuna
  richiesta, in attesa) e documentato in `notes.md`, come base del ticket backend collegato.
- [ ] Il mock è **dichiarato come tale nel codice**, con un commento che dice che verrà sostituito
  dall'implementazione reale e da quale ticket.
- [ ] Il progresso mock varia in modo deterministico per id del layer (0%, parziale, 100%).
- [ ] La richiesta inviata col mock è salvata in `localStorage` per id del layer, così che la
  verifica di stato risponda «in attesa» anche dopo un reload; il mock ha un reset per i test e
  può simulare un errore d'invio.
- [ ] Il passaggio dal mock al backend reale tocca solo il service, non componenti né store.

### Trasversali

- [ ] Ogni stringa nuova ha la chiave in italiano e la traduzione in tutti i sette file di
  `localization/i18n/` (it, en, de, fr, pr, es, sq).
- [ ] Spec unitari su service mock, picker e componenti, in tutti gli stati: 0%, parziale, 100%,
  in attesa, nessuna richiesta, layer senza track, utente non loggato, consenso mancante, minimo e
  massimo foto, selezione multipla oltre il limite, errore d'invio, uscita con foto non inviate.
- [ ] Verifica manuale su `ng serve --configuration=camminiditalia` nell'app **e nella webapp**
  (`wm-webapp`, dove la foto passa dal selettore di file del browser), in tutti gli stati del
  mock.
- [ ] [UX] Durante l'invio il pulsante è disabilitato e mostra un loader; dopo, un esito esplicito
  di successo o di errore. Nessun invio doppio.
- [ ] [UX] Ogni foto scelta ha l'anteprima e si può rimuovere.
- [ ] [UX] Il campo di testo ha una label visibile e un testo di aiuto, non solo il placeholder.
- [ ] [UX] Gli errori (foto mancante, disclaimer non accettato) compaiono vicino al campo.
- [ ] [UX] Il chip «In revisione» porta testo e icona, non solo un colore; i target tattili sono
  di almeno 44px.

## Rischi

- **Mock e disclaimer segnaposto in produzione.** Senza un flag, una build camminiditalia con
  questo codice mostrerebbe dati inventati e raccoglierebbe foto di documenti verso un backend
  inesistente. Mitigazione: il lavoro vive sul branch dedicato `Passaporto` (app e submodule) e
  si unisce al resto solo quando è testato e completo, backend compreso.
- **Contratto API ipotizzato.** Il mock fissa una forma dei dati che il backend potrebbe non
  rispettare. Mitigazione: contratto scritto in `wm-types`, limitato agli stati usati, e in
  `notes.md`; riportato nel ticket backend collegato; mock confinato nel service.
- **Dipendenza da oc:8165.** Il numero di tappe percorse è un dato di oc:8165, oggi inesistente:
  il badge mostra dati veri solo quando entrambi i backend esistono.
- **Template della variante copiato.** Le correzioni future al template condiviso di `home-layer`
  (28 righe) vanno riportate a mano nella variante camminiditalia, come già per `search-bar`.
- **Correzione del picker condivisa con gli UGC.** Il fix su `WmImagePickerComponent` cambia il
  comportamento di tutti i form UGC: coperto da spec sulla selezione multipla.
- **Anche la webapp riceve il passaporto**, tramite il proprio `fileReplacements` su
  `home-layer.component.camminiditalia.ts`: va verificata e aggiornata sul branch dedicato.
- **Richiesta in attesa a tempo indeterminato.** Senza stati di approvazione o rifiuto in app, la
  richiesta resta «In revisione» e il pulsante non ricompare. Accettato: si chiude con i ticket
  successivi.
- **Codice del passaporto nel bundle di tutti gli shard**, come per le altre varianti
  camminiditalia in wm-core: peso minimo, eseguito solo dalla variante. Accettato.

## Out of scope

- Backend camminiditalia: modello, migration, endpoint, sezione «validazioni» del gestore, email
  di notifica — va in un ticket collegato.
- Stati di approvazione e rifiuto in app, logica decisionale e sblocco delle tappe (rimandati il
  28/09); gestione differenziata degli errori HTTP.
- Calcolo automatico del completamento via GPS (oc:8165).
- Tab «Passaporto» del profilo, celebrazione del completamento e condivisione (viste 5b, 6, 7 del
  wireframe).
- Coda offline per l'invio e persistenza delle foto fra sessioni.
- Configurazione del massimo di foto da `config.json` e flag di attivazione in `OPTIONS`.
- Verifica su dispositivo di fotocamera e galleria, rimandata a quando esisterà il backend.
- OCR del seriale.

## Moduli toccati

**wm-core** (`projects/wm-core/src/`):

- `home/home-layer/home-layer.component.camminiditalia.ts` — punta al template proprio
- `home/home-layer/home-layer.component.camminiditalia.html` — nuovo: copia del template
  condiviso più il badge
- `home/home-layer/home-layer.component.camminiditalia.scss` — eventuali aggiustamenti
- `home/home-layer/home-layer.component.camminiditalia.spec.ts` — casi del badge
- nuova cartella per il passaporto: badge, modale di dettaglio, form, service con
  l'implementazione mock, costanti, spec
- `image-picker/image-picker.component.ts` e il suo spec — correzione del limite
- `services/camera.service.ts` — parametri opzionali per larghezza, qualità e GPS
- `localization/i18n/*.ts` — chiavi nuove nei sette file
- modulo di wm-core che dichiara i componenti nuovi

**wm-types**: tipi del contratto API (vedi
`wm-types/docs/features/8166-passaporto-camminatore-validazione-credenziale-cartacea/overview.md`).

**webmapp-app** e **wm-webapp**: nessuna modifica al codice. Il `fileReplacements` della
configuration camminiditalia su `home-layer.component.ts` esiste già in entrambi; resta
l'aggiornamento dei submodule sul branch `Passaporto`.
