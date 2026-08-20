> Ticket: oc:8181

# Schermata cammino con blocchi informativi configurabili — Implementation Plan (wm-core)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere a wm-core un componente condiviso (`wm-config-detail`) che renderizza `properties.config_detail` (Layer/EcTrack) come una lista di accordion informativi, e collegarlo dopo la descrizione esistente in `home-layer` e `track-properties`.

**Architecture:** Un solo componente standalone-in-NgModule (`ConfigDetailComponent`, dichiarato in `wm-core.module.ts` come gli altri componenti condivisi, non in `BoxModule`: non è un box di `config_home`, è un concetto distinto). Il componente riceve `groups: IConfigDetailBox[]` via `@Input`, appiattisce tutti i gruppi con `box_type` riconosciuto (oggi solo `'info'`) in un'unica lista di item, filtra le righe senza alcuna traduzione disponibile (fallback a cascata identico a `WmTransPipe`), e renderizza un **accordion custom** (markup proprio, non `ion-accordion` — decisione esplicita del developer) con contenuto HTML lazy-mounted solo sull'item aperto.

**Tech Stack:** Angular 20 (NgModule, non standalone component — coerente con `standalone: false` usato da tutti i componenti esistenti in questo NgModule), RxJS. Nessuna dipendenza da `ion-accordion`/`ion-accordion-group`.

## Global Constraints

- Interfacce con prefisso `I` + PascalCase (es. `IConfigDetailBox`), niente indice arbitrario dove evitabile.
- Selector Angular con prefisso `wm-` (convenzione realmente in uso in wm-core per i componenti più recenti — `wm-tab-description`, `wm-home-layer`, `wm-track-properties`, `wm-inner-component-html` — anche se `core/.eslintrc.json` del repo principale dichiara `webmapp` come prefisso enforced: quella regola si applica al progetto principale, wm-core non ha un proprio `.eslintrc` e il codice reale del submodule usa `wm-` in modo pressoché universale per i componenti non-Home-box).
- JSDoc obbligatorio su ogni metodo pubblico/privato non trivialmente auto-esplicativo (enforced da ESLint sul progetto principale).
- **Nessun test Karma/`.spec.ts` per questo componente in questo ciclo**: i test dei componenti wm-core sono esclusi dalla discovery CI (`angular.json`/`tsconfig.spec.json` limitano a `src/app/services/**` nel repo principale — bug noto `NG0201` su `APP_TRANSLATION` mancante in DI, vedi CLAUDE.md → oc:8023). Al posto del ciclo "scrivi test fallente → implementa → verifica passi", ogni task si verifica con una **compilazione TypeScript reale** (`cd core && npm run build`) e, dove applicabile, un controllo visivo manuale (`npm start`, poi apertura di una risorsa con `config_detail` popolato). La copertura automatica reale arriverà dal test Cypress E2E pianificato nel repo principale (`docs/features/8181-.../plan.md` di `webmapp-app`).
- Nessun commit o branch va eseguito automaticamente durante l'esecuzione di questo piano: i comandi `git commit`/`git checkout -b` riportati in ogni task sono istruzioni testuali per lo sviluppatore, da eseguire solo dopo la sua approvazione esplicita (vedi `wm-plan` → Fase: execution → review-gate).
- Percorso base per tutti i path relativi di questo piano: `core/src/app/shared/wm-core/projects/wm-core/src/` (submodule wm-core, dentro il repo `webmapp-app`).

---

## File Structure

| File | Responsabilità |
|---|---|
| `types/config.ts` (**modifica**) | Nuovi tipi `IConfigDetailBox`/`IConfigDetailInfoBox`/`IConfigDetailInfoBoxItem`; estensione di `ILAYER` con `config_detail?: IConfigDetailBox[]` |
| `config-detail/config-detail.component.ts` (**nuovo**) | Logica: appiattimento gruppi, filtro righe vuote, fallback lingua, tracking item aperti |
| `config-detail/config-detail.component.html` (**nuovo**) | Template: accordion custom (`<button>`+`<div>`) con contenuto lazy |
| `config-detail/config-detail.component.scss` (**nuovo**) | Stile card bianche/chevron nero-arancione, default per tutti gli shard |
| `wm-core.module.ts` (**modifica**) | Import + declaration + export di `ConfigDetailComponent` |
| `home/home-layer/home-layer.component.html` (**modifica**) | Wiring dopo `wm-tab-description` |
| `track-properties/track-properties.component.html` (**modifica**) | Wiring dopo `wm-tab-description` |

---

## Task 1: Tipi `config_detail` e estensione `ILAYER`

**Files:**
- Modify: `types/config.ts:222-241` (interfaccia `ILAYER`)
- Modify: `types/config.ts` (fine file, dopo la definizione di `iLocalString` a riga 375, o in un punto logicamente vicino a `ILAYER` — vedi Step 1)

**Interfaces:**
- Produces: `IConfigDetailBox` (union, oggi con un solo membro), `IConfigDetailInfoBox`, `IConfigDetailInfoBoxItem`, `ILAYER.config_detail?: IConfigDetailBox[]`

- [ ] **Step 1: Aggiungere i nuovi tipi in `types/config.ts`**

Aggiungere, subito prima dell'interfaccia `ILAYER` (che inizia a riga 222), questo blocco:

```typescript
/**
 * Un gruppo del builder generico `properties.config_detail` (Layer/EcTrack/EcPoi),
 * discriminato da `box_type`. Namespace di box_type concettualmente distinto da `IBOX`
 * (quello di `config_home`): non va unito a quella union anche se in futuro potesse
 * comparire una stringa uguale.
 */
export type IConfigDetailBox = IConfigDetailInfoBox;

export interface IConfigDetailInfoBox {
  box_type: 'info';
  items?: IConfigDetailInfoBoxItem[];
}

export interface IConfigDetailInfoBoxItem {
  title?: iLocalString;
  content?: iLocalString;
}
```

Nota (aggiornato dopo il final review): `items`/`title`/`content` sono opzionali — dati compilati da un admin Nova, un campo mancante è uno stato dati legittimo (vedi `notes.md`).

Poi estendere l'interfaccia `ILAYER` (riga 222-241) aggiungendo il campo (mantenendo tutti i campi esistenti invariati):

```typescript
export interface ILAYER {
  bbox: [number, number, number, number];
  behaviour: {[name: string]: string};
  data_use_bbox: boolean;
  data_use_only_my_data: boolean;
  description: string;
  edges?: {[trackId: number]: {prev: number[]; next: number[]}};
  feature_image: string;
  icon?: any;
  id: string;
  logo_image?: string;
  name: string;
  params?: {[id: string]: string};
  style: {[name: string]: string};
  subtitle: string;
  taxonomy_activities?: any[];
  taxonomy_themes?: any[];
  title: string;
  tracks?: {[name: string]: Hit[]};
  /** Builder generico "Blocchi Dettaglio" (oc:8181, wm-package) — assente se l'admin non ha configurato alcun box. */
  config_detail?: IConfigDetailBox[];
}
```

`iLocalString` è già definita più avanti nello stesso file (riga 370-375) e non richiede import aggiuntivo (stesso modulo).

- [ ] **Step 2: Verificare che il file compili**

Run: `cd core && npx tsc -p tsconfig.json --noEmit`

Expected: nessun nuovo errore relativo a `types/config.ts` (eventuali errori preesistenti non correlati non sono responsabilità di questo task).

- [ ] **Step 3: Commit**

```bash
git add core/src/app/shared/wm-core/projects/wm-core/src/types/config.ts
git commit -m "feat(oc:8181): add config_detail types and extend ILAYER"
```

---

## Task 2: Componente `ConfigDetailComponent` (accordion custom, no `ion-accordion`)

**Files:**
- Create: `config-detail/config-detail.component.ts`
- Create: `config-detail/config-detail.component.html`
- Create: `config-detail/config-detail.component.scss`

**Interfaces:**
- Consumes: `IConfigDetailBox`, `IConfigDetailInfoBox`, `IConfigDetailInfoBoxItem` (Task 1, `@wm-core/types/config`); `LangService` (`@wm-core/localization/lang.service`, proprietà `currentLang`/`defaultLang`/`onLangChange` ereditate da `TranslateService`); pipe `wmtrans` (già globale in wm-core, nessun import aggiuntivo necessario nel template perché `WmPipeModule` è già importato da `wm-core.module.ts`)
- Produces: selector `wm-config-detail`, `@Input() groups: IConfigDetailBox[] | null | undefined`

**Decisione esplicita del developer**: accordion **custom** (markup proprio, `<button>` + `<div>`), non `ion-accordion`/`ion-accordion-group` — per evitare una dipendenza da un componente Ionic complesso. Conseguenza diretta: l'accessibilità che Ionic fornirebbe di serie (focus/keyboard, `aria-expanded`) va reimplementata esplicitamente in questo componente (vedi Step 1-2).

> **Nota:** il codice sotto è lo stato **finale** (aggiornato dopo il final review e diverse iterazioni di QA manuale del developer post-implementazione — apertura esclusiva, spazio extra tra gruppi, colore primary, embed responsive, memoizzazione `SafeHtml`). Il dettaglio di ogni evoluzione e la motivazione sono in `notes.md`, non ripetuti qui.

- [ ] **Step 1: Creare `config-detail/config-detail.component.ts`**

```typescript
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {LangService} from '@wm-core/localization/lang.service';
import {
  IConfigDetailBox,
  IConfigDetailInfoBox,
  IConfigDetailInfoBoxItem,
  iLocalString,
} from '@wm-core/types/config';
import {Subscription} from 'rxjs';

/** Item pronto per il rendering, con l'informazione se inizia un nuovo gruppo (per lo spazio extra tra gruppi). */
interface IConfigDetailItemEntry {
  kind: 'item';
  item: IConfigDetailInfoBoxItem;
  /** Indice progressivo tra i soli item (non conta i pulsanti "Mostra altro"/"Mostra meno"), usato solo per costruire id/aria-controls univoci nel template — l'identità dell'item per `isOpen`/`toggle` è `item` stesso, non questo indice. */
  itemIndex: number;
  /** `true` se è il primo item visibile di un gruppo diverso dal primo (serve più spazio sopra, nessuna intestazione visibile). */
  isGroupStart: boolean;
}

/** Pulsante "Mostra altro" in fondo a un gruppo che ha ancora item nascosti oltre la pagina corrente. */
interface IConfigDetailShowMoreEntry {
  kind: 'show-more';
  /** Indice del gruppo (tra quelli con `box_type: 'info'`) a cui appartiene, per `showMore(groupIndex)`. */
  groupIndex: number;
}

/** Pulsante "Mostra meno" in fondo a un gruppo espanso per intero (nessun item nascosto rimasto). */
interface IConfigDetailShowLessEntry {
  kind: 'show-less';
  /** Indice del gruppo (tra quelli con `box_type: 'info'`) a cui appartiene, per `showLess(groupIndex)`. */
  groupIndex: number;
}

type IConfigDetailRenderEntry =
  | IConfigDetailItemEntry
  | IConfigDetailShowMoreEntry
  | IConfigDetailShowLessEntry;

/**
 * Renderizza `properties.config_detail` (Layer/EcTrack/EcPoi, oc:8181) come un'unica lista di
 * accordion custom, concatenando tutti i gruppi con `box_type` riconosciuto (oggi solo `'info'`)
 * senza intestazione visibile tra un gruppo e l'altro. Dispatch per `box_type` centralizzato
 * qui (oggi filtra solo `'info'`) — un futuro tipo di box richiederà comunque di estendere
 * questo componente (nuovo case nel filtro/getter e nel template), ma senza toccare i template
 * consumer (`home-layer`, `track-properties`, `poi-properties`), che restano un singolo
 * binding invariato.
 *
 * Accordion implementato senza `ion-accordion` (decisione esplicita, per evitare la dipendenza
 * da quel componente Ionic): apertura/chiusura tracciata per riferimento-item in `_openItem` (un
 * solo item aperto alla volta — aprirne uno chiude quello precedente), header con `<button>`
 * nativo per mantenere gratis focus/keyboard, `aria-expanded`/`aria-controls` gestiti a mano.
 *
 * Ogni gruppo mostra al massimo `PAGE_SIZE` item alla volta: se un gruppo ne ha di più, in fondo
 * compare un pulsante "Mostra altro" (tradotto via `wmtrans`, stessa chiave già usata da
 * `wm-tab-description`) che ne rivela altri `PAGE_SIZE`, ripetibile finché il gruppo non è
 * completamente mostrato. Una volta mostrato per intero, il pulsante diventa "Mostra meno" e
 * torna alla pagina iniziale, chiudendo anche l'eventuale item aperto (nessun riferimento a un
 * item non più garantito visibile).
 */
@Component({
  standalone: false,
  selector: 'wm-config-detail',
  templateUrl: './config-detail.component.html',
  styleUrls: ['./config-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ConfigDetailComponent implements OnDestroy {
  /** Quanti item mostrare per gruppo alla prima visualizzazione, e quanti aggiungerne ad ogni "Mostra altro". */
  private static readonly PAGE_SIZE = 10;

  @Input()
  set groups(value: IConfigDetailBox[] | null | undefined) {
    this._groups = value ?? [];
    // Reset perché l'istanza viene riusata tra entità diverse (es. navigazione tra due layer) e
    // il riferimento non è più raggiungibile da `visibleEntries` dopo il reset.
    this._openItem = null;
    // Stessa ragione: la paginazione è per indice di gruppo, che ha senso solo per l'attuale `_groups`.
    this._visibleCountPerGroup = [];
    // Stessa ragione: la cache è keyed per riferimento-item, gli item vecchi non sono più
    // raggiungibili da `visibleEntries` dopo il reset e andrebbero altrimenti trattenuti in memoria.
    this._safeContentCache.clear();
  }
  get groups(): IConfigDetailBox[] {
    return this._groups;
  }
  private _groups: IConfigDetailBox[] = [];

  /**
   * Item attualmente aperto, o `null` se tutti chiusi. Tracciato per riferimento all'oggetto
   * item (non per indice posizionale): un indice si disallineerebbe silenziosamente quando
   * `showMore`/`showLess` cambia quanti item di un gruppo PRECEDENTE sono visibili, spostando
   * la posizione di tutti gli item nei gruppi successivi nella lista appiattita. Privato: né il
   * template né alcun consumer esterno leggono questo campo direttamente, solo tramite `isOpen()`.
   */
  private _openItem: IConfigDetailInfoBoxItem | null = null;

  /** Quanti item sono attualmente mostrati per ciascun gruppo (indice = posizione del gruppo tra quelli con `box_type: 'info'`); assente = `PAGE_SIZE`. */
  private _visibleCountPerGroup: number[] = [];

  /** Prefisso univoco per istanza, per evitare id DOM duplicati quando più istanze di questo componente sono nella stessa pagina. */
  private readonly _uid = Math.random().toString(36).slice(2);

  /** Cache del `SafeHtml` per item, per non richiamare `bypassSecurityTrustHtml` ad ogni change detection (vedi `getSafeContent`). */
  private readonly _safeContentCache = new Map<IConfigDetailInfoBoxItem, {content: string; safeHtml: SafeHtml}>();

  private _langChangeSub: Subscription;

  constructor(
    private _langSvc: LangService,
    private _cdr: ChangeDetectorRef,
    private _sanitizer: DomSanitizer,
  ) {
    this._langChangeSub = this._langSvc.onLangChange.subscribe(() => this._cdr.markForCheck());
  }

  /** Prefisso univoco per istanza, usato nel template per costruire id/aria-controls non duplicati. */
  get uid(): string {
    return this._uid;
  }

  ngOnDestroy(): void {
    this._langChangeSub?.unsubscribe();
  }

  /**
   * Entry pronte per il rendering (item + pulsanti "Mostra altro"), da tutti i gruppi `'info'`
   * concatenati. Filtra le righe senza alcuna traduzione disponibile (né per `title` né per
   * `content`, dopo il fallback a cascata). Gruppi con `box_type` non riconosciuto vengono
   * ignorati — stesso comportamento del resolver backend, che scarta silenziosamente i box_type
   * senza layout registrato.
   *
   * Ogni gruppo mostra al massimo `PAGE_SIZE` item (vedi `_visibleCountPerGroup`); se ne restano
   * di nascosti, l'ultima entry del gruppo è un pulsante `'show-more'` invece di un item. Se
   * invece il gruppo era stato espanso (pagina corrente > `PAGE_SIZE`) e ora li mostra tutti,
   * l'ultima entry è `'show-less'` per tornare alla pagina iniziale. Il primo item visibile di un
   * gruppo diverso dal primo porta `isGroupStart: true` — nessuna intestazione visibile tra un
   * gruppo e l'altro, ma serve uno spazio verticale maggiore rispetto a quello tra item dello
   * stesso gruppo (fedele al mockup/sito di riferimento).
   *
   * Orchestrazione pura: il filtro per traduzione disponibile e la paginazione di un singolo
   * gruppo vivono in `_visibleItemsInGroup()`, questo getter si limita a concatenare i gruppi e a
   * costruire le entry (item/show-more/show-less) con gli indici progressivi.
   */
  get visibleEntries(): IConfigDetailRenderEntry[] {
    const result: IConfigDetailRenderEntry[] = [];
    let itemIndex = 0;
    this._groups
      .filter((group): group is IConfigDetailInfoBox => group.box_type === 'info')
      .forEach((group, groupIndex) => {
        const {shownItems, totalItems} = this._visibleItemsInGroup(group, groupIndex);
        if (totalItems === 0) return;
        shownItems.forEach((item, indexInGroup) => {
          result.push({
            kind: 'item',
            item,
            itemIndex,
            isGroupStart: indexInGroup === 0 && result.length > 0,
          });
          itemIndex++;
        });
        if (shownItems.length < totalItems) {
          result.push({kind: 'show-more', groupIndex});
        } else if (shownItems.length > ConfigDetailComponent.PAGE_SIZE) {
          result.push({kind: 'show-less', groupIndex});
        }
      });
    return result;
  }

  /**
   * Item del gruppo `group` (indice `groupIndex`) con traduzione disponibile, limitati alla
   * pagina corrente di quel gruppo. Isola dal getter `visibleEntries` le due responsabilità che
   * riguardano un singolo gruppo (filtro traduzione + paginazione), lasciando a `visibleEntries`
   * solo l'orchestrazione tra gruppi (concatenazione, indici, entry `show-more`/`show-less`).
   *
   * @param group Gruppo `'info'` di cui calcolare gli item visibili.
   * @param groupIndex Indice del gruppo (tra quelli con `box_type: 'info'`), per leggere la sua pagina corrente.
   * @returns `shownItems` (item della pagina corrente) e `totalItems` (item con traduzione disponibile nel gruppo, prima della paginazione).
   */
  private _visibleItemsInGroup(
    group: IConfigDetailInfoBox,
    groupIndex: number,
  ): {shownItems: IConfigDetailInfoBoxItem[]; totalItems: number} {
    const translatedItems = (group.items ?? []).filter(
      item => this._resolve(item.title) !== '' || this._resolve(item.content) !== '',
    );
    // Non è la "dimensione di pagina" fissa (quella è la costante PAGE_SIZE): dopo N click su
    // "Mostra altro" vale N*PAGE_SIZE — è quanti item di QUESTO gruppo sono attualmente visibili.
    const visibleCount = this._visibleCountPerGroup[groupIndex] ?? ConfigDetailComponent.PAGE_SIZE;
    return {
      shownItems: translatedItems.slice(0, visibleCount),
      totalItems: translatedItems.length,
    };
  }

  /**
   * `trackBy` per `*ngFor="let entry of visibleEntries; trackBy: trackEntry"`. `visibleEntries` è
   * un getter che ricostruisce array di oggetti wrapper NUOVI ad ogni valutazione — senza questa
   * `trackBy`, `NgForOf` confronterebbe per identità di riferimento e tratterebbe ogni entry come
   * "rimossa e ricreata" ad ogni change detection (anche solo per il click su un item diverso,
   * dato che l'evento nasce nel template di questo stesso componente), distruggendo e
   * ricreando TUTTI i nodi DOM della lista: focus perso sull'header appena cliccato, nessuna
   * animazione di apertura visibile (il nodo nascerebbe già nel suo stato finale), e la cache di
   * `getSafeContent()` vanificata (il valore è cacheato, ma il nodo che lo ospita verrebbe
   * comunque ricreato). Chiave stabile: il riferimento all'item per le entry `'item'`
   * (`_groups`/`group.items` non cambia tra una valutazione e l'altra dello stesso binding di
   * `groups`), una chiave composita per `'show-more'`/`'show-less'` (non hanno un oggetto
   * proprio, ma sono identificate univocamente da tipo+gruppo).
   *
   * @param _ Indice nell'array (non usato, richiesto dalla firma di `TrackByFunction`).
   * @param entry Entry da identificare.
   * @returns Una chiave stabile tra una valutazione e l'altra dello stesso entry logico.
   */
  trackEntry(_: number, entry: IConfigDetailRenderEntry): unknown {
    return entry.kind === 'item' ? entry.item : `${entry.kind}-${entry.groupIndex}`;
  }

  /**
   * Verifica se `item` è attualmente aperto.
   *
   * @param item Item da verificare.
   * @returns `true` se l'item è aperto.
   */
  isOpen(item: IConfigDetailInfoBoxItem): boolean {
    return this._openItem === item;
  }

  /**
   * Alterna lo stato aperto/chiuso di `item`. Apertura esclusiva: aprirne uno chiude
   * automaticamente l'item precedentemente aperto (mai più di un item aperto alla volta).
   *
   * @param item Item da alternare.
   */
  toggle(item: IConfigDetailInfoBoxItem): void {
    this._openItem = this._openItem === item ? null : item;
  }

  /**
   * Rivela altri `PAGE_SIZE` item del gruppo `groupIndex` (tra quelli con `box_type: 'info'`),
   * ripetibile finché il gruppo non è mostrato per intero (a quel punto `visibleEntries` produce
   * un pulsante `'show-less'` invece di `'show-more'` per quel gruppo).
   *
   * @param groupIndex Indice del gruppo (tra quelli con `box_type: 'info'`) di cui mostrare altri item.
   */
  showMore(groupIndex: number): void {
    const visibleCount = this._visibleCountPerGroup[groupIndex] ?? ConfigDetailComponent.PAGE_SIZE;
    this._visibleCountPerGroup[groupIndex] = visibleCount + ConfigDetailComponent.PAGE_SIZE;
  }

  /**
   * Torna alla pagina iniziale (`PAGE_SIZE` item) del gruppo `groupIndex`. Chiude anche
   * l'eventuale item aperto (`_openItem = null`), non solo se apparteneva al gruppo appena
   * ridotto: coerente con l'apertura esclusiva (un solo item aperto in tutto il componente) e
   * più semplice/predicibile di un controllo "l'item aperto è ancora tra quelli visibili?".
   *
   * @param groupIndex Indice del gruppo (tra quelli con `box_type: 'info'`) da riportare alla pagina iniziale.
   */
  showLess(groupIndex: number): void {
    delete this._visibleCountPerGroup[groupIndex];
    this._openItem = null;
  }

  /**
   * Risolve e sanifica il contenuto HTML di `item`, cacheando il risultato per item invece di
   * richiamare `bypassSecurityTrustHtml` ad ogni ciclo di change detection dal template:
   * `bypassSecurityTrustHtml` crea un nuovo oggetto `SafeHtml` ad ogni chiamata, quindi Angular
   * reassegnerebbe `innerHTML` anche quando l'item è chiuso o il suo contenuto non è cambiato —
   * ad es. al semplice toggle di UN ALTRO item, che marca dirty il componente OnPush e fa
   * ripartire la CD. Reassegnare `innerHTML` ricrea da zero un eventuale iframe/video al suo
   * interno, perdendo lo stato di playback. Il valore cacheato viene ricalcolato solo se il
   * contenuto risolto per la lingua corrente cambia (es. cambio lingua a runtime).
   *
   * @param item Item di cui risolvere il contenuto.
   * @returns Il contenuto HTML sanificato, pronto per il binding `[innerHTML]`.
   */
  getSafeContent(item: IConfigDetailInfoBoxItem): SafeHtml {
    const resolvedContent = this._resolve(item.content);
    const cached = this._safeContentCache.get(item);
    if (cached && cached.content === resolvedContent) {
      return cached.safeHtml;
    }
    const safeHtml = this._sanitizer.bypassSecurityTrustHtml(resolvedContent);
    this._safeContentCache.set(item, {content: resolvedContent, safeHtml});
    return safeHtml;
  }

  /**
   * Replica il fallback a cascata di `WmTransPipe` (lingua corrente → lingua di default →
   * prima lingua disponibile nell'oggetto) per decidere, lato componente (non solo in
   * template), se una riga ha almeno una traduzione disponibile.
   *
   * @param value Oggetto tradotto per lingua, o stringa/undefined.
   * @returns Il valore risolto per la lingua corrente, o stringa vuota se nessuna lingua ha contenuto.
   */
  private _resolve(value: iLocalString | undefined): string {
    if (!value) return '';
    const currentLang = this._langSvc.currentLang;
    const defaultLang = this._langSvc.defaultLang;
    if (currentLang && value[currentLang]) return value[currentLang];
    if (defaultLang && value[defaultLang]) return value[defaultLang];
    for (const k in value) if (value[k]) return value[k];
    return '';
  }
}
```

- [ ] **Step 2: Creare `config-detail/config-detail.component.html`**

```html
<div class="wm-config-detail" *ngIf="visibleEntries.length">
  <ng-container *ngFor="let entry of visibleEntries; trackBy: trackEntry">
    <div
      *ngIf="entry.kind === 'item'"
      class="wm-config-detail-item"
      [class.wm-config-detail-item--open]="isOpen(entry.item)"
      [class.wm-config-detail-item--group-start]="entry.isGroupStart"
    >
      <button
        type="button"
        class="wm-config-detail-header"
        [attr.aria-expanded]="isOpen(entry.item)"
        [attr.aria-controls]="'wm-config-detail-' + uid + '-content-' + entry.itemIndex"
        (click)="toggle(entry.item)"
      >
        <span class="wm-config-detail-title">{{ entry.item.title | wmtrans }}</span>
        <span class="wm-config-detail-chevron">
          <ion-icon name="chevron-forward"></ion-icon>
        </span>
      </button>
      <div
        class="wm-config-detail-content-wrapper"
        [id]="'wm-config-detail-' + uid + '-content-' + entry.itemIndex"
      >
        <div
          class="wm-config-detail-content"
          *ngIf="isOpen(entry.item)"
          [innerHTML]="getSafeContent(entry.item)"
        ></div>
      </div>
    </div>

    <button
      *ngIf="entry.kind === 'show-more'"
      type="button"
      class="wm-config-detail-toggle-button"
      (click)="showMore(entry.groupIndex)"
    >
      {{ 'Mostra altro' | wmtrans }}
    </button>

    <button
      *ngIf="entry.kind === 'show-less'"
      type="button"
      class="wm-config-detail-toggle-button"
      (click)="showLess(entry.groupIndex)"
    >
      {{ 'Mostra meno' | wmtrans }}
    </button>
  </ng-container>
</div>
```

Note implementative:
- `<button>` nativo (non `<div>` con `(click)`) per avere gratis focus via tab e attivazione da tastiera (Enter/Space) — requisito di accessibilità che `ion-accordion` avrebbe fornito di serie.
- `aria-expanded`/`aria-controls` con `id` (prefissato con `uid`, univoco per istanza) abbinato sul contenuto: screen reader può annunciare lo stato aperto/chiuso e la relazione header↔contenuto, senza id duplicati se più istanze del componente coesistono sulla pagina.
- `.wm-config-detail-content-wrapper` resta sempre nel DOM (necessario per l'animazione CSS, vedi Step 3), ma il suo contenuto (`[innerHTML]`, incluso ogni iframe/img embedded) viene creato/distrutto da `*ngIf` solo quando l'item è aperto — questo è il meccanismo di lazy-render richiesto dall'overview. Il valore passato a `[innerHTML]` è `getSafeContent(entry.item)` (memoizzato), non una chiamata diretta a `_sanitizer.bypassSecurityTrustHtml` nel template — altrimenti Angular ricreerebbe l'HTML (e un eventuale iframe/video al suo interno) ad ogni change detection, anche solo per il toggle di un altro item.
- `entry.isGroupStart` guida la classe `--group-start` (spaziatura extra tra gruppi, vedi Step 3) — nessun testo/intestazione aggiuntiva nel template, solo CSS.
- `*ngFor="let entry of visibleEntries; trackBy: trackEntry"` su un `<ng-container>` (che non renderizza nulla di suo), con `*ngIf` esclusivi (`entry.kind === 'item'` / `'show-more'` / `'show-less'`) sugli elementi reali: Angular restringe il tipo di `entry` alla union discriminata dentro ciascun ramo (`strictTemplates`), quindi `entry.item`/`entry.itemIndex`/`entry.groupIndex` compilano senza cast — verificato con `ng build` (`tsc --noEmit` da solo non fa questo tipo di controllo, vedi Step 4). **`trackBy` obbligatorio** (corretto in `wm-skills:wm-review-ticket`): senza, `visibleEntries` — un getter che ricostruisce oggetti wrapper nuovi ad ogni valutazione — farebbe ricreare l'intero DOM della lista ad ogni click (focus perso, animazione non visibile, cache `getSafeContent()` vanificata).
- I pulsanti "Mostra altro"/"Mostra meno" sono tradotti con `{{ 'Mostra altro' | wmtrans }}`/`{{ 'Mostra meno' | wmtrans }}` — **stesse chiavi i18n già esistenti** in tutti i file `localization/i18n/*.ts` (usate anche da `wm-tab-description` per il proprio toggle), nessuna nuova voce di traduzione da aggiungere. Stessa classe CSS `.wm-config-detail-toggle-button` per entrambi (solo la label cambia, coerente col pattern già usato da `wm-tab-description` per il suo `.wm-expand-button`).

- [ ] **Step 3: Creare `config-detail/config-detail.component.scss`**

```scss
wm-config-detail {
  display: block;
  margin: var(--wm-feature-details-margin);
}

.wm-config-detail {
  // Azzera il margin-bottom finale solo sull'ultimo figlio REALE del componente (item o pulsante
  // "Mostra altro"/"Mostra meno", qualunque sia), non su ".wm-config-detail-item:last-of-type" —
  // quella regola avrebbe azzerato il gap tra l'ultimo item mostrato e il pulsante che lo segue
  // (":last-of-type" si applica all'ultimo elemento di quel tipo, indipendentemente da cosa lo
  // segue), incollandoli visivamente. Selettore sulla classe del wrapper interno (`.wm-config-detail`,
  // il `<div>` nel template), non sul tag host `wm-config-detail`: quest'ultimo ha come unico
  // figlio diretto proprio quel `<div>`, non gli item/pulsanti al suo interno.
  > *:last-child {
    margin-bottom: 0;
  }
}

.wm-config-detail-item {
  border: 1px solid var(--ion-color-light-shade, #e2e8f0);
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: border-color 0.2s ease;

  &--open {
    border-color: var(--wm-color-primary, #3880ff);
  }

  &--group-start {
    // Nessuna intestazione visibile tra un gruppo e l'altro, ma serve più spazio del semplice
    // gap tra item dello stesso gruppo (fedele al sito di riferimento) — i margini verticali tra
    // box adiacenti collassano al valore più alto, quindi basta questo per ottenere un gap
    // complessivo maggiore rispetto ai 12px di margin-bottom tra item dello stesso gruppo.
    margin-top: 40px;
  }
}

.wm-config-detail-toggle-button {
  display: block;
  width: 100%;
  min-height: 44px;
  // Più dei 12px di gap tra item dello stesso gruppo: deve essere STRETTAMENTE maggiore di 12px,
  // perché i margini adiacenti collassano al valore più alto (non si sommano) — un valore pari o
  // inferiore a margin-bottom:12px dell'item precedente non avrebbe alcun effetto visibile.
  margin-top: 16px;
  margin-bottom: 12px;
  padding: 12px 16px;
  background: var(--wm-color-primary, #3880ff);
  border: none;
  border-radius: 8px;
  color: var(--wm-color-primary-contrast, #ffffff);
  font: inherit;
  font-weight: 700;
  text-transform: uppercase;
  text-align: center;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:active {
    opacity: 0.8;
  }
}

.wm-config-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 12px 16px;
  background: #ffffff;
  border: none;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.wm-config-detail-title {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.9rem;
}

.wm-config-detail-chevron {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 8px;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;

  ion-icon {
    color: #ffffff;
    transition: transform 0.2s ease;
  }
}

.wm-config-detail-item--open .wm-config-detail-chevron {
  background: var(--wm-color-primary, #3880ff);
}

.wm-config-detail-item--open .wm-config-detail-chevron ion-icon {
  transform: rotate(90deg);
}

.wm-config-detail-content-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  overflow: hidden;
  transition: grid-template-rows 0.3s ease;
}

.wm-config-detail-item--open .wm-config-detail-content-wrapper {
  grid-template-rows: 1fr;
}

.wm-config-detail-content {
  min-height: 0;
  overflow: hidden;
  padding: 0 16px 16px;
  font-size: 0.95rem;

  img {
    max-width: 100%;
  }

  iframe {
    // Nessun aspect-ratio forzato: il markup embed del backend porta sempre width/height HTML
    // reali (es. 560x315 per un video 16:9, ma anche 600x450 = 4:3 per una mappa) — forzare 16/9
    // avrebbe distorto/compresso qualunque embed che non fosse un video in quel rapporto. Con
    // solo width:100%;height:auto il browser deriva il rapporto naturale dagli attributi
    // width/height dell'iframe, stesso meccanismo già usato per `img` qui sopra.
    max-width: 100%;
    width: 100%;
    height: auto;
    border: none;
  }
}
```

L'animazione usa la tecnica CSS `grid-template-rows: 0fr → 1fr` (nessun calcolo JS dell'altezza, nessuna dipendenza dal contenuto): il contenitore diventa una grid a una riga la cui frazione (`fr`) viene animata dalla transizione — funziona indipendentemente dal fatto che il contenuto interno sia montato o no, e non richiede misurare l'altezza reale come farebbe un approccio `max-height`. `min-height: 0` sul figlio è necessario perché altrimenti il contenuto forzerebbe la riga della grid alla propria altezza intrinseca, vanificando l'animazione da 0.

`wm-config-detail{...}` (selettore per tag, non `:host`) perché sotto `ViewEncapsulation.None` non esiste uno shadow root e `:host` non farebbe match su nulla — stesso pattern di tutti i componenti-sorella (`wm-tab-description`, ecc.). `iframe{width:100%;height:auto}` (senza `aspect-ratio` esplicito — corretto in `wm-skills:wm-review-ticket`, un `aspect-ratio:16/9` forzato distorceva embed non 16:9, es. una mappa 4:3) mantiene le proporzioni reali del video/mappa/embed invece di schiacciarlo o stirarlo quando si adatta alla larghezza disponibile (il markup embed del backend porta `width`/`height` fissi in HTML, che da soli non sono responsive).

- [ ] **Step 4: Verificare che il progetto compili**

Run: `cd core && npx tsc -p tsconfig.json --noEmit` per un check rapido, ma **la verifica autoritativa è `ng build`** (`cd core && npx ng build --configuration=development`, richiede Node ≥20.19 — usare `nvm use` se il Node di sistema è più vecchio): `tsc --noEmit` da solo non rileva errori di lib target (es. metodi array più recenti del `lib` configurato in `tsconfig.json`) né fa template type-checking completo — un bug del genere è stato trovato solo dal final review reale via `ng build`, non da questo comando (vedi `notes.md`).

Expected: nessun errore relativo ai nuovi file. Se emergono errori di template (`strictTemplates`), rivedere i binding sopra contro i tipi di `IConfigDetailInfoBoxItem`.

- [ ] **Step 5: Commit**

```bash
git add core/src/app/shared/wm-core/projects/wm-core/src/config-detail/
git commit -m "feat(oc:8181): add ConfigDetailComponent (accordion for config_detail boxes)"
```

---

## Task 3: Registrare il componente in `wm-core.module.ts`

**Files:**
- Modify: `wm-core.module.ts:9` (blocco import), `wm-core.module.ts:104` circa (array `declarations`), `wm-core.module.ts:338` circa (`exports`)

**Interfaces:**
- Consumes: `ConfigDetailComponent` (Task 2)
- Produces: `ConfigDetailComponent` disponibile per template in tutto wm-core e nel repo principale (tramite l'export del modulo)

- [ ] **Step 1: Aggiungere l'import**

In `wm-core.module.ts`, subito dopo la riga `import {WmInnerHtmlComponent} from './inner-html/inner-html.component';` (riga 33), aggiungere:

```typescript
import {ConfigDetailComponent} from './config-detail/config-detail.component';
```

- [ ] **Step 2: Aggiungere alla lista `declarations`**

Nell'array `export const declarations = [...]`, aggiungere `ConfigDetailComponent` (posizione qualsiasi nell'array, per coerenza va vicino a `WmInnerHtmlComponent` che ha uno scopo simile — rendering contenuto):

```typescript
  WmTrackEdgesComponent,
  WmInnerHtmlComponent,
  ConfigDetailComponent,
  WmFeatureUsefulUrlsComponent,
```

- [ ] **Step 3: Verificare l'export**

Il modulo esporta già `...declarations` in blocco (riga `exports: [...declarations, ...modules, TranslateModule]`) — nessuna modifica aggiuntiva necessaria, `ConfigDetailComponent` risulterà automaticamente esportato aggiungendolo a `declarations`.

- [ ] **Step 4: Verificare che il progetto compili**

Run: `cd core && npx tsc -p tsconfig.json --noEmit`

Expected: nessun errore. Un errore "Component ConfigDetailComponent is not part of any NgModule" indicherebbe che lo Step 2 non è stato applicato correttamente.

- [ ] **Step 5: Commit**

```bash
git add core/src/app/shared/wm-core/projects/wm-core/src/wm-core.module.ts
git commit -m "feat(oc:8181): register ConfigDetailComponent in wm-core.module"
```

---

## Task 4: Wiring in `home-layer.component.html` (Layer)

**Files:**
- Modify: `home/home-layer/home-layer.component.html:22-25`

**Interfaces:**
- Consumes: `wm-config-detail` (Task 3), variabile di template `layer` (già disponibile, tipizzata `ILAYER` — vedi `home-layer.component.ts:7,48`, esposta dal `*ngIf="layer$|async as layer"` di riga 1)

- [ ] **Step 1: Aggiungere il binding dopo `wm-tab-description`**

Il blocco attuale (righe 22-26):

```html
  <wm-tab-description
    *ngIf="layer?.description as description"
    [description]="description"
  ></wm-tab-description>
</ng-container>
```

diventa:

```html
  <wm-tab-description
    *ngIf="layer?.description as description"
    [description]="description"
  ></wm-tab-description>

  <wm-config-detail [groups]="layer?.config_detail"></wm-config-detail>
</ng-container>
```

Nessuna guardia `*ngIf` aggiuntiva necessaria sul binding: `ConfigDetailComponent` gestisce internamente sia `config_detail` assente/`null`/`undefined` sia array vuoto (Task 2, Step 1 — `groups` setter con `?? []`, e `visibleEntries` che risulta vuoto in entrambi i casi, facendo sì che il template del componente stesso non renderizzi nulla via il proprio `*ngIf="visibleEntries.length"`).

- [ ] **Step 2: Verificare che il progetto compili**

Run: `cd core && npx tsc -p tsconfig.json --noEmit`

Expected: nessun errore. Un errore "Property config_detail does not exist on type ILAYER" indicherebbe che il Task 1 non è stato applicato correttamente prima di questo task.

- [ ] **Step 3: Verifica visiva manuale**

Run: `cd core && npm start`, apri l'app su un layer che abbia `config_detail` popolato lato backend (o, se non disponibile in locale, intercetta temporaneamente la risposta layer via devtools/proxy con un payload di test contenente un gruppo `info` con 2-3 item). Verifica:
- Il blocco appare subito dopo la descrizione del layer, con lo stile a card definito in Task 2.
- Tutti gli item sono chiusi all'apertura della schermata.
- Aprire un item mostra il contenuto e il chevron diventa arancione/ruotato; chiuderlo lo fa tornare nero.

- [ ] **Step 4: Commit**

```bash
git add core/src/app/shared/wm-core/projects/wm-core/src/home/home-layer/home-layer.component.html
git commit -m "feat(oc:8181): render config_detail boxes in home-layer"
```

---

## Task 5: Wiring in `track-properties.component.html` (EcTrack)

**Files:**
- Modify: `track-properties/track-properties.component.html:57-61`

**Interfaces:**
- Consumes: `wm-config-detail` (Task 3), variabile di template `ecTrackProperties` (tipizzata `LineStringProperties`, indice aperto `[key: string]: any` — vedi `track-properties.component.ts:15,34` — l'accesso a `.config_detail` compila senza estendere il tipo, come già deciso in overview)

- [ ] **Step 1: Aggiungere il binding dopo `wm-tab-description`**

Il blocco attuale (righe 57-61):

```html
  <wm-tab-description
    *ngIf="ecTrackProperties?.description != null"
    [description]="ecTrackProperties?.description"
  ></wm-tab-description>
  <ng-container *ngIf="ecTrackProperties.related_pois?.length > 0">
```

diventa:

```html
  <wm-tab-description
    *ngIf="ecTrackProperties?.description != null"
    [description]="ecTrackProperties?.description"
  ></wm-tab-description>

  <wm-config-detail [groups]="ecTrackProperties?.config_detail"></wm-config-detail>

  <ng-container *ngIf="ecTrackProperties.related_pois?.length > 0">
```

- [ ] **Step 2: Verificare che il progetto compili**

Run: `cd core && npx tsc -p tsconfig.json --noEmit`

Expected: nessun errore (il binding è su un tipo con indice aperto, quindi non genera errori di tipo anche senza estensione esplicita).

- [ ] **Step 3: Verifica visiva manuale**

Run: `cd core && npm start`, apri l'app su una traccia (EcTrack) con `config_detail` popolato (o intercettato via devtools/proxy come in Task 4). Stesse verifiche del Task 4, Step 3 (posizionamento, stato chiuso di default, toggle chevron).

- [ ] **Step 4: Commit**

```bash
git add core/src/app/shared/wm-core/projects/wm-core/src/track-properties/track-properties.component.html
git commit -m "feat(oc:8181): render config_detail boxes in track-properties"
```

---

## Note di coordinamento con il piano `webmapp-app` (repo principale)

- Dopo l'approvazione/merge di questo piano, il repo principale (`webmapp-app`) deve **aggiornare il riferimento del submodule wm-core** (`git submodule update` + commit del nuovo SHA) prima che il wiring EcPoi e il test Cypress E2E pianificati in `docs/features/8181-.../plan.md` (root del repo principale) possano vedere `ConfigDetailComponent`. Questo step è un task esplicito di quel piano, non di questo.
- Il piano `webmapp-app` include anche la verifica manuale dell'interazione con `map-details.component.ts` (oc:8313, calcolo dinamico dell'altezza del pannello) — non duplicata qui perché quel componente vive nel repo principale.

---

## Self-Review

**Spec coverage** (contro `overview.md` di questo repo, aggiornato dopo QA manuale — vedi `notes.md` per il dettaglio di ogni evoluzione):
- Componente condiviso, dispatch centralizzato in un solo punto → Task 2 (metodo `visibleEntries`, unico punto di `filter` su `box_type`).
- Stile card bianche, chevron/bordo colore `--wm-color-primary` quando aperto, default per tutti gli shard → Task 2, Step 3 (nessun CSS scoped per shard).
- Item chiusi di default → Task 2 (`_openItem` inizializzato a `null`).
- **Apertura esclusiva** (un solo item aperto alla volta) → Task 2, Step 1 (`toggle()`: `_openItem = _openItem === item ? null : item`, tracciato per riferimento-item non per indice, vedi `notes.md` per il bug di indice posizionale trovato e corretto).
- **Spazio extra tra gruppi** (nessuna intestazione visibile) → Task 2, Step 1 (`isGroupStart` in `visibleEntries`) + Step 3 (`--group-start{margin-top:40px}`).
- **Embed (iframe) responsive**, non tagliato e senza forzare un rapporto arbitrario → Task 2, Step 3 (`iframe{max-width:100%;width:100%;height:auto}`, nessun `aspect-ratio` esplicito — il browser deriva il rapporto reale dagli attributi `width`/`height` dell'embed).
- **Paginazione per gruppo (max 10, "Mostra altro" +10 alla volta, "Mostra meno" al massimo per tornare indietro e chiudere l'item aperto)** → Task 2, Step 1 (`PAGE_SIZE`, `_visibleCountPerGroup`, `showMore()`/`showLess()`, entry `'show-more'`/`'show-less'` in `visibleEntries`) + Step 2 (bottoni tradotti con `'Mostra altro'|wmtrans`/`'Mostra meno'|wmtrans`, chiavi i18n riusate da `wm-tab-description`, nessuna nuova voce).
- Lazy render contenuto HTML su expand, senza ricreare iframe/video al toggle di un altro item → Task 2, Step 1 (`getSafeContent()` memoizzato) + Step 2 (`*ngIf="isOpen(entry.item)"` sul contenuto).
- Fallback lingua a cascata per campo, riga nascosta solo se sia title sia content vuoti → Task 2, Step 1 (`_resolve()` + `visibleEntries` filter).
- Array vuoto equivalente ad assente → Task 2, Step 1 (`visibleEntries` su array vuoto risulta `[]`, template con `*ngIf="visibleEntries.length"` non renderizza nulla — stesso esito di `config_detail` `null`/`undefined`).
- Wiring dopo `wm-tab-description` in home-layer e track-properties → Task 4, Task 5.
- Estensione `ILAYER` → Task 1. Nessuna estensione di `wm-types`/`map-core` (esplicitamente out of scope nell'overview) → nessun task la introduce, corretto.
- Kill-switch app-side, TODO in poi-properties, doppia `ILAYER`, limite item, titoli lunghi → tutti registrati come debito noto/accettato nell'overview, nessuna azione di codice richiesta in questo piano — corretto, nessun task li tratta.
- Verifica manuale oc:8313 → di competenza del piano webmapp-app, non duplicata qui (vedi nota di coordinamento sopra).

**Placeholder scan:** nessun "TBD"/"implement later" nei blocchi di codice sopra; ogni step ha contenuto completo.

**Type consistency:** `IConfigDetailBox`/`IConfigDetailInfoBox`/`IConfigDetailInfoBoxItem` (Task 1) sono gli stessi nomi usati in Task 2 (import da `@wm-core/types/config`) e Task 4/5 (nessun nome alternativo introdotto). `groups`/`visibleEntries`/`_openItem`/`isOpen()`/`toggle()`/`showMore()`/`showLess()`/`trackEntry()`/`getSafeContent()`/`uid` sono coerenti tra Step 1 (TS) e Step 2 (HTML) del Task 2. `IConfigDetailItemEntry.item`/`.itemIndex`, `IConfigDetailShowMoreEntry.groupIndex` e `IConfigDetailShowLessEntry.groupIndex` usati identicamente nel template per `isOpen`/`toggle`/`showMore`/`showLess`/`trackEntry`.
