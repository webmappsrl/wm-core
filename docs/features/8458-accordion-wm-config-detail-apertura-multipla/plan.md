> Ticket: oc:8458

# Accordion wm-config-detail: apertura multipla e rimozione scrollIntoView — wm-core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare `wm-config-detail` da accordion a apertura esclusiva a apertura multipla (nessun limite), rimuovendo interamente il meccanismo di assestamento (`transitionend`/debounce/fallback) e l'evento `configDetailSettled` — il cui unico consumer in questo repo, `home.component.ts`, smette di gestire lo scroll automatico.

**Architecture:** Un solo componente (`ConfigDetailComponent`) cambia modello di stato da riferimento-singolo (`_openItem`) a insieme (`Set<ConfigDetailInfoBoxItem>`), eliminando in blocco l'infrastruttura di notifica (listener DOM, timer, `CustomEvent`) che serviva solo allo scroll dei consumer. Un solo consumer in questo repo (`home.component.ts`, tab Home) smette di ascoltare l'evento. Nessuna modifica di struttura DOM/CSS oltre a un attributo ARIA.

**Tech Stack:** Angular 20, TypeScript strict, Jasmine/Karma.

**Spec:** `docs/features/8458-accordion-wm-config-detail-apertura-multipla/overview.md` (questo repo).

**Piani correlati (stesso ticket, altri repo):** `webmapp-app/docs/features/8458-.../plan.md` (rimuove il proprio consumer, `map-details.component.ts` — indipendente da questo piano, nessuna dipendenza di import), `wm-types/docs/features/8458-.../plan.md` (rimuove il tipo `ConfigDetailToggleEvent` — **va eseguito DOPO questo piano**, perché questo piano rimuove l'ultimo uso del tipo in questo repo; wm-types non può rimuoverlo finché entrambi i consumer, questo e webmapp-app, non hanno smesso di importarlo).

## Global Constraints

- Nessun limite al numero di item aperti simultaneamente — apertura illimitata (decisione esplicita, non implementare nessun tetto).
- Nessun flag `OPTIONS.*` di rollout — comportamento condiviso da tutti gli shard, nessuna eccezione per camminiditalia o altri.
- `showLess(groupIndex)` chiude SOLO gli item del gruppo compresso che tornano nascosti — gli item aperti in altri gruppi restano aperti (azione locale, effetto locale).
- Tracking dello stato per riferimento-oggetto (non per id) — pattern esistente, non cambiare in questo ciclo.
- `[attr.aria-multiselectable]="true"` sul contenitore `.wm-config-detail` è un requisito vincolante, non opzionale.
- Nessuna modifica a `PAGE_SIZE`, alla paginazione "Mostra altro"/"Mostra meno" (solo al comportamento di chiusura di `showLess`), al layout CSS o all'animazione `grid-template-rows` per singolo item.
- JSDoc solo dove il WHY non è ovvio (convenzione repo) — non descrittivo, non su ogni riga.

---

### Task 1: `ConfigDetailComponent` — stato multi-apertura, rimozione meccanismo di assestamento

**Files:**
- Modify: `projects/wm-core/src/config-detail/config-detail.component.ts`
- Modify: `projects/wm-core/src/config-detail/config-detail.component.html`
- Modify (riscrittura completa): `projects/wm-core/src/config-detail/config-detail.component.spec.ts`

**Interfaces:**
- Consumes: nessuna dipendenza da altri task di questo piano.
- Produces: `ConfigDetailComponent.isOpen(item: ConfigDetailInfoBoxItem): boolean` (firma invariata), `ConfigDetailComponent.toggle(item: ConfigDetailInfoBoxItem, event?: Event): void` (firma invariata, comportamento cambiato: non chiude più altri item). Il `CustomEvent('configDetailSettled')` NON viene più dispacciato — Task 2 (questo piano) e il piano webmapp-app dipendono da questo fatto per rimuovere i propri listener senza che restino "silenziosamente inutili" (l'evento semplicemente non arriva più).

- [ ] **Step 1: Riscrivere `config-detail.component.spec.ts` con i nuovi test (multi-open + `showLess` scoped)**

Sostituire l'intero contenuto del file con:

```typescript
import {ConfigDetailComponent} from './config-detail.component';
import {ConfigDetailInfoBoxItem} from '@wm-types/config';
import {LangService} from '@wm-core/localization/lang.service';
import {ChangeDetectorRef, ElementRef} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {of} from 'rxjs';

describe('ConfigDetailComponent — apertura multipla (oc:8458)', () => {
  let component: ConfigDetailComponent;
  const itemA: ConfigDetailInfoBoxItem = {title: {it: 'STORIA'}, content: {it: 'Testo A'}};
  const itemB: ConfigDetailInfoBoxItem = {title: {it: 'ACQUA'}, content: {it: 'Testo B'}};
  const itemC: ConfigDetailInfoBoxItem = {title: {it: 'FLORA'}, content: {it: 'Testo C'}};

  function createComponent(): ConfigDetailComponent {
    const langSvcSpy = jasmine.createSpyObj<LangService>('LangService', ['instant']);
    (langSvcSpy as any).onLangChange = of();
    (langSvcSpy as any).currentLang = 'it';
    (langSvcSpy as any).defaultLang = 'it';
    const cdrSpy = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck']);
    const sanitizerSpy = jasmine.createSpyObj<DomSanitizer>('DomSanitizer', [
      'bypassSecurityTrustHtml',
    ]);
    sanitizerSpy.bypassSecurityTrustHtml.and.callFake((v: string) => v as any);
    const hostEl = document.createElement('div');
    return new ConfigDetailComponent(langSvcSpy, cdrSpy, sanitizerSpy, new ElementRef(hostEl));
  }

  beforeEach(() => {
    component = createComponent();
  });

  it('apre un item senza chiudere un item già aperto (multi-open)', () => {
    component.groups = [{box_type: 'info', items: [itemA, itemB]}];

    component.toggle(itemA);
    component.toggle(itemB);

    expect(component.isOpen(itemA)).toBeTrue();
    expect(component.isOpen(itemB)).toBeTrue();
  });

  it('richiudere un item aperto non tocca gli altri item aperti', () => {
    component.groups = [{box_type: 'info', items: [itemA, itemB]}];
    component.toggle(itemA);
    component.toggle(itemB);

    component.toggle(itemA);

    expect(component.isOpen(itemA)).toBeFalse();
    expect(component.isOpen(itemB)).toBeTrue();
  });

  it('non impone alcun limite al numero di item aperti simultaneamente', () => {
    component.groups = [{box_type: 'info', items: [itemA, itemB, itemC]}];

    component.toggle(itemA);
    component.toggle(itemB);
    component.toggle(itemC);

    expect(component.isOpen(itemA)).toBeTrue();
    expect(component.isOpen(itemB)).toBeTrue();
    expect(component.isOpen(itemC)).toBeTrue();
  });

  it('il setter groups resetta lo stato di apertura (istanza riusata per una nuova entità)', () => {
    component.groups = [{box_type: 'info', items: [itemA]}];
    component.toggle(itemA);
    expect(component.isOpen(itemA)).toBeTrue();

    component.groups = [{box_type: 'info', items: [itemB]}];

    expect(component.isOpen(itemA)).toBeFalse();
    expect(component.isOpen(itemB)).toBeFalse();
  });

  it('showLess chiude solo gli item nascosti del proprio gruppo, non gli item aperti in altri gruppi', () => {
    const groupExtraItems = Array.from({length: 12}, (_, i) => ({
      title: {it: `ITEM ${i}`},
      content: {it: `Testo ${i}`},
    }));
    component.groups = [
      {box_type: 'info', items: groupExtraItems},
      {box_type: 'info', items: [itemA]},
    ];
    component.showMore(0); // mostra tutti e 12 gli item del gruppo 0 (PAGE_SIZE=10)
    component.toggle(groupExtraItems[11]); // apre l'ultimo item del gruppo 0, oltre PAGE_SIZE
    component.toggle(itemA); // apre l'unico item del gruppo 1

    component.showLess(0); // torna a PAGE_SIZE=10 nel gruppo 0: item 11 non è più mostrato

    expect(component.isOpen(groupExtraItems[11])).toBeFalse();
    expect(component.isOpen(itemA)).toBeTrue();
  });

  it('showLess non chiude un item del proprio gruppo che resta visibile dopo la riduzione a PAGE_SIZE', () => {
    const groupExtraItems = Array.from({length: 12}, (_, i) => ({
      title: {it: `ITEM ${i}`},
      content: {it: `Testo ${i}`},
    }));
    component.groups = [{box_type: 'info', items: groupExtraItems}];
    component.showMore(0);
    component.toggle(groupExtraItems[2]); // dentro i primi PAGE_SIZE=10, resta visibile dopo showLess

    component.showLess(0);

    expect(component.isOpen(groupExtraItems[2])).toBeTrue();
  });
});
```

- [ ] **Step 2: Eseguire i test — devono fallire contro l'implementazione attuale (apertura esclusiva)**

Run: `cd core/src/app/shared/wm-core && npx ng test --watch=false --include='**/config-detail.component.spec.ts'`
Expected: FAIL — i test su multi-open falliscono (`isOpen(itemB)` è `false` dopo aver aperto `itemA` con l'implementazione a `_openItem` singolo).

- [ ] **Step 3: Implementare lo stato multi-apertura in `config-detail.component.ts`**

Sostituire il campo privato (blocco attuale, circa righe 104-111):

```typescript
  private _openItem: ConfigDetailInfoBoxItem | null = null;
```

con:

```typescript
  /**
   * Item attualmente aperti. Tracciato per riferimento all'oggetto item (non per indice
   * posizionale, stesso motivo del precedente `_openItem`): un indice si disallineerebbe
   * silenziosamente quando `showMore`/`showLess` cambia quanti item di un gruppo PRECEDENTE
   * sono visibili. Apertura multipla, nessun limite al numero di item aperti simultaneamente
   * (oc:8458 — sostituisce l'apertura esclusiva di oc:8181).
   */
  private _openItems = new Set<ConfigDetailInfoBoxItem>();
```

Sostituire `isOpen()`:

```typescript
  isOpen(item: ConfigDetailInfoBoxItem): boolean {
    return this._openItems.has(item);
  }
```

Sostituire `toggle()` (rimuove anche tutta la logica di `_pendingToggleEvent`/timer, vedi Step 4):

```typescript
  /**
   * Alterna lo stato aperto/chiuso di `item`. Apertura multipla: aprirne uno NON chiude gli
   * altri item eventualmente aperti (oc:8458).
   *
   * @param item Item da alternare.
   */
  toggle(item: ConfigDetailInfoBoxItem): void {
    if (this._openItems.has(item)) {
      this._openItems.delete(item);
    } else {
      this._openItems.add(item);
    }
  }
```

Nel setter `groups`, sostituire la riga `this._openItem = null;` con `this._openItems.clear();` (il resto del setter, incluso il reset di `_pendingToggleEvent`/`_visibleCountPerGroup`/`_safeContentCache`, viene comunque toccato dallo Step 4 per la parte relativa ai timer).

Sostituire `showLess(groupIndex)`:

```typescript
  /**
   * Torna alla pagina iniziale (`PAGE_SIZE` item) del gruppo `groupIndex`. Chiude solo gli item
   * di QUESTO gruppo che non sono più tra gli `shownItems` dopo la riduzione — un'azione locale
   * (comprimere un gruppo) ha effetto locale, gli item aperti in altri gruppi non vengono
   * toccati (oc:8458 — sostituisce la chiusura globale di oc:8181).
   *
   * @param groupIndex Indice del gruppo (tra quelli con `box_type: 'info'`) da riportare alla pagina iniziale.
   */
  showLess(groupIndex: number): void {
    const infoGroups = this._groups.filter(
      (group): group is ConfigDetailInfoBox => group.box_type === 'info',
    );
    const {shownItems} = this._visibleItemsInGroup(infoGroups[groupIndex], groupIndex);
    delete this._visibleCountPerGroup[groupIndex];
    const {shownItems: shownItemsAfterCollapse} = this._visibleItemsInGroup(
      infoGroups[groupIndex],
      groupIndex,
    );
    const stillShown = new Set(shownItemsAfterCollapse);
    shownItems.filter(item => !stillShown.has(item)).forEach(item => this._openItems.delete(item));
  }
```

Nota: `_visibleItemsInGroup` è già un metodo privato esistente del componente (righe attuali 256-270), riusato qui senza modifiche.

- [ ] **Step 4: Rimuovere interamente il meccanismo di assestamento**

Nel costruttore, rimuovere la riga:

```typescript
    this._elRef.nativeElement.addEventListener('transitionend', this._onTransitionEnd);
```

In `ngOnDestroy()`, rimuovere la riga:

```typescript
    this._elRef.nativeElement.removeEventListener('transitionend', this._onTransitionEnd);
    this._clearSettleTimers();
```

Rimuovere interamente questi membri della classe (con i rispettivi commenti JSDoc):
- `private static readonly SETTLE_DEBOUNCE_MS`
- `private static readonly SETTLE_FALLBACK_MS`
- `private _pendingToggleEvent`
- `private _settleDebounceId`
- `private _settleFallbackId`
- `private readonly _onTransitionEnd = (ev: TransitionEvent): void => { ... }` (l'intero arrow function)
- `private _clearSettleTimers(): void { ... }`
- `private _flushPendingToggle(): void { ... }`

Nel setter `groups`, rimuovere le righe:

```typescript
    this._clearSettleTimers();
    // Stessa ragione: un toggle in attesa di assestamento riferirebbe un item/header ormai
    // disconnesso dall'entità appena caricata.
    this._pendingToggleEvent = null;
```

Rimuovere l'import ora inutilizzato `ConfigDetailToggleEvent` da `@wm-types/config` in cima al file (resta `ConfigDetailBox`, `ConfigDetailInfoBox`, `ConfigDetailInfoBoxItem`).

Aggiornare il commento JSDoc della classe (blocco sopra `@Component`) rimuovendo il paragrafo che descrive il debounce/fallback di assestamento — non più applicabile.

- [ ] **Step 5: Aggiornare `config-detail.component.html`: `aria-multiselectable` e binding di `toggle()`**

Riga 1, aggiungere l'attributo al contenitore:

```html
<div class="wm-config-detail" [attr.aria-multiselectable]="true" *ngIf="visibleEntries.length">
```

Riga 14, `toggle()` non accetta più il parametro `event` (rimosso allo Step 3, non più necessario senza `headerElement` da recuperare per lo scroll) — aggiornare il binding da:

```html
(click)="toggle(entry.item, $event)"
```

a:

```html
(click)="toggle(entry.item)"
```

- [ ] **Step 6: Eseguire i test — devono passare**

Run: `cd core/src/app/shared/wm-core && npx ng test --watch=false --include='**/config-detail.component.spec.ts'`
Expected: PASS — tutti i test del nuovo file passano.

- [ ] **Step 7: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/config-detail/config-detail.component.ts \
  projects/wm-core/src/config-detail/config-detail.component.html \
  projects/wm-core/src/config-detail/config-detail.component.spec.ts
git commit -m "feat(oc:8458): apertura multipla per wm-config-detail, rimozione meccanismo di assestamento"
```

---

### Task 2: `home.component.ts` — rimozione del consumer di `configDetailSettled`

**Files:**
- Modify: `projects/wm-core/src/home/home.component.ts`
- Modify: `projects/wm-core/src/home/home.component.html`
- Delete: `projects/wm-core/src/home/home.component.spec.ts`

**Interfaces:**
- Consumes: nessuna — questo task rimuove codice, non introduce nuove interfacce.
- Produces: nessuna nuova interfaccia.

- [ ] **Step 1: Rimuovere il binding `(configDetailSettled)` da `home.component.html`**

Alla riga 41, sostituire:

```html
<wm-home-layer (configDetailSettled)="onConfigDetailSettled($event)"></wm-home-layer>
```

con:

```html
<wm-home-layer></wm-home-layer>
```

- [ ] **Step 2: Rimuovere `onConfigDetailSettled()` e `_isFullyInView()` da `home.component.ts`**

Rimuovere interamente i due metodi (con i rispettivi commenti JSDoc), attualmente subito prima della chiusura della classe:

```typescript
  onConfigDetailSettled(event: Event): void {
    const {opening, headerElement} = (event as CustomEvent<ConfigDetailToggleEvent>).detail;
    if (opening && headerElement && !this._isFullyInView(headerElement)) {
      headerElement.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    }
  }
```

e

```typescript
  private _isFullyInView(el: HTMLElement): boolean {
    let parent: HTMLElement | null = el.parentElement;
    while (parent && parent !== document.body) {
      const style = getComputedStyle(parent);
      if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight) {
        break;
      }
      parent = parent.parentElement;
    }
    const containerRect = (parent ?? document.documentElement).getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom;
  }
```

Nell'import da `@wm-types/config` (riga 29), rimuovere `ConfigDetailToggleEvent` dalla destructure:

```typescript
import {APP, OPTIONS} from '@wm-types/config';
```

- [ ] **Step 3: Eliminare `home.component.spec.ts`**

Il file (`projects/wm-core/src/home/home.component.spec.ts`) contiene esclusivamente test per `onConfigDetailSettled`/`_isFullyInView` (oc:8427) — nessun altro test in questo file. Va eliminato interamente, non svuotato.

```bash
cd core/src/app/shared/wm-core
git rm projects/wm-core/src/home/home.component.spec.ts
```

- [ ] **Step 4: Eseguire l'intera suite di test di wm-core per verificare l'assenza di regressioni**

Run: `cd core/src/app/shared/wm-core && npx ng test --watch=false`
Expected: PASS — nessun test rotto, nessun riferimento residuo a `configDetailSettled`/`ConfigDetailToggleEvent`/`onConfigDetailSettled` in wm-core (verificabile anche con `grep -rn "configDetailSettled\|ConfigDetailToggleEvent" projects/wm-core/src` → nessun risultato).

- [ ] **Step 5: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/home/home.component.ts projects/wm-core/src/home/home.component.html
git commit -m "feat(oc:8458): rimuovere lo scroll automatico su configDetailSettled dalla tab Home"
```

---

## Self-Review

**Spec coverage:** tutti i requisiti dell'overview wm-core sono coperti — stato multi-item (Task 1, Step 3), rimozione meccanismo di assestamento (Task 1, Step 4), `showLess` scoped al gruppo (Task 1, Step 3), `aria-multiselectable` (Task 1, Step 5), riscrittura `config-detail.component.spec.ts` con test multi-open/`showLess` (Task 1, Step 1), rimozione handler/binding in `home.component.ts`/`.html` (Task 2, Step 1-2), riscrittura (qui: eliminazione, essendo l'intero file dedicato al comportamento rimosso) di `home.component.spec.ts` (Task 2, Step 3).

**Placeholder scan:** nessun TBD — ogni step ha codice completo o comando eseguibile.

**Type consistency:** `toggle(item, event?)` perde il secondo parametro `event` nella nuova firma (Task 1, Step 3) perché non serve più (era usato solo per recuperare `headerElement` per lo scroll, ora rimosso) — il binding nel template (`config-detail.component.html`, `(click)="toggle(entry.item)"`) è stato aggiornato di conseguenza nel Task 1, Step 5.
