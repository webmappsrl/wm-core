> Ticket: oc:8166

# Notes — Passaporto camminatore: validazione credenziale cartacea

## Contratto API ipotizzato

Tipi in `@wm-types/passport` (`wm-types/src/passport.ts`); implementazione mock in
`projects/wm-core/src/passport/passport.service.ts`. Base del ticket backend collegato.

| Operazione | Rotta | Richiesta | Risposta |
|---|---|---|---|
| Progresso del cammino | `GET /api/layer/{layer}/progress` | — | `PassportProgress`: `layerId`, `totalStages`, `completedStages`, `percent` (0-100), `stages[]` con `trackId`, `name`, `status` (`completed` / `in_progress` / `not_started`), `completedAt?`, `percent?` |
| Stato della richiesta | `GET /api/layer/{layer}/certification` | — | `PassportCertification`: `layerId`, `status` (`none` / `pending`), `submittedAt?` (ISO 8601) |
| Invio della richiesta | `POST /api/layer/{layer}/certification` | multipart: `images[]` (1-6 immagini), `serial_number` (opzionale), `disclaimer_accepted` | `PassportCertification` con `status: pending` |

Le chiamate vanno verso `EnvironmentService.origin` e ricevono `App-id` e `Authorization` da
`AuthInterceptor`, come le altre chiamate dello shard. Gli stati `approved` e `rejected` non fanno
parte di questo ciclo.

**Mock:** il totale delle tappe è il numero reale di track del layer (`layerFeaturesTotalCount`);
le tappe percorse dipendono dall'id del layer (resto della divisione per 3: 0%, 64%, 100%). Le
richieste inviate stanno in `localStorage` sotto `wm-passport-mock-certifications`. Da console:
`wmPassportMock.simulateSubmitError = true` fa fallire gli invii, `wmPassportMock.resetMock()`
cancella le richieste.

## Divergenze dal piano, task per task

### Task 1

compilato con `tsc --noEmit` invece di `npm run build`, per non generare `dist/`.

### Task 2

nel test la spia è su `CameraWeb.prototype.getPhoto` e non su `Camera.getPhoto`: `Camera` è un Proxy di Capacitor e una spia messa lì non intercetta la chiamata.

### Task 4

le letture e scritture di `localStorage` del mock avvengono dentro `defer()`, cioè a ogni subscribe, così il dettaglio rilegge davvero lo stato quando torna in primo piano. Dopo la review finale `getProgress` non usa più `take(1)`: lo stream resta aperto e riemette quando arriva il conteggio delle track (con `distinctUntilChanged`). Chi sostituirà il mock deve sapere che badge e anello si aspettano uno stream che resta aperto. La chiave `localStorage` del mock è passata dalle costanti al file del service, e la regola di visibilità (loggato e con tappe) è diventata `visibleProgress()`, condivisa da badge e anello.

### Task 5

aggiunta anche la chiave `Indietro`, che non esisteva ed è usata dal form. Dopo la verifica sul wireframe sono state tolte `passport.stage.completed` e `passport.stage.notStarted`, non più usate, ed è stata aggiunta `passport.form.notesPlaceholder`: le chiavi `passport.*` sono ora **22** per file, non 23 come dice il passo 2 del piano.

### Task 6

niente test sui metadati compilati della variante (`ɵcmp`): il template proprio è verificato dalla build AOT camminiditalia. Il badge non usa `@Input() set layerId` come nel piano ma un input `string | number | null` convertito con `toLayerId()` (`passport.utils.ts`), la stessa funzione usata dall'anello del logo. `ngOnChanges` ricrea lo stream solo se cambia `layerId`.

### Task 7

`PassportLeaveGuard` sta in `passport/passport-leave-guard.ts` invece che nel file della modale, per evitare l'import circolare fra modale e form. La modale importa il form direttamente.

### Task 8

`submit()` esce subito se un invio è già in corso. Il test di `openForm` nella modale è stato scritto insieme al collegamento con il form, senza vederlo fallire prima. `_logged` parte da `false` e non da `true` come nel piano: finché lo store non conferma il login l'invio resta bloccato.

### Task 9

il lint non si è potuto eseguire (vedi «Bug trovati»); la verifica manuale su `ng serve` e sulla webapp resta al developer.

## Bug trovati

- **Trovato dal developer nella verifica manuale, corretto:** a volte il dettaglio si apriva
  vuoto («0 di 0 tappe», titolo assente) e la freccia non chiudeva più la modale. Causa: i binding
  `[root]`/`[rootParams]` su `ion-nav`. Il watcher di Ionic su `root` chiama
  `setRoot(root, rootParams)` appena `root` cambia; se l'elemento è già idratato quando Angular
  assegna `root` (che nel template viene prima), `rootParams` è ancora `undefined` e il dettaglio
  nasce senza layer, titolo e host. Dipende dai tempi di idratazione, per questo era
  intermittente. Ora la radice si imposta con `nav.setRoot(detail, params)` in
  `ngAfterViewInit`, con un test che lo verifica. È una trappola da riportare nelle rule.
- **Emersi dalla review finale e corretti**, ciascuno con un test che prima falliva:
  - `LangService.instant()` scartava i parametri di interpolazione per le chiavi stringa: con
    `'…'|wmtrans:{percent: 64}` si vedeva «{{percent}}% completato». Nessuno nel repo usava
    ancora `wmtrans` con parametri. Corretto passando `interpolateParams` a `super.instant`: il
    file è condiviso da app e webapp, ma senza parametri il comportamento non cambia.
  - Il dettaglio, `OnPush`, riassegnava `vm$` in `ionViewWillEnter()`: l'hook arriva da un listener
    DOM che non segna la view da aggiornare, quindi dopo l'invio restava la CTA invece di «In
    revisione». Ora `vm$` è uno stream stabile che riemette a ogni `refresh()`.
  - Nella webapp la modale diventa un dialog con backdrop: click fuori o Escape la chiudevano
    senza passare dal guard del form. Ora `backdropDismiss: false`.
  - Il mock leggeva il conteggio delle track con `take(1)`: se non era ancora caricato il badge
    non compariva più. Ora lo stream resta aperto.

- `WmImagePickerComponent` con la selezione multipla dalla galleria usava un valore della lista
  letto prima degli `await`: le foto elaborate in parallelo si sovrascrivevano a vicenda, e ne
  entrava una sola invece di tutte (il test con 10 foto e 4 posti liberi ne aggiungeva 1).
  `takePhoto()` non controllava affatto il massimo. Vale anche per gli UGC (`MAX_PHOTOS = 3`).
  Corretto in questo ticket (Task 3).
- **Preesistente, non corretto:** la suite completa di wm-core si interrompe con una
  disconnessione di Chrome headless (ping timeout) intorno al test 131 di 269, già prima di
  questo lavoro. Le verifiche sono state fatte con `--include` mirati.
- **Preesistente, non corretto:** `npm run lint` nell'app fallisce con «Failed to load config
  "plugin:@angular-eslint/ng-cli-compat"»: la configurazione `.eslintrc.json` non è più
  compatibile con le dipendenze installate (ESLint 9).
- I test di wm-core richiedono Node ≥ 20.19: con Node 18 la CLI Angular non parte.
- `CameraService.shotPhoto()` avvia sempre la geolocalizzazione e non riduce le foto dalla
  galleria: nessuna delle due cose era voluta per le foto della credenziale. **Corretto** nei
  Task 2 e 3 con le opzioni di acquisizione (default invariati per gli UGC).

## Decisioni

- **Campo del form: solo «Numero seriale»** (richiesta a posteriori del developer, 28/09, mentre
  sviluppa il backend): label «Numero seriale» come nel wireframe, sempre opzionale, con sotto
  «Inserisci il numero seriale se richiesto dal cammino» e senza riga di separazione. Nel
  multipart il campo è `serial_number` al posto di `notes`, e nel tipo `serialNumber`. Il campo
  libero per «altre informazioni» proposto nella call del 03/09 non c'è più.
- **Logo del layer nel dettaglio con `wm-img`** (trovato dal developer): con un `background-image`
  senza virgolette nell'`url()` il logo non compariva; dentro l'anello `wm-img` ha i minimi di
  100px azzerati, altrimenti il logo usciva dal cerchio.

- **Home del layer riallineata al wireframe 1/V0b dopo la verifica del developer:** il riquadro
  del badge usa i colori del wireframe (bordo 2px tratteggiato `#2F9E44`, fondo `#eaf7ee`, testi
  `#1d6b30` e `#3d7a4a`), e il logo del layer ha l'anello di avanzamento. L'anello è una
  direttiva sul logo esistente (`[wmPassportLogoRing]`), non un componente che lo avvolge: i
  selettori della variante (`wm-home-layer > wm-img > wm-img.wm-home-layer-logo-overlay` e il
  `:has(...)` del divisore) presuppongono il logo figlio diretto. I gradi passano in una proprietà
  CSS (`--wm-passport-ring-deg`), lo stile sta nello SCSS della variante.

- **Dettaglio riallineato al wireframe dopo la verifica del developer** (richiesta a posteriori,
  dopo l'approvazione del piano): la prima versione usava componenti Ionic standard (`ion-chip`,
  `ion-list`) e non seguiva V1/V3. Ora il dettaglio ha l'anello di avanzamento attorno al logo del
  layer su immagine sbiadita, la CTA in riquadro verde tratteggiato, «In revisione» in riquadro
  ambra, le tappe con cerchietto di stato e la data breve a destra («12 mag», nella lingua
  corrente; per `pr` si usa il formato portoghese). Logo e immagine arrivano dal template della
  variante tramite badge e modale. Rimosse le chiavi `passport.stage.completed` e
  `passport.stage.notStarted`, non più usate (poi è stata aggiunta `passport.form.notesPlaceholder`: le chiavi `passport.*` sono 22).

- **Tag Orchestrator:** su indicazione del developer non è stato associato né creato nessun tag,
  né d'ambiente né di contenuto.
- **Scope:** solo frontend, con l'API mockata; il backend camminiditalia va in un ticket collegato
  (call del 28/09).
- **Nessun flag di attivazione:** la protezione contro l'uscita in produzione del mock e del
  disclaimer segnaposto è il branch dedicato `Passaporto`, che si unisce al resto solo quando il
  lavoro è testato e completo.
- **Branch:** il lavoro del ticket sta su
  `feature/oc-8166-passaporto-camminatore-validazione-credenziale-cartacea` in webmapp-app,
  wm-core e wm-types, creato da `Passaporto`; le PR vanno verso `Passaporto`, non verso `develop`.
  In wm-types `Passaporto` è stato creato in locale (dal commit `94d8606`) e non è ancora su origin.
- **Anche la webapp** riceve il passaporto, tramite il suo `fileReplacements` sulla variante
  camminiditalia di `home-layer`: deve funzionare anche lì.
- **Salvataggio in galleria** delle foto della credenziale: resta attivo, su indicazione del
  developer.
- **Stima:** `wm-estimate` ha risposto `STIMA NON POSSIBILE` perché il piano non esisteva ancora; la
  stima è stata fatta nel context principale (quindi non indipendente) — misurato 2,33h +
  stimato 10,75h — e il developer ha impostato **10h** su Orchestrator.
- **Challenge:** i rischi ipotetici ignorati sono percentuale pesata sui km, invii concorrenti da
  due dispositivi, upload parziali duplicati, migrazione dati del mock.

## Review formale (wm-review-ticket, 28/09/2026)

Cinque controlli paralleli sul codice non committato. Esito: **da correggere**, quattro
bloccanti; il developer ha accettato così com'è il n. 2 (con l'utente senza consenso il messaggio
sopra «Invia» c'è già, e da sloggato al form non si arriva) e il n. 3 (form V2 con il picker degli
UGC e il pulsante non fisso). Corretti, ciascuno con un test che prima falliva:

- **Back di Android con un alert aperto:** la modale ha priorità 101 e Ionic esegue solo il
  gestore più alto, quindi l'alert (100) non si chiudeva e se ne apriva un secondo. Ora `back()`
  chiude prima l'alert in cima, se c'è.
- **Doppio tap sulla CTA:** apriva due form, e togliendo il secondo il primo restava senza
  conferma d'uscita. Ora `openForm()` ignora i tap mentre il push è in corso o il form è aperto.

Cleanup applicati: colori e riquadro tratteggiato in `passport/_passport-theme.scss`, gradienti
degli anelli nello SCSS tramite `--wm-passport-ring-deg`; `passportRingDegrees()` e
`toLayerId()` in `passport.utils.ts`; `visibleProgress()` nel service; un solo tipo
`CaptureOptions` in `camera.service.ts` al posto di `PickerCaptureOptions`; il picker conta anche
le foto sincronizzate e emette `endAddPhotos` anche se la galleria viene annullata; il badge non
sparisce più al cambio lingua; il dettaglio non carica due volte all'apertura; placeholder del
seriale in i18n; JSDoc del contratto senza il «da 1 a 6»; `wmPassportMock` esposto solo con
`isDevMode()`.

Scartati dopo verifica: percentuale ripetuta nella tappa in corso (c'è anche nel wireframe);
commenti in inglese di `camera.service.ts` (preesistenti); mock in produzione (coperto dal branch
`Passaporto`); assenza di NgRx o cache (con il mock non ha effetti: va considerata nel ticket
backend, perché con l'HTTP reale badge e anello farebbero due chiamate); `saveToGallery` attivo
(decisione del developer). Resta come scelta: il pulsante «Invia» è attivo anche col form non
valido, così il tap mostra gli errori vicino ai campi.

## Follow-up

- Rilievi minori della review finale, non corretti:
  - con utente sloggato o senza consenso il pulsante «Invia» non mostra nessun messaggio;
  - se la navigazione al dettaglio fallisce dopo un invio riuscito compare «Invio non riuscito»;
  - foto identiche scelte nella stessa selezione della galleria passano entrambe (preesistente);
  - il mock si espone su `globalThis` come `wmPassportMock` (solo in sviluppo): va tolto con il backend reale;

- Ticket backend camminiditalia collegato a oc:8166: modello, migration, le tre rotte del
  contratto, sezione «validazioni» per il gestore, email di notifica.
- Stati `approved` e `rejected` in app, e gestione differenziata degli errori HTTP.
- Testo legale del disclaimer al posto del segnaposto.
- Verifica su dispositivo di fotocamera e galleria, quando esisterà il backend.
- Pubblicare `Passaporto` su origin in wm-types prima della PR.
- Ticket backend: con l'HTTP reale badge, anello e dettaglio chiamano ciascuno il progresso; valutare una cache (`shareReplay` per layer) o una feature NgRx nel service reale.
- Trappola di `ion-nav` (`[root]`/`[rootParams]`) da portare in `.claude/rules/` di wm-core in fase di aggiornamento del contesto.
