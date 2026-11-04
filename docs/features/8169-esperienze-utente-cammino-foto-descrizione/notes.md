> Ticket: oc:8169

# Esperienze utente — note di implementazione (wm-core + webmapp-app)

Gemelle: `camminiditalia/docs/features/8169-esperienze-utente-cammino-foto-descrizione/notes.md`
(backend) e `wm-webapp/docs/features/8169-…/` (allineamento della webapp, non ancora fatto).

## Deviazioni dal piano

### Attivazione: varianti camminiditalia, non il nome dello shard

Il piano accendeva le esperienze con `shardName.startsWith('camminiditalia')` nel service. In locale
lo shard si chiama `local` e il blocco non compariva; il dev non ha voluto né quel controllo né
una sua estensione. Ora:

- `track-properties` e `ugc-track-properties` hanno una classe base (`@Directive()` astratta, mai
  soggetta a `fileReplacements`) con il flag `showExperiences`, falso nel componente di default e
  vero nella variante `*.camminiditalia.ts`;
- il cammino monta il blocco solo nel template della variante `home-layer.component.camminiditalia.html`;
- il service non guarda lo shard; l'interruttore lato server resta il 404 dell'API (stato `off`).

Nell'app servono le due righe di `fileReplacements` in `core/angular.json` (configuration
camminiditalia). Prova che la build è giusta: `grep -c "showExperiences = true"` su `main.js` dà 2
con la configuration camminiditalia, 0 nella build di default.

Il Passaporto monta il blocco senza flag: è raggiungibile solo da camminiditalia, quindi oggi è
equivalente. Se il Passaporto arriva su un altro shard, va aggiunto un flag anche lì.

### Registrazioni collegate: righe toccabili, non una frase

Il piano prevedeva solo «Collegata alla tua registrazione del …». Su richiesta del dev, il dettaglio
mostra «Registrazioni collegate»: una riga per registrazione (icona `analytics-outline` su cerchio
arancione chiaro, nome, «data · km · durata»). Il tocco chiude il contenitore e apre la registrazione
sulla mappa come da «I miei percorsi». Le righe sono toccabili solo se la registrazione è sul
telefono (`ExperienceLinkedUgcRow.openable`); data, km e durata vengono da `UgcTrackStatsService`.

### Offline

Non era nel piano oltre a «errore chiaro alla pubblicazione». Deciso col dev:

- stato `offline` distinto da `off`: `off` solo per il 404;
- cache delle **sole proprie** esperienze in localForage (`synchronized/experiences`), per utente,
  svuotata al logout da `auth.effects.ts`; un marcatore in localStorage evita di creare lo store
  IndexedDB a ogni logout;
- azioni (crea, modifica, elimina) bloccate con il segnale di rete reale dello store;
- stato `error` con al massimo 3 tentativi automatici (30, 60, 120 s) più «Riprova»;
- le esperienze «di tutti», quando arriveranno, non vanno in cache.

### Foto sul web

Sul web `wm-image-picker` non usa la fotocamera nativa: le foto si ridimensionano su canvas (lato
lungo 1600 px) e si ricodificano in JPEG 0,8 (`experience-photo.utils.ts`), per stare nei limiti del
backend.

### UI rispetto all'artifact

- tolta la scritta «Per ora la vedi solo tu»;
- scheda di solo testo della stessa misura e con lo stesso fondo bianco delle altre;
- foto delle schede ad altezza fissa (84 px);
- titolo in grassetto con specificità alzata: una regola globale lo vinceva;
- blocco della tappa con `order: 99` dentro `wm-track-properties`, per restare in fondo anche con i
  temi che riordinano le sezioni.

### Errori di validazione

Il form sceglie il messaggio di un 422 dal campo rifiutato (`ec_track_id`/`layer_id`, `description`,
`images`), non dal testo del backend, che è sempre in italiano.

## Limiti noti, accettati

- **Toast offline nel browser.** Offline, nel browser il primo `ion-toast` può fallire con
  `ChunkLoadError` (il chunk non è ancora scaricato). Nell'app nativa il codice è nel pacchetto; il
  dev ha deciso di non gestirlo.
- **Formato dei km.** Le righe delle registrazioni collegate mostrano «16,4 km», mentre altrove
  nell'app si vede «16.40 km».
- **Etichetta «TAPPA 05».** Si ricava con una regex sul nome della tappa: nessuna traccia ha `ref`
  valorizzato (0 su 1285 nel DB locale). Senza «Tappa N» nel nome compare l'etichetta generica.
- **Filtri dell'API non usati.** Il service scarica tutte le proprie esperienze e filtra in memoria
  per cammino, tappa e registrazione: per «mie» sono poche, e una lista sola è quella che si salva
  per l'offline. I filtri `layer_id`, `ec_track_id`, `ugc_track_id` del backend serviranno con
  «Di tutti», insieme alla paginazione.

## Lasciato com'è dalla review del 20/10 (non bloccante)

- La riga «Tappa · Cammino» è costruita in tre punti (launcher, classe base di track-properties,
  Passaporto); `_isOffline` e `onImgError` sono copiati in più componenti.
- `ExperienceLauncherService._presentModal` rifà il guard d'uscita che esiste già in
  `WmPassportModalComponent`, e `experiences/` e `passport/` si importano a vicenda.

## Follow-up

- **Esperienze pubbliche** (studio nell'artifact, righe «Futuro»): selettore «Le mie | Di tutti»,
  autore («Tu» / «Giulia R.»), «Vedi altre (N)» dopo 10 schede e «Mostra altre esperienze (N)» dopo
  5 nelle liste, dettaglio altrui senza Modifica/Elimina, «Visibile a tutti» nel form. Il backend
  può aggiungere `author: {display_name, avatar_url, is_me}` senza rompere l'app.
- **wm-webapp**: bump di wm-core e wm-types e `fileReplacements` per layer-box, search-box,
  track-properties e ugc-track-properties (vedi il piano della webapp).


## Ciclo 2 — «Il mio diario» (3-4 novembre 2026)

### Divergenze dal piano, task per task

#### Task 5 — passaporto a cammino iniziato
Lo spec di `passport-detail` non era negli elenchi degli spec dell'app (`core/tsconfig.spec.json`, `core/angular.json`): non girava da nessuna parte e il mock dell'host era rimasto indietro (`nav`, `registerGuard`). Aggiunta la cartella ai due elenchi e corretto il mock.

#### Task 8 — pulsante solo vicino al cammino
Ridisegnato dopo la review finale. Il piano leggeva le tappe di ogni cammino da `tracks`/`edges` della configurazione, ma nella config di produzione (124 cammini) quei campi non ci sono: il controllo si riduceva al solo rettangolo, e sulla tappa aperta senza cammino il pulsante non compariva mai. Disegno attuale, approvato dal dev: in sottofondo si salvano solo le posizioni del telefono (al massimo una ogni 3 minuti, almeno 200 m dall'ultima, 90 giorni); il confronto con le tappe si fa all'apertura del dettaglio — del cammino con le tappe che arrivano da Elastic (`ecTracks`), della tappa con la sua linea e i suoi `properties.layers` — e si rifà a ogni posizione nuova (`lastPositionAt$`). Senza linee disponibili vale il rettangolo del cammino.

### Bug trovati
- Revisione finale: coda mostrata anche nella sezione della registrazione; messaggio generico per un 422 dalla coda; foto riconvertite a ogni pausa nella scrittura; bozza esistente sovrascritta riaprendo un diario non inviato; 429 trattato come errore da correggere; conteggio dell'avviso al logout con i non inviati; bozza riscritta dopo la pubblicazione. Tutti corretti con test.
- Prova in locale: la posizione arrivata a dettaglio già aperto non rifaceva il confronto; `throttleTime` teneva solo la prima posizione della finestra (aggiunto `trailing`). Una posizione con accuracy di 150 m non arriva al servizio (filtro a monte, nel GPS).
- Prova in locale: il pulsante di chiusura del dettaglio era coperto dallo `swiper-container` della galleria (`z-index`).
- PHPStan: 10 errori preesistenti del ciclo 1 emersi nel diff per il rinomino dei file (`ProtectDiaryMedia`, `Diary.php`, `DiaryApiTest`), corretti.
- Ambiente locale: disco Docker pieno (Elasticsearch in restart continuo, un test fallito per spazio), indice `ec_tracks` vuoto; liberata la build cache e reindicizzato con `scout:import`.

### Decisioni
- Niente ticket nuovi: il ciclo 2 si fa dentro oc:8169 (tag Orchestrator 716 per le richieste della call del 3 novembre).
- Rinomino completo da `Experience` a `Diary` (codice, API, tabelle, config, variabili d'ambiente), in un commit unico per repo insieme alle funzioni nuove: i file toccati dal rinomino e dalle funzioni sono gli stessi, e senza staging interattivo non si separano.
- Consenso in un campo dedicato `publication_consent`, distinto da `is_public`.
- Coda offline solo per i diari nuovi; la modifica senza rete resta bloccata, con la bozza salvata. Coda e cammino attivo si avviano solo da `tabs.page.camminiditalia.ts`; nella webapp c'è solo la bozza.
- Richieste dopo il piano: dettaglio con «Modifica»/«Elimina» in un `ion-footer`; schede del carosello basse come nel wireframe; «visibile solo a te» sostituito da «Cammini d'Italia può pubblicarlo» quando il consenso c'è.

### Follow-up
- **Variabili d'ambiente rinominate**: `CAMMINIDITALIA_DIARIES_ENABLED`, `CAMMINIDITALIA_DIARY_LINK_DAYS` (dove era impostata `…_EXPERIENCES_ENABLED=false` la funzione si riaccenderebbe col default).
- Prova offline su dispositivo reale.
- Minori rimandati: ripristino della bozza in corsa con la digitazione e object URL non revocati; chiave della bozza diversa aprendo la tappa con o senza cammino; diari in coda invisibili se la sezione è nascosta; pulsante visibile un attimo prima del primo valore; nella webapp le bozze non scadono; sulla tappa si confronta solo la sua linea.
- Aree del tag 716 da rivalutare: promemoria a fine cammino, diari nel profilo, editor, scheda dati, valutazioni, periodo di percorrenza.


### Aggiunte 7-10 (3 novembre 2026, sera)

**Deviazioni dal piano e decisioni prese durante l'esecuzione**

- **Tab «Il mio diario», componente non standalone.** Il piano lo voleva standalone con
  `WmCoreModule` fra gli import; ma qualunque file che importa `WmCoreModule` sotto Karma carica
  `custom-tracks.draw.directive.ts` → `graphhopper-js-api-client` e si blocca
  (`ReferenceError: GraphHopperRouting is not defined`, trappola già nota in map-core). Il
  componente è dichiarato in `ProfileDiaryTabModule`, importato solo dal routing di camminiditalia;
  lo spec lo dichiara da solo con `CUSTOM_ELEMENTS_SCHEMA`.
- **`wm-diary-rating` non standalone**, dichiarato in `WmCoreModule` come gli altri componenti dei
  diari: la pipe finta dei test (`FakeTransPipe`) non è standalone.
- **Valutazioni come oggetto `ratings`** (`route`, `hospitality`, `difficulty`) invece di tre campi
  piatti: passano uguali da diario, bozza, coda offline e form. Le bozze e gli elementi in coda
  salvati prima non hanno il campo: valgono «non date».
- **Animazione delle valutazioni**: si animano solo i timbri che cambiano (da 1 a 4 si animano il
  2, il 3 e il 4), non tutti da 1 a N, per non ripetere l'animazione su quelli già pieni.
- **Avviso di cammino completato, «visto» alla comparsa** e non alla chiusura: se l'app viene
  chiusa con la scheda aperta, la notifica non si ripresenta a ogni avvio.
- **Stile della scheda** in `tabs.page.camminiditalia.scss` dell'app, non in wm-core: il toast è un
  overlay globale e quel foglio è caricato solo in camminiditalia.
- **Campi nuovi del progresso nei tipi del Passaporto** (`userDistance`, `walkedDates`,
  `userDistanceTotal`) aggiunti con un'estensione del modulo `@wm-types/passport` in
  `wm-core/passport/passport-walked.ts`, non in wm-types: wm-types è in detached HEAD con una
  modifica locale del dev, e un quarto repo da committare a ridosso della scadenza non valeva.
  **Debito**: spostarli in `wm-types/src/passport.ts` e togliere il file.
- **Km di una registrazione** nel backend: `properties.stats.distance` (regola di wm-package, la
  stessa dell'app), altrimenti la lunghezza della geometria. **Giorno**: tempo del primo punto,
  poi `properties.createdAt`, poi `created_at`, nel fuso di Roma.
- **Database di sviluppo**: le tre colonne delle valutazioni aggiunte con `Schema::table` invece
  del rollback delle migration, che avrebbe cancellato i 2 diari di prova del dev. Lo schema
  coincide con la migration modificata; il database dei test è stato rigenerato.
- **Test di forma esatta** del progresso (`StageProgressApiTest`, `StageProgressServiceTest`)
  aggiornati con i campi nuovi.
- **Non coperto da test**: la lettura di `user_distance`/`walked_dates` in
  `PassportService._toProgress` — `passport.service.spec.ts` non è negli elenchi degli spec
  dell'app e quindi non gira.
- **Build della webapp** non rifatta: il wm-core della webapp è un checkout separato, si verifica
  quando si aggiorna il puntatore dopo il commit.

**Profilo riorganizzato (punto 11, variante A del prototipo)**
- La tab «I miei dati» diventa «Account» (rotta `account`); `profile-data` resta come
  reindirizzamento per i link già in giro. La prima tab da loggato è «Il mio diario».
- «Esci» passa nella tab «Account»; nell'ingranaggio si nasconde con `showLogout: false`, input di
  `SettingsComponent` che vale `true` di default: negli altri shard l'ingranaggio non cambia.
- La conferma di uscita (con l'avviso dei diari in coda) è in `LogoutService`, usato da
  ingranaggio e tab.
- Le sezioni della tab hanno i titoli Download, Privacy, Sessione; il titolo interno
  «Downloads» di `wm-profile-data` è nascosto nella tab per non ripeterlo.
- Lo spazio di 150px in fondo al tab del diario è tolto: i pulsanti fissi non ci sono più.

**Prova a schermo e review finale (4 novembre 2026)**
- **Animazione delle valutazioni che non partiva** (segnalata dal dev nella prova). Nel form il
  getter delle righe delle valutazioni restituiva un array nuovo a ogni controllo e `*ngFor` non
  aveva `trackBy`: a ogni tocco `wm-diary-rating` veniva distrutto e ricreato, e l'animazione
  partiva su elementi già tolti dalla pagina. Righe tenute in cache (ricalcolate solo se cambia la
  prima etichetta, «Cammino» o «Tappa») e `trackBy` sulla chiave. Test che falliva prima.
- **Tab «Account» come voci di elenco**, come nella variante A del prototipo, non come pulsanti.
  Consenso dati con `AuthService.showPrivacyAgreeAlert()`; «Elimina account» chiama il metodo di un
  `wm-profile-delete-button` nascosto (`@ViewChild`), così l'avviso con la conferma «delete
  account» resta uno solo, quello di wm-core. Approvato dal dev; l'alternativa era spostare
  l'avviso in un servizio di wm-core. Niente attributo `color` sulla riga di «Elimina account»:
  colorerebbe tutta la riga, il rosso è su testo e freccia via variabili CSS.
- **Avviso di cammino completato**: pulsanti sotto il testo (`layout: 'stacked'`), perché
  affiancati stringevano titolo e messaggio a poche lettere per riga; colore dell'app
  (`--ion-color-primary`) al posto del verde.
- **Review finale, corretti con test che fallivano prima**:
  - riaprendo un diario in coda rifiutato dal server le valutazioni non passavano nella bozza;
  - nella scheda «Il tuo percorso» di un cammino completato per gruppi (varianti) date, giorni e
    km di riserva contavano anche le varianti non percorse: ora solo le tappe completate;
  - chiudendo un avviso mentre il Passaporto riemette i cammini potevano comparire due avvisi
    insieme, anche dello stesso cammino: il servizio segna il cammino in preparazione prima del
    primo `await`, e lo libera anche se il salvataggio dei visti fallisce.
- **Migration**: le colonne delle valutazioni restano nella migration di creazione della tabella,
  già pushata sul branch remoto. Decisione del dev: un database che l'avesse già eseguita non
  avrebbe le colonne.
- **Minori rimandati dalla review**: titolo «Hai completato !» se il cammino non è fra i layer
  caricati; la tab «Il mio diario» non mostra i diari in coda (con il primo diario scritto offline
  dice «Non hai ancora scritto nessun diario»); i cammini della tab sono ordinati per ultima
  modifica; aprendo l'app direttamente sul profilo prima che il login sia ripristinato si finisce
  su «Account».
- Suite dell'app 478/478, backend 902/902; build camminiditalia e default compilate, tab e avviso
  presenti solo nella prima.


## Ciclo 3 — Editor del racconto (4 novembre 2026)

### Divergenze dal piano, task per task

#### Task 3 — nessuna migration di conversione
La migration che convertiva in HTML i racconti scritti in testo semplice è stata scritta, provata e
poi tolta su richiesta del dev: la funzione dei diari non è ancora né in produzione né sul dev, quindi
non ci sono dati da convertire, e come negli altri cicli le modifiche allo schema stanno nella
migration di creazione. I 7 diari del database locale sono già HTML (la conversione era stata
eseguita prima di toglierla); dalla tabella `migrations` locale è stata tolta la sua riga. Il servizio
`DiaryTextService` converte comunque il testo semplice che arriva dall'app (casella di ripiego).

### Bug trovati
- Prova a schermo: con la barra dell'editor a `top: 0` il testo scorreva nei 16 px sopra la barra,
  perché il padding di `ion-content` sta dentro l'area che scorre. Corretto con
  `top: calc(-1 * var(--padding-top))` sulla barra e `scroll-padding-top` su
  `ion-content.wm-diary-form::part(scroll)`.
- Review finale, corretti con test che fallivano prima:
  - un racconto di soli spazi non separabili (`<p>&nbsp;</p>`, le righe vuote incollate da Word)
    passava la regola «testo o foto» sia nel backend (`trim` di PHP non toglie U+00A0) sia
    nell'app («Pubblica» guardava la stringa HTML): ora conta il testo visibile in entrambi;
  - una `description` non testuale (`description[]=x`) dava 500 invece di 422, e un HTML di
    diversi MB veniva ripulito prima di ogni controllo di lunghezza: ora si ripulisce solo una
    stringa entro i 100.000 caratteri, il resto lo rifiutano le regole `string` e `max`.
- PHPStan: un `?->` inutile in `DiaryTextService`, corretto.

### Decisioni
- Il ciclo si fa nonostante l'indicazione dello scrum del 3 novembre (richieste nuove non pagate,
  da mettere in backlog): decisione del dev.
- Stima del ciclo saltata su richiesta del dev; quella indipendente era di 5,61 h
  (0,31 h di pianificazione misurata + 5,3 h).
- `composer require` ha portato HTMLPurifier da 4.19.0 a 4.19.1 (patch del 15/09/2026) e ha
  scritto la versione di wm-package nel lock come `dev-<hash>` perché il submodule è in detached
  HEAD: rimessa a mano a `dev-develop`.
- Il testo semplice si riconosce nel backend solo dal primo carattere diverso da `<`: serve per la
  casella di ripiego. Un testo semplice che inizia con `<` perde quel pezzo.
- Ricerca in Nova con `searchableColumns()` e `Column::raw(regexp_replace(...))`: funziona solo su
  PostgreSQL.
- Messaggi del backend solo in `it.json`, come gli altri messaggi del diario (l'inglese è la chiave).
- Numeri del contatore formattati con `toLocaleString('it-IT')` in tutte le lingue.
- Test scritti dopo il codice in due punti (spec dell'editor, test di Nova): il fallimento è stato
  verificato a posteriori, riaccendendo il sottolineato e rimettendo il file Nova di HEAD.

### Follow-up
- Prova sul dispositivo vero (iOS e Android): barra attaccata in alto con la tastiera aperta, riga di
  scrittura non coperta, niente zoom al tocco, collegamenti aperti nel browser.
- Webapp: i pacchetti Tiptap sono installati; il puntatore di wm-core si aggiorna con il rilascio.
- Il ciclo 3 deve uscire insieme ai cicli 1 e 2: un'app senza l'editor mostrerebbe i tag.
- Minori rimandati dalla review: modifica nella casella di ripiego che perde la formattazione senza
  avviso; un'email scritta senza `mailto:` diventa `https://utente@dominio` e un indirizzo con la
  porta viene rifiutato, e l'avviso del collegamento non dice perché resta aperto; chiamata statica
  a `HasEmbeddableRichText::buildRichTextPurifier()` deprecata da PHP (serve una factory in
  wm-package); la ricerca in Nova non decodifica le entità («A & B» non trova `A &amp; B`).
- Foto dentro il testo: stesso formato HTML, ma servirà un riferimento ai media (non l'URL) e un
  elenco di tag più largo nel purifier.


## Ciclo 4 — Date di percorrenza del diario (4 novembre 2026)

### Divergenze dal piano, task per task
Nessuna divergenza sostanziale. Aggiunte rispetto al piano:
- Task 1: anche i km della tappa (`user_distance`) e il totale del cammino vengono solo dalle
  registrazioni dell'ultima percorrenza, altrimenti due giri della stessa tappa si sommavano.
- Task 4: `passport/passport-form` e `shared/date-range-picker` aggiunti agli elenchi degli spec
  (`core/tsconfig.spec.json`, `core/angular.json`): lo spec del form della richiesta cartacea
  (32 test) prima non girava da nessuna parte.
- Task 5: tolti dallo spec del form della richiesta i test del vecchio calendario a due campi; i due
  sulla chiusura del foglio durante l'animazione sono passati nel componente nuovo, che ne ha
  ereditato la logica (`_dismissExpected`). Stili del vecchio calendario tolti dopo aver verificato
  che nessun tema dei clienti li usa.

### Bug trovati
- Challenge sull'overview: la tabella `passport_stage_ugc_track` contiene le registrazioni di ogni
  anno (`StageValidationService.php:343`), quindi le date note mescolavano più percorrenze; da qui
  la regola dell'ultima percorrenza, applicata anche alla scheda del ciclo 2.
- Review finale, corretti con test che fallivano prima: il back hardware con il calendario aperto
  chiudeva tutto il diario (mancava `closeOverlay` nel form); il dettaglio del diario del cammino
  senza date proprie univa i giorni di più percorrenze.
- Screenshot con il calendario blu: tema non ancora caricato nella sessione headless; ricontrollato,
  i colori sono quelli dell'app.

### Decisioni
- Il dev ha cambiato le scelte durante la challenge: le date scritte decidono il periodo (prima si
  sommavano a quelle note), il margine è di un giorno (prima tre), le date si salvano solo se il
  campo è stato toccato.
- Colonne nella migration di creazione, su richiesta del dev; database locale allineato con
  `Schema::table`, quello dei test con `migrate:fresh --env=testing`.
- Calendario unico per diario e richiesta cartacea (richiesta del dev), con il payload della
  richiesta invariato.
- `PassportService` nel form del diario come parametro `@Optional` del costruttore: gli spec creano
  il form con `new`.
- Stima saltata, come nel ciclo 3.

### Follow-up
- Prova sul dispositivo vero: calendario su iOS e Android, back hardware con il foglio aperto.
- Richiesta cartacea non provata a schermo dopo il cambio del calendario (coperta dai test).
- Minore rimandato: «Svuota» su un campo solo precompilato invia date vuote, e dettaglio e
  collegamento tornano all'ultima percorrenza, quindi le date «ricompaiono».
- Da verificare: una tappa validata con richiesta cartacea che ha anche legami GPS di anni precedenti
  prende le date dalle registrazioni e non dalla richiesta (comportamento precedente al ciclo).
- Il collegamento si ricalcola solo alla modifica del diario: registrazioni sincronizzate dopo, o
  tappe validate dopo, non si legano finché il diario non viene modificato.
