> Ticket: oc:8391

# Sostituire CSS custom home-layer con componente custom (camminiditalia)

## Cosa cambia
Il layout custom di `wm-home-layer` per lo shard camminiditalia (oggi ottenuto
tramite selettori CSS globali con `!important` in `1.css`, caricato a runtime
via `MetaComponent`) viene spostato in un vero componente Angular:

- La logica TS di `WmHomeLayerComponent` (stato preferiti, subscription lingua,
  selettori store) viene estratta in una classe **Base** (`WmHomeLayerBaseComponent`,
  plain class, non un `@Component` separato — nessuna injection/decorator propri,
  solo stato e metodi condivisi).
- `WmHomeLayerComponent` (default, selettore `wm-home-layer`) estende la Base,
  mantiene il template/stile attuali inalterati.
- `home-layer.component.camminiditalia.ts` esporta **la stessa classe
  `WmHomeLayerComponent`** (stesso nome, stesso pattern già in uso per
  `profile.page.camminiditalia.ts` — `fileReplacements` sostituisce l'intero
  file a livello di path, non aggiunge una dichiarazione parallela nel
  modulo), estende la stessa Base, **riusa lo stesso template HTML del
  default** (`templateUrl: './home-layer.component.html'` — la struttura DOM
  non cambia tra le due varianti, solo lo stile, quindi nessun file gemello
  necessario: solo il `.ts` deve essere gemello per il pattern
  `fileReplacements`) e un proprio `.camminiditalia.scss` che porta le regole
  del blocco `wm-home-layer` di `1.css` (grid foto/logo/titolo, divisore
  condizionale) come stile scoped
  del componente, senza `!important` né selettori globali.
- Instradato dal repo principale via `fileReplacements` Angular sul file
  `home-layer.component.ts` (dettagli lato build in
  `docs/features/8391-.../overview.md` del repo principale). `wm-core.module.ts`
  **non cambia**: continua a dichiarare `WmHomeLayerComponent` importato dallo
  stesso path — l'implementazione dietro quel path viene scelta dal build.

## Perché
Il meccanismo CSS attuale (selettori globali `!important` su un file caricato
a runtime) è fragile: nessun controllo del compilatore, dipendenza silenziosa
dalla struttura DOM interna di un componente condiviso, nessuna localizzazione
dell'errore in caso di modifica futura del componente originale. Un componente
dedicato rende la personalizzazione type-safe e visibile nel build Angular.

## Requisiti
- [ ] Estrarre `WmHomeLayerBaseComponent` con tutta la logica TS oggi in
      `WmHomeLayerComponent` (nessun decorator `@Component`, nessuna dipendenza
      da `templateUrl`/`styleUrls`/`selector`)
- [ ] `WmHomeLayerComponent` estende la Base, selettore/template/stile
      invariati rispetto a oggi (nessuna regressione visiva per gli shard
      diversi da camminiditalia)
- [ ] Nuovo file `home-layer.component.camminiditalia.ts` esporta la stessa
      classe `WmHomeLayerComponent` (stesso nome del default, stesso pattern
      di `profile.page.camminiditalia.ts`), estende la Base, selettore
      `wm-home-layer`, riusa il template HTML del default e nuovo `.scss`
      (che importa le regole comuni da `home-layer-shared.scss`) con le
      regole grid/logo/titolo/divisore portate da `1.css` (camminiditalia +
      camminiditaliadev)
- [ ] `home-layer.component.camminiditalia.ts` dichiara
      `encapsulation: ViewEncapsulation.None` (come il default, verificato in
      `home-layer.component.ts:18`) — obbligatorio perché le regole di stile
      colpiscono nodi interni del componente figlio `wm-img` (`.wm-img-image`,
      `.wm-home-layer-logo-overlay`, `.wm-box-title`); con l'encapsulation
      Emulated di default Angular lo stile scoped non li raggiungerebbe,
      producendo una regressione visiva non rilevabile dal compilatore
- [ ] Comportamenti da replicare fedelmente, verificati puntualmente (non solo
      "porta le regole di 1.css"):
      1. divisore (`::before` accanto al titolo) presente **solo** se il
         layer ha un logo (`hasLogo`/`:has()` sul logo-overlay nel DOM) —
         assente altrimenti
      2. il cuoricino preferiti (`.wm-home-layer-favorite`) resta
         `position:absolute`, **fuori** dal layout grid — non partecipa a
         `grid-template-areas`
      3. struttura grid a due righe (`'photo photo'` / `'logo title'`) con
         foto in alto a piena larghezza, logo e titolo nella fascia sotto
- [ ] Applicabile a entrambe le istanze del componente (tab Home e pannello
      Mappa) — nessuna differenziazione per contesto di montaggio
- [ ] `home-layer.component.spec.ts` esistente resta verde senza modifiche
      (il costruttore ereditato dalla Base deve mantenere la stessa firma
      `(store, langSvc, cdr, favoriteSvc)`)
- [ ] Nuovo spec dedicato per la variante camminiditalia
      (`home-layer.component.camminiditalia.spec.ts`), stesso pattern di
      istanziazione diretta (bypass TestBed) dello spec esistente

## Rischi
- **Precedente architetturale contraddetto**: l'estrazione di una classe Base
  condivisa è stata scartata due volte in precedenza (`home.component.ts`,
  `profile.page.ts`) per decisione esplicita del developer dopo revisione.
  Qui si procede comunque perché la logica TS tra default e variante
  camminiditalia è identica al 100% (cambia solo lo scss) — un caso diverso
  dai due precedenti, dove presumibilmente la logica differiva. Il developer
  ha scelto di trattare questo ciclo come **validazione del pattern**: se il
  vantaggio DRY si confirma qui, `CLAUDE.md` (progetto principale) va
  aggiornato per raccomandare Base+estensione quando la logica TS è identica
  tra varianti, mantenendo la duplicazione piena quando differisce. Non
  aggiornare la policy generale prima che questo ciclo la validi.
- **Componente condiviso oltre webmapp-app**: `wm-home-layer` vive in wm-core,
  submodule usato anche da altri consumer (es. wm-webapp, citato nel CLAUDE.md
  di wm-core per i test E2E). La Base e la variante camminiditalia restano
  comunque innocue per gli altri consumer: il default component non cambia
  comportamento, la variante si attiva solo per uno shard specifico di
  webmapp-app tramite `fileReplacements` lato repo principale — wm-core da
  solo non attiva mai la variante.
- **Ciclo di rilascio più lungo**: essendo il codice dentro wm-core, ogni
  modifica futura alla variante camminiditalia richiede un commit su wm-core
  + bump della versione submodule in webmapp-app (a differenza di un file nel
  repo principale, immediatamente disponibile). Scelta esplicita del
  developer nonostante questo costo.
- **Perdita della capacità di hotfix a runtime — accettata consapevolmente**:
  oggi un fix di stile si ripubblica cambiando `1.css` (caricato a runtime,
  nessun rebuild). Dopo la migrazione, qualunque correzione futura richiede un
  build completo e, per le piattaforme mobile (Capacitor), un nuovo ciclo di
  review sugli store. Accettato come costo intrinseco della migrazione da
  CSS-a-runtime a componente Angular type-safe, non mitigato in questo ciclo.
- **Ordine di merge cross-repo — vincolo obbligatorio, non solo un rischio**:
  al momento della scrittura di questo documento, `home-layer.component.camminiditalia.ts`
  non esiste in nessun commit di wm-core (submodule pinnato a
  `RDO_ass_cammini_italia_2026_2`, non `develop`). La PR che aggiunge
  `fileReplacements` nel repo principale **non deve essere mergiata prima**
  che: (1) la PR wm-core sia mergiata, (2) il submodule in webmapp-app sia
  bumpato a quel commit. Se l'ordine viene invertito, qualunque build/serve/
  deploy con `--configuration=camminiditalia` fallisce a build-time (percorso
  non esistente) — incluso il deploy manuale in produzione via
  `deploy-to-web-camminiditalia`.
- **Nessun test automatico di parità visiva — limite noto, non mitigato**:
  gli spec Karma dei componenti di wm-core (incluso questo) sono esclusi
  dalla discovery CI (oc:8023, crash `NG0201` su `APP_TRANSLATION`). Il nuovo
  spec sulla variante camminiditalia copre solo la logica TS ereditata dalla
  Base, non il rendering/layout. Una futura modifica al default che non
  aggiorna in parallelo la variante (o viceversa) non genera nessun alert
  automatico — solo verifica visiva manuale, coerente con l'assenza di test
  visivi/E2E per componenti analoghi nel repo (es. oc:8221).

## Out of scope
- Le altre regole CSS presenti in `1.css` (`wm-home > .root`,
  `.wm-home-header-container`, `wm-map-details wm-status-filter`) restano
  intatte — questo ciclo tocca solo il blocco `wm-home-layer`.
- Nessuna modifica al meccanismo di caricamento runtime di `1.css`
  (`MetaComponent`) — resta attivo per le regole non toccate.
- Nessun aggiornamento di `CLAUDE.md` sulla policy generale Base vs
  duplicazione in questo ciclo — solo annotazione dell'eccezione e della
  validazione in corso (vedi `notes.md`).

## Moduli toccati
- `projects/wm-core/src/home/home-layer/home-layer.component.ts` (refactor:
  logica spostata in Base, resta il file di default riferito da
  `wm-core.module.ts` e da `fileReplacements`)
- `projects/wm-core/src/home/home-layer/home-layer-base.component.ts` (nuovo,
  mai soggetto a `fileReplacements`; decorato `@Injectable()` — necessario
  perché Angular generi la factory DI da cui `WmHomeLayerComponent`, in tutte
  le sue varianti, eredita i parametri del costruttore, altrimenti `NG0202`
  a runtime)
- `projects/wm-core/src/home/home-layer/home-layer-base.component.spec.ts`
  (nuovo — guardia di regressione sul punto sopra)
- `projects/wm-core/src/home/home-layer/home-layer.component.camminiditalia.ts` (nuovo)
- `projects/wm-core/src/home/home-layer/home-layer.component.camminiditalia.scss` (nuovo — condivide
  il layout di base con il default via `home-layer-shared.scss`, aggiunge solo
  le regole grid/logo/titolo/divisore specifiche)
- `projects/wm-core/src/home/home-layer/home-layer-shared.scss` (nuovo —
  regole comuni tra default e variante, estratte in Fase: review per evitare
  la duplicazione 1:1 del blocco host)
- `projects/wm-core/src/home/home-layer/home-layer.component.scss` (aggiornato
  per importare `home-layer-shared.scss` invece di duplicarne il contenuto)
- `projects/wm-core/src/home/home-layer/home-layer-favorite.spec-support.ts`
  (nuovo — suite di test condivisa tra default e variante, estratta in Fase:
  review per evitare la duplicazione 1:1 degli spec)
- `projects/wm-core/src/home/home-layer/home-layer.component.spec.ts`
  (aggiornato per usare la suite condivisa — comportamento testato invariato)
- `projects/wm-core/src/home/home-layer/home-layer.component.camminiditalia.spec.ts`
  (aggiornato per usare la suite condivisa — comportamento testato invariato)
- `projects/wm-core/src/wm-core.module.ts` (nessuna modifica — vedi "Cosa cambia")

**Nota**: il template HTML non è duplicato — `home-layer.component.camminiditalia.ts`
punta a `templateUrl: './home-layer.component.html'` (lo stesso file del
default), dato che solo il `.ts` deve essere gemello per il pattern
`fileReplacements` e la struttura DOM non cambia tra le varianti.
