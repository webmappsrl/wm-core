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
