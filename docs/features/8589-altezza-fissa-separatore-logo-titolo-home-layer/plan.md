> Ticket: oc:8589

# Altezza fissa del separatore logo/titolo (home layer, shard camminiditalia) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere il separatore verticale tra logo e titolo nella card della home layer di
Cammini d'Italia di altezza fissa, indipendente dal numero di righe del titolo.

**Architecture:** Fix CSS confinato a una singola regola (`.wm-box-title::before`) in un file
variante di shard già esistente (`fileReplacements`), senza toccare markup, TypeScript o file
condivisi tra shard.

**Tech Stack:** Angular 20 / SCSS, submodule `wm-core` montato in `webmapp-app`.

**Spec:** `docs/features/8589-altezza-fissa-separatore-logo-titolo-home-layer/overview.md`
(stessa cartella di questo piano) — il piano lo implementa per intero, leggilo insieme a questo
file.

## Global Constraints

- **Fix confinato a un solo file**: `projects/wm-core/src/home/home-layer/home-layer.component.camminiditalia.scss`.
  Nessuna modifica a `home-layer.component.camminiditalia.ts`, al markup condiviso di
  `home-layer.component.html`, o a qualsiasi file di un altro shard.
- **Nessun test automatico**: la verifica è solo visiva/manuale, come da overview. Non aggiungere
  spec Karma né test Cypress per questo fix.
- **`height: 40px`** è il valore da usare — resta sotto l'altezza minima del box titolo su una
  riga (≈63px: `line-height: 31px` + `padding: 16px` sopra e sotto), garantendo che il separatore
  non sporga mai oltre i bordi della riga indipendentemente dal numero di righe del titolo.
- **Deploy**: questo shard ha una pipeline dedicata (`deploy-to-web-camminiditalia`), separata da
  quella generica — questo piano non esegue nessun deploy, ma chi lo farà in seguito deve usare
  quello script, mai `deploy-to-web --configuration=camminiditalia`.

---

### Task 1: Altezza fissa del separatore e verifica visiva sullo shard camminiditalia

**Files:**
- Modify: `projects/wm-core/src/home/home-layer/home-layer.component.camminiditalia.scss:70-82`
  (percorso relativo alla root del submodule `wm-core`; percorso assoluto in questo checkout:
  `core/src/app/shared/wm-core/projects/wm-core/src/home/home-layer/home-layer.component.camminiditalia.scss`)
- Modify temporaneamente (solo per la verifica locale, da ripristinare a fine task):
  `core/src/environments/environment.ts` (repo principale `webmapp-app`)

**Interfaces:** N/A — nessuna interfaccia di codice coinvolta, solo una regola CSS.

- [ ] **Step 1: Applicare il fix CSS**

  Nel file `core/src/app/shared/wm-core/projects/wm-core/src/home/home-layer/home-layer.component.camminiditalia.scss`,
  sostituire il blocco (righe 70-82):

  ```scss
  wm-home-layer > wm-img:has(> wm-img.wm-home-layer-logo-overlay) > .wm-box-title::before {
    content: '';
    position: absolute;
    left: 0;
    top: 30px;
    bottom: 30px;
    width: 2px;
    // Valore hardcoded invece di var(--wm-color-primary) di proposito: questa
    // variante è specifica di camminiditalia (nessun altro shard la usa),
    // quindi l'indirezione tramite la variabile del tema non aggiunge nessuna
    // flessibilità reale qui — stessa scelta già presente nel CSS di origine.
    background-color: #ef7821;
  }
  ```

  con:

  ```scss
  wm-home-layer > wm-img:has(> wm-img.wm-home-layer-logo-overlay) > .wm-box-title::before {
    content: '';
    position: absolute;
    left: 0;
    // Altezza fissa (oc:8589): un offset top/bottom simmetrico dipende
    // dall'altezza auto del blocco titolo, che varia con il numero di righe —
    // un titolo su una riga produceva un separatore quasi invisibile (~3px)
    // contro uno su due righe (~34px). 40px resta sotto l'altezza minima del
    // box titolo su una riga (~63px), quindi non sporge mai.
    height: 40px;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    // Valore hardcoded invece di var(--wm-color-primary) di proposito: questa
    // variante è specifica di camminiditalia (nessun altro shard la usa),
    // quindi l'indirezione tramite la variabile del tema non aggiunge nessuna
    // flessibilità reale qui — stessa scelta già presente nel CSS di origine.
    background-color: #ef7821;
  }
  ```

  Nota: `top: 30px` e `bottom: 30px` vanno **rimossi entrambi**, non solo ridotti — la loro
  presenza insieme a `height`/`transform` produrrebbe un posizionamento in conflitto.

- [ ] **Step 2: Servire l'app localmente con lo shard camminiditalia**

  Lo shard di default in `environment.ts` è `carg`, non `camminiditalia` — serve forzarlo
  temporaneamente per vedere il fix nel browser:

  ```bash
  cd core
  ```

  Apri `src/environments/environment.ts` e cambia temporaneamente:

  ```ts
  shardName: 'carg',
  ```

  in:

  ```ts
  shardName: 'camminiditalia',
  ```

  Poi avvia:

  ```bash
  npm start
  ```

  `scripts/serve.js` legge `shardName` e lancia `ng serve --configuration=camminiditalia`
  automaticamente (loggherà `[serve.js] shardName "camminiditalia" → --configuration=camminiditalia`).
  Apri l'app nel browser all'URL indicato da `ng serve` (di norma `http://localhost:4200`) e
  naviga alla home dei layer.

- [ ] **Step 3: Verifica visiva — titolo su una riga**

  Individua la card di un cammino con logo e titolo breve, tale da restare su una riga (es.
  "Cammino Balteo", citato nel ticket). Verifica che il separatore verticale arancione tra logo
  e titolo sia visibile e non appaia più "tagliato"/troppo corto rispetto al resto della card.

- [ ] **Step 4: Verifica visiva — titolo su due righe**

  Individua (o cerca) una card di un cammino con logo e titolo abbastanza lungo da andare a capo
  su due righe. Verifica che il separatore abbia la **stessa altezza visiva** di quello del passo
  precedente (entrambi fissi a 40px, centrati), non più un separatore visibilmente più lungo.

- [ ] **Step 5: Verifica visiva — titolo molto lungo (3+ righe potenziali) e assenza di conflitti**

  Se disponibile un cammino con titolo che avvolge su 3+ righe, apri la sua card e verifica che il
  separatore resti a 40px centrato, senza sporgere oltre i bordi della riga logo/titolo. In ogni
  caso, apri gli strumenti di sviluppo del browser sull'elemento `.wm-box-title::before` di una
  qualsiasi card e controlla nel pannello "Computed" che **non siano presenti** valori residui di
  `top: 30px`/`bottom: 30px` in conflitto — deve comparire solo `height: 40px`, `top: 50%`,
  `transform: translateY(-50%)`.

- [ ] **Step 6: Verifica del caso "nessun logo" (invariato)**

  Apri la card di un cammino senza logo e verifica che **non compaia nessun separatore** (il
  `::before` è condizionato da `:has(> wm-img.wm-home-layer-logo-overlay)`) — questo comportamento
  non deve cambiare rispetto a prima del fix.

- [ ] **Step 7: Ripristinare `environment.ts`**

  Riporta `src/environments/environment.ts` allo stato originale:

  ```ts
  shardName: 'carg',
  ```

  Questo file **non va committato** con `camminiditalia` — è stato modificato solo per la
  verifica locale del passo 2.

  ```bash
  git diff --stat src/environments/environment.ts
  ```

  Deve risultare senza differenze rispetto a `HEAD` (o comunque tornato al valore originale
  prima di questo task) prima di procedere al commit.

- [ ] **Step 8: Commit**

  Dalla root del submodule `wm-core` (`core/src/app/shared/wm-core`):

  ```bash
  cd core/src/app/shared/wm-core
  git add projects/wm-core/src/home/home-layer/home-layer.component.camminiditalia.scss
  git commit -m "fix(oc:8589): altezza fissa del separatore logo/titolo nella home layer camminiditalia"
  ```
