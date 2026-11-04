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


## Ciclo 2 — «Il mio diario» (3 novembre 2026)

> Fonti: richiesta del cliente del 2 novembre 2026 nel ticket; call con Cammini d'Italia del 3 novembre
> (tag Orchestrator 716, «[CALL][CAMMINIDITALIA][2026] Chiarimenti sul diario del cammino»); scrum del 3
> novembre ore 11:37. Scadenza: 4 novembre 2026 ore 12, un giorno di sviluppo.

### Cosa cambia

1. **Rinomino in «diario», ovunque.** I testi visibili passano da «esperienza» a «diario» (sezione «Il mio
   diario», «Racconta il tuo cammino», «Racconta questa tappa», «Nuova pagina di diario», …) in tutte e 7 le
   lingue. Anche il codice si rinomina: `Experience` → `Diary` nel backend (modello, tabelle `diaries` e
   `diary_ugc_track`, rotte `/api/diaries`, policy, richieste, controller, job, servizio di collegamento delle
   tracce, risorsa Nova, config `camminiditalia.diaries.*`, variabile d'ambiente) e in wm-core (modello,
   `DiaryService`, cartella `diaries/`, selettori `wm-diary-*`, flag `showDiaries`, store localforage). Il
   branch non è mergiato né rilasciato: si rinomina la migration di creazione, non serve una migrazione dei
   dati. È il primo passo, in un commit dedicato per repo.
2. **Pulsante solo vicino al cammino.** Nel dettaglio del cammino e delle sue tappe, il pulsante per
   scrivere un diario compare solo se l'utente è stato a **meno di 1 km** da una qualsiasi tappa del cammino
   negli **ultimi 90 giorni**. Lo stato «cammino attivo» si salva sul telefono per `layerId` con la data, e
   vale per il cammino e per tutte le sue tappe. Soglia e durata stanno in costanti.
   **Quando e come si controlla:** un servizio di wm-core, attivo solo nella variante camminiditalia, ascolta
   `GeolocationService.onLocationChange$` (mappa aperta o registrazione in corso), al massimo una volta ogni
   pochi minuti, e controlla anche all'apertura del dettaglio. Prima scarta i cammini il cui `bbox`, allargato
   di 1 km, non contiene la posizione (118 cammini, costo trascurabile); per il cammino candidato carica le
   tappe con `EcService.getEcTrack` (cache in localforage) e misura la distanza minima dalla linea. Senza rete
   e senza tappe in cache vale l'esito del `bbox`. Un cammino già attivo oggi non si ricontrolla. I diari già scritti si
   vedono sempre. Nel Passaporto la regola della vicinanza non vale (vedi punto 5).
3. **Bozza e invio offline.** Il testo e le foto del form si salvano sul telefono mentre si scrive, sia per un
   diario nuovo sia per una modifica: chiudendo l'app non si perde nulla. Senza rete, un **diario nuovo** si
   mette in coda (uuid, testo, foto come Blob) e parte da solo quando la rete torna; resta visibile nella
   sezione con lo stato «In attesa di invio». La **modifica** di un diario già pubblicato resta bloccata senza
   rete, come oggi, ma la bozza è salvata.
   **Chiave e vita della bozza:** diario nuovo → `utente + cammino + tappa` (tappa «nessuna» per il cammino);
   modifica → `utente + id del diario`. L'uuid si salva nella bozza e si riusa alla riapertura. La bozza si
   cancella dopo la pubblicazione, dopo l'annullamento esplicito e quando il diario passa in coda. Il testo si
   salva dopo una pausa nella scrittura, le foto solo quando si aggiungono o si tolgono.
   **Utente e scadenza:** ogni bozza ed elemento in coda porta l'`userId` di chi l'ha scritto e si invia solo
   con lo stesso utente loggato; quelli di altri utenti aspettano il loro rientro. Al logout con diari in coda
   l'app avvisa: «Hai N diari in attesa di invio: se esci, partiranno al tuo prossimo accesso». All'avvio si
   cancellano bozze ed elementi in coda con ultima modifica più vecchia di 90 giorni (costante). Lo stato
   «cammino attivo» resta del telefono, non dell'utente.
   **Avvio solo in camminiditalia:** il processore della coda e il servizio del «cammino attivo» si avviano
   nel costruttore di `tabs.page.camminiditalia.ts` dell'app (già in `fileReplacements`, vivo per tutta la
   sessione); negli altri shard non esistono. L'invio parte a evento: passaggio di `NetworkService.online$`
   da falso a vero, login, scadenza delle attese crescenti dopo un errore. Nessun timer a coda vuota. Nella
   webapp c'è solo la bozza nel form, senza processore della coda.
4. **Consenso alla ripubblicazione.** Nel form, una spunta facoltativa, non selezionata di default: «Cammini
   d'Italia può pubblicare il mio racconto sui suoi canali». Si salva nel campo dedicato
   `publication_consent` (default `false`), distinto da `is_public`; si invia con la creazione e la modifica,
   e torna nell'API. In Nova si vede in sola lettura, con un filtro.
5. **Diario del cammino nel Passaporto anche a cammino iniziato.** Oggi il blocco del cammino nel
   Passaporto sta nella sezione del traguardo (`passport-detail.component.html:55`, `*ngIf="vm.completed"`)
   e compare solo a cammino completato. Si sposta perché compaia per ogni cammino con almeno una tappa
   riconosciuta (`completedStages > 0`), senza la regola della vicinanza. Il diario della singola tappa nel
   Passaporto resta com'è.
6. **Nova solo per gli amministratori.** I diari li vedono solo gli Administrator (Cammini d'Italia e
   Webmapp), con o senza consenso. Il Validator viene tolto da `viewAny` e da `visibleTo`.

### Perché

Il cliente ha validato il prototipo e ha chiesto una serie di modifiche (messaggio del 2 novembre),
chiarite in call il 3 novembre. Webmapp copre un altro giorno di sviluppo: si fanno le richieste
indispensabili e quelle più semplici. Il consenso è indicato dal cliente come «da fare subito», perché
senza consenso non potrà riusare i racconti scritti prima.

### Requisiti

- [ ] Nessun testo visibile all'utente contiene più «esperienza» o «esperienze»; le 7 lingue hanno tutte
      le chiavi nuove e nessuna chiave vecchia rimasta.
- [ ] Backend e wm-core non contengono più `Experience`/`experience` nei nomi (classi, tabelle, rotte,
      config, selettori), a parte i riferimenti storici nella documentazione del cantiere.
- [ ] I test esistenti del backend passano dopo il rinomino.
- [ ] Il pulsante compare sul cammino e sulle sue tappe solo se l'utente è stato entro 1 km da una tappa di
      quel cammino negli ultimi 90 giorni; senza posizione o senza permesso di localizzazione non compare.
- [ ] I diari già scritti restano visibili anche quando il pulsante non c'è.
- [ ] Nel Passaporto il diario del cammino si può scrivere da quando c'è almeno una tappa riconosciuta,
      senza regola della vicinanza; a cammino completato resta nel traguardo come oggi.
- [ ] Il form salva testo e foto sul telefono mentre si scrive e li ripropone alla riapertura, per un
      diario nuovo e per una modifica, con la propria chiave per contesto; la bozza si cancella dopo la
      pubblicazione, l'annullamento o il passaggio in coda, e scade dopo 90 giorni.
- [ ] Bozze ed elementi in coda di un utente non partono mai con il token di un altro; al logout con diari
      in coda l'app avvisa.
- [ ] Senza rete, «Pubblica» su un diario nuovo lo mette in coda e chiude il form con un messaggio chiaro;
      al ritorno della rete parte il POST con lo stesso uuid, senza creare doppioni.
- [ ] La spunta del consenso è facoltativa e non selezionata di default; il valore si salva e torna
      dall'API, anche in modifica.
- [ ] In Nova i diari li vede solo l'Administrator; il Validator non vede la risorsa.
- [ ] [UX] Lo stato «In attesa di invio» è un'etichetta testuale con icona, non solo un colore, ed è
      annunciato come stato (`role="status"`); scompare quando l'invio riesce.
- [ ] [UX] Esiti dell'invio dalla coda: 401 → resta in coda e parte dopo il prossimo login; rete assente o
      5xx → nuovo tentativo con attese crescenti (1, 5, 15 minuti, poi a ogni ritorno della rete); 422, 413,
      404 → il diario si ferma come «Non inviato» e, toccandolo, si riapre nel form con testo, foto e il
      messaggio d'errore, per correggerlo e ripubblicarlo, oppure eliminarlo.
- [ ] [UX] La spunta ha l'etichetta visibile accanto, un'area di tocco di almeno 44×44 px, e il testo
      completo non troncato.
- [ ] [UX] Il passaggio da form a coda è confermato con un toast: «Sei offline: il diario partirà appena
      torni online».

### Rischi

- **Rinomino esteso su un giorno di lavoro**: tocca molti file in due repo, e un rinomino a metà (backend su
  `/api/diaries`, app su `/api/experiences`) fa sparire la funzione senza errori, perché il 404 vale come
  «spenta dal backend». Mitigazione: il rinomino si fa per primo, backend e wm-core insieme, in un commit
  dedicato per repo, chiuso con i test del backend e la build dell'app; o è completo o non si fa (in quel
  caso si torna indietro su entrambi e resta «diario» solo nei testi visibili).
- **Ordine dei lavori** (un giorno di sviluppo, scrum del 3 novembre ore 11:37): rinomino → consenso e Nova
  → Passaporto a cammino iniziato → bozza e coda offline → pulsante vicino al cammino. L'ultimo è quello
  che si rimanda con meno danni: la sezione resta visibile come oggi.
- **Coda e logout, errori non risolvibili riprovando, avvio della coda, bozze sovrascritte o doppie**:
  gestiti nei punti 3 e nei requisiti [UX] (userId, scadenza a 90 giorni, esiti per codice HTTP, avvio a
  evento solo in camminiditalia, chiave e vita della bozza).
- **Spec dei diari esclusi in silenzio**: `core/angular.json:198` e `core/tsconfig.spec.json:26` dell'app
  puntano a `experiences/`; vanno aggiornati nel rinomino.
- **Limite di upload in locale**: il container PHP ha `upload_max_filesize = 2M`, sotto i 5 MB delle regole;
  in produzione va verificato nginx (già annotato in oc:8169).
- **Doppio invio dalla coda** (rete instabile, app riaperta durante l'invio): si mitiga con l'uuid già
  idempotente lato backend e con un solo invio alla volta.
- **Foto in coda e spazio sul telefono**: al massimo 6 foto già ridimensionate per diario; la coda si
  svuota a invio riuscito.
- **Utente senza GPS**: chi non concede la posizione non vede mai il pulsante sul cammino. È voluto dal
  cliente; il Passaporto resta la strada sempre disponibile.
- [UX] **Pulsante che sparisce senza spiegazione**: chi ha già scritto da quel cammino e torna dopo 90
  giorni non trova più il pulsante. Mitigato dal Passaporto, dove resta sempre.

### Out of scope

Rimandati, da rivalutare dopo questo ciclo: promemoria a fine cammino, diari nel profilo, editor con
formattazione, foto nel testo e racconti per tappa nel diario del cammino, scheda con i dati del
percorso, valutazioni, periodo di percorrenza per collegare le tracce, coda offline per le modifiche.
Esclusi dallo scrum del 3 novembre: titolo e descrizione per ogni foto. Il blocco nella webapp è già
attivo sul branch (`angular.json`, sostituzioni camminiditalia) e non richiede lavoro.

### Moduli toccati

**camminiditalia (backend)**: migration di creazione (`experiences` → `diaries`, `experience_ugc_track` →
`diary_ugc_track`, colonna `publication_consent`), `app/Models/Experience.php` → `Diary.php`, policy,
`Store/UpdateExperienceRequest` → `Store/UpdateDiaryRequest`, `ExperienceController` → `DiaryController`,
rotte API, `LinkExperienceUgcTracksJob`, `ExperienceUgcLinkService`, `ExperienceService`, middleware
`EnsureExperiencesEnabled` e `ProtectExperienceMedia`, observer, risorsa Nova e filtro del consenso,
`config/camminiditalia.php`, factory e test.

**wm-core**: `experiences/` → `diaries/` (modello, servizio, form, sezione, dettaglio), `track-properties`
e `home-layer` (varianti camminiditalia, flag), Passaporto (punti di montaggio), `utils/localForage.ts`,
file `localization/i18n/*.ts` (7 lingue), nuovo servizio per lo stato «cammino attivo» e per la coda.

**webmapp-app**: puntatore di wm-core; `core/src/app/pages/tabs/tabs.page.camminiditalia.ts` (avvio dei due
servizi); `core/angular.json` (`architect.test.options.include`, riga 198) e `core/tsconfig.spec.json`
(riga 26), che puntano alla cartella `experiences/` e vanno portati a `diaries/`, altrimenti gli spec dei
diari smettono di girare senza segnalarlo.

**wm-webapp**: solo il puntatore di wm-core.




### Ciclo 2, aggiunte (3 novembre 2026, sera)

Aree del tag 716 aggiunte dal dev a oc:8169 dopo il primo blocco, tutte **solo camminiditalia**.
Prototipo: https://claude.ai/artifact/VKvfbYKfDCBaRQBUVyfcz7

7. **Notifica di cammino completato** (al posto dell'invito nell'email). Un servizio di wm-core,
   avviato da `tabs.page.camminiditalia.ts`, ascolta `PassportService.passportRoutes$()`: quando un
   cammino passa a `completed` e non è fra quelli già visti (salvati sul telefono per utente), mostra
   una scheda in alto (`ion-toast` personalizzato, persistente, chiudibile trascinandola su):
   «Hai completato <cammino>!», «Guarda il traguardo e racconta il cammino nel diario», pulsanti
   «Più tardi» e «Vai al traguardo», che apre il dettaglio del Passaporto di quel cammino. Alla prima
   esecuzione per un utente i cammini già completati si segnano come visti senza notifica. Una scheda
   alla volta.
8. **Il mio diario nel profilo.** Nella variante camminiditalia del profilo, accanto al tab esistente,
   un secondo tab «Il mio diario»; il primo diventa «I miei dati» (solo in camminiditalia). Il tab
   elenca i diari raggruppati per cammino: una `wm-diaries-section` per cammino (`layerId`,
   `layout="list"`, `showCreate=false`, titolo il nome del cammino). Rotta in un
   `profile-routing.module.camminiditalia.ts` via `fileReplacements`, componente standalone: il modulo
   e il routing condivisi del profilo non si toccano. Senza diari, un messaggio vuoto.
   *(Superato in parte dal punto 11: la tab «I miei dati» è diventata «Account»; il componente non è
   standalone, vedi notes.md.)*
9. **Valutazioni** facoltative, uguali per diario del cammino e della tappa: Cammino (sulla tappa
   «Tappa»), Ospitalità, Difficoltà percepita, da 1 a 5, con un'unica icona: il **timbro con lo
   scarpone** (tavola «Scarponi di icons.json», variante B, nel canvas
   https://claude.ai/artifact/PcgenGHpyScsnXuHk2eHnj). Tondo pieno nel colore dell'app, bordo interno
   tratteggiato bianco, al centro lo scarpone `txn-boot` di `wm-package/resources/defaults/icons.json`
   in bianco; il punto non dato è solo il contorno grigio con lo scarpone grigio chiaro. L'SVG si
   copia nel componente di wm-core (quel file serve alle icone dei POI, non è caricabile da lì); in
   piccolo, nel dettaglio, senza bordo tratteggiato. Nel form in pagina unica dopo le foto; un tocco sul valore già
   scelto lo azzera.
   **Animazione, solo alla selezione nel form:** toccando il valore N, i timbri da 1 a N si
   «imprimono» uno dopo l'altro (60 ms di distanza), ciascuno da grande e leggermente ruotato a
   dimensione normale con un piccolo rimbalzo (circa 250 ms: scala 1,4 → 0,9 → 1, rotazione
   −12° → 0°). Abbassando il valore, i timbri oltre N tornano vuoti con una dissolvenza breve, senza
   rimbalzo. Nessuna animazione all'apertura del form con valori già salvati né nel dettaglio. Con la
   riduzione del movimento attiva nel sistema (`prefers-reduced-motion`) solo il cambio di colore. Nel dettaglio, solo quelle date. Backend: colonne `rating_route`,
   `rating_hospitality`, `rating_difficulty` (interi 1-5, null) nella migration di creazione, regole
   in creazione e modifica, API, Nova in sola lettura.
10. **Scheda dati del percorso** nel dettaglio del diario, solo se quello che racconta è stato
    percorso: diario della **tappa** a tappa completata, diario del **cammino** a cammino completato.
    Mostra data (o date di inizio e fine), numero di giorni e km. **Prima i dati dell'utente, dove
    mancano quelli del cammino:**
    - **km della tappa:** la lunghezza delle tracce GPS dell'utente che l'hanno validata
      (`PassportStage::ugcTracks()`, tabella `passport_stage_ugc_track`), se quelle tracce
      appartengono solo a questa tappa; altrimenti (validazione manuale, nessuna traccia, oppure
      una traccia registrata su più tappe insieme) la lunghezza della tappa.
    - **km del cammino:** la lunghezza delle tracce dell'utente collegate alle tappe completate,
      ciascuna contata una volta sola, più la lunghezza delle tappe completate senza traccia.
    - **date e giorni, stessa regola:** tappa completata col GPS → i giorni delle registrazioni
      collegate (data della traccia); tappa completata con la richiesta cartacea → i giorni da
      `start_date` a `end_date` della richiesta che l'ha validata (`PassportStage::certificationRequest()`).
      Per il cammino: dal primo all'ultimo giorno e numero di giorni distinti, unendo quelli di tutte
      le tappe. Se una tappa non ha né tracce né richiesta, i suoi giorni mancano e la riga dei giorni
      del cammino non si mostra (i km sì).
    Backend: nella risposta di `GET /api/layer/{layer}/progress` si aggiungono per tappa
    `user_distance` (km dalle tracce dell'utente, `null` se non applicabile) e `walked_dates` (le
    date `Y-m-d` in cui è stata percorsa, vuoto se non si sanno), e per il cammino
    `user_distance_total` (calcolato come sopra). Il frontend sceglie fra dato dell'utente e dato
    del cammino. Senza
    progresso (offline senza copia) la scheda non c'è.

**Ordine**: profilo → valutazioni → notifica → scheda dati (la più incerta, si rimanda se manca tempo).

**Rischi aggiunti**
- Notifica: `passportRoutes$` si aggiorna al login, al ritorno in primo piano e all'apertura del
  Passaporto, non in tempo reale: il completamento si vede alla prossima di queste occasioni.
- Notifica alla prima esecuzione: senza il «già visti» iniziale, chi ha più cammini completati
  riceverebbe più schede di fila.
- Profilo: `ion-tabs` con rotte figlie; la variante del routing va dichiarata nelle configuration di
  build e di serve.
- Scheda dati, km dell'utente: una traccia registrata in un giorno solo su due tappe è collegata a
  entrambe; senza la regola «una volta sola» i km del cammino si conterebbero due volte. Una traccia
  con il GPS che salta può dare km gonfiati: si mostrano così come sono stati registrati.
- Scheda dati: la `validated_at` di una tappa cartacea è la data di approvazione del gestore, non di
  percorrenza: per questo i giorni vengono da `start_date`/`end_date` della richiesta, mai da
  `validated_at`.
- Scheda dati, giorni GPS: la data di una traccia è quella di inizio registrazione; una traccia che
  passa la mezzanotte conta un giorno solo.

11. **Profilo riorganizzato** (solo camminiditalia, aggiunto il 3 novembre 2026 dopo la prova del
    tab «Il mio diario»: i pulsanti fissi in fondo coprivano la lista, e le informazioni erano
    sparse in modo incoerente). La schermata di accesso e registrazione resta com'è.
    - **Intestazione**: avatar, nome ed email come oggi; il tocco apre già la modifica del profilo.
    - **Tab «Il mio diario»**, la prima e quella aperta di default da loggato.
    - **Tab «Account»** al posto di «I miei dati», nell'ordine: Download (tracce scaricate, il
      contenuto di oggi), Modifica consenso dati, Esci, Elimina account. Tutti nel flusso della
      pagina, non più fissi in fondo: niente più sovrapposizioni. Da non loggato la tab mostra solo
      i download, e «Il mio diario» non c'è.
    - **Ingranaggio**: solo le impostazioni dell'app (lingua, GPS, schermo acceso, versione,
      pagine); «Esci» si sposta in «Account». L'avviso dei diari in coda all'uscita resta uguale.
    - Rischi: `SettingsComponent` è condiviso fra tutti gli shard; si nasconde «Esci» con un input
      che vale `true` di default, così gli altri shard non cambiano. La logica di uscita si sposta
      in un servizio dell'app usato da entrambi i punti.
