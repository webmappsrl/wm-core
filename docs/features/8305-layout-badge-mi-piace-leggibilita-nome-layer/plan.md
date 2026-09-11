> Ticket: oc:8305

# Fix layout badge "mi piace" e riposizionamento logo — wm-core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminare la sovrapposizione tra il titolo e il badge "mi piace"+conteggio su `wm-layer-box` (senza troncare il titolo), rendere uniforme l'altezza della card in tutti i contesti, e spostare il logo del cammino da basso-destra ad alto-sinistra.

**Architecture:** Modifica SCSS-only di `layer-box.component.scss` — nessun cambiamento a `.ts`/`.html`. L'altezza di `.wm-box` passa da `height:100%;max-height:176px` (dipendente dal contenitore) a un valore fisso `220px`, dimensionato per riservare spazio al badge e per un titolo fino a 4 righe. Il logo (`wm-layer-box-logo-overlay`, già nidificato dentro il `wm-img` della feature image da oc:8164) cambia solo posizione (bottom/right → top/left).

**Tech Stack:** Angular 20 standalone component SCSS, `ViewEncapsulation.None`.

## Global Constraints

- Nessun troncamento del titolo (niente `line-clamp`/`ellipsis`) — il testo deve restare sempre completamente leggibile, anche su più righe.
- Tutte le card della stessa lista hanno la stessa altezza fissa (220px), indipendentemente dal contenuto della singola card.
- Il valore 220px è condiviso con il repo principale (`favourites-layers.component.scss`, webmapp-app oc:8305) — se cambia qui, va aggiornato anche là.
- Nessuna modifica a `layer-box.component.ts`/`.html`: il fix è interamente SCSS.
- Nessuna modifica al componente `home-layer` (fuori scope, gestito solo via CSS in webmapp-app).
- Nessun test automatico esistente coprirà questo cambiamento (i test Karma di wm-core sono esclusi dalla CI, oc:8023/oc:8221) — la verifica è manuale, con passi concreti e riproducibili indicati in ogni task.
- Commit convention: `fix(oc:8305): ...`. Nessun commit eseguito automaticamente durante l'esecuzione del piano — sono istruzioni testuali per il developer.

---

### Task 1: Riservare spazio per il badge e rendere l'altezza uniforme

**Files:**
- Modify: `projects/wm-core/src/box/layer-box/layer-box.component.scss:1-17` (regola `.wm-box`)
- Modify: `projects/wm-core/src/box/layer-box/layer-box.component.scss:27-42` (regola `.wm-box-icon`, solo commento)

**Interfaces:**
- Consumes: nessuna dipendenza da altri task.
- Produces: `.wm-box` con `height: 220px` fisso (non più `height:100%;max-height:176px`). Il Task 1 del plan webmapp-app dipende da questo valore esatto (220px).

- [ ] **Step 1: Riprodurre il bug attuale (baseline, prima della modifica)**

Da `core/`, avvia il dev server:

```bash
npm start
```

Apri l'app nel browser (`http://localhost:4200`), vai alla Home, poi al tab di ricerca "Layers" (contesto più stretto). Usa Chrome DevTools → device toolbar → viewport 412×832 (stesso viewport usato da Cypress in CI, vedi CLAUDE.md). Cerca il layer con il titolo più lungo noto: **"Magna Via Francigena - Vie Francigene di Sicilia"**. Verifica (e fai uno screenshot per confronto) che il titolo, andando a capo su più righe, si sovrapponga visivamente al badge "mi piace"/conteggio in alto a destra della card.

Expected: sovrapposizione visibile tra le ultime righe del titolo e il badge — questo è il bug che il task risolve.

- [ ] **Step 2: Modificare `.wm-box` in `layer-box.component.scss`**

Sostituisci (righe 1-17):

```scss
wm-layer-box {
  .wm-box {
    position: relative;
    margin: 10px;
    border-radius: 15px;
    box-shadow: 5px 5px 5px 0px rgba(0, 0, 0, 0.1);
    transition: all 500ms;
    height: 100%;
    max-height: 176px;
    cursor: pointer;

    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-content: stretch;
    align-items: stretch;
```

con:

```scss
wm-layer-box {
  .wm-box {
    position: relative;
    margin: 10px;
    border-radius: 15px;
    box-shadow: 5px 5px 5px 0px rgba(0, 0, 0, 0.1);
    transition: all 500ms;
    // Altezza fissa (non più height:100%;max-height:176px): stessa altezza in
    // TUTTI i contesti (home-landing, ricerca, preferiti), non calcolata
    // per-card — evita anche il problema del containing block che serviva a
    // favourites-layers.component.scss (webmapp-app) per dare un'altezza a
    // .wm-box dentro ion-list: con un valore fisso qui, quel file non ha più
    // bisogno di duplicare l'altezza (oc:8305).
    // Budget: ~60px riservati in alto per .wm-layer-box-badge-combo (top:16px
    // + altezza pillola) + ~148px per un titolo fino a 4 righe (line-height
    // 31px + padding 6%). Copre con margine il titolo più lungo osservato in
    // produzione (48 caratteri, "Magna Via Francigena - Vie Francigene di
    // Sicilia", camminiditalia) ma NON è una garanzia assoluta: un titolo più
    // lungo (altra lingua, o testo di sistema ingrandito per accessibilità)
    // può ancora sovrapporsi al badge — rischio residuo accettato (oc:8305),
    // preferito al troncamento perché il testo resta sempre presente per
    // intero. Per lo stesso motivo NESSUN overflow:hidden qui: un titolo che
    // sfora deve restare visibile per intero (anche sporgendo dal box)
    // invece di essere tagliato a metà.
    // Valore duplicato in webmapp-app: favourites-layers.component.scss.
    height: 220px;
    cursor: pointer;

    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-content: stretch;
    align-items: stretch;
```

- [ ] **Step 3: Aggiungere il commento sul conflitto teorico logo/icona in `.wm-box-icon`**

Trova il blocco (circa righe 27-42):

```scss
    .wm-box-icon {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      margin: 0;
      height: 48px;
      width: 48px;
      margin: 10px;

      border-width: 1px;
      svg {
        height: 100%;
      }
      z-index: 2;
    }
```

Aggiungi il commento subito sopra `position: absolute;`:

```scss
    .wm-box-icon {
      // Stesso angolo del logo cammino (wm-layer-box-logo-overlay, sotto,
      // spostato qui da oc:8305): nessun conflitto reale oggi (nessun layer
      // camminiditalia imposta `icon` nel config.json home, verificato su
      // 117 box `layer` reali), ma le due feature sono pilotate da fonti
      // dati indipendenti (box home vs layer.logo_image) e potrebbero
      // sovrapporsi su un altro shard che usasse entrambe.
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      margin: 0;
      height: 48px;
      width: 48px;
      margin: 10px;

      border-width: 1px;
      svg {
        height: 100%;
      }
      z-index: 2;
    }
```

- [ ] **Step 4: Verificare visivamente che il bug sia risolto**

Con il dev server ancora attivo (o riavviato se necessario), ripeti lo Step 1 sullo stesso layer ("Magna Via Francigena - Vie Francigene di Sicilia"), stesso viewport 412×832, nei 3 contesti:
1. Home (tab "layers" della ricerca, contesto più stretto)
2. Home-landing (box `box_type: 'layer'` in home)
3. Tab Preferiti (con quel layer aggiunto ai preferiti)

Expected: in tutti e 3 i contesti, il titolo va a capo su più righe (fino a ~4) senza sovrapporsi al badge/cuoricino, e la card ha la stessa altezza delle altre card nella stessa lista.

Verifica anche un titolo corto (es. "AltraVia") nello stesso contesto: la card deve avere la stessa altezza fissa delle altre (spazio vuoto extra sotto il titolo è accettabile, non un difetto).

- [ ] **Step 5: Commit**

```bash
git add projects/wm-core/src/box/layer-box/layer-box.component.scss
git commit -m "fix(oc:8305): riservare spazio badge e altezza uniforme in wm-layer-box"
```

---

### Task 2: Riposizionare il logo del cammino da basso-destra ad alto-sinistra

**Files:**
- Modify: `projects/wm-core/src/box/layer-box/layer-box.component.scss:72-94` (regola `wm-img.wm-layer-box-logo-overlay`)

**Interfaces:**
- Consumes: nessuna dipendenza da altri task (indipendente dal Task 1, ma stesso file).
- Produces: nessuna interfaccia consumata da altri task — cambiamento puramente visivo, isolato a questa regola.

- [ ] **Step 1: Riprodurre il posizionamento attuale (baseline)**

Con il dev server attivo, apri un layer con logo impostato (verifica nel `config.json` di camminiditaliadev quali layer hanno `logo_image` non nullo, oppure usa un layer noto con logo — es. "Cammino Minerario di Santa Barbara", visibile nel mockup fornito dal cliente). Osserva la posizione attuale del logo: cerchio/quadrato in **basso a destra** sulla foto della card.

- [ ] **Step 2: Modificare `wm-img.wm-layer-box-logo-overlay`**

Sostituisci (circa righe 72-94):

```scss
    wm-img.wm-layer-box-logo-overlay {
      position: absolute;
      bottom: 8px;
      right: 8px;
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      border-radius: 4px;
      background-color: rgba(255, 255, 255, 0.85);
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.35);
      overflow: hidden;
      z-index: 2;

      img {
        position: static;
        border-radius: 0;
        object-fit: contain;
        height: 100%;
        width: 100%;
        filter: none;
      }
    }
```

con:

```scss
    // Alto-sinistra invece di basso-destra (oc:8305, generalizzato da un
    // mockup camminiditalia a tutte le istanze) — resta nidificato dentro il
    // wm-img della feature image (non sibling di .wm-box), stesso principio
    // di allineamento ai confini reali della foto introdotto in oc:8164.
    wm-img.wm-layer-box-logo-overlay {
      position: absolute;
      top: 8px;
      left: 8px;
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      border-radius: 4px;
      background-color: rgba(255, 255, 255, 0.85);
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.35);
      overflow: hidden;
      z-index: 2;

      img {
        position: static;
        border-radius: 0;
        object-fit: contain;
        height: 100%;
        width: 100%;
        filter: none;
      }
    }
```

- [ ] **Step 3: Verificare visivamente il nuovo posizionamento**

Ricarica la pagina con lo stesso layer con logo. Verifica nei 3 contesti (home-landing, ricerca, preferiti):
- Il logo appare ora in **alto a sinistra** sulla foto, stessa dimensione (44×44) e stile (sfondo bianco translucido, ombra) di prima.
- Nessuna sovrapposizione con `.wm-box-icon` (verificabile solo se un layer ha anche `data.icon` impostato — su camminiditalia nessuno lo ha oggi, quindi questo controllo è solo per completezza, non bloccante).
- Il badge "mi piace"/conteggio in alto a destra non è impattato (posizione invariata).

- [ ] **Step 4: Commit**

```bash
git add projects/wm-core/src/box/layer-box/layer-box.component.scss
git commit -m "fix(oc:8305): spostare il logo del cammino da basso-destra ad alto-sinistra"
```

---

## Revisione post-review (oc:8305)

I Task 1 e 2 sopra sono stati implementati e revisionati come scritto (altezza 220px, nessun troncamento, `position:absolute`). Dopo un test visivo live sul dev server, il developer ha richiesto una revisione — vedi `notes.md` per il dettaglio completo della decisione e la motivazione. In sintesi, applicata direttamente su `layer-box.component.scss` (non ripassata dal ciclo implementer→reviewer, revisione diretta in risposta a feedback visivo):

- Altezza `.wm-box`: `220px` → **`180px`**
- Tecnica di stacking: `position:absolute` su ogni elemento overlay → **CSS Grid a cella condivisa** (`display:grid;grid-template:1fr/1fr`, ogni figlio `grid-row:1;grid-column:1`, posizionati con `align-self`/`justify-self`+`margin`)
- `.wm-box-title`: da illimitato/nessun troncamento a **`-webkit-line-clamp:3` + ellipsis** (deroga al requisito "sempre completamente leggibile" del cliente — vedi overview.md aggiornato e notes.md)
- Il codice reale nel file è la fonte di verità per i valori esatti; questo piano documenta cosa è stato eseguito nel primo giro, non l'ultima revisione.

## Note per l'esecutore

- **stelvio** (`core/src/theme/stelvio/global_env.scss`) riposiziona già `.wm-box-title` a `top:20%;width:100%;text-align:center` — un layout strutturalmente diverso da quello coperto da questo piano (titolo ancorato in basso). Il fix di questo piano NON risolve un eventuale overlap su stelvio: è un bug preesistente indipendente, da trattare in un ticket separato per quello shard. Non toccare `stelvio/global_env.scss` in questo ciclo.
- **geohub** (`core/src/theme/geohub/75.css`) ha già oggi un `.wm-box::after` in basso-destra (stesso angolo del logo prima di questo fix) — lo spostamento a top-left del Task 2 risolve questo conflitto pre-esistente, non lo peggiora. Nessuna azione necessaria su quel file.
