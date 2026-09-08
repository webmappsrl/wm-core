> Ticket: oc:8427

# Fix scroll e animazione doppia in wm-config-detail — Implementation Plan (wm-core)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `wm-config-detail` smette di essere silenzioso sull'apertura/chiusura di un item: emette un `@Output()` che i consumer (`home-layer`, `track-properties`, e — via loro — `home.component`/`webmapp-app`) usano per decidere se/quando eseguire uno scroll automatico, senza che il componente stesso tocchi mai lo scroll.

**Architecture:** Contratto Output/Input a tre livelli. (1) `ConfigDetailComponent` emette `toggled: EventEmitter<ConfigDetailToggleEvent>` ad ogni `toggle()`, senza chiamare `scrollIntoView`. (2) `WmHomeLayerComponent` e `TrackPropertiesComponent` — che montano `<wm-config-detail>` nel proprio template — **inoltrano** (pass-through) lo stesso evento con un proprio `@Output()` identico nella forma, perché i consumer di `wm-home-layer`/`wm-track-properties` non possono ascoltare un componente annidato tre livelli sotto. (3) `home.component.ts` (Home tab, unico consumer "semplice" di `wm-home-layer` in questo repo — l'altro consumer, `wm-map-details`, vive in `webmapp-app` e ha una logica di coordinamento diversa, vedi plan.md di quel repo) sottoscrive il pass-through e chiama `scrollIntoView` subito, solo in apertura.

**Tech Stack:** Angular 20 (NgModule, `standalone: false`), RxJS non necessario per questo fix (solo `EventEmitter`).

**Spec:** `docs/features/8427-fix-scroll-animazione-doppia-wm-config-detail/overview.md` (questo repo).

## Global Constraints

- **Prerequisito**: il tipo `ConfigDetailToggleEvent` deve già esistere in `@wm-types/config` — eseguire prima il plan.md di `wm-types` per lo stesso ticket, aggiornare il submodule.
- Nessun prefisso `I` sulle nuove interfacce (nessuna interfaccia nuova in questo repo: il tipo condiviso vive in wm-types).
- JSDoc obbligatorio su ogni metodo pubblico non trivialmente auto-esplicativo (enforced da ESLint sul progetto principale).
- **Test via istanza TS pura (`new Component(...)`), non `TestBed`**: pattern consolidato in questo repo (`home-layer-favorite.spec-support.ts` oc:8176/8391, `ugc-track-properties.component.spec.ts` oc:8183) per evitare il crash `NG0201` (`APP_TRANSLATION` mancante in DI) che la compilazione di template via `TestBed` produce in questo modulo. Per questo, ogni pass-through è implementato come **metodo TS esplicito** (mai un'espressione inline nel template tipo `(toggled)="x.emit($event)"`), così resta chiamabile e testabile direttamente senza compilare il template.
- Nessun commit o branch va eseguito automaticamente durante l'esecuzione di questo piano: i comandi `git commit`/`git checkout -b` riportati in ogni task sono istruzioni testuali per lo sviluppatore, da eseguire solo dopo la sua approvazione esplicita (vedi `wm-plan` → Fase: execution → review-gate).
- Percorso base per tutti i path relativi di questo piano: `core/src/app/shared/wm-core/projects/wm-core/src/` (submodule wm-core, dentro il repo `webmapp-app`).

---

## File Structure

| File | Responsabilità |
|---|---|
| `config-detail/config-detail.component.ts` (**modifica**) | `@Output() toggled`; `toggle(item, event?)` emette il payload, nessuno scroll interno |
| `config-detail/config-detail.component.html` (**modifica**) | `(click)="toggle(entry.item, $event)"` |
| `config-detail/config-detail.component.spec.ts` (**nuovo**) | Verifica emissione in apertura (con header) e in chiusura (senza header) |
| `home/home-layer/home-layer.component.ts` (**modifica**) | `@Output() configDetailToggled`; metodo `onConfigDetailToggled()` pass-through |
| `home/home-layer/home-layer.component.html` (**modifica**) | `(toggled)="onConfigDetailToggled($event)"` su `<wm-config-detail>` |
| `home/home-layer/home-layer.component.spec.ts` (**modifica**) | Nuovo test per il pass-through, aggiunto alla suite esistente |
| `track-properties/track-properties.component.ts` (**modifica**) | Stesso pattern di `home-layer` |
| `track-properties/track-properties.component.html` (**modifica**) | Stesso binding di `home-layer` |
| `track-properties/track-properties.component.spec.ts` (**nuovo**) | Verifica pass-through |
| `home/home.component.ts` (**modifica**) | `onConfigDetailToggled()`: `scrollIntoView` solo in apertura |
| `home/home.component.html` (**modifica**) | `(configDetailToggled)="onConfigDetailToggled($event)"` su `<wm-home-layer>` |
| `home/home.component.spec.ts` (**nuovo**) | Verifica scroll solo in apertura, nessuna azione in chiusura |

---

## Task 1: `ConfigDetailComponent` — nuovo `@Output() toggled`

**Files:**
- Modify: `config-detail/config-detail.component.ts`
- Modify: `config-detail/config-detail.component.html`
- Test: `config-detail/config-detail.component.spec.ts` (nuovo)

**Interfaces:**
- Consumes: `ConfigDetailToggleEvent` da `@wm-types/config` (prerequisito, vedi Global Constraints)
- Produces: `ConfigDetailComponent.toggled: EventEmitter<ConfigDetailToggleEvent>`; `toggle(item: ConfigDetailInfoBoxItem, event?: Event): void` (firma estesa, backward-compatible: il secondo parametro è opzionale)

- [ ] **Step 1: Scrivere il test che deve fallire**

Creare `core/src/app/shared/wm-core/projects/wm-core/src/config-detail/config-detail.component.spec.ts`:

```typescript
import {ConfigDetailComponent} from './config-detail.component';
import {ConfigDetailInfoBoxItem} from '@wm-types/config';
import {LangService} from '@wm-core/localization/lang.service';
import {ChangeDetectorRef} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {of} from 'rxjs';

describe('ConfigDetailComponent — toggled (oc:8427)', () => {
  let component: ConfigDetailComponent;
  const itemA: ConfigDetailInfoBoxItem = {title: {it: 'STORIA'}, content: {it: 'Testo lungo'}};
  const itemB: ConfigDetailInfoBoxItem = {title: {it: 'ACQUA'}, content: {it: 'Testo corto'}};

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
    return new ConfigDetailComponent(langSvcSpy, cdrSpy, sanitizerSpy);
  }

  beforeEach(() => {
    component = createComponent();
    component.groups = [{box_type: 'info', items: [itemA, itemB]}];
  });

  it('emette {opening: true, headerElement} quando apre un item, con l\'elemento cliccato', () => {
    const emitted: any[] = [];
    component.toggled.subscribe(e => emitted.push(e));
    const fakeButton = document.createElement('button');
    const clickEvent = {currentTarget: fakeButton} as unknown as Event;

    component.toggle(itemA, clickEvent);

    expect(emitted).toEqual([{opening: true, headerElement: fakeButton}]);
    expect(component.isOpen(itemA)).toBeTrue();
  });

  it('emette {opening: false, headerElement: null} quando richiude lo stesso item', () => {
    const fakeButton = document.createElement('button');
    component.toggle(itemA, {currentTarget: fakeButton} as unknown as Event);
    const emitted: any[] = [];
    component.toggled.subscribe(e => emitted.push(e));

    component.toggle(itemA, {currentTarget: fakeButton} as unknown as Event);

    expect(emitted).toEqual([{opening: false, headerElement: null}]);
    expect(component.isOpen(itemA)).toBeFalse();
  });

  it('apertura esclusiva: aprire un item chiude quello precedente ed emette due volte', () => {
    const emitted: any[] = [];
    component.toggled.subscribe(e => emitted.push(e));
    const buttonA = document.createElement('button');
    const buttonB = document.createElement('button');

    component.toggle(itemA, {currentTarget: buttonA} as unknown as Event);
    component.toggle(itemB, {currentTarget: buttonB} as unknown as Event);

    expect(emitted).toEqual([
      {opening: true, headerElement: buttonA},
      {opening: true, headerElement: buttonB},
    ]);
    expect(component.isOpen(itemA)).toBeFalse();
    expect(component.isOpen(itemB)).toBeTrue();
  });

  it('emette anche senza un evento click (chiamata programmatica), con headerElement null', () => {
    const emitted: any[] = [];
    component.toggled.subscribe(e => emitted.push(e));

    component.toggle(itemA);

    expect(emitted).toEqual([{opening: true, headerElement: null}]);
  });
});
```

- [ ] **Step 2: Eseguire il test e verificare che fallisca**

Run: `cd core && npx ng test wm-core --include='**/config-detail.component.spec.ts' --watch=false`

Expected: FAIL — `Property 'toggled' does not exist on type 'ConfigDetailComponent'` (errore di compilazione TypeScript, il file non compila ancora).

- [ ] **Step 3: Implementare `@Output() toggled` e aggiornare `toggle()`**

In `config-detail/config-detail.component.ts`:

Aggiungere `EventEmitter`, `Output` all'import esistente da `'@angular/core'` (riga 1-8):

```typescript
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewEncapsulation,
} from '@angular/core';
```

Aggiungere `ConfigDetailToggleEvent` all'import esistente da `'@wm-types/config'` (riga 11-15):

```typescript
import {
  ConfigDetailBox,
  ConfigDetailInfoBox,
  ConfigDetailInfoBoxItem,
  ConfigDetailToggleEvent,
} from '@wm-types/config';
```

Aggiungere il nuovo `@Output()`, subito dopo la dichiarazione di `_openItem` (dopo la riga `private _openItem: ConfigDetailInfoBoxItem | null = null;`):

```typescript
  /**
   * Notifica al consumer ogni apertura/chiusura di un item, senza eseguire alcuno scroll
   * internamente: solo il consumer sa se e quando è sicuro spostare la vista (es.
   * `wm-map-details`, webmapp-app, deve prima attendere il proprio resize del pannello in
   * modalità full — vedi `docs/features/8427-.../overview.md` di quel repo).
   */
  @Output() readonly toggled = new EventEmitter<ConfigDetailToggleEvent>();
```

Sostituire il metodo `toggle()` esistente:

```typescript
  toggle(item: ConfigDetailInfoBoxItem): void {
    this._openItem = this._openItem === item ? null : item;
  }
```

con:

```typescript
  /**
   * Alterna lo stato aperto/chiuso di `item`. Apertura esclusiva: aprirne uno chiude
   * automaticamente l'item precedentemente aperto (mai più di un item aperto alla volta). Emette
   * `toggled` con l'header cliccato (`event.currentTarget`) solo in apertura — mai in chiusura,
   * per costruzione: la responsabilità dello scroll resta sempre del consumer (oc:8427).
   *
   * @param item Item da alternare.
   * @param event Evento click originato dal tap sull'header, usato solo per recuperare
   *   `currentTarget` come header da riportare in vista. Opzionale per restare backward-compatible
   *   con chiamate programmatiche che non hanno un evento DOM reale.
   */
  toggle(item: ConfigDetailInfoBoxItem, event?: Event): void {
    const opening = this._openItem !== item;
    this._openItem = opening ? item : null;
    this.toggled.emit({
      opening,
      headerElement: opening ? ((event?.currentTarget as HTMLElement) ?? null) : null,
    });
  }
```

In `config-detail/config-detail.component.html`, sostituire:

```html
        (click)="toggle(entry.item)"
```

con:

```html
        (click)="toggle(entry.item, $event)"
```

- [ ] **Step 4: Eseguire il test e verificare che passi**

Run: `cd core && npx ng test wm-core --include='**/config-detail.component.spec.ts' --watch=false`

Expected: PASS — 4/4 test verdi.

- [ ] **Step 5: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/config-detail/config-detail.component.ts projects/wm-core/src/config-detail/config-detail.component.html projects/wm-core/src/config-detail/config-detail.component.spec.ts
git commit -m "feat(oc:8427): emit toggled output from wm-config-detail instead of scrolling internally"
```

---

## Task 2: `WmHomeLayerComponent` — pass-through `configDetailToggled`

**Files:**
- Modify: `home/home-layer/home-layer.component.ts`
- Modify: `home/home-layer/home-layer.component.html`
- Test: `home/home-layer/home-layer.component.spec.ts` (modifica)

**Interfaces:**
- Consumes: `ConfigDetailComponent.toggled` (Task 1), `ConfigDetailToggleEvent` da `@wm-types/config`
- Produces: `WmHomeLayerComponent.configDetailToggled: EventEmitter<ConfigDetailToggleEvent>`; `onConfigDetailToggled(event: ConfigDetailToggleEvent): void`

- [ ] **Step 1: Scrivere il test che deve fallire**

Modificare `home/home-layer/home-layer.component.spec.ts`, aggiungendo un nuovo blocco `describe` dopo quello esistente (senza toccare `describeHomeLayerFavoriteBehavior`, che resta invariato):

```typescript
import {WmHomeLayerComponent} from './home-layer.component';
import {describeHomeLayerFavoriteBehavior} from './home-layer-favorite.spec-support';
import {Store} from '@ngrx/store';
import {LangService} from '@wm-core/localization/lang.service';
import {LayerFavoriteService} from '@wm-core/services/layer-favorite.service';
import {of} from 'rxjs';

describeHomeLayerFavoriteBehavior('WmHomeLayerComponent (default)', WmHomeLayerComponent);

describe('WmHomeLayerComponent — pass-through configDetailToggled (oc:8427)', () => {
  function createComponent(): WmHomeLayerComponent {
    const storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
    storeSpy.select.and.returnValue(of(null));
    const langSvcSpy = jasmine.createSpyObj<LangService>('LangService', ['instant']);
    (langSvcSpy as any).onLangChange = of();
    const favoriteSvcSpy = jasmine.createSpyObj<LayerFavoriteService>('LayerFavoriteService', [
      'isFavorite$',
    ]);
    return new WmHomeLayerComponent(
      storeSpy,
      langSvcSpy,
      {markForCheck: () => {}} as any,
      favoriteSvcSpy,
    );
  }

  it('inoltra l\'evento ricevuto da wm-config-detail via configDetailToggled', () => {
    const component = createComponent();
    const emitted: any[] = [];
    component.configDetailToggled.subscribe(e => emitted.push(e));
    const fakeEvent = {opening: true, headerElement: document.createElement('button')};

    component.onConfigDetailToggled(fakeEvent);

    expect(emitted).toEqual([fakeEvent]);
  });
});
```

- [ ] **Step 2: Eseguire il test e verificare che fallisca**

Run: `cd core && npx ng test wm-core --include='**/home-layer.component.spec.ts' --watch=false`

Expected: FAIL — `Property 'configDetailToggled' does not exist on type 'WmHomeLayerComponent'`.

- [ ] **Step 3: Implementare il pass-through**

In `home/home-layer/home-layer.component.ts`, sostituire il file intero con:

```typescript
import {ChangeDetectionStrategy, Component, EventEmitter, Output, ViewEncapsulation} from '@angular/core';
import {ConfigDetailToggleEvent} from '@wm-types/config';
import {WmHomeLayerBaseComponent} from './home-layer-base.component';

@Component({
  standalone: false,
  selector: 'wm-home-layer',
  templateUrl: './home-layer.component.html',
  styleUrls: ['./home-layer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeLayerComponent extends WmHomeLayerBaseComponent {
  /**
   * Inoltra al proprio consumer (Home tab o `wm-map-details`, webmapp-app) l'evento di
   * apertura/chiusura di un item di `wm-config-detail`, annidato nel proprio template — un
   * consumer esterno non può ascoltarlo direttamente (oc:8427).
   */
  @Output() readonly configDetailToggled = new EventEmitter<ConfigDetailToggleEvent>();

  /**
   * Pass-through dell'evento di `wm-config-detail`. Metodo esplicito (non un'espressione inline
   * nel template) per restare testabile senza compilare il template via `TestBed` (vedi Global
   * Constraints del piano).
   *
   * @param event Evento ricevuto da `wm-config-detail`.
   */
  onConfigDetailToggled(event: ConfigDetailToggleEvent): void {
    this.configDetailToggled.emit(event);
  }
}
```

In `home/home-layer/home-layer.component.html`, modificare la riga:

```html
  <wm-config-detail [groups]="layer?.config_detail"></wm-config-detail>
```

in:

```html
  <wm-config-detail
    [groups]="layer?.config_detail"
    (toggled)="onConfigDetailToggled($event)"
  ></wm-config-detail>
```

- [ ] **Step 4: Eseguire il test e verificare che passi**

Run: `cd core && npx ng test wm-core --include='**/home-layer.component.spec.ts' --watch=false`

Expected: PASS — tutti i test verdi (sia la suite preferiti preesistente, sia il nuovo test pass-through).

- [ ] **Step 5: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/home/home-layer/home-layer.component.ts projects/wm-core/src/home/home-layer/home-layer.component.html projects/wm-core/src/home/home-layer/home-layer.component.spec.ts
git commit -m "feat(oc:8427): forward wm-config-detail toggle event from wm-home-layer"
```

---

## Task 3: `TrackPropertiesComponent` — pass-through `configDetailToggled`

**Files:**
- Modify: `track-properties/track-properties.component.ts`
- Modify: `track-properties/track-properties.component.html`
- Test: `track-properties/track-properties.component.spec.ts` (nuovo)

**Interfaces:**
- Consumes: `ConfigDetailComponent.toggled` (Task 1), `ConfigDetailToggleEvent` da `@wm-types/config`
- Produces: `TrackPropertiesComponent.configDetailToggled: EventEmitter<ConfigDetailToggleEvent>`; `onConfigDetailToggled(event: ConfigDetailToggleEvent): void`

- [ ] **Step 1: Scrivere il test che deve fallire**

Creare `core/src/app/shared/wm-core/projects/wm-core/src/track-properties/track-properties.component.spec.ts`:

```typescript
import {TrackPropertiesComponent} from './track-properties.component';
import {Store} from '@ngrx/store';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {LangService} from '@wm-core/localization/lang.service';
import {of} from 'rxjs';

describe('TrackPropertiesComponent — pass-through configDetailToggled (oc:8427)', () => {
  function createComponent(): TrackPropertiesComponent {
    const storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
    storeSpy.select.and.returnValue(of(null));
    const urlHandlerSvcSpy = jasmine.createSpyObj<UrlHandlerService>('UrlHandlerService', [
      'updateURL',
    ]);
    const langSvcSpy = jasmine.createSpyObj<LangService>('LangService', ['instant']);
    return new TrackPropertiesComponent(storeSpy, urlHandlerSvcSpy, langSvcSpy);
  }

  it('inoltra l\'evento ricevuto da wm-config-detail via configDetailToggled', () => {
    const component = createComponent();
    const emitted: any[] = [];
    component.configDetailToggled.subscribe(e => emitted.push(e));
    const fakeEvent = {opening: false, headerElement: null};

    component.onConfigDetailToggled(fakeEvent);

    expect(emitted).toEqual([fakeEvent]);
  });
});
```

- [ ] **Step 2: Eseguire il test e verificare che fallisca**

Run: `cd core && npx ng test wm-core --include='**/track-properties.component.spec.ts' --watch=false`

Expected: FAIL — `Property 'configDetailToggled' does not exist on type 'TrackPropertiesComponent'`.

- [ ] **Step 3: Implementare il pass-through**

In `track-properties/track-properties.component.ts`, aggiungere `EventEmitter`, `Output` all'import esistente da `'@angular/core'` (riga 1):

```typescript
import {Component, ChangeDetectionStrategy, EventEmitter, Output, ViewEncapsulation} from '@angular/core';
```

Aggiungere l'import del tipo, subito dopo l'import esistente da `'@wm-types/config'` (riga 14):

```typescript
import {ConfigDetailToggleEvent, OPTIONS} from '@wm-types/config';
```

(sostituendo la riga esistente `import {OPTIONS} from '@wm-types/config';`)

Aggiungere, subito dopo la dichiarazione di `trackProgress$` (ultima property osservabile della classe, prima del costruttore):

```typescript
  /**
   * Inoltra al proprio consumer (`wm-map-details`, webmapp-app — unico contesto in cui questo
   * componente è montato) l'evento di apertura/chiusura di un item di `wm-config-detail`,
   * annidato nel proprio template (oc:8427).
   */
  @Output() readonly configDetailToggled = new EventEmitter<ConfigDetailToggleEvent>();
```

Aggiungere, in coda alla classe (dopo il metodo `onLocationHover`):

```typescript

  /**
   * Pass-through dell'evento di `wm-config-detail`. Metodo esplicito (non un'espressione inline
   * nel template) per restare testabile senza compilare il template via `TestBed` (vedi Global
   * Constraints del piano).
   *
   * @param event Evento ricevuto da `wm-config-detail`.
   */
  onConfigDetailToggled(event: ConfigDetailToggleEvent): void {
    this.configDetailToggled.emit(event);
  }
```

In `track-properties/track-properties.component.html`, modificare la riga:

```html
  <wm-config-detail [groups]="ecTrackProperties?.config_detail"></wm-config-detail>
```

in:

```html
  <wm-config-detail
    [groups]="ecTrackProperties?.config_detail"
    (toggled)="onConfigDetailToggled($event)"
  ></wm-config-detail>
```

- [ ] **Step 4: Eseguire il test e verificare che passi**

Run: `cd core && npx ng test wm-core --include='**/track-properties.component.spec.ts' --watch=false`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/track-properties/track-properties.component.ts projects/wm-core/src/track-properties/track-properties.component.html projects/wm-core/src/track-properties/track-properties.component.spec.ts
git commit -m "feat(oc:8427): forward wm-config-detail toggle event from wm-track-properties"
```

---

## Task 4: `WmHomeComponent` — consumer "semplice" (Home tab)

**Files:**
- Modify: `home/home.component.ts`
- Modify: `home/home.component.html`
- Test: `home/home.component.spec.ts` (nuovo)

**Interfaces:**
- Consumes: `WmHomeLayerComponent.configDetailToggled` (Task 2), `ConfigDetailToggleEvent` da `@wm-types/config`
- Produces: `WmHomeComponent.onConfigDetailToggled(event: ConfigDetailToggleEvent): void`

- [ ] **Step 1: Scrivere il test che deve fallire**

Creare `core/src/app/shared/wm-core/projects/wm-core/src/home/home.component.spec.ts`:

```typescript
import {WmHomeComponent} from './home.component';
import {Store} from '@ngrx/store';
import {ActivatedRoute} from '@angular/router';
import {ModalController, NavController} from '@ionic/angular';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {of} from 'rxjs';

describe('WmHomeComponent — consumer semplice configDetailToggled (oc:8427)', () => {
  function createComponent(): WmHomeComponent {
    const storeSpy = jasmine.createSpyObj<Store>('Store', ['select']);
    storeSpy.select.and.returnValue(of(null));
    const routeStub = {queryParams: of({})} as unknown as ActivatedRoute;
    return new WmHomeComponent(
      storeSpy,
      routeStub,
      {} as ModalController,
      {} as NavController,
      {} as UrlHandlerService,
    );
  }

  it('chiama scrollIntoView sull\'header quando l\'evento è di apertura', () => {
    const component = createComponent();
    const fakeHeader = document.createElement('button');
    spyOn(fakeHeader, 'scrollIntoView');

    component.onConfigDetailToggled({opening: true, headerElement: fakeHeader});

    expect(fakeHeader.scrollIntoView).toHaveBeenCalledWith({block: 'start', behavior: 'smooth'});
  });

  it('non chiama scrollIntoView quando l\'evento è di chiusura', () => {
    const component = createComponent();
    const fakeHeader = document.createElement('button');
    spyOn(fakeHeader, 'scrollIntoView');

    component.onConfigDetailToggled({opening: false, headerElement: null});

    expect(fakeHeader.scrollIntoView).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Eseguire il test e verificare che fallisca**

Run: `cd core && npx ng test wm-core --include='**/home.component.spec.ts' --watch=false`

Expected: FAIL — `Property 'onConfigDetailToggled' does not exist on type 'WmHomeComponent'`.

- [ ] **Step 3: Implementare il consumer**

In `home/home.component.ts`, aggiungere l'import del tipo, subito dopo l'import esistente da `'@wm-types/config'` (riga 29):

```typescript
import {APP, ConfigDetailToggleEvent, OPTIONS} from '@wm-types/config';
```

(sostituendo la riga esistente `import {APP, OPTIONS} from '@wm-types/config';`)

Aggiungere, in coda alla classe `WmHomeComponent` (dopo il metodo `togglePoiFilter`):

```typescript

  /**
   * Consumer "semplice" del pass-through di `wm-home-layer`: nel tab Home non c'è alcun pannello
   * ridimensionabile con cui coordinare lo scroll (a differenza di `wm-map-details`, webmapp-app,
   * che ha una logica di coordinamento diversa — vedi CLAUDE.md di quel repo), quindi lo scroll
   * avviene subito in apertura. Nessuna azione in chiusura (oc:8427).
   *
   * @param event Evento ricevuto da `wm-home-layer`.
   */
  onConfigDetailToggled(event: ConfigDetailToggleEvent): void {
    if (event.opening && event.headerElement) {
      event.headerElement.scrollIntoView({block: 'start', behavior: 'smooth'});
    }
  }
```

In `home/home.component.html`, alla riga 41, modificare:

```html
        <wm-home-layer></wm-home-layer>
```

in:

```html
        <wm-home-layer (configDetailToggled)="onConfigDetailToggled($event)"></wm-home-layer>
```

- [ ] **Step 4: Eseguire il test e verificare che passi**

Run: `cd core && npx ng test wm-core --include='**/home.component.spec.ts' --watch=false`

Expected: PASS.

- [ ] **Step 5: Verifica manuale nel browser**

Run: `npm start` (dalla root del repo `webmapp-app`, sceglie automaticamente la configuration corretta — vedi CLAUDE.md webmapp-app).

Aprire il tab Home, selezionare un cammino/layer con almeno due box `config_detail` di lunghezza molto diversa (es. STORIA lungo, ACQUA corto). Aprire il box lungo, scrollare fino in fondo per leggerlo, poi aprire il box corto: l'header del box appena aperto deve portarsi in cima al viewport con scroll fluido. Richiudere lo stesso box: nessuno scroll deve avvenire.

- [ ] **Step 6: Commit**

```bash
cd core/src/app/shared/wm-core
git add projects/wm-core/src/home/home.component.ts projects/wm-core/src/home/home.component.html projects/wm-core/src/home/home.component.spec.ts
git commit -m "feat(oc:8427): scroll opened config-detail item into view in Home tab"
```

---

## Self-Review

**Spec coverage:**
- "`wm-config-detail` NON deve chiamare `scrollIntoView` internamente. Deve esporre un `@Output()`..." → Task 1.
- "Consumer semplici... si iscrivono e chiamano scrollIntoView subito, solo in apertura" → Task 4 (Home tab, unico consumer semplice in questo repo).
- "`wm-map-details` ha logica diversa, non implementarla qui" → rispettato, nessun task tocca webmapp-app.
- "Nessuno scroll su chiusura" → verificato esplicitamente nei test di Task 1 e Task 4.
- "Fuori scope: Mostra altro/meno, prefers-reduced-motion, logica di apertura esclusiva" → nessun task li tocca.
- "Test unitari per l'Output" → Task 1.
- Pass-through di `home-layer`/`track-properties` (emerso durante l'analisi del codice reale in Fase: write-plan, non esplicito nell'overview originale ma necessario per la content projection dentro `wm-map-details`) → Task 2 e Task 3.

**Placeholder scan:** nessuno — ogni step ha codice completo, nessun TBD/TODO.

**Type consistency:** `ConfigDetailToggleEvent{opening, headerElement}` usato identico in tutti e 3 i livelli (Task 1 produce, Task 2/3 inoltrano, Task 4 consuma) e nei plan.md di `wm-types` (produce il tipo) e `webmapp-app` (consumer `wm-map-details`) — nomi dei campi verificati coerenti tra i tre piani.
