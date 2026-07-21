> Ticket: oc:8183

# Note di implementazione — pulsante e stato UI (wm-core)

Nessuna deviazione rilevante dal piano. Tutti i 7 task sono stati implementati nell'ordine
indicato. Di seguito le decisioni prese on-the-fly dove il piano lasciava un grado di libertà
esplicito (in particolare il task 3, che rimandava la definizione del contratto esatto).

## Decisioni prese

### 1. Campo `OPTIONS.ugcTrackShareEnabled` (wm-types)
- Aggiunto in `wm-types/src/config.ts`, in ordine alfabetico tra `trackRefLabelZoom` e
  `useCaiScaleStyle`, come `ugcTrackShareEnabled?: boolean` (opzionale, come
  `showTrackRemainingDistance` di oc:8177).
- **Nessun default client-side aggiunto** in `conf.reducer.ts` (a differenza di
  `showTrackRemainingDistance`, che ha un default temporaneo `true` marcato `TODO(oc:8177)`).
  Scelta deliberata: questa è una feature nuova che alla fine invoca un plugin nativo
  (Instagram/Facebook Stories) tramite un'orchestrazione cross-repo — non ha senso che sia
  attiva di default finché il backend non la abilita esplicitamente via `config.json`. Se in
  futuro serve un default per i test locali, seguire lo stesso pattern di oc:8177 con un
  `TODO` esplicito.

### 2. Pulsante "Condividi" — gating
- Il piano indicava esplicitamente di riusare il selettore `confOPTIONS$` già dichiarato nel
  componente (`confOPTIONS$ = this._store.select(confOPTIONS)`), che risultava dichiarato ma
  **inutilizzato** nel template esistente. Il gating in `ugc-track-properties.component.html`
  è quindi `*ngIf="(confOPTIONS$|async)?.ugcTrackShareEnabled"`, **senza** introdurre un nuovo
  selettore dedicato tipo `confOPTIONSUgcTrackShareEnabled` (pattern usato altrove, es.
  oc:8177) — coerente con quanto scritto nel piano.
- Il blocco del pulsante è annidato dentro lo stesso `*ngIf="!(isEditing$|async)"` dei bottoni
  edit/delete esistenti: il pulsante "Condividi" è visibile solo in modalità vista, non
  durante l'editing del form (non specificato esplicitamente nel piano, ma coerente con il
  fatto che editing e condivisione sono azioni mutuamente esclusive sulla stessa traccia).

### 3. Contratto esatto dell'evento/callback — **punto aperto per revisione umana**
Questo è il punto che il piano rimandava esplicitamente ("definire il contratto esatto
dell'evento/callback con webmapp-app prima di chiudere questo task"). Lavorando solo lato
wm-core in questa sessione, ho scelto e implementato un contratto ragionevole coerente con i
pattern esistenti nel componente, ma **va validato contro l'implementazione reale di
`share.service.ts` nel repo principale (task 6 del plan di `webmapp-app`)** prima del merge:

- **Output** (richiesta di condivisione, dal componente verso l'alto):
  ```ts
  @Output('share-track') shareTrack: EventEmitter<WmFeature<LineString>>
  ```
  Emette **la traccia corrente per intero** (`this.track`, tipo `WmFeature<LineString>`), non
  un id o un oggetto-wrapper. Motivazione: il chiamante deve orchestrare screenshot (map-core,
  serve la geometria) + statistiche (servono le properties) + compositing — passare l'intera
  feature evita un secondo lookup lato webmapp-app. Coerente con il pattern esistente
  `@Output('poi-click') poiClick: EventEmitter<number>` (payload di dominio "grezzo", non
  incapsulato), anche se qui il payload è l'intera feature invece di un id.
  Alias `'share-track'` (kebab-case) scelto per coerenza con `'poi-click'` esistente.

- **Input** (esito riportato dal chiamante al componente):
  ```ts
  @Input('shareResult') set setShareResult(result: UgcTrackShareResult | null)

  export interface UgcTrackShareResult {
    errorMessage?: string;
    success: boolean;
  }
  ```
  `null` è un no-op esplicito (valore iniziale del binding prima che il parent abbia
  qualcosa da riportare — evita che un `[shareResult]="someObs$|async"` con `null` iniziale
  resetti lo stato a `ERROR`). Su `success: true` → stato `SUCCESS`, errore azzerato. Su
  `success: false` → stato `ERROR`, `shareErrorMessage` valorizzato da `errorMessage` se
  presente, altrimenti resta `null` e la UI mostra un messaggio di fallback tradotto
  (`'Condivisione non riuscita'`).

  **Alternative scartate**: (a) un secondo `@Output` tipo `retryRequested` distinto da
  `shareTrack` — scartata perché il piano task 4 dice esplicitamente "bottone/azione che
  ripropone **lo stesso evento**"; (b) passare l'esito tramite una Promise/Observable passata
  come Input anziché un valore push — scartata perché rompe il pattern "dumb component" già
  in uso (Input/Output puri, niente logica async iniettata dall'esterno oltre al valore).

  **Cosa il developer umano deve verificare in `webmapp-app`**: che `share.service.ts` (o
  chi per esso) sottoscriva `(share-track)="onShareTrack($event)"` sul template che monta
  `<wm-ugc-track-properties>`, e che l'esito converga in un Observable/BehaviorSubject
  legato con `[shareResult]="shareResult$|async"`. Se il team preferisce un contratto diverso
  (es. Promise-based, o un enum di stato invece di `{success, errorMessage}`), il punto di
  modifica è isolato: solo il setter `setShareResult` e l'interfaccia `UgcTrackShareResult`.

### 4. Stati UI — enum dedicato
- Creato `wm-core/projects/wm-core/src/types/eugc-track-share-state.enum.ts` con
  `EUgcTrackShareState = ERROR | GENERATING | IDLE | SUCCESS` (prefisso `E` + PascalCase,
  membri UPPER_CASE, coerente con `ESlopeChartSurface`/`EGeojsonGeometryTypes` già presenti
  in `types/`), invece di un type-alias locale o di riusare l'enum `downloadPanelStatus`
  esistente (che non segue il prefisso `E` ed è comunque semanticamente un dominio diverso —
  download tile, non condivisione social).
- Stato tracciato in `shareState$: BehaviorSubject<EUgcTrackShareState>`, inizializzato a
  `IDLE`. **Nessun auto-reset temporizzato da `SUCCESS` a `IDLE`**: il messaggio di successo
  resta finché il pannello non si chiude/riapre o l'utente non ritenta un nuovo tap — scelta
  per non introdurre un timer/subscription solo per un dettaglio di polish UX. Punto aperto,
  segnalabile per una revisione UX successiva se si preferisce un auto-dismiss.

### 5. Retry su errore
- Il bottone "Riprova" nello stato `ERROR` chiama lo **stesso metodo** `triggerShare()` usato
  dal tap iniziale (nessun metodo/evento separato) — riemette `shareTrack` con lo stesso
  payload (`this.track`) e riporta lo stato a `GENERATING`, azzerando `shareErrorMessage`.
  Nessun retry automatico silenzioso, come richiesto dal task 4.

### 6. Guardia doppio tap (task 5)
- Doppia protezione: (a) `[disabled]="shareState === EUgcTrackShareState.GENERATING"` sul
  bottone nel template: (b) `triggerShare()` esce immediatamente (no-op) se
  `shareState$.value === GENERATING`, indipendentemente dallo stato del binding `disabled`
  (difesa in profondità, coerente con quanto già notato nel piano per la guardia lato
  map-core mini-map come "seconda linea").

### 7. Traduzioni
- 5 nuove chiavi aggiunte in tutte le 7 lingue (`it/en/es/de/fr/pr/sq`), in italiano come
  chiave (coerente con `'Filtri'`/`'Cerca'`/`'Annulla'` già presenti):
  `'Condividi'`, `'Condivisione in corso'`, `'Condiviso con successo'`,
  `'Condivisione non riuscita'`, `'Riprova'`. Aggiunte in coda a ciascun file, stesso punto
  di inserimento usato per l'ultima chiave preesistente (`'Nessun risultato'`).
- **Bug preesistente non toccato**: il template usa già altrove chiavi come `{{'edit'|wmtrans}}`
  e `{{'delete'|wmtrans}}` che **non esistono** come chiave in `it.ts` (esistono invece come
  valori-traduzione in `en.ts`, mappate da chiavi italiane `'modifica'`/`'elimina'` — sembra
  un'inversione chiave/valore preesistente). Non è in scope di questo ticket e non l'ho
  toccato, ma segnalo che è un'inconsistenza preesistente nel componente, non introdotta da
  questa feature.

### 8. Test unitari (task 7)
- File: `ugc-track-properties.component.spec.ts`. **Istanziazione diretta della classe**
  (`new UgcTrackPropertiesComponent(storeSpy, alertCtrlSpy, langSvcSpy, urlHandlerSvcSpy)`),
  **senza `TestBed`** e senza compilare il template — per evitare il crash `NG0201`
  (`APP_TRANSLATION` mancante in DI) già documentato in `wm-core/CLAUDE.md` come causa della
  rimozione dei 27 spec boilerplate in oc:8023. Tutti i mock (`Store`, `AlertController`,
  `LangService`, `UrlHandlerService`) sono `jasmine.createSpyObj`.
- Copertura: stato iniziale `IDLE`; `triggerShare()` emette `share-track` con la traccia e
  passa a `GENERATING`; guardia doppio tap (chiamate ripetute durante `GENERATING` non
  riemettono); `setShareResult({success:true})` → `SUCCESS`; `setShareResult({success:false,
  errorMessage})` → `ERROR` con messaggio; `setShareResult({success:false})` senza messaggio →
  `ERROR` con `shareErrorMessage` nullo (fallback gestito in UI); `setShareResult(null)` →
  no-op; retry dopo errore → riemette lo stesso evento e torna a `GENERATING`; gating
  `confOPTIONS$` con flag `true`/`false`/assente.
- **Verifica aggiuntiva oltre al solo spec isolato**: ho eseguito l'intera suite
  `ng test wm-core --watch=false --browsers=ChromeHeadlessNoSandbox` (richiede Node ≥20,
  non disponibile come default nell'ambiente — usato `nvm use v20.19.0`) per confermare che
  il template compili correttamente sotto il compilatore Angular (AOT) e che non ci siano
  regressioni. Risultato: **174/174 test verdi**, nessun fallimento.

## File creati
- `wm-core/projects/wm-core/src/types/eugc-track-share-state.enum.ts`
- `wm-core/projects/wm-core/src/ugc-track-properties/ugc-track-properties.component.spec.ts`
- `wm-core/docs/features/8183-condivisione-percorso-registrato-sui-social/notes.md` (questo file)

## File modificati
- `wm-types/src/config.ts` — campo `OPTIONS.ugcTrackShareEnabled?: boolean`
- `wm-types/CLAUDE.md` — voce feature + decisione
- `wm-core/projects/wm-core/src/ugc-track-properties/ugc-track-properties.component.ts` —
  stati UI, `@Output('share-track')`, `@Input('shareResult')`, `triggerShare()`
- `wm-core/projects/wm-core/src/ugc-track-properties/ugc-track-properties.component.html` —
  bottone "Condividi" gated, blocco success/error con retry
- `wm-core/projects/wm-core/src/ugc-track-properties/ugc-track-properties.component.scss` —
  stili per i messaggi di successo/errore
- `wm-core/projects/wm-core/src/localization/i18n/{it,en,es,de,fr,pr,sq}.ts` — 5 nuove chiavi
- `wm-core/CLAUDE.md` — voce feature + sezione decisioni

## Revisione: redesign grafico del blocco condivisione (segnalato "molto brutto" da screenshot reale)

`ui-ux-pro-max` (la skill di design che `wm-plan` cercherebbe automaticamente per feature UI)
non è installata in questo ambiente e il developer non è riuscito a installarla al volo —
proceduto con giudizio interno, stesso approccio già usato per il redesign dell'immagine di
condivisione lato backend (analisi dello stile esistente, nessun colore/font inventato).

- **Nessun colore hardcoded**: stessa lezione imparata sul backend (dove un hex fisso
  perdeva il brand di camminiditalia su ogni altra app) applicata qui — il pulsante e i chip
  di feedback usano solo i token CSS semantici già esistenti nell'app
  (`--wm-color-primary`/`-success`/`-danger` e le varianti `-tint`/`-shade` calcolate a
  runtime da `theme.ts`), mai un hex scelto da questa sessione.
- **Scoperta laterale, non risolta qui (fuori scope)**: il colore blu visto nello screenshot
  reale su EDIT/CONDIVIDI sembra il default Ionic (`#3880ff` in `theme.ts`), non il verde
  configurato per l'istanza (`--wm-color-primary: #2F9E44` in
  `instances/camminiditalia/src/theme/variables.scss`). Il campo Nova per il tema dell'app
  (`properties->theme->primary_color`, visto anche nel fix del colore accento
  dell'immagine di condivisione lato backend) usa la chiave `primary_color`, mentre
  `theme.ts` (`getCSSVariables(colors: ITHEME)`) si aspetta la chiave `primary` — un
  disallineamento che spiegherebbe perché il tema Nova non arriva mai a sovrascrivere il
  default blu. Segnalato al developer, non corretto in questo giro (bug preesistente e
  indipendente da questa feature).
- **Struttura**: il blocco condivisione è uscito dalla `ion-grid` di Edit/Delete (era
  annidato dentro le stesse `ion-row`/`ion-col`, sembrava "un altro pulsante della lista"
  invece di un'azione distinta) — ora è una `<div class="wm-ugc-track-share-section">` con
  un separatore (`border-top`) e margine proprio.
  - Bottone "Condividi": aggiunta `ion-icon name="share-social-outline"` (nascosta durante
    lo spinner di `GENERATING`), icona standard Ionicons già bundlata (nessuna dipendenza
    nuova, stesso meccanismo già usato da `ion-icon name="close"` nello stesso file).
  - Stato successo/errore: da `<p>` di solo testo colorato a un "chip" (icona +
    testo su sfondo tint del colore semantico) — `checkmark-circle` per successo,
    `alert-circle` per errore.
  - Retry: da `ion-button expand="block" color="danger"` (blocco pieno a piena larghezza)
    a `fill="clear" size="small"` inline dentro lo stesso chip d'errore — trattamento
    visivo molto più leggero, coerente con un'azione secondaria di recupero.
  - Testi/chiavi i18n **invariati** (stessa identica stringa italiana usata come chiave):
    nessuna modifica ai file `localization/i18n/*.ts`, solo markup/stile.
- **Verifica**: `ng build --configuration=ci` sul repo principale (che compila anche
  wm-core via path alias, non essendo un progetto Angular library separato in questo
  workspace) — completato senza errori, nessun errore di template/tipo sul file toccato.
  Non ripetuta l'intera suite Karma (nessuna logica TS toccata, solo HTML/SCSS).
- **Punto aperto**: questa è solo la prima delle due collocazioni della UI di condivisione
  richieste dal developer — la seconda non è stata ancora comunicata/implementata a fine
  sessione.

### Rimozione del feedback di successo

Richiesta esplicita del developer: "togli anche il condiviso con successo, non serve un
feedback di successo è visibile da sé" — la chiusura del native share sheet è già un segnale
sufficiente, un chip aggiuntivo era ridondante.

- Rimosso il blocco `.wm-ugc-track-share-feedback--success` dal template (restava solo
  questo dopo la rimozione precedente del chip d'errore, quindi l'intera classe
  `.wm-ugc-track-share-feedback` è stata rimossa anche dallo SCSS, non solo il modificatore).
- Rimossa la chiave i18n `'Condiviso con successo'` da tutti e 7 i file
  `localization/i18n/*.ts` (era diventata dead code, nessun altro riferimento nel codebase).
- **Lo stato interno `EUgcTrackShareState.SUCCESS` resta invariato** (`shareState$` continua
  a transitare lì, coperto dagli stessi test preesistenti) — nessuna ragione per toccare la
  state machine solo perché il template non la renderizza più.
- Verificato con `ng build --configuration=ci` (pulito) e la suite Karma dedicata
  (13/13 verdi, invariata rispetto a prima).

### Correzione: errore mostrato con alert nativo, non con un banner in-template

Richiesta esplicita del developer subito dopo aver visto la prima versione: "gli errori non
metterli sotto, fai aprire un alert come in altre occasioni" — riferendosi allo stesso
pattern già usato da `deleteTrack()` in questo stesso componente (`AlertController`).

- Il chip `.wm-ugc-track-share-feedback--error` (icona + testo + retry inline) è stato
  **rimosso** dal template — resta solo il chip di successo.
- `setShareResult()` ora chiama un nuovo metodo privato `presentShareErrorAlert(message)`
  quando `result.success === false`, che presenta un `AlertController` con `message` (il
  messaggio d'errore o il fallback "Condivisione non riuscita") e due bottoni: "Annulla"
  (`role: 'cancel'`) e "Riprova" (`handler: () => this.triggerShare()`) — stessa identica
  struttura di `deleteTrack()`, nessun pattern nuovo introdotto.
- **Lo stato interno `EUgcTrackShareState.ERROR` resta invariato** (ancora impostato su
  `shareState$`, ancora coperto dagli stessi test preesistenti) anche se il template non lo
  usa più per renderizzare un banner — serve comunque a `triggerShare()` per la guardia
  doppio-tap e a documentare lo stato macchina, e cambiarlo avrebbe rischiato di rompere
  la spec esistente senza un motivo reale.
- **Spec aggiornato**: `alertCtrlSpy.create` ora resta stubbato con `.and.resolveTo({present:
  jasmine.createSpy()})` (senza, `from(undefined)` avrebbe fatto fallire ogni test che
  imposta un risultato negativo, dato che `AlertController.create()` non era mai stato
  invocato prima in nessun test) e `langSvcSpy.instant` con un fake pass-through. Aggiunti 2
  nuovi test: verifica che l'alert venga aperto con messaggio/bottoni corretti, e che il
  bottone "Riprova" dell'alert riemetta l'evento di condivisione e torni a `GENERATING`.
- **Risultato test**: eseguito `ng test wm-core --watch=false --browsers=ChromeHeadlessNoSandbox
  --include='**/ugc-track-properties.component.spec.ts'` dalla working directory del
  submodule `wm-core` (progetto Angular library `wm-core` nel suo `angular.json` dedicato,
  non l'app principale — che invece esclude di proposito gli spec di wm-core dalla
  discovery, vedi oc:8023) — **13/13 test verdi** (11 preesistenti + 2 nuovi). Ripetuta
  anche `ng build --configuration=ci` sul repo principale per confermare che il template
  aggiornato compili senza errori.
