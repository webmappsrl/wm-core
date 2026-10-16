> Ticket: oc:8763

# Passaporto: attivazione per singolo cammino (flag sul layer) e guida per il cliente — app

Parte app. Il backend (flag, Nova, 404, nuova risposta di `/api/passport`) è descritto in
`docs/features/8763-…/overview.md` del repo `camminiditalia`; il tipo in `wm-types`.

## Cosa cambia

Ogni cammino ha un interruttore «Passaporto attivo», acceso dagli amministratori. Il backend
risponde a `GET /api/passport` con **un elemento per ogni cammino acceso** (con almeno una tappa),
anche senza tappe convalidate, e per ciascuno la mappa delle tappe convalidate dall'utente con la
loro data (`validated_tracks`). L'app usa quella risposta come unica fonte per sapere su quali
cammini mostrare il passaporto: tab Passaporto, badge e anelli sulle card dei cammini, chip
«percorsa / non ancora percorsa» sulle tappe nei risultati di ricerca. Fuori dal dettaglio non si
chiama più `GET /layer/{id}/progress`; il dettaglio lo legge solo quando lo si apre. Se nessun
cammino è acceso, il tab Passaporto mostra un messaggio esplicito.

## Perché

Cammini d'Italia vuole provare il passaporto con pochi partner fidati prima di estenderlo a tutti
(call del 12/10/2026, Davide: «io poi glielo accendo ai nostri partner più fidati»). Oggi l'app
mostra il passaporto su tutti i layer della config. Già che la fonte cambia, si eliminano le
chiamate `/progress` fatte per ogni card di cammino in home (`visibleProgress`) e per ogni cammino
iniziato nella ricerca (`stageIndex$`): con 20 card in home sono 20 chiamate, che diventano 0.

## Requisiti

- [ ] **Regola di visibilità**: su un cammino **spento** (assente da `routes`) non compare nulla
  del passaporto: né timbro, né badge, né anello, né chip sulle sue tappe. Su un cammino
  **acceso** compaiono sempre timbro, badge, anello e chip su ogni sua tappa, anche se l'utente
  non ne ha percorsa nessuna.
- [ ] **`PassportService`**: legge `validated_tracks` (id tappa → data di convalida) da
  `/api/passport` e lo porta in `PassportRoute.validatedTracks`; `routes` è l'elenco dei cammini
  accesi.
- [ ] **Badge e anello sulle card dei cammini** (`passport-progress-badge`, `passport-logo-ring`,
  usati in `home-layer` camminiditalia): `visibleProgress` legge dal cammino in `routes`, senza
  chiamare `/progress`; badge e anello anche a 0 tappe percorse; nulla per un cammino non in
  `routes` e per un utente non loggato.
- [ ] **Anello di `layer-box`**: continua a leggere `passportRoutes$`; dopo la modifica compare
  anche allo 0% sui cammini accesi non iniziati, come il badge di `home-layer`.
- [ ] **`stageIndex$`** (chip sulle card delle tappe nei risultati di ricerca camminiditalia): si
  costruisce da `validatedTracks` dei cammini in `routes`, senza chiamare `/progress`, e si
  aggiorna quando cambiano le tappe convalidate, non solo quando cambia l'elenco dei cammini.
- [ ] **Chip della tappa** (`passportStageChip`): compare solo se almeno uno dei cammini della
  tappa (`layers` dell'hit) è in `routes`; «✓ percorsa il {data}» se la tappa è in
  `validatedTracks` di uno di quei cammini, altrimenti «○ non ancora percorsa». Una tappa condivisa
  fra un cammino acceso e uno spento ha il chip. Si toglie la logica di `pendingLayers`.
- [ ] **Tab Passaporto (`passport-stamps`)**: un timbro per ogni cammino in `routes`; da
  `confMAPLAYERS` si prendono solo nome, logo e immagine. Un cammino in `routes` ma assente dalla
  config non compare.
- [ ] **Stato vuoto del tab**: con `routes` vuoto, al posto della griglia un messaggio esplicito,
  per esempio «Il passaporto non è ancora attivo su nessun cammino.». Restano invariati il
  caricamento, l'errore con «Riprova» e la frase-guida quando ci sono cammini ma nessuno iniziato.
- [ ] **Dettaglio del cammino**: invariato; legge `/progress` e `/certification` solo
  all'apertura. Un 404 dal backend (cammino spento nel frattempo) produce il messaggio d'errore
  generico già esistente. `refreshProgress` rilegge già anche `/api/passport` alla chiusura della
  modale: nessun refresh nuovo.
- [ ] **Traduzioni**: il testo dello stato vuoto nei 7 file di `localization/i18n/`
  (`de, en, es, fr, it, pr, sq`), chiave = testo italiano.
- [ ] **Test unitari** di `PassportService` (`visibleProgress` e `stageIndex$` senza chiamate a
  `/progress`, mappatura di `validated_tracks`), di `passportStageChip` (cammino spento, acceso
  non percorso, acceso percorso, tappa condivisa) e di `passport-stamps` (filtro su `routes`,
  stato vuoto); fixture aggiornate.
- [ ] [UX] Badge, anelli, timbri e chip compaiono solo dopo la risposta di `/api/passport`: nessun
  elemento del passaporto che compare e poi sparisce su un cammino spento.
- [ ] [UX] Lo stato vuoto è un messaggio leggibile al centro dell'area del tab, non una griglia
  vuota.

## Rischi

- **Tab vuoto al rilascio**: tutti i cammini partono spenti. Mitigato dal messaggio esplicito e
  dalla guida per il cliente.
- [UX] **Badge in ritardo rispetto al dettaglio**: il badge legge `/api/passport`, il dettaglio
  `/progress`. Dopo una convalida il badge si aggiorna alla prossima lettura di `/api/passport`
  (login, ritorno in primo piano, rientro nel tab, chiusura del dettaglio).
- **Cambio di significato di `routes`**: oggi elenca i cammini iniziati, dopo i cammini accesi. Ogni
  punto che usa `routes` come «cammini iniziati» va rivisto; i docblock di `_toRoutes`,
  `passportRoutes$` e `passportStamps` vanno aggiornati.
- **Rilascio e rollback legati al backend**: nessun fallback. Un'app nuova contro il backend vecchio
  vede solo i cammini iniziati e nessun chip; un'app vecchia contro il backend nuovo mostra i
  cammini accesi come «in corso» allo 0%. Backend e app si rilasciano lo stesso giorno, con le build
  di test aggiornate; nulla è ancora in produzione.

## Out of scope

- Verifica funzionale nella webapp camminiditalia: `wm-webapp` monta la variante camminiditalia di
  `home-layer` (badge e anello) e ne riceverà l'effetto quando aggiornerà `wm-core`.
- Nascondere la voce del tab Passaporto quando nessun cammino è acceso.
- Un messaggio dedicato per il 404 di un cammino spento.
- Leggere il flag dalla config del layer.
- Usare `name` e i km della risposta di `/api/passport`.

## Moduli toccati

**wm-core**
- `passport/passport.service.ts` (`PassportResponse`, `_toRoutes`, `visibleProgress`, `stageIndex$`)
- `passport/passport.utils.ts` (`passportStageChip`, `passportStamps`)
- `passport/passport-progress-badge/`, `passport/passport-logo-ring/` (se cambia il tipo letto)
- `passport/passport-stamps/` (timbri da `routes`, stato vuoto)
- `box/search-box/search-box.component.camminiditalia.ts` (se cambia la firma del chip)
- `passport/passport-progress.fixtures.ts`, `passport/testing/`, spec correlate
- `localization/i18n/{de,en,es,fr,it,pr,sq}.ts`
