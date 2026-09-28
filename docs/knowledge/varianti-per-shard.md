# Varianti per shard: `fileReplacements`, classi base e CSS per app

## Come funziona oggi

Una variante di shard è un file `.ts` **gemello** del componente di default, instradato dai `fileReplacements` dichiarati nell'`angular.json` del consumer che fa il build. Il vincolo di schema Angular riguarda solo il `.ts`: la variante può puntare allo stesso `templateUrl` del default quando la struttura DOM non cambia, e avere `styleUrls` propri. Gli `styleUrls` di componenti diversi possono condividere liberamente partial SCSS — `home-layer-shared.scss` esiste per questo.

Due varianti `.camminiditalia` oggi: `wm-home-layer` (oc:8391) e `wm-searchbar` (oc:8414), entrambe con una classe base condivisa (`WmHomeLayerBaseComponent`, `SearchBarBaseComponent`).

## Il CSS per app, caricato a runtime

Accanto alle varianti compilate esiste un secondo meccanismo, indipendente e molto più usato:
un **foglio di stile per app**, iniettato a runtime dal `MetaComponent`
(`meta/meta.component.ts:44-54`).

Nel costruttore, se `EnvironmentService` espone sia `shardName` sia `appId`, viene creato un
`<link rel="stylesheet" id="client-theme">` con `href` costruito così:

```
theme/<shardName>/<appId>.css
```

e aggiunto in coda al `<head>`. Non c'è nessuna verifica che il file esista: se manca, il
browser riceve un 404 e semplicemente non applica nulla — senza errori in console e senza che
niente lo segnali.

**Il file sta qui**, in [`projects/wm-core/src/assets/theme/`](../../projects/wm-core/src/assets/theme/README.md),
un file per app: `<shardName>/<appId>.css`. Entrambi i prodotti lo pubblicano con una voce di
`assets` in `angular.json` che punta a quella cartella con `output: "theme"`, così l'URL costruito
qui sopra risolve su tutti e due.

Fino a oc:8613 non era così: ogni prodotto teneva i propri in `core/src/theme/` (webmapp-app) e
`src/theme/` (wm-webapp), due insiemi **disgiunti**. Una stessa app poteva avere il suo CSS da una
parte e non dall'altra — è esattamente così che i due prodotti sono arrivati a rendere lo stesso
dettaglio in modo diverso (oc:8406): il tema dell'app 75 esisteva solo sulla mobile, e sulla webapp
quell'URL rispondeva 404. Le cartelle `core/src/theme/` e `src/theme/` esistono ancora, ma oggi
contengono **solo** gli SCSS di shard usati a compile-time da `stylePreprocessorOptions`: sono
un'altra cosa, non confonderle con i fogli per app.

### Perché a runtime e non compilati dentro

Il bundle della webapp è **uno solo e multi-tenant**: `app.geohub.webmapp.it` serve tutti gli shard
e tutte le app, con lo shard deciso a runtime dall'hostname. Una personalizzazione per app non può
quindi essere compilata nel bundle. L'unica alternativa sarebbe un bundle per cliente, che è ciò che
si fa solo per `camminiditalia`, e solo perché lì servono i `fileReplacements`.

### Quali sono, oggi

Nove file per otto app. Le regole `order` sono la parte che fa più danno quando si scollega un
selettore, quindi il conteggio sta in tabella:

| App | Shard | File | `order` | Cosa tocca |
|---|---|---|---|---|
| Federazione Italiana Escursionismo (29) | `geohub` | `geohub/29.css` | 11 | dettaglio traccia |
| Sentieri CAI Parma (33) | `geohub` | `geohub/33.css` | 9 | dettaglio traccia |
| Sardegna Sentieri (32) | `geohub` | `geohub/32.css` | — | filtri, ricerca, box della home |
| Forestas (1) | `forestas`, `forestasdev`, `forestasuat` | `forestas/1.css` e i due gemelli | — | come sopra |
| Ville e Giardini Medicei (75) | `geohub` | `geohub/75.css` | 25 | dettaglio POI e traccia, home, filtri |
| Cammini d'Italia (1) | `camminiditalia`, `camminiditaliadev` | `camminiditalia/1.css` e il gemello | — | home |

Attenzione a contarle: `grep -c "order:"` conta anche `border:`, serve `grep -cE '(^|[^-a-z])order *:'`.

**Sei file, due contenuti**: i quattro di Forestas e Sardegna hanno lo stesso md5, e così i due di
Cammini d'Italia. Finché stavano in due repo separati la duplicazione era invisibile; ora è a vista,
e una modifica va scritta quattro volte.


**Perchè riguarda chi lavora qui.** Quei fogli prendono di mira i componenti di wm-core **per
nome** — selettore di elemento o classe — e in più di un caso li riordinano con `order:` dentro
i contenitori flex del dettaglio. Rinominare un componente, una classe o una variabile CSS
**scollega quelle regole in silenzio**: un selettore che non corrisponde a nulla non è un errore
per build, test o lint, e in flexbox un figlio senza `order` vale 0, quindi risale sopra tutti
gli altri invece di restare dov'era. È successo con oc:8406 e corretto sotto oc:8613.

La stessa cautela vale per le **variabili**: un tema può azzerarne una (`--wm-feature-details-margin:
0px !important` nel tema dell'app 75) perchè la spaziatura la governa per conto proprio. Spostare
uno spazio dal `padding` di un componente a quel margine è neutro ovunque, tranne dove il margine
è azzerato: lì lo spazio sparisce e basta.

**Regola pratica**: dopo un refactor che rinomina o rispazia elementi resi da questa libreria, i
temi dei due consumer vanno controllati a mano. I selettori orfani si elencano confrontando i
`selector:` dichiarati nel codice con i tag usati nei fogli di tema.

### Una regola che deve valere su entrambi i prodotti si scrive additiva

Un tema nato per un prodotto è spesso scopato al suo contenitore, che nell'altro non esiste. Per
estenderlo si **affianca** un selettore, non si sostituisce:

```css
wm-map-details wm-home-layer wm-img,      /* contenitore dell'app */
.details-container wm-home-layer wm-img { /* contenitore della webapp */ }
```

Così il ramo che già funzionava resta identico e la sua resa non cambia **per costruzione**, senza
doverlo dimostrare; l'altro prodotto entra dal ramo nuovo, e ciascuno resta inerte dove il proprio
contenitore non c'è. Sostituire il selettore invece di affiancarlo significa doversi chiedere ogni
volta se la resa del primo prodotto è ancora quella, ed è un dubbio che non vale la pena comprare.

**Il prefisso del contenitore non è sempre decorativo.** Sull'app `wm-home-layer` e
`wm-status-filter` si montano in due punti — nel pannello dei dettagli e dentro `wm-home` nella
pagina home — quindi toglierlo allargherebbe la regola a una vista che non la voleva. Verificato che
i due punti di montaggio sono vivi nello stesso momento quando un layer è aperto.

### Non tutto si traduce, e va bene così

Il criterio è **cosa dichiara la regola**, non come si chiama il selettore. Sei regole del tema
dell'app 75 restano solo sull'app perché dipendono da com'è fatto il suo contenitore: un
`padding-bottom` che fa spazio alla tab bar, un `::after` che disegna la linguetta sopra il foglio
scorrevole, e quattro `:has(...)` che compensano l'altezza di `ion-card-content`. Sulla webapp non
ci sono né la card né la tab bar, il pannello parte da `top: 0` e l'altezza gliela dà un'altra
variabile: tradurle produrrebbe una striscia fuori dal viewport e dell'overflow.

Una regola inerte su un prodotto **non è un difetto da correggere**: prima di riagganciarne una,
misurare se agganciava. Riscrivere un selettore inerte non ripristina niente, lo attiva per la prima
volta.

## Quando estrarre una base, e quando no

La policy generale del repo principale è **non** estrarre una classe base: è stata scartata due volte, su `home.component.ts` e `profile.page.ts`. Le due estrazioni esistenti sono deviazioni motivate, non un'abrogazione della regola:

- **`WmHomeLayerBaseComponent`** (oc:8391): la logica TS delle due varianti è identica al 100%, cambiano solo template e stile. Trattata come validazione del pattern per quel ciclo, non promossa a policy.
- **`SearchBarBaseComponent`** (oc:8414): non è l'intero componente identico con stile diverso, è un sottoinsieme di logica genuinamente condiviso al 100% (form di ricerca, debounce, dispatch `inputTyped`), e la sottoclasse camminiditalia **aggiunge** funzionalità invece di duplicarla con modifiche.

Il criterio che distingue i casi accettati da quelli scartati è questo, non la comodità.

**Un componente interamente nuovo non ha una variante generica.** Il piano originale di oc:8414 prevedeva un `HomeRouteFiltersComponent` generico gated sui dati, montato accanto alla searchbar. Il developer ha fatto notare che, a differenza di `wm-home-layer` — preesistente e usato da tutti gli shard — `home-route-filters` non era mai esistito: mantenerne una versione generica per shard che non l'hanno chiesta non aveva senso. Il pannello è diventato parte della variante della searchbar, e `home.component.html`/`.ts` sono tornati identici a prima del ticket. Per lo stesso motivo `home-route-filter-row` ha un'unica implementazione.

## Trappole

Vivono in [.claude/rules/varianti-e-classi-base.md](../../.claude/rules/varianti-e-classi-base.md),
dove si caricano toccando un file gemello o una classe base: `@Injectable()` obbligatorio e
l'errore `NG0202` che compare solo a runtime, il template da non duplicare, e lo split di uno SCSS
che può lasciare senza stile tutti gli shard tranne quello della variante. Qui resta il perché.


## Dettagli di interazione

Le scelte visive della variante camminiditalia (icone, indicatore dei filtri attivi, resa del pannello) sono customizzazione di quel prodotto: stanno nel cantiere di oc:8414, non qui.

- **Animazione del pannello filtri**: trucco CSS `grid-template-rows: 0fr → 1fr`, lo stesso di `wm-config-detail` (oc:8181), senza introdurre `@angular/animations`. Le singole righe filtro non sono animate — follow-up noto.
- **Filtri attivi senza testo digitato** attivano comunque la vista a tab di `wm-home-result`, forzata sulla sola tab Layers — richiesta emersa dopo una demo, non nel piano.
