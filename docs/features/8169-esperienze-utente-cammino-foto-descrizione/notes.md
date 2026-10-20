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
