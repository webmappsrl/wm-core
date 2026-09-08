> Ticket: oc:8164

# Logo cammino in backoffice e app — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrare il logo del cammino (`logo_image`, già esposto dal backend in `develop`) come overlay in un angolo del box lista cammini e nella schermata di dettaglio del layer, in `wm-core`.

**Architecture:** Aggiungere il campo opzionale `logo_image?: string` al modello `IGeojsonProperties`. Creare una pipe pura condivisa `hasLogo` che verifica la presenza non vuota del campo (gestisce chiave assente, `null`, stringa vuota). Usarla con `*ngIf` per avvolgere un nuovo `<wm-img>` in entrambi i componenti target, evitando il fallback-a-placeholder interno di `wm-img` quando il logo non è presente.

**Tech Stack:** Angular 20 (standalone: false, NgModule), Karma/Jasmine (nessun test esistente su questi componenti, non introdotto per questa feature — vedi Rischi in overview.md).

## Global Constraints

- Nessun commit o branch va eseguito autonomamente durante l'esecuzione di questo piano. I comandi `git commit` mostrati nei task sono istruzioni testuali per l'utente, non azioni da eseguire in autonomia.
- Commit convention: `feat(oc:8164): ...`
- `logo_image` è SEMPRE una stringa URL semplice o assente/`null` — MAI un oggetto `WmImage`. Non trattarlo come `feature_image`.
- Nessun placeholder/icona fallback quando il logo è assente — usare sempre `*ngIf` attorno a `<wm-img>`, mai passare `logo_image` direttamente come `[src]` senza guardia (altrimenti `wm-img` mostra il suo placeholder di default interno per `src == null`).
- Nessuna gestione di errore di caricamento immagine (rischio noto accettato, vedi overview.md) — non aggiungere binding `(error)`, non toccare `wm-img`.
- Nessuna feature flag/kill-switch — la feature è puramente additiva e condizionale.
- File `wm-webapp/src/app/components/common/layer-box/` è FUORI SCOPE — codice morto, non referenziato in nessun template, non toccarlo.

---

## Task 1: Aggiungere `logo_image` al modello `IGeojsonProperties`

**Files:**
- Modify: `src/app/shared/wm-core/projects/wm-core/src/types/model.ts:52-58`

**Interfaces:**
- Produces: `IGeojsonProperties.logo_image?: string` — campo opzionale stringa, consumato dai Task 3 e 4 tramite la pipe `hasLogo` (Task 2).

- [ ] **Step 1: Aggiungere il campo all'interfaccia**

Apri `src/app/shared/wm-core/projects/wm-core/src/types/model.ts` e individua il blocco esistente (righe 52-58):

```ts
  feature_image?: WmImage;
  ...
  image?: WmImage;
  image_gallery?: WmImage[];
```

Aggiungi `logo_image` subito dopo `feature_image`, con un commento inline che chiarisce la differenza di formato (non richiesto altrove nel file, ma qui evita che un futuro dev lo tratti come `WmImage` per abitudine):

```ts
  feature_image?: WmImage;
  /** stringa URL semplice o assente — NON un oggetto WmImage, a differenza di feature_image */
  logo_image?: string;
```

- [ ] **Step 2: Verificare che il progetto compili**

Run: `cd /Users/bongiu/Documents/wm-webapp && npx tsc -p src/app/shared/wm-core/projects/wm-core/tsconfig.lib.json --noEmit`

Expected: nessun errore di tipo (il campo è opzionale, additivo, non rompe nessun consumer esistente).

Se il comando sopra non esiste o fallisce per motivi non legati a questa modifica (es. tsconfig path diverso), usa in alternativa:

Run: `cd /Users/bongiu/Documents/wm-webapp && CHROME_HEADLESS=1 npx ng build wm-core 2>&1 | tail -50`

Expected: build completata senza errori TS relativi a `model.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/shared/wm-core/projects/wm-core/src/types/model.ts
git commit -m "feat(oc:8164): add logo_image field to IGeojsonProperties"
```

---

## Task 2: Creare la pipe condivisa `hasLogo`

**Files:**
- Create: `src/app/shared/wm-core/projects/wm-core/src/pipes/wm-has-logo.pipe.ts`
- Modify: `src/app/shared/wm-core/projects/wm-core/src/pipes/pipe.module.ts`

**Interfaces:**
- Consumes: nessuna dipendenza da altri task.
- Produces: pipe Angular con `name: 'hasLogo'`, classe `WmHasLogoPipe`, metodo `transform(logoImage: string | null | undefined): boolean`. Consumato nei Task 3 e 4 come `*ngIf="logo | hasLogo"`.

- [ ] **Step 1: Creare il file della pipe**

Crea `src/app/shared/wm-core/projects/wm-core/src/pipes/wm-has-logo.pipe.ts`:

```ts
import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  standalone: false,
  name: 'hasLogo',
  pure: true,
})
export class WmHasLogoPipe implements PipeTransform {
  transform(logoImage: string | null | undefined): boolean {
    return typeof logoImage === 'string' && logoImage.trim().length > 0;
  }
}
```

Questa pipe gestisce tutti e tre i casi di assenza: chiave non presente nell'oggetto (`undefined`), valore `null`, e stringa vuota/di soli spazi — tutti trattati come "nessun logo".

- [ ] **Step 2: Registrare la pipe nel modulo**

Apri `src/app/shared/wm-core/projects/wm-core/src/pipes/pipe.module.ts` e aggiungi l'import e la voce nell'array `pipes`:

```ts
import {WmFilterFeaturesPipe} from './wm-filter-features';
import {WmHasLogoPipe} from './wm-has-logo.pipe';

const pipes = [
  WmTransPipe,
  MinuteTimePipe,
  DistancePipe,
  DurationPipe,
  WmGetFilterIcnPipe,
  WmGetIcnPipe,
  BuildSvgDirective,
  WmGetDataPipe,
  WmToMbPipe,
  WmHowMany,
  WmOrderedBySelection,
  WmAsAny,
  WmIsSelected,
  getFormFieldIcnPipe,
  getFormFieldValuePipe,
  WmCreateBlobPipe,
  WmTimeFormatterPipe,
  WmSortPipe,
  WmFilterFeaturesPipe,
  WmHasLogoPipe,
];
```

- [ ] **Step 3: Scrivere il test unitario della pipe**

Crea `src/app/shared/wm-core/projects/wm-core/src/pipes/wm-has-logo.pipe.spec.ts`:

```ts
import {WmHasLogoPipe} from './wm-has-logo.pipe';

describe('WmHasLogoPipe', () => {
  let pipe: WmHasLogoPipe;

  beforeEach(() => {
    pipe = new WmHasLogoPipe();
  });

  it('returns false for undefined', () => {
    expect(pipe.transform(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(pipe.transform(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(pipe.transform('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(pipe.transform('   ')).toBe(false);
  });

  it('returns true for a populated URL string', () => {
    expect(pipe.transform('https://example.com/logo.webp')).toBe(true);
  });
});
```

Questa pipe è isolata (nessuna dipendenza da `TestBed`), quindi non richiede la registrazione in `tsconfig.spec.json`/`angular.json` di wm-webapp — i test di wm-core girano nel proprio setup, come da CLAUDE.md del submodule.

- [ ] **Step 4: Eseguire il test**

Run: `cd /Users/bongiu/Documents/wm-webapp/src/app/shared/wm-core && nvm use 22 && CI=true npx ng test wm-core --configuration=ci --include=projects/wm-core/src/pipes/wm-has-logo.pipe.spec.ts`

Expected: 5 test PASS.

Se il flag `--include` puntuale non è supportato dalla configurazione `ci` esistente (che limita già l'inclusione ad altri path), esegui la suite completa:

Run: `cd /Users/bongiu/Documents/wm-webapp/src/app/shared/wm-core && nvm use 22 && CI=true npx ng test wm-core --configuration=ci`

Expected: tutti i test passano, incluso il nuovo file (117 spec invece di 112 — verifica che il conteggio sia salito di 5).

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/wm-core/projects/wm-core/src/pipes/wm-has-logo.pipe.ts src/app/shared/wm-core/projects/wm-core/src/pipes/wm-has-logo.pipe.spec.ts src/app/shared/wm-core/projects/wm-core/src/pipes/pipe.module.ts
git commit -m "feat(oc:8164): add hasLogo pipe to check logo_image presence"
```

---

## Task 3: Overlay del logo nel box lista cammini (`layer-box`)

**Files:**
- Modify: `src/app/shared/wm-core/projects/wm-core/src/box/layer-box/layer-box.component.html`
- Modify: `src/app/shared/wm-core/projects/wm-core/src/box/layer-box/layer-box.component.scss`

**Interfaces:**
- Consumes: pipe `hasLogo` (Task 2), campo `IGeojsonProperties.logo_image` (Task 1), accessibile in questo template come `data.layer.logo_image`.
- Produces: nessuna interfaccia consumata da task successivi — modifica terminale.

- [ ] **Step 1: Aggiungere l'overlay al template**

Il template attuale (righe 13-17) è:

```html
  <wm-img
    class="webmapp-card-big-image-container wm-result-img"
    [src]="data.layer.feature_image"
    size="225x100"
  ></wm-img>
```

Sostituiscilo con (aggiunta subito dopo, stesso blocco):

```html
  <wm-img
    class="webmapp-card-big-image-container wm-result-img"
    [src]="data.layer.feature_image"
    size="225x100"
  ></wm-img>
  <wm-img
    *ngIf="data.layer.logo_image | hasLogo"
    class="wm-layer-box-logo-overlay"
    [src]="data.layer.logo_image"
  ></wm-img>
```

- [ ] **Step 2: Aggiungere lo stile dell'overlay**

Apri `src/app/shared/wm-core/projects/wm-core/src/box/layer-box/layer-box.component.scss` e aggiungi in fondo al file:

```scss
.wm-layer-box-logo-overlay {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 44px;
  height: 44px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.85);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  z-index: 2;
}
```

Verifica che `.wm-box` (contenitore genitore, riga 1 dell'html) abbia già `position: relative` (necessario perché l'overlay `position: absolute` sia posizionato relativamente alla card e non alla pagina). Se non lo trovi nel file scss esistente, aggiungilo alla regola `.wm-box`:

```scss
.wm-box {
  position: relative;
  // ... eventuali regole esistenti restano invariate, non rimuoverle
}
```

- [ ] **Step 3: Verifica visiva manuale**

Avvia l'app in locale:

Run: `cd /Users/bongiu/Documents/wm-webapp && npx ng serve`

Naviga alla home, verifica che il box del layer id `56` (shard `camminiditaliadev`, "Cammino Minerario di Santa Barbara") mostri l'overlay del logo in basso a destra della card, sovrapposto a `feature_image`, leggibile e non deformato. Verifica anche che un layer SENZA `logo_image` (es. la maggior parte degli altri cammini) non mostri nessun overlay né placeholder.

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/wm-core/projects/wm-core/src/box/layer-box/layer-box.component.html src/app/shared/wm-core/projects/wm-core/src/box/layer-box/layer-box.component.scss
git commit -m "feat(oc:8164): show logo overlay in layer-box list card"
```

---

## Task 4: Logo nella schermata di dettaglio del cammino (`home-layer`)

**Files:**
- Modify: `src/app/shared/wm-core/projects/wm-core/src/home/home-layer/home-layer.component.html`
- Modify: `src/app/shared/wm-core/projects/wm-core/src/home/home-layer/home-layer.component.scss`

**Interfaces:**
- Consumes: pipe `hasLogo` (Task 2), campo `IGeojsonProperties.logo_image` (Task 1), accessibile in questo template come `layer.logo_image` (dentro `*ngIf="layer$|async as layer"`).
- Produces: nessuna interfaccia consumata da task successivi — modifica terminale.

- [ ] **Step 1: Aggiungere l'overlay al template**

Il template attuale (`home-layer.component.html`, righe 1-4) è:

```html
<ng-container *ngIf="layer$|async as layer">
  <wm-img *ngIf="layer?.feature_image as img" [src]="img">
    <div class="wm-box-title" *ngIf="layer?.title as title">{{title | wmtrans}}</div>
  </wm-img>
</ng-container>
```

Sostituiscilo con:

```html
<ng-container *ngIf="layer$|async as layer">
  <div class="wm-home-layer-image-container">
    <wm-img *ngIf="layer?.feature_image as img" [src]="img">
      <div class="wm-box-title" *ngIf="layer?.title as title">{{title | wmtrans}}</div>
    </wm-img>
    <wm-img
      *ngIf="layer?.logo_image | hasLogo"
      class="wm-home-layer-logo-overlay"
      [src]="layer.logo_image"
    ></wm-img>
  </div>
</ng-container>
```

Nota: `layer?.logo_image | hasLogo` funziona correttamente con l'operatore di navigazione sicura — se `layer` è `null`/`undefined`, `layer?.logo_image` risolve a `undefined`, che la pipe tratta correttamente come "nessun logo" (Task 2, Step 3, test "returns false for undefined").

- [ ] **Step 2: Aggiungere lo stile dell'overlay**

Apri `src/app/shared/wm-core/projects/wm-core/src/home/home-layer/home-layer.component.scss` e aggiungi:

```scss
.wm-home-layer-image-container {
  position: relative;
}

.wm-home-layer-logo-overlay {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 56px;
  height: 56px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.85);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  z-index: 2;
}
```

Dimensione leggermente maggiore (56px vs 44px del box lista) perché la schermata di dettaglio ha più spazio disponibile.

- [ ] **Step 3: Verifica visiva manuale**

Con l'app già avviata (`npx ng serve`, Task 3 Step 3), apri il dettaglio del layer id `56` (shard `camminiditaliadev`). Verifica che l'overlay del logo compaia in basso a destra dell'immagine di copertina nella schermata di dettaglio, e che un layer senza logo non mostri nulla.

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/wm-core/projects/wm-core/src/home/home-layer/home-layer.component.html src/app/shared/wm-core/projects/wm-core/src/home/home-layer/home-layer.component.scss
git commit -m "feat(oc:8164): show logo overlay in home-layer detail screen"
```

---

## Task 5: Verifica finale e aggiornamento notes.md

**Files:**
- Modify/Create: `src/app/shared/wm-core/docs/features/8164-logo-cammino-in-backoffice-e-app/notes.md`

**Interfaces:**
- Consumes: nessuna — task di chiusura, non produce interfacce.

- [ ] **Step 1: Eseguire la suite completa dei test wm-core**

Run: `cd /Users/bongiu/Documents/wm-webapp/src/app/shared/wm-core && nvm use 22 && CI=true npx ng test wm-core --configuration=ci`

Expected: tutti i test passano (112 preesistenti + 5 nuovi della pipe = 117).

- [ ] **Step 2: Creare/aggiornare notes.md**

Crea `src/app/shared/wm-core/docs/features/8164-logo-cammino-in-backoffice-e-app/notes.md`:

```markdown
> Ticket: oc:8164

# Notes — Logo cammino in backoffice e app (Frontend)

## Deviazioni dal piano

- La mitigazione "nascondi overlay su errore di caricamento immagine" proposta in fase di challenge è stata rimossa dai requisiti prima della scrittura del piano: `wm-img` (componente condiviso) non espone un evento `(error)`, e modificarlo per aggiungerlo avrebbe toccato un componente usato ovunque nell'app per `feature_image` — sproporzionato per questo ticket. Rischio noto accettato senza mitigazione (vedi overview.md, sezione Rischi).

## Bug trovati

- Nessuno.

## Decisioni

- `hasLogo` implementata come pipe pura condivisa (non funzione util) per seguire la convenzione di naming/registrazione già presente in `pipes/pipe.module.ts` (es. `wm-filter-is-selected.pipe.ts`).
- Test unitario aggiunto solo per la pipe `hasLogo` (isolata, nessuna dipendenza da TestBed) — non aggiunti test per `layer-box.component` e `home-layer.component`, coerente con l'assenza di `.spec.ts` preesistenti su questi due componenti.

## Follow-up

- Nessuno pianificato. Il riuso di `logo_image` come immagine badge nel sistema passaporto è tracciato in un ticket separato non ancora esistente.
```

- [ ] **Step 3: Commit**

```bash
git add src/app/shared/wm-core/docs/features/8164-logo-cammino-in-backoffice-e-app/notes.md
git commit -m "docs(oc:8164): add implementation notes"
```

---

## Self-Review

**Spec coverage:**
- Requisito 1 (`logo_image` in model.ts) → Task 1 ✅
- Requisito 2 (tipi gemelli wm-webapp/map-core) → verificato in Task 1 che la build compila senza toccarli; non serve modificarli perché nessun componente in wm-webapp/map-core consuma `logo_image` in questo ciclo (solo wm-core lo usa) — nessun task dedicato necessario, coerente con YAGNI.
- Requisito 3 (helper condiviso presenza logo) → Task 2 ✅
- Requisito 4 (layer-box overlay) → Task 3 ✅
- Requisito 5 (home-layer overlay) → Task 4 ✅
- Requisito 6 (gestione errore caricamento) → rimosso dai requisiti dopo discussione con l'utente, documentato come rischio accettato in overview.md e notes.md (Task 5).
- Nessun placeholder quando assente → garantito dall'uso di `*ngIf` con `hasLogo` in entrambi i task 3 e 4, mai binding diretto di `logo_image` a `[src]` senza guardia.

**Placeholder scan:** nessun "TBD"/"implement later" nel testo — tutti gli step hanno codice completo.

**Type consistency:** `logo_image?: string` (Task 1) usato identicamente in Task 3 (`data.layer.logo_image`) e Task 4 (`layer.logo_image`) via pipe `hasLogo` (Task 2) con firma `transform(logoImage: string | null | undefined): boolean` — coerente in entrambi i punti di consumo.
