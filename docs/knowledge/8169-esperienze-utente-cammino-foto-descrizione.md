# Esperienze utente: cammino, foto e descrizione

## Come funziona oggi

Un utente loggato racconta una sua esperienza (descrizione e foto) su un cammino, su una tappa o
su una sua registrazione, e la ritrova nello stesso posto. Il blocco è `wm-experiences-section`
(cartella `experiences/`); il backend è nella pagina gemella di camminiditalia.

- **Dove è montato.** Nel template della variante `home-layer.component.camminiditalia.html`
  (cammino), in `wm-track-properties` e `wm-ugc-track-properties` (tappa e registrazione), e nel
  Passaporto (dettaglio del cammino e della tappa). Le due `*-properties` hanno una classe base
  `@Directive()` astratta con `showExperiences`, falso nel componente di default e vero nella
  variante `*.camminiditalia.ts`; il template è uno solo. Non c'è nessun controllo sullo shard,
  nemmeno `shardName.startsWith('camminiditalia')`: in locale lo shard si chiama `local` e il
  blocco non compariva (oc:8169). Il Passaporto non ha il flag perché è raggiungibile solo da
  camminiditalia: se arriva su un altro shard, il flag va aggiunto anche lì.
- **Stato.** In `ExperienceService`, con RxJS e non con NgRx. Stati: `loading`, `active`,
  `login-required` (401), `off` (solo 404: è l'interruttore lato server), `offline` (rete assente) ed
  `error` (GET fallita). In `error` i tentativi automatici sono al massimo tre, dopo 30, 60 e 120
  secondi, più «Riprova».
- **Offline.** Si salva in localForage solo l'elenco delle **proprie** esperienze, per utente. Si
  svuota al logout da `auth.effects.ts`; un marcatore in localStorage evita di creare lo store
  IndexedDB a ogni logout. Crea, modifica ed elimina sono bloccati con il segnale di rete reale
  dello store.
- **Form e dettaglio.** Sulla mappa si aprono in una modale; nel Passaporto con `nav.push`
  nell'`ion-nav` già aperto (`ExperienceLauncherService`). Il form ha un guard d'uscita.
- **Registrazioni collegate.** Il dettaglio mostra una riga per registrazione, toccabile solo se
  la registrazione è sul telefono (`openable`); data, km e durata vengono da `UgcTrackStatsService`.
- **Errori 422.** Il form sceglie il messaggio dal campo rifiutato (`ec_track_id`/`layer_id`,
  `description`, `images`), non dal testo del backend.
- **Foto sul web.** Ridimensionate su canvas (lato lungo 1600 px) e ricodificate in JPEG 0,8
  (`experience-photo.utils.ts`), per stare nei limiti del backend.

## Perché così

- **Attivazione per variante, non per shard.** È una scelta del dev: l'interruttore vero è il
  404 dell'API, e il codice non deve conoscere i nomi dei clienti.
- **`off` solo per il 404.** Un errore di rete o un 5xx non devono far sparire la funzione: per
  questo esistono `offline` ed `error`, con la copia sul telefono.
- **«TAPPA 05» da regex sul nome.** Nessuna traccia ha `ref` valorizzato (0 su 1285 nel DB
  locale). Senza «Tappa N» nel nome compare l'etichetta generica.
- **Tutte le proprie esperienze in una lista**, filtrata in memoria per cammino, tappa e
  registrazione: sono poche, e quella lista è la stessa che si salva per l'offline.

## Trappole verificate

- **Il blocco della tappa ha `order: 99` dentro `wm-track-properties`**, per restare in fondo anche
  con i temi che riordinano le sezioni (vedi `.claude/rules/css-per-istanza.md`).
- **Nell'app servono due righe di `fileReplacements`** (track-properties e ugc-track-properties)
  nella configuration camminiditalia. Prova che la build è giusta: `grep -c "showExperiences = true"`
  su `main.js` dà 2 con camminiditalia, 0 nella build di default. La webapp non le ha ancora.
- **Offline, nel browser, il primo `ion-toast` può fallire con `ChunkLoadError`** (chunk non ancora
  scaricato). Nel nativo il codice è nel pacchetto. Accettato, non gestito.

## Per «Di tutti» (non ancora fatto)

Le esperienze di altri non vanno in cache e vanno lette coi filtri dell'API (`layer_id`,
`ec_track_id`, `ugc_track_id`) e la paginazione, non in memoria. Il backend può aggiungere
`author: {display_name, avatar_url, is_me}` senza rompere l'app. Il cantiere elenca il resto
(selettore, «Vedi altre», dettaglio altrui senza Modifica/Elimina).
