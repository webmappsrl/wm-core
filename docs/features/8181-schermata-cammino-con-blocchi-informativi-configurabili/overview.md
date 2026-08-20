> Ticket: oc:8181

# Schermata cammino con blocchi informativi configurabili — frontend (wm-core)

## Cosa cambia

Il dettaglio di Layer (cammino) ed EcTrack (traccia) mostra, subito dopo il testo di descrizione esistente (`wm-tab-description`), una lista di box informativi espandibili (accordion) quando il backend espone `properties.config_detail` per quella risorsa. Se `config_detail` è assente, il comportamento resta quello attuale — nessun cambiamento visibile.

Il backend (oc:8181, ciclo precedente, già rilasciato su wm-package) espone `properties.config_detail` come array di gruppi, un solo `box_type` implementato oggi (`info`), stesso pattern architetturale di `config_home` (chiave discriminante `box_type`, campi tradotti come oggetti annidati per lingua):

```json
[
  {
    "box_type": "info",
    "items": [
      { "title": {"it": "...", "en": "...", "fr": "...", "es": "...", "de": "..."},
        "content": {"it": "<p>...</p>", "en": "...", "fr": "...", "es": "...", "de": "..."} }
    ]
  }
]
```

Un admin può creare N gruppi `info` (per organizzarsi in Nova) — il frontend li concatena in un'**unica lista di accordion senza intestazione visibile tra un gruppo e l'altro**: solo i singoli item (title+content) sono collassabili, ma tra l'ultimo item di un gruppo e il primo del successivo c'è uno spazio verticale maggiore di quello tra item dello stesso gruppo (fedele al sito di riferimento, verificato in QA manuale).

**Stile visivo** (da screenshot forniti dal developer, replica del sito live camminiditalia.org): card bianche con bordo sottile, gap verticale tra le card, titolo in maiuscolo grassetto a sinistra, pulsante quadrato con chevron a destra. Quando un item è aperto: il chevron ruota e prende il **colore primary dell'app** (`--wm-color-primary`, non più l'arancione/warning inizialmente proposto — corretto dopo QA manuale) e il bordo della card assume lo stesso colore primary. Contenuto mostrato sotto il titolo nella stessa card quando aperta. **Apertura esclusiva**: solo un item alla volta può essere aperto — aprirne uno chiude automaticamente quello precedentemente aperto (corretto dopo QA manuale, la bozza iniziale prevedeva apertura multipla indipendente). Questo stile diventa il **default del componente condiviso per tutti gli shard**, non solo camminiditalia — visibile ovunque il backend pubblichi `config_detail` (decisione esplicita del developer, diversa dal pattern CSS-scoped-per-shard usato in oc:8305).

## Perché

Il backend ha introdotto il builder Nova generico `config_detail` esplicitamente per essere consumato da un componente frontend — questo era il lavoro esplicitamente rimandato al ciclo successivo (vedi nota dev sul ticket: "Non incluso in questo ciclo: consumo di `config_detail` lato frontend"). Il cliente (Cammini d'Italia) vuole nell'app la stessa presentazione già live sul proprio sito, applicata allo spazio disponibile nel pannello di dettaglio mobile/PWA.

## Requisiti

- [ ] Nuovo componente condiviso in wm-core che riceve `properties.config_detail` e ne renderizza i gruppi concatenati in un'unica lista di accordion. **Dispatch su `box_type` centralizzato in un solo punto** (dentro il componente stesso, es. uno `switch`/una mappa interna tipo→sotto-componente) — deliberatamente **più centralizzato del pattern `config_home`** (emerso in Challenge: lì il dispatch `*ngIf` a catena è replicato sia nel template `home-landing.component.html` sia nel selector `conf.selector.ts`, quindi un nuovo `box_type` tocca più punti). Per `config_detail`, i tre consumer (`home-layer`, `track-properties`, `poi-properties`) devono limitarsi a un singolo binding (es. `[groups]="layer?.config_detail"`) senza alcuna logica di branching per tipo — un futuro `box_type` si aggiunge registrandolo una sola volta dentro il componente condiviso, senza toccare i tre template consumer
- [ ] Ogni item: titolo (bold, uppercase) + pulsante toggle (chevron ruota e prende il colore `--wm-color-primary` quando aperto, il bordo della card assume lo stesso colore) + contenuto HTML mostrato sotto il titolo quando aperto — stile card fedele agli screenshot forniti
- [ ] Tutti gli item **chiusi di default**
- [ ] **Apertura esclusiva**: un solo item alla volta può essere aperto — aprire un item chiude automaticamente quello precedentemente aperto (requisito emerso in QA manuale)
- [ ] Spazio verticale maggiore tra l'ultimo item di un gruppo e il primo del gruppo successivo, rispetto al gap tra item dello stesso gruppo — nessuna intestazione visibile tra gruppi (requisito emerso in QA manuale, fedele al sito di riferimento)
- [ ] Contenuto HTML (può contenere iframe/img embedded, sanitizzati dal backend) renderizzato nel DOM solo quando l'item è aperto (`*ngIf` gated sullo stato open — non solo CSS-hide): evita N iframe caricati in parallelo su gruppi lunghi (nel mockup un gruppo ha 9 righe)
- [ ] Contenuto embed (iframe) responsive: si adatta alla larghezza disponibile su qualsiasi dispositivo mantenendo le proporzioni (`aspect-ratio`), non viene tagliato — bug trovato in QA manuale (il markup embed del backend porta `width`/`height` fissi in HTML, senza vincolo CSS l'iframe overflow-ava tagliato dal `overflow:hidden` del contenitore)
- [ ] **Paginazione per gruppo**: ogni gruppo mostra al massimo 10 item; se ne ha di più, un pulsante **"Mostra altro"** in fondo al gruppo ne rivela altri 10, ripetibile finché il gruppo non è mostrato per intero (requisito emerso post-piano). Una volta raggiunto il massimo, il pulsante diventa **"Mostra meno"**: torna alla pagina iniziale (10 item) e chiude l'eventuale item aperto. La label segue lo stesso meccanismo di traduzione (`wmtrans`) già usato nel resto della codebase — riusa le chiavi `'Mostra altro'`/`'Mostra meno'` già esistenti in tutti i file i18n (stesse chiavi usate da `wm-tab-description` per il suo toggle), nessuna nuova chiave introdotta
- [ ] Titolo e contenuto tradotti con lo stesso fallback a cascata già usato da `wmtrans` (lingua corrente → lingua di default → prima lingua disponibile nell'oggetto), applicato **per campo** (coerente con `wmtrans`, che opera su un singolo valore) — non per riga intera: `title` e `content` risolvono la lingua indipendentemente
- [ ] Una riga non viene renderizzata solo se **sia `title` sia `content`** risultano vuoti dopo il fallback (nessuna lingua disponibile per nessuno dei due); se solo uno dei due ha contenuto, la riga si mostra comunque
- [ ] `config_detail` presente ma con array vuoto (`[]`) è equivalente ad "assente": nessun box renderizzato, stesso comportamento del campo assente
- [ ] Wiring nel template dopo `wm-tab-description` in: `home-layer.component.html` (Layer), `track-properties.component.html` (EcTrack)
- [ ] `ILAYER` (`wm-core/projects/wm-core/src/types/config.ts`) estesa con un campo tipizzato per `config_detail` — interfaccia chiusa, l'accesso non compila senza estensione esplicita
- [ ] Accordion **custom** (decisione esplicita del developer: niente `ion-accordion`/`ion-accordion-group`, per evitare dipendenze da componenti Ionic complessi) — markup con `<button>` nativo per l'header (semantica/focus/keyboard di serie) e attributi `aria-expanded`/`aria-controls` gestiti esplicitamente in TS/template, apertura/chiusura animata via CSS (`grid-template-rows` 0fr↔1fr), non via `ion-accordion`
- [ ] [UX] Header con target di tap ≥44×44px e `aria-expanded`/focus visibile su expand/collapse — qui **non** c'è un componente nativo che li fornisce di serie (a differenza di `ion-accordion`): vanno implementati esplicitamente

## Rischi

- **Discrepanza tra la bozza originale del ticket e l'implementazione backend reale**: l'overview iniziale del ticket ipotizzava 4 `box_type` (`info_pills`/`text_block`/`tracks_list`/`pois_list`); il backend rilasciato implementa un solo `box_type` (`info`). Mitigato: questo piano si basa sulla struttura dati reale verificata leggendo il branch backend (`feature/oc-8181-box-informativi-cammino` su wm-package), non sulla bozza obsoleta.
- **[UX] Contenuto lazy su expand**: se un iframe/embed ha side-effect al mount (script esterni, player video), apri/chiudi/riapri ricarica l'iframe da zero ogni volta — accettato come comportamento standard per contenuto embedded, non mitigato.
- **Accordion custom, non `ion-accordion`** (decisione esplicita del developer): l'accessibilità (focus keyboard, `aria-expanded`) che Ionic fornirebbe di serie va reimplementata manualmente — mitigato usando un `<button>` nativo per l'header (non un `<div>` con click handler) più attributi `aria-*` espliciti, ma resta una superficie di codice in più da mantenere corretta nel tempo rispetto all'uso di un componente Ionic già testato.
- **Stile diventato default per tutti gli shard**: eventuali override CSS esistenti per-shard su elementi visivamente simili (card, accordion) potrebbero necessitare una verifica visiva incrociata — stesso tipo di rischio già documentato in oc:8305 per `home-layer` (es. `stelvio/global_env.scss`).
- **Nessun kill-switch app-side** (emerso in Challenge): il contenuto HTML di `config_detail` è renderizzato senza sanitizzazione lato client (`bypassSecurityTrustHtml`, stesso pattern già in uso altrove nel progetto — fiducia nel backend, HTMLPurifier lato server è la barriera reale). Poiché il componente diventa default condiviso per tutti gli shard, un blocco malformato o malevolo inserito da un admin Nova di un singolo cliente si propaga al componente usato da tutti. Non esiste un feature flag o interruttore lato app per disattivarlo a caldo: l'unica mitigazione in caso di incidente in produzione è intervenire direttamente sul dato in Nova (backend). Accettato esplicitamente per questo ciclo — introdurre un kill-switch dedicato sarebbe fuori scope.

## Out of scope

- Estensione tipizzata di `WmProperties`/`LineStringProperties`/`PointProperties` (wm-types) e `IGeojsonProperties`/`ILAYER` (map-core) — questi indici sono già aperti (`[key: string]: any`), l'accesso a `config_detail` compila senza modifiche; lasciato come debito tecnico noto (solo type-safety/autocomplete, non bloccante).
- Altri `box_type` oltre a `info` — non implementati né lato backend né lato frontend in questo ciclo.
- Modifiche al backend/Nova (già rilasciato in oc:8181/oc:8349).
- Gestione custom di errori di rendering per HTML malformato o embed non raggiungibile offline — si eredita il comportamento esistente di `[innerHTML]`/`bypassSecurityTrustHtml` già in uso altrove nell'app (nessuna sanitizzazione lato client, fiducia nel backend).
- Wiring in EcPoi (`poi-properties.component.html`) — vive nel repo principale `webmapp-app`, coperto dall'overview di quel repo.

## Moduli toccati

- Nuovo componente `wm-core/projects/wm-core/src/box/...` (naming esatto da definire in plan.md) — dispatch `box_type`, item accordion, lazy content
- `wm-core/projects/wm-core/src/types/config.ts` — nuovi tipi per il box `info`/i suoi item + estensione `ILAYER`
- `wm-core/projects/wm-core/src/home/home-layer/home-layer.component.html` — wiring dopo `wm-tab-description`
- `wm-core/projects/wm-core/src/track-properties/track-properties.component.html` — wiring dopo `wm-tab-description`
- Modulo/dichiarazione del nuovo componente (es. `box/box.module.ts` o equivalente) per l'export verso il repo principale
