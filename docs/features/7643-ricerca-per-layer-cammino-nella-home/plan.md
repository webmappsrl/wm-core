> Ticket: oc:7643

# Ricerca per layer/cammino nella home — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un tab "Cammini N" condizionale nella vista risultati di ricerca che filtra client-side i layer dalla configurazione app per nome in tempo reale.

**Architecture:** Il filtro combina `confMAPLAYERS` (layer dalla config, già in memoria) e `inputTyped` (testo di ricerca) tramite un observable NgRx in `home-result.component`. Il tab appare solo se ci sono match e non ruba il focus se l'utente ha già selezionato un altro tab. Il click emette un `@Output() layerEVT` intercettato da `home.component` che chiama il `setLayer()` esistente.

**Tech Stack:** Angular 15+, Ionic, NgRx, RxJS, ChangeDetectionStrategy.OnPush

**Commit convention:** `feat(oc:7643): ...`

**⚠️ Nessun commit automatico** — i commit sono istruzioni testuali, non azioni da eseguire autonomamente.

---

## File Map

| File | Azione | Responsabilità |
|------|--------|----------------|
| `src/app/shared/wm-types/src/user-activity.ts` | Modifica | Aggiunge `'layers'` alla union `HomeResultTab` |
| `wm-core/projects/wm-core/src/home/home-result/home-result.component.ts` | Modifica | `filteredLayers$`, `countLayers$`, `layerEVT @Output`, logica `showResultTabSelected$` aggiornata |
| `wm-core/projects/wm-core/src/home/home-result/home-result.component.html` | Modifica | Tab "layers" condizionale + loop `wm-layer-box` |
| `wm-core/projects/wm-core/src/home/home-result/home-result.component.scss` | Modifica | Nessuno stile aggiuntivo previsto (verifica) |
| `wm-core/projects/wm-core/src/localization/i18n/it.ts` | Modifica | Aggiunge chiave `'layers': 'Cammini'` |
| `wm-core/projects/wm-core/src/localization/i18n/en.ts` | Modifica | Aggiunge `'layers': 'Routes'` |
| `wm-core/projects/wm-core/src/localization/i18n/de.ts` | Modifica | Aggiunge `'layers': 'Routen'` |
| `wm-core/projects/wm-core/src/localization/i18n/es.ts` | Modifica | Aggiunge `'layers': 'Rutas'` |
| `wm-core/projects/wm-core/src/localization/i18n/fr.ts` | Modifica | Aggiunge `'layers': 'Itinéraires'` |
| `wm-core/projects/wm-core/src/localization/i18n/pr.ts` | Modifica | Aggiunge `'layers': 'Rotas'` |
| `wm-core/projects/wm-core/src/localization/i18n/sq.ts` | Modifica | Aggiunge `'layers': 'Rrugët'` |
| `wm-webapp/src/app/shared/wm-core/projects/wm-core/src/home/home.component.html` | Modifica | Aggiunge `(layerEVT)="setLayer($event)"` su `wm-home-result` |

---

## Task 1: Estendi `HomeResultTab` in wm-types

**Files:**
- Modifica: `src/app/shared/wm-types/src/user-activity.ts`

- [ ] **Step 1.1: Modifica il tipo**

Sostituisci:
```typescript
export type HomeResultTab = 'tracks' | 'pois' | null;
```
Con:
```typescript
export type HomeResultTab = 'tracks' | 'pois' | 'layers' | null;
```

- [ ] **Step 1.2: Verifica compilazione wm-types**

```bash
cd src/app/shared/wm-types && npx tsc --noEmit 2>&1 | head -20
```
Atteso: nessun errore TypeScript.

- [ ] **Step 1.3: Commit in wm-types**

```bash
cd src/app/shared/wm-types
git add src/user-activity.ts
git commit -m "feat(oc:7643): add 'layers' to HomeResultTab union type"
```

---

## Task 2: Aggiungi chiave i18n `'layers'` in tutti i file lingua

**Files:**
- Modifica: `src/app/shared/wm-core/projects/wm-core/src/localization/i18n/it.ts`
- Modifica: `src/app/shared/wm-core/projects/wm-core/src/localization/i18n/en.ts`
- Modifica: `src/app/shared/wm-core/projects/wm-core/src/localization/i18n/de.ts`
- Modifica: `src/app/shared/wm-core/projects/wm-core/src/localization/i18n/es.ts`
- Modifica: `src/app/shared/wm-core/projects/wm-core/src/localization/i18n/fr.ts`
- Modifica: `src/app/shared/wm-core/projects/wm-core/src/localization/i18n/pr.ts`
- Modifica: `src/app/shared/wm-core/projects/wm-core/src/localization/i18n/sq.ts`

Ogni file è un oggetto TypeScript esportato (es. `export const wmIT = { ... }`). Aggiungi la riga vicino alle chiavi `'Sentieri'` e `'Punti di interesse'` per coerenza.

- [ ] **Step 2.1: Aggiungi in `it.ts`**

Trova la riga `'Sentieri': 'Sentieri',` e aggiungi subito dopo:
```typescript
  'layers': 'Cammini',
```

- [ ] **Step 2.2: Aggiungi in `en.ts`**

Trova la riga `'Sentieri': 'Trails',` e aggiungi subito dopo:
```typescript
  'layers': 'Routes',
```

- [ ] **Step 2.3: Aggiungi in `de.ts`**

Trova la riga `'Sentieri': 'Wanderwege',` e aggiungi subito dopo:
```typescript
  'layers': 'Routen',
```

- [ ] **Step 2.4: Aggiungi in `es.ts`**

Trova la riga `'Sentieri': 'Senderos',` e aggiungi subito dopo:
```typescript
  'layers': 'Rutas',
```

- [ ] **Step 2.5: Aggiungi in `fr.ts`**

Trova la riga `'Sentieri': 'Sentiers',` e aggiungi subito dopo:
```typescript
  'layers': 'Itinéraires',
```

- [ ] **Step 2.6: Aggiungi in `pr.ts`**

Trova la riga `'Sentieri': 'Trilhas',` e aggiungi subito dopo:
```typescript
  'layers': 'Rotas',
```

- [ ] **Step 2.7: Aggiungi in `sq.ts`**

Trova la riga `'Sentieri': 'Shtigjet',` e aggiungi subito dopo:
```typescript
  'layers': 'Rrugët',
```

- [ ] **Step 2.8: Commit**

```bash
cd src/app/shared/wm-core
git add projects/wm-core/src/localization/i18n/
git commit -m "feat(oc:7643): add 'layers' i18n key in all 7 language files"
```

---

## Task 3: Aggiorna `home-result.component.ts`

**Files:**
- Modifica: `src/app/shared/wm-core/projects/wm-core/src/home/home-result/home-result.component.ts`

- [ ] **Step 3.1: Aggiungi import mancanti**

In cima al file, aggiungi `debounceTime` agli import RxJS e `confMAPLAYERS` agli import store:

```typescript
import {debounceTime, distinctUntilChanged, map, startWith, switchMap, throttleTime} from 'rxjs/operators';
```

```typescript
import {confMAPLAYERS} from '@wm-core/store/conf/conf.selector';
```

- [ ] **Step 3.2: Aggiungi `@Output() layerEVT`**

Dopo la riga `@Output() trackEVT`:
```typescript
@Output() layerEVT: EventEmitter<ILAYER> = new EventEmitter<ILAYER>();
```

Aggiungi anche l'import di `ILAYER` se non presente:
```typescript
import {ILAYER, ILAYERBOX} from '@wm-core/types/config';
```

- [ ] **Step 3.3: Aggiungi `filteredLayers$` e `countLayers$`**

Nella sezione delle proprietà della classe, dopo `ugcOpened$`, aggiungi:

```typescript
filteredLayers$: Observable<ILAYER[]> = combineLatest([
  this._store.select(confMAPLAYERS),
  this._store.select(inputTyped),
]).pipe(
  debounceTime(300),
  map(([layers, input]) => {
    if (!input || input.trim() === '') return [];
    if (!layers) return [];
    const normalized = this._normalize(input);
    return layers.filter(layer => {
      if (!layer.title) return false;
      return this._normalize(layer.title).includes(normalized);
    });
  }),
  distinctUntilChanged((a, b) => JSON.stringify(a.map(l => l.id)) === JSON.stringify(b.map(l => l.id))),
);

countLayers$: Observable<number> = this.filteredLayers$.pipe(
  map(layers => layers.length),
);
```

- [ ] **Step 3.4: Aggiungi il metodo privato `_normalize`**

Alla fine della classe, prima della chiusura `}`:

```typescript
private _normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
```

- [ ] **Step 3.5: Aggiorna `showResultTabSelected$` per gestire `'layers'`**

Sostituisci l'intera definizione di `showResultTabSelected$` con:

```typescript
showResultTabSelected$ = combineLatest([
  this.countTracks$,
  this.countPois$,
  this.countLayers$,
  this._store.select(homeResultTabSelected),
  this.lastFilterType$,
]).pipe(
  map(([countTracks, countPois, countLayers, userSelectedTab, lastFilterType]) => {
    const preferredTab = lastFilterType ?? userSelectedTab;

    // Rispetta la selezione utente se quel tab ha ancora risultati
    if (preferredTab === 'tracks' && countTracks > 0) return 'tracks';
    if (preferredTab === 'pois' && countPois > 0) return 'pois';
    if (preferredTab === 'layers' && countLayers > 0) return 'layers';

    // Default automatico: layers prima, poi tracks, poi pois
    if (countLayers > 0) return 'layers';
    if (countTracks > 0) return 'tracks';
    if (countPois > 0) return 'pois';

    return null;
  }),
  distinctUntilChanged(),
) as Observable<HomeResultTab>;
```

- [ ] **Step 3.6: Aggiungi metodo `setLayer`**

Dopo `setTrack()`:

```typescript
setLayer(layer: ILAYER): void {
  this.layerEVT.emit(layer);
}
```

- [ ] **Step 3.7: Aggiungi import `inputTyped` se non presente**

Verifica che `inputTyped` sia importato tra i selectors:
```typescript
import {
  downloadsOpened,
  ecLayer,
  homeResultTabSelected,
  inputTyped,
  lastFilterType,
  showTracks,
  ugcOpened,
} from '@wm-core/store/user-activity/user-activity.selector';
```

- [ ] **Step 3.8: Verifica compilazione**

```bash
cd src/app/shared/wm-core && npx tsc --noEmit 2>&1 | head -30
```
Atteso: nessun errore.

---

## Task 4: Aggiorna `home-result.component.html`

**Files:**
- Modifica: `src/app/shared/wm-core/projects/wm-core/src/home/home-result/home-result.component.html`

- [ ] **Step 4.1: Aggiungi il tab "layers" nel `ion-segment`**

Trova il blocco `ion-segment` (quello dentro `#noDownload`). Aggiungi il tab `layers` **prima** del tab `tracks` esistente:

```html
<ion-segment [value]="showResultTabSelected$|async" (ionChange)="changeResultType($event)">
  <!-- Tab LAYERS — condizionale, primo -->
  <ng-container *ngIf="countLayers$|async as countLayers">
    <ion-segment-button
      value="layers"
      *ngIf="countLayers > 0"
      [attr.aria-label]="('layers'|wmtrans) + ', ' + countLayers + ' risultati'"
      e2e-home-result-layers-tab
    >
      <ion-label aria-live="polite">
        {{'layers'|wmtrans}}
        <span>{{countLayers}}</span>
      </ion-label>
    </ion-segment-button>
  </ng-container>

  <!-- Tab TRACKS — invariato -->
  <ng-container *ngIf="tracks$|async as tracks">
    <ion-segment-button
      value="tracks"
      *ngIf="tracks.length > 0 && showTracks$|async"
      e2e-home-result-tracks-tab
    >
      ...
```

- [ ] **Step 4.2: Aggiungi il contenuto del tab layers nel `div.wm-home-content`**

Dopo il blocco `</ng-container>` che chiude il tab `pois`, aggiungi:

```html
<div class="layers" *ngIf="(showResultTabSelected$|async) === 'layers'">
  <wm-layer-box
    *ngFor="let layer of filteredLayers$|async"
    [data]="{box_type: 'layer', layer: layer}"
    (clickEVT)="setLayer(layer)"
  ></wm-layer-box>
</div>
```

- [ ] **Step 4.3: Verifica che `wm-layer-box` sia nel modulo**

```bash
grep -r "LayerBoxComponent\|layer-box" src/app/shared/wm-core/projects/wm-core/src/wm-core.module.ts 2>/dev/null | head -5
grep -r "LayerBoxComponent\|layer-box" src/app/shared/wm-core/projects/wm-core/src/home/home.module.ts 2>/dev/null | head -5
```

Se non è dichiarato nel modulo che contiene `home-result`, aggiungilo all'import.

---

## Task 5: Aggiorna `home.component.html` in wm-webapp

**Files:**
- Modifica: `src/app/shared/wm-core/projects/wm-core/src/home/home.component.html`

- [ ] **Step 5.1: Aggiungi binding `layerEVT` su `wm-home-result`**

Trova la riga:
```html
<wm-home-result></wm-home-result>
```

Sostituisci con:
```html
<wm-home-result (layerEVT)="setLayer($event)"></wm-home-result>
```

- [ ] **Step 5.2: Verifica compilazione wm-core completa**

```bash
cd src/app/shared/wm-core && npx tsc --noEmit 2>&1 | head -30
```
Atteso: nessun errore.

- [ ] **Step 5.3: Commit wm-core**

```bash
cd src/app/shared/wm-core
git add projects/wm-core/src/home/home-result/home-result.component.ts
git add projects/wm-core/src/home/home-result/home-result.component.html
git add projects/wm-core/src/home/home.component.html
git commit -m "feat(oc:7643): add layers tab in home-result with client-side filter and layerEVT output"
```

---

## Task 6: Bump submodule refs in wm-webapp

**Files:**
- Modifica: `src/app/shared/wm-types` (ref submodule)
- Modifica: `src/app/shared/wm-core` (ref submodule)

- [ ] **Step 6.1: Bump wm-types**

```bash
cd src/app/shared/wm-types && git log --oneline -1
# Copia il commit hash
cd /Users/bongiu/Documents/wm-webapp
git add src/app/shared/wm-types
```

- [ ] **Step 6.2: Bump wm-core**

```bash
cd src/app/shared/wm-core && git log --oneline -1
cd /Users/bongiu/Documents/wm-webapp
git add src/app/shared/wm-core
```

- [ ] **Step 6.3: Verifica build wm-webapp**

```bash
cd /Users/bongiu/Documents/wm-webapp && npx tsc --noEmit 2>&1 | head -30
```
Atteso: nessun errore.

- [ ] **Step 6.4: Commit wm-webapp**

```bash
git commit -m "feat(oc:7643): bump wm-types and wm-core submodules for layers tab feature"
```

---

## Task 7: Test manuale

- [ ] **Step 7.1: Avvia l'app**

```bash
cd /Users/bongiu/Documents/wm-webapp && npm start
```

- [ ] **Step 7.2: Verifica scenario 1 — ricerca con match layer**

1. Apri la home
2. Digita il nome di un cammino noto (es. "dante")
3. Atteso: il tab "Cammini N" appare per primo, è attivo, mostra i box layer filtrati
4. Atteso: il tab "Sentieri N" è presente accanto

- [ ] **Step 7.3: Verifica scenario 2 — ricerca senza match layer**

1. Digita un termine che non matcha nessun layer (es. "xyzxyz")
2. Atteso: il tab "Cammini" non appare; vista identica a quella attuale

- [ ] **Step 7.4: Verifica scenario 3 — utente su tab sentieri, appare tab cammini**

1. Digita un termine che matcha solo sentieri → attivo su "Sentieri"
2. Modifica il termine per matchare anche layer
3. Atteso: il tab "Cammini" appare ma il tab "Sentieri" rimane attivo (no furto focus)

- [ ] **Step 7.5: Verifica scenario 4 — click su box cammino**

1. Clicca un box cammino nel tab risultati
2. Atteso: naviga alla vista layer esattamente come dal click in home

- [ ] **Step 7.6: Verifica scenario 5 — cancella il testo**

1. Con tab "Cammini" attivo, cancella tutto il testo
2. Atteso: il tab "Cammini" sparisce, si torna al tab "Sentieri"
