> Ticket: oc:8305

# Ricerca: sistemare layout del badge "mi piace" e leggibilità del nome del layer

## Cosa cambia

- `.wm-box-title` e `.wm-layer-box-badge-combo` in `wm-layer-box` (riusato da home-landing, tab "layers" della ricerca, tab preferiti) sono oggi entrambi `position:absolute` senza riservare spazio l'uno per l'altro: su box stretti (contesto ricerca) un titolo lungo che va su più righe si sovrappone visivamente al badge "mi piace" + conteggio. Il fix riserva spazio verticale per il badge indipendentemente dal numero di righe del titolo, garantendo che il titolo resti sempre leggibile per intero (nessun troncamento/ellipsis).
- Tutte le card della stessa lista mantengono la stessa altezza (valore fisso, non calcolato per-card in base alla lunghezza del titolo).
- Il logo del cammino (overlay introdotto in oc:8164, oggi in basso a destra) si sposta in **alto a sinistra** su `wm-layer-box`, per tutti gli usi (home-landing, ricerca, preferiti) e per tutte le istanze.

## Perché

Il cliente Cammini d'Italia richiede che il nome del cammino resti sempre completamente leggibile in tutte le liste dove appare (customer_request oc:8305 — "Il nome del layer deve restare sempre completamente leggibile"). Il riposizionamento del logo segue la proposta di redesign visiva ricevuta come commento sul ticket oc:8164 (mockup fornito dal cliente), generalizzata qui a beneficio di tutte le istanze che usano `wm-layer-box`, non solo camminiditalia.

## Requisiti

> **Revisione post-review (vedi notes.md):** dopo la prima implementazione (approvata in review — altezza 220px, nessun troncamento, `position:absolute`), il developer ha chiesto una revisione dopo un test visivo live: titolo troncato a 3 righe con ellipsis invece di illimitato, e stacking senza `position:absolute` (CSS Grid a cella condivisa). I requisiti sotto riflettono la versione finale, implementata.

- [ ] Nessuna sovrapposizione visiva tra `.wm-box-title` e `.wm-layer-box-badge-combo`, in tutti i contesti (home-landing, ricerca layers, tab preferiti) — esclusa **per costruzione**: il titolo è limitato a 3 righe (`-webkit-line-clamp:3` + ellipsis), quindi la sua altezza massima è deterministica e l'altezza fissa del box la contiene sempre insieme alla zona badge
- [ ] Titolo troncato con ellipsis oltre 3 righe (`line-clamp`, stesso pattern già usato da `wm-search-box`/`wm-poi-box`) — **deroga esplicita** al requisito originale del cliente ("il nome del layer deve restare sempre completamente leggibile", customer_request oc:8305): decisione del developer dopo test visivo, non riverificata con il cliente finale. Vedi notes.md
- [ ] Tutte le card della stessa lista hanno la stessa altezza fissa (180px), non calcolata per-card
- [ ] Nessun elemento overlay (`.color`, `.wm-box-icon`, foto, logo, titolo, badge) usa `position:absolute` — tutti condividono la stessa cella di un CSS Grid (`display:grid;grid-template:1fr/1fr`, ogni figlio `grid-row:1;grid-column:1`) e si posizionano con `align-self`/`justify-self`+`margin`. Richiesta esplicita del developer, non solo una necessità tecnica
- [ ] Il logo del cammino (`logo_image`) si sposta da basso-destra a **alto-sinistra**, in tutti gli usi di `wm-layer-box`, per tutte le istanze (nessun default diverso per shard)
- [ ] Il cuoricino "mi piace" resta funzionalmente invariato (nessuna rimozione, nessun cambio di comportamento — solo eventuale adeguamento di stile per coerenza con lo spazio riservato)

## Rischi

- **Deroga al requisito del cliente ("titolo sempre completamente leggibile")**: il troncamento a 3 righe con ellipsis, introdotto in revisione post-review su richiesta del developer dopo un test visivo, contraddice testualmente il `customer_request` originale di oc:8305. Non riverificato con il cliente Cammini d'Italia. Rischio: un titolo di produzione più lungo di 3 righe (o una traduzione più lunga in un'altra lingua) verrebbe ora tagliato con "...", non solo in teoria "leggibile con sforzo" come nel rischio residuo della versione precedente — un vero pezzo di testo diventa invisibile. Nessuna azione di mitigazione oltre alla documentazione di questa deroga; da riportare al cliente se il titolo più lungo osservato (48 caratteri) dovesse in futuro superare 3 righe su un contesto reale.
- **Conflitto teorico logo/icona categoria**: `.wm-box-icon` (icona facoltativa da `data.icon`, pilotata dal box home in `config.json`) occupa oggi lo stesso angolo alto-sinistra dove va il logo. Verificato sui dati reali di camminiditalia (117 box `layer` in `config.json`): nessuno imposta `icon` — nessun conflitto reale oggi. Resta un rischio latente per shard futuri che usassero entrambi contemporaneamente; non mitigato in questo ciclo perché non c'è un caso reale da risolvere.
- **Coordinamento cross-repo sul valore di altezza**: risolto rimuovendo la duplicazione invece di sincronizzarla — `favourites-layers.component.scss` (repo principale, webmapp-app) non hardcoda più nessuna altezza (rimossa in fase di piano, vedi notes.md), quindi non c'è più un numero da tenere in sync tra i due repo.
- **Audit di tutti gli shard theme (`core/src/theme/*`) completato in fase di challenge**:
  - `default/global_env.scss`: nessun override sui componenti toccati, nessun rischio.
  - `geohub/75.css`: ha già oggi un `.wm-box::after` (icona 28px) in basso a destra — stesso angolo del logo attuale (oc:8164). Spostare il logo in alto a sinistra **risolve** questo conflitto pre-esistente invece di crearne uno nuovo. Ha anche un `padding-right:55px !important` su `.wm-box-title` già tarato per il badge in alto a destra (non toccato da questo fix, badge resta dove è) e un `min-height:151px` su `.wm-box` (coesiste senza conflitto con l'altezza uniforme, essendo un minimo, non un massimo). Ha inoltre `wm-layer-features-counter-badge{display:none}` sul primo box di home-landing — conferma reale (non ipotetica) dello scenario "badge assente, solo cuoricino" già gestito dal requisito sopra sulla riserva di spazio incondizionata.
  - `stelvio/global_env.scss`: **toccato in questo ciclo, non più "out of scope"** — vedi notes.md. Audit iniziale (challenge, prima ancora della revisione post-review a CSS Grid): `.wm-box-title` qui riposizionato a `top:20%; width:100%; text-align:center`, bug di overlap preesistente indipendente. Dopo la revisione post-review (passaggio da `position:absolute` a CSS Grid), quel `top:20%` sarebbe diventato **completamente inerte** (nessun effetto su un elemento `position:static`) — non più "un rischio preesistente da ignorare" ma una **rottura attiva introdotta da questo ticket** su una personalizzazione che prima funzionava. Corretto con `align-self:start;margin-top:36px` (equivalente in px fisso, non percentuale — le percentuali su `margin-top` si risolvono sulla larghezza, non sull'altezza, bug trovato e corretto in review formale). Il bug originale di overlap su stelvio resta comunque non affrontato (fuori scope, come già deciso), ma il file non è più "non toccato". Nota accessoria residua: l'override referenzia anche `div.wm-box-click`, classe non più presente nel markup — CSS morto/obsoleto preesistente, non approfondito.
- **Nessun kill-switch/feature flag per il nuovo default globale**: è un bug fix, non una feature opzionale — non esiste un caso legittimo in cui uno shard vorrebbe mantenere il comportamento con l'overlap. Rollback accettato come binario (revert + redeploy), coerente con come gli altri bugfix CSS di questo codebase vengono già gestiti (nessun precedente di feature flag per bugfix CSS).
- **Cache-busting assente su `theme/<shard>/<id>.css`** (`meta.component.ts:50`, nessun query param di versione): limite pre-esistente dell'infrastruttura theme, non introdotto da questo ticket — un rollout/rollback di questo fix non è garantito raggiungere tutti i client con cache calda in tempi deterministici. Fuori scope: risolverlo toccherebbe codice condiviso usato da tutti gli shard, non solo camminiditalia.

## Out of scope

- Testo "Sentieri"→"Tappe": è un override di traduzione lato `config.json` (backend/Nova per lo shard camminiditalia), non tocca questo codice — segnalato come follow-up operativo, non incluso in questo ticket.
- Redesign della schermata di apertura layer (`home-layer`, fascia bianca con logo+divisore+titolo): realizzato interamente via CSS nel repo principale (`theme/camminiditalia/1.css`), nessuna modifica al componente `home-layer` di wm-core.
- Comportamento del cuoricino (toggle, feedback, evento PostHog): invariato, fuori scope.
- Fix del bug di overlap preesistente su stelvio (title top-anchored, centrato, sovrapposizione col badge indipendente da questo ticket): candidato per un ticket separato. **Non confondere con la modifica a `stelvio/global_env.scss` fatta in questo ciclo** (vedi Rischi sopra e notes.md) — quella era necessaria per non rompere la personalizzazione esistente durante la migrazione a CSS Grid, non è il fix del bug di overlap.
- Cache-busting su `theme/<shard>/<id>.css`: limite pre-esistente dell'infrastruttura, non risolto in questo ciclo.

## Moduli toccati

- `projects/wm-core/src/box/layer-box/layer-box.component.scss` (fix overlap, altezza uniforme, riposizionamento logo, CSS Grid a cella condivisa)
- `core/src/theme/stelvio/global_env.scss` (repo principale, non wm-core — compatibilità con la migrazione a CSS Grid, vedi Rischi)
