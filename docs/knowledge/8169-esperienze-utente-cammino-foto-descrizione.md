# Diario del camminatore: cammino, foto e descrizione

## Ciclo 3 — Editor del racconto (oc:8169, 4 novembre 2026)

Il resto della pagina descrive i cicli precedenti; dove questo ciclo cambia il formato del racconto (prima testo semplice, ora HTML) vale questa sezione.

- **`description` è sempre HTML**, scritto con `wm-diary-editor` (Tiptap 3.32.0) e ripulito dal
  backend con un elenco chiuso di tag (`p`, `br`, `strong`, `em`, `s`, `h2`, `h3`, `ul`, `ol`, `li`,
  `blockquote`, `hr`, `a[href]` http/https/mailto). Nessuna regola per riconoscere il formato: il
  dettaglio mette `description` in `[innerHTML]` (mai `wm-inner-html`, che non ripulisce), le schede
  usano `diaryTextExcerpt`. Lo stile del testo è uno solo, `_diary-rich-text.scss`, per editor e
  dettaglio: così il racconto si vede come è stato scritto.
- **Tiptap si carica solo all'apertura del form** (`import()` dinamico in `_loadTiptap`): il bundle
  iniziale non lo contiene, ma app e webapp devono avere i pacchetti, perché `WmCoreModule` dichiara
  l'editor. Se il caricamento fallisce (PWA senza rete al primo uso) resta una `textarea` e si invia
  testo semplice, che il backend converte in paragrafi; in modifica la formattazione si perde.
- **Barra di 12 bottoni** (niente sottolineato: è spento anche nello `StarterKit`, Ctrl+U compreso),
  collegamenti normalizzati da `normalizeDiaryLink` (`www.…` → `https://…`), aperti nel dettaglio con
  `window.open(href, '_blank')` intercettando il click con `closest('a')`.
- **Limite:** 20.000 caratteri di testo visibile (`DIARY_MAX_VISIBLE`, contatore sotto l'editor,
  «Pubblica» disabilitato oltre); il backend ha anche un tetto di 100.000 caratteri di HTML.
  «Pubblica» guarda il testo visibile, non la stringa HTML: `<p>&nbsp;</p>` e una sola linea non
  sono un racconto.
- **Trappola: una barra `position: sticky` dentro `ion-content` si ferma sotto il padding**, perché
  il padding sta dentro l'area che scorre: con `top: 0` il testo passa nei 16 px sopra la barra. Va
  `top: calc(-1 * var(--padding-top))`, più `scroll-padding-top` su `ion-content::part(scroll)` perché
  la riga in cui si scrive non finisca sotto la barra.

## Ciclo 2 — «Il mio diario» (oc:8169, 3 novembre 2026)

La funzione si chiama **diario** per l'utente e `Diary` nel codice (cartella `diaries/`, blocco
`wm-diaries-section`, flag `showDiaries`, `DiaryService`, API `/api/diaries`). Il resto della pagina
descrive il primo ciclo con la parola «esperienza»; dove il secondo ciclo l'ha cambiato vale questa
sezione.

- **Pulsante solo vicino al cammino** (`ActiveRouteService`, avviato solo da
  `tabs.page.camminiditalia.ts` dell'app). In sottofondo salva **solo le posizioni** del telefono:
  al massimo una ogni 3 minuti (`throttleTime` con `leading` e `trailing`, perché uno spostamento
  dentro la finestra non vada perso), almeno 200 m dall'ultima, per 90 giorni. Il confronto si fa
  **all'apertura del dettaglio**, e si rifà a ogni posizione nuova (`lastPositionAt$`): sul cammino
  con le tappe di Elastic (`ecTracks`, campo `layers`) e le loro linee da `EcService.getEcTrack`,
  sulla tappa con la sua linea e i suoi `properties.layers`. Entro 1 km il cammino è attivo per 90
  giorni, per tutte le sue tappe. Senza linee disponibili vale il rettangolo del cammino. **Le tappe
  non si possono leggere dalla configurazione**: `MAP.layers` non ha né `tracks` né `edges`.
  Fuori da camminiditalia `canWrite$` vale sempre `true`. Nel Passaporto la regola non vale.
- **Passaporto.** Il diario del cammino compare da quando c'è almeno una tappa riconosciuta
  (`vm.showDiary`), non solo a cammino completato.
- **Bozza** (`DiaryDraftStore`, localforage `device/diaryDrafts`): chiave `u<utente>:l<cammino>:t<tappa>`
  per un diario nuovo, `u<utente>:d<id>` per una modifica; uuid nella bozza; si cancella dopo
  pubblicazione, uscita confermata o passaggio in coda; scade dopo 90 giorni.
- **Coda offline** (`DiaryOutboxService`, `device/diaryOutbox`): solo diari nuovi, solo dove la coda
  è avviata (l'app camminiditalia). Invio a evento — rete tornata, login, attese di 1, 5 e 15
  minuti dopo rete assente, 5xx o 429 — un elemento alla volta e solo per l'utente che l'ha scritto.
  401 resta in attesa del login; 422, 413 e 404 diventano «Non inviato» e si riaprono nel form come
  bozza con il messaggio vero (`diaryHttpErrorKey`). Nella registrazione la coda non si mostra.
- **Consenso** `publicationConsent`: spunta facoltativa nel form; nel dettaglio la riga della data
  dice «Cammini d'Italia può pubblicarlo» solo se c'è.
- **Dettaglio.** «Modifica» ed «Elimina» in un `ion-footer`; la ✕ sopra la galleria ha `z-index`,
  altrimenti lo `swiper-container` la copre. Carosello del cammino con schede basse (215×76).

### Aggiunte del 4 novembre 2026 (solo camminiditalia)

- **Valutazioni** (`wm-diary-rating`, `Diary.ratings` con `route`, `hospitality`, `difficulty`, da
  1 a 5 o `null`): tre righe nel form dopo le foto, sola lettura e in piccolo nel dettaglio. Un
  tocco sul valore già scelto lo azzera. L'icona è il timbro con lo scarpone `txn-boot` di
  wm-package, copiato nel componente. **L'animazione parte solo alla selezione** e solo sui timbri
  che cambiano (impressi uno dopo l'altro, o una dissolvenza quando si abbassa); con
  `prefers-reduced-motion` niente animazione. Passano per bozza, coda offline e riapertura di un
  «Non inviato»; il form manda sempre i tre campi (`''` = nessun valore).
- **Scheda «Il tuo percorso»** nel dettaglio (`diaryRouteData`): solo a tappa o cammino completati,
  dal progresso del Passaporto. Km dell'utente (`userDistance`, `userDistanceTotal`, dal backend)
  e, dove mancano, quelli del percorso; date e giorni da `walkedDates`. Per il cammino contano
  **solo le tappe completate**: in un cammino con varianti quelle non percorse restano
  `not_started` e non hanno date. Se una tappa completata non ha date, la scheda mostra solo i km.
  I tre campi sono un'estensione di `@wm-types/passport` in `passport/passport-walked.ts`: debito,
  vanno spostati in wm-types.
- **Avviso di cammino completato** (`RouteCompletedNoticeService`, avviato solo da
  `tabs.page.camminiditalia.ts`): ascolta `passportRoutes$()`, quindi vede il completamento al
  login, al ritorno in primo piano o all'apertura del Passaporto, non in tempo reale. Un `ion-toast`
  in alto alla volta, persistente, bottoni sotto il testo (`layout: 'stacked'`). I cammini visti
  sono per utente in `device/completedRoutesSeen` (`u<id>`); alla prima esecuzione per un utente
  quelli già completati si segnano senza avviso. Un cammino è «visto» quando l'avviso compare. Lo
  stile sta nel foglio camminiditalia dell'app: il toast è un overlay globale.
- **Trappola: un getter che restituisce un array nuovo, usato da `*ngFor` senza `trackBy`, ricrea i
  figli a ogni change detection.** Nel form delle valutazioni ogni tocco distruggeva e ricreava
  `wm-diary-rating`, e l'animazione partiva su elementi già tolti: nei test unitari non si vede.
- **Trappola dell'avviso: fra la chiusura di un toast e la comparsa del successivo ci sono degli
  `await`.** Il servizio segna il cammino in preparazione (`_current`) prima del primo `await`,
  altrimenti un'emissione di `passportRoutes$()` in quel momento apre un secondo avviso, anche dello
  stesso cammino.

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
