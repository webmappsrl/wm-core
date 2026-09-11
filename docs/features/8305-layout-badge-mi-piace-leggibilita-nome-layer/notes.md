> Ticket: oc:8305

# Notes — Fix layout badge "mi piace" e riposizionamento logo (wm-core)

## Deviazioni dal piano

**Revisione post-review su richiesta del developer, dopo test visivo live.** Il piano originale (Task 1 e 2) è stato implementato e revisionato (subagent-driven: implementer + reviewer per task, poi review finale whole-branch) con esito pulito su tutti i fronti. Dopo aver testato visivamente il risultato sul dev server (screenshot reale, box `home-landing` con "Cammino Minerario di Santa Barbara"), il developer ha richiesto tre cambiamenti rispetto a quanto approvato:

1. **Box troppo alto** (220px) — voluto più compatto.
2. **Titolo troncato a 3 righe con ellipsis**, non più illimitato — inversione esplicita del requisito "nessun troncamento" derivato letteralmente dal `customer_request` del cliente ("Il nome del layer deve restare sempre completamente leggibile"). Il developer ha confermato esplicitamente (via conferma diretta) che questo sostituisce quel requisito, ma **non è stato riverificato con il cliente Cammini d'Italia**.
3. **Nessun `position:absolute`** per gli elementi overlay (titolo, badge, logo, icona, ribbon colore) — richiesta esplicita di stile/robustezza del codice, non solo un mezzo per risolvere l'overlap. Prima proposta (spostare il titolo in una fascia sotto la foto, come per `home-layer`) è stata corretta dal developer: il titolo deve restare overlay sopra la foto in `wm-layer-box`, la fascia bianca sotto è **solo** per `home-layer` e **solo** per camminiditalia (già implementato separatamente, non toccato da questa revisione).

**Soluzione tecnica adottata**: CSS Grid a cella condivisa (`display:grid;grid-template:1fr/1fr` su `.wm-box`, ogni figlio overlay con `grid-row:1;grid-column:1`, posizionato con `align-self`/`justify-self` + `margin` invece di `top/right/bottom/left`). Il titolo usa `-webkit-line-clamp:3` (stesso pattern già in uso da `wm-search-box`/`wm-poi-box`), che rende la sua altezza massima deterministica (~117px) — l'esclusione della sovrapposizione col badge diventa quindi una garanzia strutturale (line-clamp fissa il tetto massimo) e non più solo un margine generoso su un budget di righe. Altezza box: `220px` → `180px`. Nessuna modifica all'HTML: la tecnica CSS Grid non richiede di cambiare l'ordine/nesting degli elementi esistenti.

La revisione è stata applicata direttamente sul file (non ripassata dal ciclo implementer→reviewer del subagent-driven-development, dato che era una correzione puntuale e ben definita in risposta a feedback diretto, non un nuovo task del piano) — vedi `plan.md` → "Revisione post-review" per il collegamento.

## Bug trovati

**1. Logo nidificato, grid inerte — introdotto e risolto nella stessa revisione, prima del commit.** La prima versione della revisione post-review applicava `grid-row:1;grid-column:1;align-self/justify-self` anche a `wm-img.wm-layer-box-logo-overlay` (il logo) assumendolo figlio diretto di `.wm-box` — ma il logo è nidificato **dentro** il `wm-img` della foto (pattern deliberato da oc:8164, per allinearsi ai confini reali della foto). Le proprietà grid su un elemento il cui genitore reale non è un grid container sono inerti: il logo sarebbe finito in flusso normale invece che overlay in alto a sinistra sulla foto. Trovato da un reviewer isolato dedicato prima del commit. Fix: reso anche il `wm-img` della foto un grid container annidato. Verificato con un secondo giro di review isolata — confermato risolto.

**2. `stelvio/global_env.scss` rotto dalla migrazione a CSS Grid — trovato in un audit richiesto esplicitamente dal developer, prima della review formale.** La migrazione da `position:absolute` a CSS Grid ha reso inerte `top:20%` nell'override di stelvio (`.wm-box-title` non ha più `position:absolute`, quindi `top`/`bottom`/`left`/`right` non hanno più alcun effetto — nessun errore, il titolo finisce semplicemente ancorato in basso, ignorando la personalizzazione di quello shard che prima funzionava). **Il developer ha approvato esplicitamente la modifica a `stelvio/global_env.scss`** (file che il piano originale indicava di non toccare) per correggere questa regressione — vedi `overview.md` → Rischi (bullet stelvio, aggiornato) e → Out of scope (nota di chiarimento). Fix iniziale: `align-self:start;margin-top:20%`. **Bug nel fix stesso, trovato dalla review formale (finder 5, altitude) prima del commit**: le percentuali su `margin-top`/`margin-bottom` si risolvono sulla LARGHEZZA del containing block, non sull'altezza (stessa regola del trick `padding-top:56.25%` per gli aspect-ratio) — `margin-top:20%` avrebbe reso la posizione del titolo dipendente dalla larghezza della card (diversa tra home-landing/ricerca/preferiti), non dall'altezza fissa del box come nel vecchio `top:20%`. Corretto con `margin-top:36px` (valore fisso, 20% di 180px, l'altezza fissa di `.wm-box`).

## Decisioni

- **Deroga al requisito cliente "titolo sempre leggibile"**: decisione del developer, non del cliente. Riportato esplicitamente anche in `overview.md` → Rischi, così chi legge la documentazione in futuro sa che l'informazione non è stata validata a valle con Cammini d'Italia.
- **Fascia bianca sotto la foto resta esclusiva di `home-layer`/camminiditalia**: il developer ha corretto un mio primo tentativo di generalizzare quel pattern anche a `wm-layer-box` — confermato che `wm-layer-box` deve mantenere il titolo overlay sulla foto in tutti i contesti/istanze, senza eccezioni.
- **220px → 180px**: la maggior parte della riduzione arriva dal cap a 3 righe (era pensato per 4) e dal budget di riserva badge ricalcolato in modo più preciso (margin-based, non più stimato "generosamente").

## Cleanup (dalla review formale)

- Estratto il mixin `overlay-chip-background` (sfondo bianco translucido + ombra, `theme/mixins.scss`) per il pattern duplicato 4 volte identico tra `layer-box.component.scss` (badge, logo) e `home-layer.component.scss` (logo, cuoricino). Applicato anche in `home-layer.component.scss` su richiesta esplicita del developer, nonostante quel componente sia "out of scope" per oc:8305 — modifica a costo/rischio zero (stessi valori, nessun cambio visivo).
- Colore divisore in `camminiditaliadev/1.css` (webmapp-app) passato da hex hardcoded a `var(--wm-color-primary)` — vedi notes.md di quel repo.

## Follow-up

- Se in futuro un titolo reale supera 3 righe su un contesto in produzione (es. traduzione più lunga in un'altra lingua), valutare con il cliente se il troncamento con ellipsis è accettabile o se serve rivedere ancora il budget di altezza — questa deroga non ha una validazione esplicita del cliente finale.
- **geohub**: nessuna modifica al suo file, ma la sua `line-height:initial !important` su `.wm-box-title` altera il budget "3 righe ≈ 117px" calcolato dal componente per quello shard specifico (non verificato con il font-family reale di geohub — rischio basso, non approfondito in questo ciclo, segnalato dalla review formale).
- **stelvio**: toccato (vedi Bug trovati #2) — il bug di overlap preesistente su quello shard resta comunque non risolto, fuori scope come già deciso.
