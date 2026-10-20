> Ticket: oc:8169

# Esperienze utente su cammino con foto e descrizione

> Overview gemelle: backend in `camminiditalia/docs/features/8169-esperienze-utente-cammino-foto-descrizione/overview.md`,
> allineamento della webapp in `wm-webapp/docs/features/8169-esperienze-utente-cammino-foto-descrizione/overview.md`.
> UI approvata il 19/10, rifatta da zero sull'app reale e sul codice del Passaporto:
> https://claude.ai/artifact/ET13SZH33ZZNbdA4jVDyoH (sostituisce il wireframe del 24/08).
> Le decisioni prese durante l'implementazione — attivazione con le varianti invece del controllo
> sullo shard, righe «Registrazioni collegate», cache offline — sono in [notes.md](notes.md).

## Cosa cambia

Nell'istanza camminiditalia l'utente loggato può scrivere un'**esperienza** — un testo e fino a 6
foto — su un **cammino** (layer) o su una **tappa** (traccia), e poi modificarla o eliminarla.
L'esperienza è un modello nuovo del backend camminiditalia (`Experience`), non più un `UgcPoi` con
`form.id = 'feedback'` come nell'overview del 24/08: niente geometria, niente sync UGC, un'API propria.

Dove si vede, in questo ciclo, sempre e solo **le esperienze dell'utente stesso**. Un unico blocco
«esperienze» (titolo, schede, scheda tratteggiata «Racconta…») è montato in quattro punti:

- **cammino** (`home-layer` e la sua variante camminiditalia): sezione «Le tue esperienze» dopo i box
  informativi e prima delle tappe, con le esperienze del cammino **e delle sue tappe** (etichetta
  «TAPPA 05» o «CAMMINO») in una riga a scorrimento orizzontale aperta dalla scheda «Racconta la tua
  esperienza»;
- **tappa sulla mappa** (`wm-track-properties`): «Le tue esperienze su questa tappa» in fondo, dopo
  la descrizione, con «Racconta questa tappa»;
- **Passaporto, vista 3** (`wm-passport-stage-detail`): lo stesso blocco della tappa, sotto le righe
  di lunghezza e dislivello;
- **Passaporto, vista 6** (`wm-passport-detail` a cammino completato): lo stesso blocco del cammino,
  fra «Condividi il traguardo» e «Vedi le N tappe».

In più, nel **dettaglio di una UGC track** una sezione «Esperienze collegate», solo se ce n'è almeno
una. Non c'è un tab «Esperienze» in «I miei percorsi».

**Utente non loggato**: vede la stessa sezione vuota; il tocco su «Racconta…» apre il login, come per
la registrazione di una UGC, senza un riquadro «Accedi» dedicato.

Dentro il Passaporto il form si apre nella `ion-nav` della modale, come «Richiedi certificazione»;
sulla mappa si apre in una modale. La grafica del blocco segue il Passaporto reale: pulsanti con
raggio 10 px e testo in grassetto, colore primario del tema.

Il dettaglio di un'esperienza mostra testo, foto, cammino e tappa, data, e permette all'autore di
modificare testo e foto ed eliminarla.

Funziona nell'app e nella webapp: i componenti stanno in wm-core e non dipendono da Capacitor nel
flusso principale (sulla webapp le foto si scelgono da file).

## Perché

Il cliente vuole raccogliere i racconti dei camminatori, sul cammino intero o sulla singola tappa,
come patrimonio della community. È l'ultima funzione del RDO Cammini d'Italia (scrum del 19/10).

Il modello nuovo, al posto degli UGC di wm-package, è stato deciso allo scrum del 19/10 e confermato
nel dialogo: la lettura pubblica futura su una tabella dedicata non rischia di esporre dati privati
degli UGC, non serve una geometria senza significato (`ugc_pois.geometry` è NOT NULL), e non servono
filtri per `form.id` in ogni punto che legge `ugcPois`.

Le esperienze si mostrano dove sta il luogo a cui sono legate, non in un elenco a parte: è così che
le pensa il camminatore, e non tocca `home-result`, condiviso da tutti gli shard.

## Requisiti

- [ ] Un servizio wm-core per l'API delle esperienze del backend camminiditalia: elenco dell'utente
  (filtrabile per cammino, tappa e UGC track), creazione, modifica, eliminazione.
- [ ] **Attivazione**: le esperienze sono attive solo sull'istanza camminiditalia **e** solo se l'API
  risponde. Sulle altre istanze il blocco non è montato: lo accendono le varianti camminiditalia
  (`fileReplacements`, flag `showExperiences` nella classe base), non un controllo sul nome dello
  shard (*superato il controllo `shardName`, vedi notes.md*). Se l'API risponde 404 la UI non
  compare. Anche da non loggato la chiamata si fa: 401 vuol dire «attive, serve il login», 404
  «spente». Così l'app può uscire prima del backend, e le esperienze si spengono dal backend senza
  una nuova build.
- [ ] Creazione da cammino: `layer_id` del cammino, `ec_track_id` vuoto.
- [ ] Creazione da tappa: `ec_track_id` della tappa e `layer_id` del cammino corrente
  (`currentEcLayer`); se la tappa è aperta senza cammino nell'URL (ricerca, deep link), l'app manda
  solo `ec_track_id` e il cammino lo ricava il backend.
- [ ] Form: testo (textarea) e foto con `wm-image-picker`, `maxPhotos = 6` passato come input —
  `MAX_PHOTOS = 3` delle UGC resta invariato — e `captureOptions` a 1600 px e qualità 80 (senza,
  `getPhotos()` usa qualità 100).
- [ ] `wm-image-picker` riceve un input per la rimozione delle foto già salvate: con il valore
  predefinito chiama `deleteUgcMedia` come oggi, per le esperienze toglie la foto solo dal form.
  Senza, togliere una foto di un'esperienza in modifica manderebbe una DELETE all'API dei media UGC
  con l'id sbagliato (`image-picker.component.ts:100-103`).
- [ ] Pubblicazione e salvataggio della modifica bloccati se il testo, dopo `trim()`, e le foto
  sono entrambi vuoti.
- [ ] Invio multipart in una chiamata sola (testo + `images[]`), con un `uuid` generato all'apertura
  del form di creazione e mantenuto fra un tentativo e l'altro.
- [ ] Modifica: si inviano testo, foto nuove e **sempre** l'elenco degli id delle foto da tenere,
  anche vuoto, codificato in modo che arrivi al server (un array vuoto in `FormData` non viaggia).
- [ ] Senza connessione: errore chiaro, il form resta aperto con testo e foto; nessuna coda locale.
- [ ] Controllo prima della chiusura del form (indietro, swipe, X): se testo o foto non sono vuoti,
  chiede conferma prima di scartare. Schema di `PassportLeaveGuard`.
- [ ] Le esperienze in memoria si azzerano al logout.
- [ ] Il selettore delle esperienze è scritto con un parametro di visibilità (mie / di tutti), anche
  se in questo ciclo si usa solo «mie».
- [ ] Testi nuovi in `localization/i18n/*.ts`, nei 7 file (de, en, es, fr, it, pr, sq), con la
  chiave uguale al testo italiano.
- [ ] Le varianti `*.camminiditalia.*` toccate ricevono le stesse modifiche del template di default.
- [ ] [UX] Un solo componente per il blocco «esperienze», montato su cammino, tappa, Passaporto
  vista 3 e vista 6, come nell'artifact approvato.
- [ ] [UX] Da non loggato, «Racconta…» apre il login come per le UGC; nessun riquadro «Accedi».
- [ ] [UX] Nel Passaporto il form si apre nella `ion-nav` della modale e usa `PassportLeaveGuard`.

## Rischi

- **Componenti condivisi da tutti gli shard.** `wm-track-properties` e la schermata del cammino sono
  usati da ogni istanza. Mitigazione: il blocco è montato solo dalle varianti camminiditalia, quindi
  sulle altre istanze non parte nemmeno la chiamata.
- **Due template da tenere allineati.** Se le esperienze del cammino passano da `home-layer`, la sua
  variante camminiditalia è una copia del template di default, e una modifica fatta in uno solo dei
  due non dà errori. Mitigazione: si toccano entrambi nello stesso task.
- **Cammino corrente assente.** Aprendo una tappa da ricerca o deep link lo store non ha il cammino
  (`url-handler.service.ts:112`). Mitigazione: decide il backend; per le 3 tappe che stanno in più
  cammini (DB locale) l'esperienza può finire su un cammino diverso da quello che l'utente aveva in
  mente.
- **Legame con le registrazioni incompleto, accettato.** Se l'utente scrive l'esperienza prima che la
  registrazione sia sincronizzata e abbinata alla tappa, il dettaglio di quella UGC non mostra
  l'esperienza; una modifica successiva dell'esperienza ricalcola il legame.
- **Upload sulla webapp.** Il picker è pensato per la fotocamera nativa; sulla webapp va verificata
  la scelta da file, compreso il ridimensionamento.

## Out of scope

- Lettura pubblica delle esperienze di altri utenti e interruttore «condividi»: la colonna
  `is_public` esiste nel backend, ma resta `false` e la UI non la espone.
- Una vista con tutte le esperienze dell'utente (per esempio nel profilo).
- Moderazione da parte dei gestori.
- Bozza salvata sul telefono e invio automatico al ritorno della rete.
- Rilascio: le PR vanno su `develop`, senza release.

## Moduli toccati

**wm-core:**
- nuovo servizio API delle esperienze e relativo stato (store NgRx o service, da decidere nel piano)
- nuovi componenti: elenco delle esperienze, form di creazione e modifica con controllo prima della
  chiusura, dettaglio
- `image-picker/` — input per la rimozione delle foto già salvate
- `home/home-layer/` e la variante `home-layer.component.camminiditalia.*` — sezione del cammino
- `track-properties/` — esperienze della tappa, con classe base e variante camminiditalia
- `ugc-track-properties/` — esperienze collegate, con classe base e variante camminiditalia
- `passport/passport-stage-detail/`, `passport/passport-detail/`, `passport/passport-modal/` —
  blocco nelle viste 3 e 6, form nella `ion-nav`
- `localization/i18n/*.ts`
- `utils/localForage.ts` e `store/auth/auth.effects.ts` — cache offline delle proprie esperienze,
  svuotata al logout
- `wm-core.module.ts` — dichiarazione dei componenti

**webmapp-app:** puntatore dei submodule wm-core e wm-types; `core/angular.json` (`fileReplacements`
camminiditalia per track-properties e ugc-track-properties, cartelle dei test) e
`core/tsconfig.spec.json`.
